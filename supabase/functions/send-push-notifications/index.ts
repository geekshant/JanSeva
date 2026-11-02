// ============================================================================
// JanMitra - send-push-notifications Edge Function
// ============================================================================
// Trusted server-side FCM sender. Drains the notifications outbox
// (rows with push_sent = false) and delivers an FCM push to every device
// registered in device_tokens for that user, then marks the row sent.
//
// SECURITY: Firebase service-account credentials live ONLY in Edge Function
// secrets. The Flutter app never sees server keys - it only registers its
// public FCM device token against Supabase (RLS-scoped to the signed-in user).
//
// Deploy:
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
//   supabase functions deploy send-push-notifications
//
// Invoke (verify_jwt enabled - requires the service_role key):
//   POST https://<PROJECT_REF>.supabase.co/functions/v1/send-push-notifications
//   Authorization: Bearer <SERVICE_ROLE_KEY>
//
// Schedule every minute with pg_cron + pg_net (SQL Editor):
//   select cron.schedule('send-push-notifications', '* * * * *', $$
//     select net.http_post(
//       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push-notifications',
//       headers := jsonb_build_list(
//         'Content-Type: application/json',
//         'Authorization: Bearer <SERVICE_ROLE_KEY>'
//       ),
//       body := '{}'::jsonb
//     );
//   $$);
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { cert, getApps, initializeApp } from "npm:firebase-admin@12/app";
import { getMessaging } from "npm:firebase-admin@12/messaging";

/** Max notifications processed per invocation (keeps runs short). */
const BATCH_SIZE = 100;

interface PendingNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  complaint_id: string | null;
  data: Record<string, unknown> | null;
}

/** FCM data payloads must be flat string maps. */
function toFcmData(n: PendingNotification): Record<string, string> {
  const data: Record<string, string> = {
    notification_id: n.id,
    type: n.type,
  };
  if (n.complaint_id) data["complaint_id"] = n.complaint_id;
  if (n.data && typeof n.data === "object") {
    for (const [key, value] of Object.entries(n.data)) {
      if (value === null || value === undefined) continue;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        data[key] = String(value);
      }
    }
  }
  return data;
}

const INVALID_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server environment is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Firebase credentials come from a secret - never from the client app.
  if (!serviceAccountJson) {
    return new Response(
      JSON.stringify({
        error: "FIREBASE_SERVICE_ACCOUNT secret is not set; push disabled",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let messaging;
  try {
    const app = getApps()[0] ??
      initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
    messaging = getMessaging(app);
  } catch (error) {
    console.error("firebase-admin init failed", error);
    return new Response(
      JSON.stringify({ error: "Failed to initialize Firebase Admin" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Service-role client: bypasses RLS to drain the outbox safely.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: pending, error: fetchError } = await admin
    .from("notifications")
    .select("id, user_id, title, message, type, complaint_id, data")
    .eq("push_sent", false)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("failed to fetch pending notifications", fetchError);
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const notifications = (pending ?? []) as PendingNotification[];

  // Honour the per-citizen push preference (`profiles.notify_push`, toggled
  // from the app's Notifications & privacy screen). Opted-out citizens are
  // still marked handled so the outbox keeps draining.
  const userIds = [...new Set(notifications.map((n) => n.user_id))];
  const optedOut = new Set<string>();
  if (userIds.length > 0) {
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, notify_push")
      .in("id", userIds);
    if (profileError) {
      console.error("failed to fetch push preferences", profileError);
    } else {
      for (const row of profileRows ?? []) {
        if (row.notify_push === false) optedOut.add(row.id as string);
      }
    }
  }

  let delivered = 0;
  let skipped = 0;
  const invalidTokens = new Set<string>();

  for (const notification of notifications) {
    if (optedOut.has(notification.user_id)) {
      skipped++;
      await admin
        .from("notifications")
        .update({ push_sent: true })
        .eq("id", notification.id);
      continue;
    }

    const { data: tokenRows, error: tokenError } = await admin
      .from("device_tokens")
      .select("token")
      .eq("user_id", notification.user_id);

    if (tokenError) {
      console.error("failed to fetch device tokens", tokenError);
      continue;
    }

    const tokens = (tokenRows ?? []).map((row) => row.token as string);
    if (tokens.length === 0) {
      // No registered devices - still mark handled so the outbox drains.
      skipped++;
      await admin
        .from("notifications")
        .update({ push_sent: true })
        .eq("id", notification.id);
      continue;
    }

    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: notification.title,
          body: notification.message,
        },
        data: toFcmData(notification),
        android: { priority: "high" },
      });

      response.responses.forEach((result, index) => {
        const error = result.error;
        if (error && INVALID_TOKEN_CODES.has(error.code)) {
          invalidTokens.add(tokens[index]);
        }
        if (result.success) delivered++;
      });

      await admin
        .from("notifications")
        .update({ push_sent: true })
        .eq("id", notification.id);
    } catch (error) {
      // Leave push_sent = false so the next run retries.
      console.error(`push failed for notification ${notification.id}`, error);
    }
  }

  // Clean up stale/invalid device tokens so future sends do not fail.
  if (invalidTokens.size > 0) {
    const { error: deleteError } = await admin
      .from("device_tokens")
      .delete()
      .in("token", [...invalidTokens]);
    if (deleteError) {
      console.error("failed to delete invalid tokens", deleteError);
    }
  }

  return new Response(
    JSON.stringify({
      processed: notifications.length,
      delivered,
      skipped,
      invalidTokensRemoved: invalidTokens.size,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
