import type { Episode, EpisodeDetail, EpisodeInput, EpisodePlaylistEntry } from '@setlister/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'

const LIST_KEY = ['episodes'] as const
const detailKey = (id: number) => ['episodes', id] as const

export function useEpisodes() {
  return useQuery({ queryKey: LIST_KEY, queryFn: () => api.get<Episode[]>('/episodes') })
}

export function useEpisode(id: number) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => api.get<EpisodeDetail>(`/episodes/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  })
}

export function useCreateEpisode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EpisodeInput) => api.post<Episode>('/episodes', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useUpdateEpisode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: EpisodeInput }) =>
      api.put<Episode>(`/episodes/${id}`, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY })
      queryClient.invalidateQueries({ queryKey: detailKey(id) })
    },
  })
}

export function useDeleteEpisode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/episodes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useSetPlaylist(episodeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (trackIds: number[]) =>
      api.put<{ playlist: EpisodePlaylistEntry[] }>(`/episodes/${episodeId}/playlist`, { trackIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey(episodeId) }),
  })
}
