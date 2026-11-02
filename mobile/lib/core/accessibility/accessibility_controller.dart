import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// SharedPreferences keys for accessibility settings (device-local — these
/// don't sync across devices since they're device-specific display prefs).
const _kFontScaleKey = 'janmitra_font_scale';
const _kHighContrastKey = 'janmitra_high_contrast';
const _kReduceMotionKey = 'janmitra_reduce_motion';
const _kScreenReaderHintsKey = 'janmitra_screen_reader_hints';
const _kLargerTouchTargetsKey = 'janmitra_larger_touch_targets';

/// Default values.
const double kDefaultFontScale = 1.0;

/// Initial accessibility state used before persisted prefs load. Overridden
/// in [main] with saved values.
final initialAccessibilityProvider = Provider<AccessibilityState>((ref) {
  return const AccessibilityState();
});

/// Current accessibility state, persisted to SharedPreferences.
final accessibilityProvider =
    NotifierProvider<AccessibilityController, AccessibilityState>(
  AccessibilityController.new,
);

/// Immutable snapshot of all accessibility settings.
class AccessibilityState {
  const AccessibilityState({
    this.fontScale = kDefaultFontScale,
    this.highContrast = false,
    this.reduceMotion = false,
    this.screenReaderHints = false,
    this.largerTouchTargets = false,
  });

  final double fontScale;
  final bool highContrast;
  final bool reduceMotion;
  final bool screenReaderHints;
  final bool largerTouchTargets;

  AccessibilityState copyWith({
    double? fontScale,
    bool? highContrast,
    bool? reduceMotion,
    bool? screenReaderHints,
    bool? largerTouchTargets,
  }) {
    return AccessibilityState(
      fontScale: fontScale ?? this.fontScale,
      highContrast: highContrast ?? this.highContrast,
      reduceMotion: reduceMotion ?? this.reduceMotion,
      screenReaderHints: screenReaderHints ?? this.screenReaderHints,
      largerTouchTargets: largerTouchTargets ?? this.largerTouchTargets,
    );
  }
}

class AccessibilityController extends Notifier<AccessibilityState> {
  @override
  AccessibilityState build() => ref.watch(initialAccessibilityProvider);

  Future<void> setFontScale(double scale) async {
    state = state.copyWith(fontScale: scale);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_kFontScaleKey, scale);
  }

  Future<void> toggleHighContrast() async {
    state = state.copyWith(highContrast: !state.highContrast);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kHighContrastKey, state.highContrast);
  }

  Future<void> toggleReduceMotion() async {
    state = state.copyWith(reduceMotion: !state.reduceMotion);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kReduceMotionKey, state.reduceMotion);
  }

  Future<void> toggleScreenReaderHints() async {
    state = state.copyWith(screenReaderHints: !state.screenReaderHints);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kScreenReaderHintsKey, state.screenReaderHints);
  }

  Future<void> toggleLargerTouchTargets() async {
    state = state.copyWith(largerTouchTargets: !state.largerTouchTargets);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kLargerTouchTargetsKey, state.largerTouchTargets);
  }
}

/// Loads persisted accessibility prefs before the app starts. Called from
/// [main] alongside [loadSavedLocale].
Future<AccessibilityState> loadSavedAccessibility() async {
  final prefs = await SharedPreferences.getInstance();
  return AccessibilityState(
    fontScale: prefs.getDouble(_kFontScaleKey) ?? kDefaultFontScale,
    highContrast: prefs.getBool(_kHighContrastKey) ?? false,
    reduceMotion: prefs.getBool(_kReduceMotionKey) ?? false,
    screenReaderHints: prefs.getBool(_kScreenReaderHintsKey) ?? false,
    largerTouchTargets: prefs.getBool(_kLargerTouchTargetsKey) ?? false,
  );
}
