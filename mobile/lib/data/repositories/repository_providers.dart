import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'aadhaar_kyc_repository.dart';
import 'category_repository.dart';
import 'complaint_repository.dart';
import 'notification_repository.dart';
import 'privacy_settings_repository.dart';
import 'profile_repository.dart';
import 'rewards_repository.dart';
import 'safety_repository.dart';
import 'storage_repository.dart';
import 'verification_repository.dart';

/// Repository singletons, available app-wide.
final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository();
});

final complaintRepositoryProvider = Provider<ComplaintRepository>((ref) {
  return ComplaintRepository();
});

final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  return CategoryRepository();
});

final storageRepositoryProvider = Provider<StorageRepository>((ref) {
  return StorageRepository();
});

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository();
});

final rewardsRepositoryProvider = Provider<RewardsRepository>((ref) {
  return RewardsRepository();
});

final verificationRepositoryProvider = Provider<VerificationRepository>((ref) {
  return VerificationRepository();
});

/// Aadhaar registration (the identity gate applied after sign-in).
final aadhaarKycRepositoryProvider = Provider<AadhaarKycRepository>((ref) {
  return AadhaarKycRepository();
});

/// Privacy & Settings repository — handles all privacy, accessibility,
/// notification, and account-control operations.
final privacySettingsRepositoryProvider = Provider<PrivacySettingsRepository>((ref) {
  return PrivacySettingsRepository();
});

/// Safety repository — handles SOS, contacts, check-ins, nearby places.
final safetyRepositoryProvider = Provider<SafetyRepository>((ref) {
  return SafetyRepository();
});
