import 'dart:io' show File;
import 'dart:typed_data';

import 'package:cross_file/cross_file.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

/// Displays an [XFile] image across platforms.
///
/// On web, [XFile.path] is not a valid file path, so the bytes are read
/// asynchronously and shown via [Image.memory]. On mobile/desktop, [Image.file]
/// is used directly with [File].
class XFileImage extends StatefulWidget {
  const XFileImage({
    super.key,
    required this.file,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
  });

  final XFile file;
  final double? width;
  final double? height;
  final BoxFit fit;

  @override
  State<XFileImage> createState() => _XFileImageState();
}

class _XFileImageState extends State<XFileImage> {
  Future<Uint8List>? _bytesFuture;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      _bytesFuture = widget.file.readAsBytes();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb) {
      return FutureBuilder<Uint8List>(
        future: _bytesFuture,
        builder: (context, snapshot) {
          if (snapshot.hasData) {
            return Image.memory(
              snapshot.data!,
              width: widget.width,
              height: widget.height,
              fit: widget.fit,
            );
          }
          return SizedBox(
            width: widget.width,
            height: widget.height,
            child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          );
        },
      );
    }
    return Image.file(
      File(widget.file.path),
      width: widget.width,
      height: widget.height,
      fit: widget.fit,
    );
  }
}
