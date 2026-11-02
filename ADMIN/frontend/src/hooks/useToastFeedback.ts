import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Mutation toast helpers — provide consistent success/error feedback for
// all admin mutations. Centralized so wording stays uniform.
// ---------------------------------------------------------------------------

export function toastSuccess(message: string, description?: string) {
  toast.success(message, description ? { description } : undefined);
}

export function toastError(message: string, description?: string) {
  toast.error(message, description ? { description } : undefined);
}

/** Extracts a user-friendly message from a thrown error. */
export function errMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

/** Wraps a mutation's onSuccess to fire a success toast. */
export function withSuccessToast<TData, TVariables>(
  message: string,
  description?: string,
) {
  return {
    onSuccess: (_data: TData, _vars: TVariables) => {
      toastSuccess(message, description);
    },
  };
}
