import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backup: unknown) => api.post<{ restored: true }>("/backup/restore", backup),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
