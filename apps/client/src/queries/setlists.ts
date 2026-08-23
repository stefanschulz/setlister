import type { SetlistEntry } from "@setlister/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export function useSetlists() {
  return useQuery({ queryKey: ["setlists"], queryFn: () => api.get<SetlistEntry[]>("/setlists") });
}
