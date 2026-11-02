import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../models/category.dart';
import '../models/category_ai_config.dart';

/// Fetches civic issue categories from the database.
class CategoryRepository {
  CategoryRepository();

  SupabaseClient get _client => SupabaseService.client;

  /// Returns all active categories, ordered by name.
  Future<Result<List<Category>>> fetchCategories() async {
    try {
      final data = await _client
          .from('categories')
          .select()
          .eq('active', true)
          .order('name', ascending: true);

      final categories = (data as List)
          .map((e) => Category.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(categories);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Returns all active categories joined with their AI evidence-verification
  /// config (from the `category_ai_config` table). Categories without a config
  /// row receive a `null` [CategoryAiConfig].
  Future<Result<List<CategoryWithAiConfig>>> fetchCategoriesWithAiConfig() async {
    try {
      final data = await _client
          .from('categories')
          .select('*, category_ai_config(*)')
          .eq('active', true)
          .order('name', ascending: true);

      final rows = (data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      final result = rows.map((row) {
        final category = Category.fromJson(row);
        CategoryAiConfig? config;
        final configData = row['category_ai_config'];
        if (configData is List && configData.isNotEmpty) {
          config = CategoryAiConfig.fromJson(
            configData.first as Map<String, dynamic>,
          );
        }
        return CategoryWithAiConfig(category: category, aiConfig: config);
      }).toList();
      return Result.success(result);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }
}
