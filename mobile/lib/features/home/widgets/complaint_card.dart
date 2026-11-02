import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../data/models/complaint.dart';
import '../../../core/widgets/status_badge.dart';

/// A card showing a single recent complaint: thumbnail, category, title,
/// date and status chip.
class ComplaintCard extends StatelessWidget {
  const ComplaintCard({super.key, required this.complaint});

  final Complaint complaint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Thumbnail(url: complaint.thumbnailUrl),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (complaint.category != null)
                    Text(
                      complaint.category!.name,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    complaint.title,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.calendar_today_outlined,
                          size: 14, color: colors.onSurfaceVariant),
                      const SizedBox(width: 4),
                      Text(
                        complaint.formattedDate,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  StatusBadge(status: complaint.status),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Thumbnail extends StatelessWidget {
  const _Thumbnail({this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    if (url == null || url!.isEmpty) {
      return Container(
        width: 92,
        height: 110,
        color: colors.surfaceContainerHighest,
        child: Icon(Icons.image_outlined, color: colors.onSurfaceVariant),
      );
    }
    return CachedNetworkImage(
      imageUrl: url!,
      width: 92,
      height: 110,
      fit: BoxFit.cover,
      placeholder: (context, url) => Container(
        color: colors.surfaceContainerHighest,
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
      errorWidget: (context, url, error) => Container(
        color: colors.surfaceContainerHighest,
        child: Icon(Icons.broken_image_outlined, color: colors.onSurfaceVariant),
      ),
    );
  }
}
