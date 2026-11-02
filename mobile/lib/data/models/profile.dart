/// A citizen's profile, mapped from the `profiles` table.
class Profile {
  const Profile({
    required this.id,
    required this.authUserId,
    required this.name,
    this.email,
    this.phone,
    this.avatarUrl,
    this.city,
    this.ward,
    this.notifyPush = true,
    this.notifyEmail = true,
    this.notifyInApp = true,
    this.privacyShowLeaderboard = true,
    this.privacyShowWard = true,
    this.profileVisibility = 'public',
    this.showNameOnVerifications = true,
    this.shareAadhaarWithOfficials = false,
    this.preferredLanguage,
    this.preferredRegion,
    this.sharePreciseLocation = true,
    this.locationPrecision = 'exact',
    this.shareLocationWithOfficials = true,
    this.includeLocationOnComplaints = true,
    this.deletionRequestedAt,
    this.gender,
    this.points = 0,
    this.level = 1,
  });

  final String id;
  final String authUserId;
  final String name;
  final String? email;
  final String? phone;
  final String? avatarUrl;

  /// Optional location shown on the citizen's own profile (step 16 columns).
  final String? city;
  final String? ward;

  /// Notification preferences (step 16 columns; default to opted-in).
  final bool notifyPush;
  final bool notifyEmail;
  final bool notifyInApp;

  /// Privacy settings (step 16 columns; default to visible).
  final bool privacyShowLeaderboard;
  final bool privacyShowWard;

  /// Profile visibility: 'public' | 'verified_users' | 'officials_only' | 'private'.
  final String profileVisibility;
  final bool showNameOnVerifications;

  /// Aadhaar sharing opt-in (default false — citizen must explicitly opt in).
  final bool shareAadhaarWithOfficials;

  /// Language & region preferences.
  final String? preferredLanguage;
  final String? preferredRegion;

  /// Location sharing controls.
  final bool sharePreciseLocation;
  final String locationPrecision; // 'exact' | 'block' | 'ward' | 'city'
  final bool shareLocationWithOfficials;
  final bool includeLocationOnComplaints;

  /// Account deletion grace period (NULL if no deletion requested).
  final String? deletionRequestedAt;

  /// User gender: 'female' | 'male' | 'other' | 'prefer_not_to_say' | null.
  /// Used for Women Safety SOS eligibility (female only). Never exposed in
  /// public views, complaint feeds, or leaderboards.
  final String? gender;

  final int points;
  final int level;

  /// Returns a copy with the given fields replaced.
  ///
  /// Intentionally omits `points` / `level`: those are server-managed only
  /// (protected by the `profiles_protect_reputation` trigger) and must never
  /// be written from the client.
  Profile copyWith({
    String? name,
    String? phone,
    String? avatarUrl,
    String? city,
    String? ward,
    bool? notifyPush,
    bool? notifyEmail,
    bool? notifyInApp,
    bool? privacyShowLeaderboard,
    bool? privacyShowWard,
    String? profileVisibility,
    bool? showNameOnVerifications,
    bool? shareAadhaarWithOfficials,
    String? preferredLanguage,
    String? preferredRegion,
    bool? sharePreciseLocation,
    String? locationPrecision,
    bool? shareLocationWithOfficials,
    bool? includeLocationOnComplaints,
    String? gender,
  }) {
    return Profile(
      id: id,
      authUserId: authUserId,
      name: name ?? this.name,
      email: email,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      city: city ?? this.city,
      ward: ward ?? this.ward,
      notifyPush: notifyPush ?? this.notifyPush,
      notifyEmail: notifyEmail ?? this.notifyEmail,
      notifyInApp: notifyInApp ?? this.notifyInApp,
      privacyShowLeaderboard: privacyShowLeaderboard ?? this.privacyShowLeaderboard,
      privacyShowWard: privacyShowWard ?? this.privacyShowWard,
      profileVisibility: profileVisibility ?? this.profileVisibility,
      showNameOnVerifications: showNameOnVerifications ?? this.showNameOnVerifications,
      shareAadhaarWithOfficials: shareAadhaarWithOfficials ?? this.shareAadhaarWithOfficials,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      preferredRegion: preferredRegion ?? this.preferredRegion,
      sharePreciseLocation: sharePreciseLocation ?? this.sharePreciseLocation,
      locationPrecision: locationPrecision ?? this.locationPrecision,
      shareLocationWithOfficials: shareLocationWithOfficials ?? this.shareLocationWithOfficials,
      includeLocationOnComplaints: includeLocationOnComplaints ?? this.includeLocationOnComplaints,
      deletionRequestedAt: deletionRequestedAt,
      gender: gender ?? this.gender,
      points: points,
      level: level,
    );
  }

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      id: json['id'] as String,
      authUserId: json['auth_user_id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      city: json['city'] as String?,
      ward: json['ward'] as String?,
      notifyPush: json['notify_push'] as bool? ?? true,
      notifyEmail: json['notify_email'] as bool? ?? true,
      notifyInApp: json['notify_in_app'] as bool? ?? true,
      privacyShowLeaderboard: json['privacy_show_leaderboard'] as bool? ?? true,
      privacyShowWard: json['privacy_show_ward'] as bool? ?? true,
      profileVisibility: json['profile_visibility'] as String? ?? 'public',
      showNameOnVerifications: json['show_name_on_verifications'] as bool? ?? true,
      shareAadhaarWithOfficials: json['share_aadhaar_with_officials'] as bool? ?? false,
      preferredLanguage: json['preferred_language'] as String?,
      preferredRegion: json['preferred_region'] as String?,
      sharePreciseLocation: json['share_precise_location'] as bool? ?? true,
      locationPrecision: json['location_precision'] as String? ?? 'exact',
      shareLocationWithOfficials: json['share_location_with_officials'] as bool? ?? true,
      includeLocationOnComplaints: json['include_location_on_complaints'] as bool? ?? true,
      deletionRequestedAt: json['deletion_requested_at'] as String?,
      gender: json['gender'] as String?,
      points: (json['points'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 1,
    );
  }
}
