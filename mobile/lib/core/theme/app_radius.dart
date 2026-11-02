import 'package:flutter/material.dart';

/// Corner-radius tokens for JanMitra.
///
/// Use these instead of raw `BorderRadius.circular(...)` so radii stay
/// uniform across the app. Re-exported by `app_spacing.dart` for backwards
/// compatibility with code that imports spacing tokens only.
class AppRadius {
  AppRadius._();

  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 28;
  static const double pill = 100;

  static const BorderRadius rSM = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius rMD = BorderRadius.all(Radius.circular(md));
  static const BorderRadius rLG = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius rXL = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius rXXL = BorderRadius.all(Radius.circular(xxl));
  static const BorderRadius rPill = BorderRadius.all(Radius.circular(pill));
}
