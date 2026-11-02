import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_logger.dart';
import '../../data/repositories/repository_providers.dart';
import '../../data/services/supabase_service.dart';

/// Whether the current authenticated user is eligible for Women Safety
/// features (profile gender is 'female').
///
/// This is a client-side cache of the server's `is_women_safety_eligible()`
/// check. The server-side RPCs and RLS policies are the authoritative
/// enforcement layer; this provider only controls UI visibility.
///
/// Returns `false` when the profile cannot be loaded (not signed in, network
/// error, etc.) — fail-closed so a restricted user never sees the SOS UI.
///
/// `.autoDispose` so the result is re-fetched when the home/profile screen
/// is rebuilt after a login (instead of keeping a stale `false` from before
/// the session started).
///
/// Falls back to the Supabase Auth user metadata (`raw_user_meta_data`) when
/// `profiles.gender` is NULL. This covers users who registered with a gender
/// selection but whose profile row predates the `gender` column (migration
/// 17) or was created before the trigger stored it.
final womenSafetyEligibilityProvider = FutureProvider.autoDispose<bool>((ref) async {
  final repo = ref.watch(profileRepositoryProvider);
  final result = await repo.fetchCurrentProfile();
  if (!result.isSuccess) {
    AppLogger.warning(
      'womenSafetyEligibility: profile fetch failed — '
      '${result.failureOrNull?.message}',
    );
    return false;
  }
  final profile = result.dataOrNull!;

  // Primary source: the profiles.gender column (set by the handle_new_user
  // trigger on signup, or by the Edit Profile screen).
  if (profile.gender != null) {
    final eligible = profile.gender == 'female';
    AppLogger.info(
      'womenSafetyEligibility: profiles.gender="${profile.gender}" → eligible=$eligible',
    );
    return eligible;
  }

  // Fallback: check the auth user metadata. The signUp call stores gender in
  // raw_user_meta_data, which is available client-side via currentUser.
  final user = SupabaseService.client.auth.currentUser;
  final metadataGender = user?.userMetadata?['gender'] as String?;
  if (metadataGender != null) {
    final eligible = metadataGender == 'female';
    AppLogger.info(
      'womenSafetyEligibility: profiles.gender=NULL, '
      'metadata.gender="$metadataGender" → eligible=$eligible',
    );
    return eligible;
  }

  AppLogger.info(
    'womenSafetyEligibility: gender is NULL in both profile and metadata → not eligible',
  );
  return false;
});
