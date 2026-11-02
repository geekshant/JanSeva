/// Application-wide constants for JanMitra.
class AppConstants {
  AppConstants._();

  static const String appName = 'JanMitra';
  static const String appTagline = 'Report karo. Sudhaar lao. Saath badho.';
  static const String appVersion = '0.1.0';

  /// Supabase storage buckets (used later by the uploads feature).
  static const String complaintImagesBucket = 'complaint_images';

  /// Public bucket for profile photos uploaded from Edit Profile.
  static const String avatarsBucket = 'avatars';

  /// Maximum number of photos per complaint.
  static const int maxComplaintPhotos = 5;

  /// Maximum photo file size in bytes (10 MB, matching the storage bucket).
  static const int maxPhotoBytes = 10 * 1024 * 1024;

  /// Default page size for paginated list endpoints.
  static const int defaultPageSize = 20;

  /// Duration the splash screen is shown before navigating.
  static const Duration defaultSplashDuration = Duration(seconds: 2);

  /// Authentication is always enabled. The app requires a real sign-in via
  /// Supabase Auth; there is no demo/bypass account.
  static const bool enableAuth = true;
}
