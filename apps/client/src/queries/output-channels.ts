import type { OutputChannel, OutputChannelInput } from '@setlister/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

const KEY = ['output-channels'] as const

export function useOutputChannels() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<OutputChannel[]>('/output-channels') })
}

export function useCreateOutputChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OutputChannelInput) => api.post<OutputChannel>('/output-channels', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateOutputChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: OutputChannelInput }) =>
      api.put<OutputChannel>(`/output-channels/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteOutputChannel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/output-channels/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
