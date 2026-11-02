import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/primary_button.dart';

/// Shared-preferences key tracking whether onboarding has been seen.
const _kOnboardingSeen = 'janmitra_onboarding_seen';

/// First-launch onboarding flow: three pages introducing the citizen app's
/// core capabilities (report, track, contribute). Shown once; the "Get
/// started" action persists a flag so it never appears again.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _controller = PageController();
  int _currentPage = 0;

  static const _pages = <_OnboardingPage>[
    _OnboardingPage(
      icon: Icons.report_rounded,
      titleKey: 'onboarding.page1.title',
      descKey: 'onboarding.page1.desc',
    ),
    _OnboardingPage(
      icon: Icons.track_changes_rounded,
      titleKey: 'onboarding.page2.title',
      descKey: 'onboarding.page2.desc',
    ),
    _OnboardingPage(
      icon: Icons.emoji_events_rounded,
      titleKey: 'onboarding.page3.title',
      descKey: 'onboarding.page3.desc',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kOnboardingSeen, true);
    if (!mounted) return;
    context.go(AppRoutes.login);
  }

  void _next() {
    if (_currentPage < _pages.length - 1) {
      _controller.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: _finish,
                child: Text(context.tr('common.skip')),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _pages.length,
                onPageChanged: (page) =>
                    setState(() => _currentPage = page),
                itemBuilder: (context, index) => _pages[index],
              ),
            ),
            Padding(
              padding: AppSpacing.pagePadding,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_pages.length, (i) {
                      final active = i == _currentPage;
                      return Container(
                        width: active ? 24 : 8,
                        height: 8,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          color: active ? colors.primary : colors.outlineVariant,
                          borderRadius: AppRadius.rPill,
                        ),
                      );
                    }),
                  ),
                  AppSpacing.hXL,
                  PrimaryButton(
                    label: _currentPage < _pages.length - 1
                        ? context.tr('common.next')
                        : context.tr('common.getStarted'),
                    onPressed: _next,
                  ),
                  AppSpacing.hMD,
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({
    required this.icon,
    required this.titleKey,
    required this.descKey,
  });

  final IconData icon;
  final String titleKey;
  final String descKey;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: const BoxDecoration(
              gradient: AppColors.brandGradient,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 56, color: Colors.white),
          ),
          AppSpacing.hXXL,
          Text(
            context.tr(titleKey),
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
            textAlign: TextAlign.center,
          ),
          AppSpacing.hMD,
          Text(
            context.tr(descKey),
            style: theme.textTheme.bodyLarge?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// Checks whether onboarding has been shown before (without blocking the
/// caller). Returns `true` if the user has NOT seen onboarding yet.
Future<bool> shouldShowOnboarding() async {
  final prefs = await SharedPreferences.getInstance();
  return !(prefs.getBool(_kOnboardingSeen) ?? false);
}
