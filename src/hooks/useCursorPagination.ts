import { useCallback, useRef, useMemo } from 'react';
import { useInfiniteQuery, QueryKey } from '@tanstack/react-query';

export interface CursorPaginationOptions<TData, TCursor = string> {
  /** Unique query key for caching */
  queryKey: QueryKey;
  /** Function to fetch a page of data */
  queryFn: (cursor: TCursor | null, pageSize: number) => Promise<{
    data: TData[];
    nextCursor: TCursor | null;
    hasMore: boolean;
  }>;
  /** Number of items per page */
  pageSize?: number;
  /** Whether the query is enabled */
  enabled?: boolean;
  /** Stale time in ms */
  staleTime?: number;
  /** Cache time in ms */
  gcTime?: number;
}

export interface CursorPaginationResult<TData> {
  /** All items loaded so far */
  items: TData[];
  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether more data is being fetched */
  isFetchingNextPage: boolean;
  /** Whether there are more items to load */
  hasNextPage: boolean;
  /** Function to load more items */
  fetchNextPage: () => void;
  /** Function to refresh all data */
  refetch: () => void;
  /** Error if any */
  error: Error | null;
  /** Total count of items loaded */
  totalLoaded: number;
}

/**
 * Generic cursor-based pagination hook using React Query's useInfiniteQuery.
 * Provides reliable infinite scroll without duplicates/skips when data changes.
 * 
 * @example
 * const { items, fetchNextPage, hasNextPage, isLoading } = useCursorPagination({
 *   queryKey: ['notifications', userId],
 *   queryFn: async (cursor, pageSize) => {
 *     const { data } = await supabase
 *       .from('notifications')
 *       .select('*')
 *       .eq('user_id', userId)
 *       .order('created_at', { ascending: false })
 *       .lt('created_at', cursor ?? new Date().toISOString())
 *       .limit(pageSize);
 *     
 *     return {
 *       data: data ?? [],
 *       nextCursor: data?.length === pageSize ? data[data.length - 1].created_at : null,
 *       hasMore: data?.length === pageSize,
 *     };
 *   },
 *   pageSize: 20,
 * });
 */
export function useCursorPagination<TData, TCursor = string>(
  options: CursorPaginationOptions<TData, TCursor>
): CursorPaginationResult<TData> {
  const {
    queryKey,
    queryFn,
    pageSize = 20,
    enabled = true,
    staleTime = 30_000, // 30 seconds
    gcTime = 5 * 60_000, // 5 minutes
  } = options;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage: fetchNext,
    refetch,
    error,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam as TCursor | null, pageSize),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: null as TCursor | null,
    enabled,
    staleTime,
    gcTime,
  });

  // Flatten all pages into a single array
  const items = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data?.pages]);

  const fetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNext();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNext]);

  return {
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    refetch,
    error: error as Error | null,
    totalLoaded: items.length,
  };
}

/**
 * Hook to detect when user scrolls near the bottom for infinite scroll.
 * Use with useCursorPagination's fetchNextPage.
 * 
 * @example
 * const { onScroll, scrollRef } = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   hasMore: hasNextPage,
 *   isLoading: isFetchingNextPage,
 *   threshold: 200,
 * });
 * 
 * return <div ref={scrollRef} onScroll={onScroll}>...</div>
 */
export function useInfiniteScroll(options: {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
}) {
  const { onLoadMore, hasMore, isLoading, threshold = 200 } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const onScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element || isLoadingRef.current || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < threshold) {
      onLoadMore();
    }
  }, [hasMore, threshold, onLoadMore]);

  return { onScroll, scrollRef };
}

/**
 * Utility to create a cursor-based query for Supabase.
 * Handles the common pattern of ordering by created_at with cursor filtering.
 */
export function createSupabaseCursorQuery<T extends { created_at: string }>(
  baseQuery: any,
  cursor: string | null,
  pageSize: number,
  orderColumn: keyof T = 'created_at' as keyof T,
  ascending: boolean = false
) {
  let query = baseQuery.order(String(orderColumn), { ascending });
  
  if (cursor) {
    // For descending order, get items older than cursor
    // For ascending order, get items newer than cursor
    query = ascending 
      ? query.gt(String(orderColumn), cursor)
      : query.lt(String(orderColumn), cursor);
  }
  
  return query.limit(pageSize);
}
