/// A generic result type used across repositories and use cases.
///
/// Returning `Result<T>` from data layers keeps error handling explicit and
/// type-safe at call sites, instead of throwing exceptions across boundaries.
sealed class Result<T> {
  const Result();

  factory Result.success(T data) = Success<T>;
  factory Result.failure(Failure failure) = FailureResult<T>;

  bool get isSuccess => this is Success<T>;
  bool get isFailure => this is FailureResult<T>;

  T? get dataOrNull => switch (this) {
        Success<T> s => s.data,
        FailureResult<T> _ => null,
      };

  Failure? get failureOrNull => switch (this) {
        Success<T> _ => null,
        FailureResult<T> f => f.failure,
      };

  /// Pattern-matches the result, like `Either.fold`.
  R when<R>({
    required R Function(T data) success,
    required R Function(Failure failure) failure,
  }) => switch (this) {
        Success<T> s => success(s.data),
        FailureResult<T> f => failure(f.failure),
      };
}

/// Successful outcome carrying [data].
final class Success<T> extends Result<T> {
  const Success(this.data);
  final T data;
}

/// Failed outcome carrying a [Failure] description.
final class FailureResult<T> extends Result<T> {
  const FailureResult(this.failure);
  final Failure failure;
}

/// A user-facing, serializable description of something that went wrong.
class Failure {
  const Failure({
    required this.message,
    this.code,
    this.exception,
  });

  final String message;
  final int? code;
  final Object? exception;

  factory Failure.fromException(Object error) {
    if (error is Failure) return error;
    return Failure(message: error.toString(), exception: error);
  }

  factory Failure.network() =>
      const Failure(message: 'Network error. Please check your connection.');

  factory Failure.unknown([String? message]) => Failure(
        message: message ?? 'Something went wrong. Please try again.',
      );
}
