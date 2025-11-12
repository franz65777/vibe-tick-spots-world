import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache per 10 minuti per performance migliori
      staleTime: 10 * 60 * 1000,
      // Mantieni in cache per 15 minuti
      gcTime: 15 * 60 * 1000,
      // Mostra dati cached immediatamente, rivalida in background
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      // Retry automatico solo 1 volta
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Prefetch utilities
export const prefetchProfile = async (userId: string) => {
  return queryClient.prefetchQuery({
    queryKey: ['profile', userId],
    staleTime: 5 * 60 * 1000,
  });
};

export const prefetchPosts = async (userId?: string) => {
  return queryClient.prefetchQuery({
    queryKey: ['posts', userId],
    staleTime: 3 * 60 * 1000,
  });
};

export const prefetchFeed = async () => {
  return queryClient.prefetchQuery({
    queryKey: ['feed'],
    staleTime: 2 * 60 * 1000,
  });
};
