import 'package:flutter/material.dart';

import '../../core/i18n/app_localizations.dart';

/// A section of static legal / help content.
class StaticContentSection {
  const StaticContentSection({required this.heading, required this.body});

  final String heading;
  final String body;
}

/// Renders Help & Support, Privacy Policy and Terms & Conditions content.
class StaticContentScreen extends StatelessWidget {
  const StaticContentScreen({
    super.key,
    required this.title,
    required this.sections,
    this.intro,
  });

  final String title;
  final String? intro;
  final List<StaticContentSection> sections;

  // --- Content factories used by the router ---------------------------------

  static StaticContentScreen helpAndSupport() => const StaticContentScreen(
    title: 'help.title',
    intro: 'help.intro',
    sections: [
      StaticContentSection(
        heading: 'help.q.report',
        body: 'help.a.report',
      ),
      StaticContentSection(
        heading: 'help.q.points',
        body: 'help.a.points',
      ),
      StaticContentSection(
        heading: 'help.q.rejected',
        body: 'help.a.rejected',
      ),
      StaticContentSection(
        heading: 'help.q.contact',
        body: 'help.a.contact',
      ),
    ],
  );

  static StaticContentScreen privacyPolicy() => const StaticContentScreen(
    title: 'privacy.title',
    intro: 'privacy.intro',
    sections: [
      StaticContentSection(
        heading: 'privacy.h.collect',
        body: 'privacy.b.collect',
      ),
      StaticContentSection(
        heading: 'privacy.h.use',
        body: 'privacy.b.use',
      ),
      StaticContentSection(
        heading: 'privacy.h.location',
        body: 'privacy.b.location',
      ),
      StaticContentSection(
        heading: 'privacy.h.retention',
        body: 'privacy.b.retention',
      ),
      StaticContentSection(
        heading: 'privacy.h.rights',
        body: 'privacy.b.rights',
      ),
      StaticContentSection(
        heading: 'privacy.h.changes',
        body: 'privacy.b.changes',
      ),
    ],
  );

  static StaticContentScreen termsAndConditions() => const StaticContentScreen(
    title: 'terms.title',
    intro: 'terms.intro',
    sections: [
      StaticContentSection(
        heading: 'terms.h.use',
        body: 'terms.b.use',
      ),
      StaticContentSection(
        heading: 'terms.h.moderation',
        body: 'terms.b.moderation',
      ),
      StaticContentSection(
        heading: 'terms.h.points',
        body: 'terms.b.points',
      ),
      StaticContentSection(
        heading: 'terms.h.licence',
        body: 'terms.b.licence',
      ),
      StaticContentSection(
        heading: 'terms.h.disclaimer',
        body: 'terms.b.disclaimer',
      ),
      StaticContentSection(
        heading: 'terms.h.contact',
        body: 'terms.b.contact',
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final l = context.tr;

    return Scaffold(
      appBar: AppBar(title: Text(l(title))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            if (intro != null) ...[
              Text(
                l(intro!),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.onSurfaceVariant,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 20),
            ],
            for (final section in sections)
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l(section.heading),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      l(section.body),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        height: 1.5,
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
