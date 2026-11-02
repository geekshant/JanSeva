import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/safety_models.dart';
import '../../data/repositories/repository_providers.dart';

/// Trusted contacts management — add up to 3 contacts that are notified
/// when SOS is activated.
class SafetyContactsScreen extends ConsumerStatefulWidget {
  const SafetyContactsScreen({super.key});

  @override
  ConsumerState<SafetyContactsScreen> createState() => _SafetyContactsScreenState();
}

class _SafetyContactsScreenState extends ConsumerState<SafetyContactsScreen> {
  @override
  Widget build(BuildContext context) {
    final l = context.tr;
    return Scaffold(
      appBar: AppBar(title: Text(l('safety.contacts'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
          children: [
            Text(l('safety.contactsDesc'), style: Theme.of(context).textTheme.bodyMedium),
            AppSpacing.hSM,
            Text(l('safety.contactsMax'), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            AppSpacing.hLG,
            _buildContactsList(context, l),
            AppSpacing.hLG,
            _buildAddButton(context, l),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Add button (hidden when at max capacity)
  // ---------------------------------------------------------------------------
  Widget _buildAddButton(BuildContext context, String Function(String key, {Map<String, dynamic> args}) l) {
    final contactsAsync = ref.watch(_safetyContactsProvider);
    final contactCount = contactsAsync.value?.length ?? 0;

    if (contactCount >= 3) {
      return Card(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary, size: 20),
              AppSpacing.wMD,
              Expanded(child: Text(l('safety.contactsMaxReached'), style: Theme.of(context).textTheme.bodySmall)),
            ],
          ),
        ),
      );
    }

    return FilledButton.icon(
      onPressed: () => _showAddDialog(context, l),
      icon: const Icon(Icons.add),
      label: Text(l('safety.contactsAdd')),
    );
  }

  // ---------------------------------------------------------------------------
  // Contacts list
  // ---------------------------------------------------------------------------
  Widget _buildContactsList(BuildContext context, String Function(String key, {Map<String, dynamic> args}) l) {
    final contactsAsync = ref.watch(_safetyContactsProvider);

    return contactsAsync.when(
      data: (contacts) {
        if (contacts.isEmpty) {
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Icon(Icons.contacts_outlined, size: 48, color: Theme.of(context).colorScheme.outline),
                  AppSpacing.hMD,
                  Text(l('safety.contactsEmpty'), style: Theme.of(context).textTheme.titleSmall),
                  AppSpacing.hSM,
                  Text(
                    l('safety.contactsEmptyDesc'),
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          );
        }
        return Column(
          children: contacts.asMap().entries.map((entry) {
            final index = entry.key + 1;
            final contact = entry.value;
            return Card(
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.blue.withValues(alpha: 0.1),
                  child: Text('$index', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                ),
                title: Text(contact.name, style: Theme.of(context).textTheme.titleSmall),
                subtitle: Text(contact.phone + (contact.relationship != null ? ' · ${contact.relationship}' : '')),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 20),
                      onPressed: () => _showEditDialog(context, l, contact),
                      tooltip: l('safety.contactsEdit'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                      onPressed: () => _deleteContact(context, l, contact),
                      tooltip: l('safety.contactsDelete'),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.all(40),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (err, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 40),
              AppSpacing.hSM,
              Text(_friendlyError(err.toString(), l), textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium),
              AppSpacing.hMD,
              OutlinedButton(
                onPressed: () => ref.invalidate(_safetyContactsProvider),
                child: Text(l('common.retry')),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Add dialog
  // ---------------------------------------------------------------------------
  Future<void> _showAddDialog(BuildContext context, String Function(String key, {Map<String, dynamic> args}) l) async {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final relCtrl = TextEditingController();
    var saving = false;

    await showDialog<bool>(
      context: context,
      barrierDismissible: !saving,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(l('safety.contactsAdd')),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: l('safety.contactsName')),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return l('safety.contactsNameRequired');
                    return null;
                  },
                ),
                AppSpacing.hSM,
                TextFormField(
                  controller: phoneCtrl,
                  decoration: InputDecoration(
                    labelText: l('safety.contactsPhone'),
                    hintText: '9876543210',
                    prefixText: '+91 ',
                  ),
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return l('safety.contactsPhoneRequired');
                    final cleaned = v.replaceAll(RegExp(r'[\s\-()]'), '');
                    if (!RegExp(r'^\d{10}$').hasMatch(cleaned) && !RegExp(r'^\+91\d{10}$').hasMatch(cleaned)) {
                      return l('safety.contactsPhoneInvalid');
                    }
                    return null;
                  },
                ),
                AppSpacing.hSM,
                TextFormField(
                  controller: relCtrl,
                  decoration: InputDecoration(labelText: l('safety.contactsRelationship'), hintText: 'Brother, Sister, Father...'),
                  textCapitalization: TextCapitalization.words,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(ctx, false), child: Text(l('widget.cancel'))),
            FilledButton(
              onPressed: saving ? null : () async {
                if (!formKey.currentState!.validate()) return;
                setDialogState(() => saving = true);

                final res = await ref.read(safetyRepositoryProvider).addContact(
                  name: nameCtrl.text,
                  phone: phoneCtrl.text,
                  relationship: relCtrl.text.isEmpty ? null : relCtrl.text,
                );

                if (!ctx.mounted) return;
                if (res.isFailure) {
                  setDialogState(() => saving = false);
                  _showError(_friendlyError(res.failureOrNull?.message ?? '', l));
                } else {
                  Navigator.pop(ctx, true);
                }
              },
              child: saving
                ? Row(mainAxisSize: MainAxisSize.min, children: [const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)), AppSpacing.wSM, Text(l('safety.contactsSaving'))])
                : Text(l('safety.contactsSave')),
            ),
          ],
        ),
      ),
    );

    ref.invalidate(_safetyContactsProvider);
  }

  // ---------------------------------------------------------------------------
  // Edit dialog
  // ---------------------------------------------------------------------------
  Future<void> _showEditDialog(BuildContext context, String Function(String key, {Map<String, dynamic> args}) l, SafetyContact contact) async {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController(text: contact.name);
    final phoneCtrl = TextEditingController(text: contact.phone.replaceAll('+91 ', ''));
    final relCtrl = TextEditingController(text: contact.relationship ?? '');
    var saving = false;

    await showDialog<bool>(
      context: context,
      barrierDismissible: !saving,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(l('safety.contactsEdit')),
          content: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: nameCtrl,
                  decoration: InputDecoration(labelText: l('safety.contactsName')),
                  textCapitalization: TextCapitalization.words,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return l('safety.contactsNameRequired');
                    return null;
                  },
                ),
                AppSpacing.hSM,
                TextFormField(
                  controller: phoneCtrl,
                  decoration: InputDecoration(labelText: l('safety.contactsPhone'), prefixText: '+91 '),
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return l('safety.contactsPhoneRequired');
                    final cleaned = v.replaceAll(RegExp(r'[\s\-()]'), '');
                    if (!RegExp(r'^\d{10}$').hasMatch(cleaned)) return l('safety.contactsPhoneInvalid');
                    return null;
                  },
                ),
                AppSpacing.hSM,
                TextFormField(
                  controller: relCtrl,
                  decoration: InputDecoration(labelText: l('safety.contactsRelationship')),
                  textCapitalization: TextCapitalization.words,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(ctx, false), child: Text(l('widget.cancel'))),
            FilledButton(
              onPressed: saving ? null : () async {
                if (!formKey.currentState!.validate()) return;
                setDialogState(() => saving = true);

                final res = await ref.read(safetyRepositoryProvider).updateContact(
                  id: contact.id,
                  name: nameCtrl.text,
                  phone: phoneCtrl.text,
                  relationship: relCtrl.text.isEmpty ? null : relCtrl.text,
                );

                if (!ctx.mounted) return;
                if (res.isFailure) {
                  setDialogState(() => saving = false);
                  _showError(_friendlyError(res.failureOrNull?.message ?? '', l));
                } else {
                  Navigator.pop(ctx, true);
                }
              },
              child: saving
                ? Row(mainAxisSize: MainAxisSize.min, children: [const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)), AppSpacing.wSM, Text(l('safety.contactsSaving'))])
                : Text(l('safety.contactsSave')),
            ),
          ],
        ),
      ),
    );

    ref.invalidate(_safetyContactsProvider);
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  Future<void> _deleteContact(BuildContext context, String Function(String key, {Map<String, dynamic> args}) l, SafetyContact contact) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l('safety.contactsDelete')),
        content: Text(l('safety.contactsDeleteConfirmWithName', args: {'name': contact.name})),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l('widget.cancel'))),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l('safety.contactsDelete')),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final res = await ref.read(safetyRepositoryProvider).deleteContact(contact.id);
    if (!mounted) return;
    if (res.isFailure) {
      _showError(_friendlyError(res.failureOrNull?.message ?? '', l));
    } else {
      ref.invalidate(_safetyContactsProvider);
      _showSuccess(l('safety.contactsDeleted'));
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  String _friendlyError(String rawError, String Function(String key, {Map<String, dynamic> args}) l) {
    final lower = rawError.toLowerCase();
    if (lower.contains('not signed in') || lower.contains('unauthenticated') || lower.contains('jwt')) {
      return l('safety.contactsErrorAuth');
    }
    if (lower.contains('already been added') || lower.contains('duplicate')) {
      return l('safety.contactsErrorDuplicate');
    }
    if (lower.contains('up to 3') || lower.contains('maximum')) {
      return l('safety.contactsErrorMax');
    }
    if (lower.contains('network') || lower.contains('connection') || lower.contains('socket') || lower.contains('timeout')) {
      return l('safety.contactsErrorNetwork');
    }
    if (lower.contains('valid') || lower.contains('phone') || lower.contains('name')) {
      return l('safety.contactsErrorValidation');
    }
    return l('safety.contactsErrorGeneric');
  }

  void _showSuccess(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  void _showError(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: Theme.of(context).colorScheme.error),
  );
}

/// Provider that fetches safety contacts.
final _safetyContactsProvider = FutureProvider.autoDispose<List<SafetyContact>>((ref) async {
  final result = await ref.read(safetyRepositoryProvider).fetchContacts();
  if (result.isFailure) throw result.failureOrNull!.message;
  return result.dataOrNull ?? [];
});
