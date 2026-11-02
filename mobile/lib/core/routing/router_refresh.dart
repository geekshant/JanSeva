import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Notified when async gate state changes so GoRouter re-runs its redirect
/// **in place**.
///
/// Recreating the router instead would reset navigation to `initialLocation`
/// and visibly bounce the citizen back through the splash route every time the
/// Aadhaar registration status resolves.
class RouterRefresh extends ChangeNotifier {
  void notify() => notifyListeners();
}

/// App-wide refresh signal for the router's redirect.
final routerRefreshProvider = Provider<RouterRefresh>((ref) {
  final refresh = RouterRefresh();
  ref.onDispose(refresh.dispose);
  return refresh;
});
