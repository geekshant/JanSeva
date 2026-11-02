import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/widgets/empty_view.dart';

void main() {
  testWidgets('EmptyView renders its title and message', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: const Scaffold(
          body: EmptyView(
            icon: Icons.inbox_outlined,
            title: 'Nothing here',
            message: 'Try reporting an issue',
          ),
        ),
      ),
    );

    expect(find.text('Nothing here'), findsOneWidget);
    expect(find.text('Try reporting an issue'), findsOneWidget);
    expect(find.byIcon(Icons.inbox_outlined), findsOneWidget);
  });

  testWidgets('EmptyView shows an action when provided', (tester) async {
    var tapped = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: EmptyView(
            icon: Icons.inbox_outlined,
            title: 'Empty',
            actionLabel: 'Report now',
            onAction: () => tapped = true,
          ),
        ),
      ),
    );

    final actionButton = find.text('Report now');
    expect(actionButton, findsOneWidget);

    await tester.tap(actionButton);
    await tester.pump();

    expect(tapped, isTrue);
  });
}
