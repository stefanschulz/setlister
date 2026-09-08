import type { Label, LabelInput } from "@setlister/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

const KEY = ["labels"] as const;

export function useLabels() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<Label[]>("/labels") });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LabelInput) => api.post<Label>("/labels", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: LabelInput }) => api.put<Label>(`/labels/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/labels/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
