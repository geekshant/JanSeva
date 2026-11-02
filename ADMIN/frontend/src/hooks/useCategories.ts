import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCategories,
  listActiveCategories,
  createCategory,
  updateCategory,
} from '@/services/categories';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import type { CategoryInsert, CategoryUpdate } from '@/types';

const categoriesKey = ['categories'] as const;

export function useCategories() {
  return useQuery({
    queryKey: [...categoriesKey, 'all'],
    queryFn: () => listCategories(),
  });
}

export function useActiveCategories() {
  return useQuery({
    queryKey: [...categoriesKey, 'active'],
    queryFn: () => listActiveCategories(),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actorId }: { input: CategoryInsert; actorId: string | null }) =>
      createCategory(input, actorId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoriesKey });
      toastSuccess('Category created');
    },
    onError: (err) => toastError('Failed to create category', errMessage(err)),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, actorId }: { id: string; patch: CategoryUpdate; actorId: string | null }) =>
      updateCategory(id, patch, actorId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: categoriesKey });
      toastSuccess('Category updated');
    },
    onError: (err) => toastError('Failed to update category', errMessage(err)),
  });
}
