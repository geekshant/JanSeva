import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../data/models/profile.dart';
import '../../data/repositories/repository_providers.dart';
import '../../core/i18n/app_localizations.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/app_text_field.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../../core/widgets/xfile_image.dart';
import '../auth/auth_provider.dart';
import '../safety/safety_eligibility_provider.dart';
import 'current_profile_provider.dart';
import 'profile_dashboard_provider.dart';

/// Form for editing the citizen's **name**, **phone**, **city / ward** and
/// **profile photo**.
///
/// Security: only those columns are ever sent to Supabase. Points, level,
/// verified-report counts, e-mail and reward history are server-managed and
/// cannot be edited here (blocked by RLS + the `profiles_protect_reputation`
/// trigger even if a malicious client tried).
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _cityController = TextEditingController();
  final _wardController = TextEditingController();

  XFile? _pickedPhoto;
  String? _currentAvatarUrl;
  String? _originalAvatarUrl;
  String? _selectedGender;
  bool _isSaving = false;
  bool _seeded = false;

  static const _genderOptions = <String>['female', 'male', 'other', 'prefer_not_to_say'];

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _wardController.dispose();
    super.dispose();
  }

  void _seedFromProfile(Profile profile) {
    if (_seeded) return;
    _seeded = true;
    _nameController.text = profile.name;
    _phoneController.text = profile.phone ?? '';
    _cityController.text = profile.city ?? '';
    _wardController.text = profile.ward ?? '';
    _currentAvatarUrl = profile.avatarUrl;
    _originalAvatarUrl = profile.avatarUrl;
    _selectedGender = profile.gender;
  }

  Future<void> _pickPhoto() async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                sheetContext.tr('profile.edit.changePhotoSheet'),
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded),
              title: Text(sheetContext.tr('profile.edit.chooseGallery')),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_rounded),
              title: Text(sheetContext.tr('profile.edit.takePhoto')),
              onTap: () => Navigator.of(sheetContext).pop(ImageSource.camera),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (source == null) return;

    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: source,
      imageQuality: 75,
      maxWidth: 1024,
      maxHeight: 1024,
    );
    if (image == null) return;
    if (!_isSupportedImage(image)) {
      if (!mounted) return;
      _showError(AppLocalizations.translate('profile.edit.invalidImage'));
      return;
    }
    setState(() => _pickedPhoto = image);
  }

  static bool _isSupportedImage(XFile file) {
    final ext = file.name.split('.').last.toLowerCase();
    return const {'jpg', 'jpeg', 'png', 'webp'}.contains(ext);
  }

  Future<void> _save() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();

    setState(() => _isSaving = true);

    final authRepo = ref.read(authRepositoryProvider);
    final storageRepo = ref.read(storageRepositoryProvider);
    final profileRepo = ref.read(profileRepositoryProvider);

    final userId = authRepo.currentUserId;
    if (userId == null) {
      setState(() => _isSaving = false);
      _showError(AppLocalizations.translate('profile.edit.notSignedIn'));
      return;
    }

    // 1) Upload new photo first (if chosen) so we never save a profile
    //    pointing at a missing image.
    String? avatarUrl = _currentAvatarUrl;
    String? uploadedPath;
    if (_pickedPhoto != null) {
      final upload = await storageRepo.uploadAvatar(_pickedPhoto!, userId);
      final uploaded = upload.dataOrNull;
      if (uploaded == null) {
        if (!mounted) return;
        setState(() => _isSaving = false);
        _showError(AppLocalizations.translate(
            upload.failureOrNull?.message ?? 'profile.edit.uploadFailed'));
        return;
      }
      avatarUrl = uploaded.url;
      uploadedPath = uploaded.path;
    }

    // 2) Whitelist update: ONLY name / phone / avatar / city / ward go to
    //    the server.
    final hasNewAvatar = avatarUrl != null && avatarUrl != _originalAvatarUrl;
    final result = await profileRepo.updateProfile(
      name: name,
      phone: phone.isEmpty ? null : phone,
      avatarUrl: hasNewAvatar ? avatarUrl : null,
      city: _cityController.text,
      ward: _wardController.text,
      gender: _selectedGender,
    );

    if (!mounted) return;
    setState(() => _isSaving = false);

    if (result.isFailure) {
      // Clean up the orphaned upload so storage doesn't accumulate junk.
      if (uploadedPath != null) {
        await storageRepo.deleteAvatar(uploadedPath);
      }
      _showError(AppLocalizations.translate(result.failureOrNull!.message));
      return;
    }

    // 3) Refresh cached providers that surface profile data.
    ref
      ..invalidate(profileDashboardProvider)
      ..invalidate(currentProfileIdProvider)
      ..invalidate(womenSafetyEligibilityProvider);

    if (!mounted) return;
    context.pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.translate('profile.edit.updated'))),
    );
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final dashboardAsync = ref.watch(profileDashboardProvider);

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('profile.edit.title'))),
      body: SafeArea(
        child: dashboardAsync.when(
          data: (data) {
            _seedFromProfile(data.profile);
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          _buildAvatar(colors),
                          Positioned(
                            right: 0,
                            bottom: 0,
                            child: Material(
                              color: colors.primary,
                              shape: const CircleBorder(),
                              elevation: 2,
                              child: InkWell(
                                key: const Key('changePhotoButton'),
                                customBorder: const CircleBorder(),
                                onTap: _pickPhoto,
                                child: const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Icon(
                                    Icons.camera_alt_rounded,
                                    size: 18,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton.icon(
                      onPressed: _pickPhoto,
                      icon: const Icon(Icons.photo_camera_outlined, size: 18),
                      label: Text(context.tr('profile.edit.changePhoto')),
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      label: context.tr('profile.edit.fullName'),
                      hint: context.tr('profile.edit.fullNameHint'),
                      controller: _nameController,
                      prefixIcon: Icons.person_outline_rounded,
                      validator: (value) {
                        final v = value?.trim() ?? '';
                        if (v.isEmpty) return context.tr('profile.edit.nameRequired');
                        if (v.length < 2) return context.tr('profile.edit.nameShort');
                        if (v.length > 80) return context.tr('profile.edit.nameLong');
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      label: context.tr('profile.edit.phone'),
                      hint: context.tr('profile.edit.phoneHint'),
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      prefixIcon: Icons.phone_outlined,
                      validator: (value) {
                        final v = value?.trim() ?? '';
                        if (v.isEmpty) return null;
                        final digits = v.replaceAll(RegExp(r'[^\d]'), '');
                        if (digits.length < 10 || digits.length > 15) {
                          return context.tr('profile.edit.phoneInvalid');
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      label: context.tr('profile.edit.city'),
                      hint: context.tr('profile.edit.cityHint'),
                      controller: _cityController,
                      prefixIcon: Icons.location_city_outlined,
                    ),
                    const SizedBox(height: 16),
                    AppTextField(
                      label: context.tr('profile.edit.ward'),
                      hint: context.tr('profile.edit.wardHint'),
                      controller: _wardController,
                      prefixIcon: Icons.map_outlined,
                    ),
                    const SizedBox(height: 16),
                    // --- Gender (for Women Safety eligibility) ---
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        context.tr('gender.label'),
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(
                          context.tr('profile.genderPrivate'),
                          style: theme.textTheme.bodySmall?.copyWith(color: colors.onSurfaceVariant),
                        ),
                      ),
                    ),
                    ..._genderOptions.map((value) {
                      final isSelected = _selectedGender == value;
                      final labelKey = 'gender.${value == 'prefer_not_to_say' ? 'preferNotToSay' : value}';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: InkWell(
                          onTap: () => setState(() => _selectedGender = value),
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: isSelected ? colors.primary : colors.outline,
                                width: isSelected ? 2 : 1,
                              ),
                              borderRadius: BorderRadius.circular(12),
                              color: isSelected ? colors.primaryContainer : Colors.transparent,
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
                                  color: isSelected ? colors.primary : colors.outline,
                                  size: 22,
                                ),
                                const SizedBox(width: 12),
                                Expanded(child: Text(context.tr(labelKey), style: theme.textTheme.bodyMedium)),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: colors.surfaceContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.lock_outline_rounded,
                            size: 18,
                            color: colors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              context.tr('profile.edit.lockedNote'),
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: colors.onSurfaceVariant,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    AppButton(
                      label: context.tr('profile.edit.save'),
                      icon: Icons.save_rounded,
                      isExpanded: true,
                      isLoading: _isSaving,
                      onPressed: _save,
                    ),
                    const SizedBox(height: 12),
                    AppButton(
                      label: context.tr('common.cancel'),
                      variant: AppButtonVariant.text,
                      isExpanded: true,
                      onPressed: _isSaving ? null : () => context.pop(),
                    ),
                  ],
                ),
              ),
            );
          },
          loading: () =>
              LoadingView(message: context.tr('profile.edit.loading')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () => ref.invalidate(profileDashboardProvider),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(ColorScheme colors) {
    if (_pickedPhoto != null) {
      return ClipOval(
        child: XFileImage(file: _pickedPhoto!, width: 112, height: 112),
      );
    }
    final url = _currentAvatarUrl;
    if (url == null || url.isEmpty) {
      return CircleAvatar(
        radius: 56,
        backgroundColor: colors.primaryContainer,
        child: Icon(
          Icons.person_rounded,
          size: 56,
          color: colors.onPrimaryContainer,
        ),
      );
    }
    return CircleAvatar(
      radius: 56,
      backgroundColor: colors.primaryContainer,
      backgroundImage: CachedNetworkImageProvider(url),
      onBackgroundImageError: (_, _) {},
      child: Icon(
        Icons.person_rounded,
        size: 56,
        color: colors.onPrimaryContainer,
      ),
    );
  }
}
