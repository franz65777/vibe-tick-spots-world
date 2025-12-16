import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PostEngagementCounts = {
  likes: number;
  comments: number;
  shares: number;
};

const CHUNK_SIZE = 25;

function normalizeIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function buildCountsMap(postIds: string[]) {
  const base: Record<string, PostEngagementCounts> = {};
  for (const id of postIds) base[id] = { likes: 0, comments: 0, shares: 0 };
  return base;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function usePostEngagementCounts(postIdsInput: string[]) {
  // Unique suffix per hook instance to avoid Supabase channel-name collisions across the app.
  // (supabase.channel(name) returns the same channel instance if the name matches)
  const channelSuffixRef = useRef(Math.random().toString(36).slice(2));

  const postIds = useMemo(() => normalizeIds(postIdsInput), [postIdsInput.join(",")]);
  const postIdsSetRef = useRef<Set<string>>(new Set());

  const [counts, setCounts] = useState<Record<string, PostEngagementCounts>>({});

  useEffect(() => {
    postIdsSetRef.current = new Set(postIds);
  }, [postIds.join(",")]);

  useEffect(() => {
    let cancelled = false;

    if (postIds.length === 0) {
      setCounts({});
      return;
    }

    const load = async () => {
      const base = buildCountsMap(postIds);

      try {
        // Batched fetch to avoid very long `in.(...)` queries (which can fail and silently leave zeros).
        const chunks = chunk(postIds, CHUNK_SIZE);

        const countFor = async (table: "post_likes" | "post_comments" | "post_shares") => {
          const allRows: Array<{ post_id: string }> = [];
          for (const ids of chunks) {
            const { data, error } = await supabase.from(table).select("post_id").in("post_id", ids);
            if (error) {
              console.error(`[usePostEngagementCounts] failed to load ${table}`, error);
              continue;
            }
            if (data?.length) allRows.push(...(data as any));
          }
          return allRows;
        };

        const [likesRows, commentsRows, sharesRows] = await Promise.all([
          countFor("post_likes"),
          countFor("post_comments"),
          countFor("post_shares"),
        ]);

        likesRows.forEach((r) => {
          if (base[r.post_id]) base[r.post_id].likes += 1;
        });
        commentsRows.forEach((r) => {
          if (base[r.post_id]) base[r.post_id].comments += 1;
        });
        sharesRows.forEach((r) => {
          if (base[r.post_id]) base[r.post_id].shares += 1;
        });
      } catch (e) {
        console.error("[usePostEngagementCounts] failed to load engagement counts", e);
      }

      if (!cancelled) setCounts(base);
    };

    load();

    const isTrackedPost = (payload: any) => {
      const row = (payload?.new || payload?.old) as { post_id?: string } | undefined;
      const pid = row?.post_id;
      if (!pid) return null;
      return postIdsSetRef.current.has(pid) ? pid : null;
    };

    const onDelta = (field: keyof PostEngagementCounts, delta: number) => (payload: any) => {
      const postId = isTrackedPost(payload);
      if (!postId) return;
      setCounts((prev) => {
        const next = { ...prev };
        const current = next[postId] ?? { likes: 0, comments: 0, shares: 0 };
        next[postId] = {
          ...current,
          [field]: Math.max(0, (current[field] ?? 0) + delta),
        };
        return next;
      });
    };

    const suffix = channelSuffixRef.current;

    // Subscribe without a Postgres filter (the `in.(...)` filter is unreliable/too long at scale).
    // We filter client-side to the current set of post ids.
    const likesChannel = supabase
      .channel(`counts-post-likes-${suffix}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_likes" }, onDelta("likes", 1))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_likes" }, onDelta("likes", -1))
      .subscribe();

    const commentsChannel = supabase
      .channel(`counts-post-comments-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments" },
        onDelta("comments", 1)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_comments" },
        onDelta("comments", -1)
      )
      .subscribe();

    const sharesChannel = supabase
      .channel(`counts-post-shares-${suffix}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_shares" }, onDelta("shares", 1))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_shares" }, onDelta("shares", -1))
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(sharesChannel);
    };
  }, [postIds.join(",")]);

  return { counts };
}
