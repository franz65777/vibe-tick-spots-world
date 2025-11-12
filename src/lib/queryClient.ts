import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache AGGRESSIVO per transizioni istantanee
      staleTime: 30 * 60 * 1000, // 30 minuti - dati considerati freschi
      gcTime: 60 * 60 * 1000, // 1 ora - mantieni in memoria
      // Mostra sempre dati cached, NO refetch automatici
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      // Retry solo 1 volta, veloce
      retry: 1,
      retryDelay: 500,
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
