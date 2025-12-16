import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PostEngagementCounts = {
  likes: number;
  comments: number;
  shares: number;
};

function normalizeIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function buildCountsMap(postIds: string[]) {
  const base: Record<string, PostEngagementCounts> = {};
  for (const id of postIds) base[id] = { likes: 0, comments: 0, shares: 0 };
  return base;
}

export function usePostEngagementCounts(postIdsInput: string[]) {
  // Unique suffix per hook instance to avoid Supabase channel-name collisions across the app.
  // (supabase.channel(name) returns the same channel instance if the name matches)
  const channelSuffixRef = useRef(Math.random().toString(36).slice(2));

  const postIds = useMemo(() => normalizeIds(postIdsInput), [postIdsInput.join(",")]);
  const [counts, setCounts] = useState<Record<string, PostEngagementCounts>>({});

  useEffect(() => {
    let cancelled = false;
    if (postIds.length === 0) {
      setCounts({});
      return;
    }

    const load = async () => {
      const base = buildCountsMap(postIds);

      const [likesRes, commentsRes, sharesRes] = await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", postIds),
        supabase.from("post_comments").select("post_id").in("post_id", postIds),
        supabase.from("post_shares").select("post_id").in("post_id", postIds),
      ]);

      likesRes.data?.forEach((r) => {
        base[r.post_id].likes += 1;
      });
      commentsRes.data?.forEach((r) => {
        base[r.post_id].comments += 1;
      });
      sharesRes.data?.forEach((r) => {
        base[r.post_id].shares += 1;
      });

      if (!cancelled) setCounts(base);
    };

    load();

    const filter = `post_id=in.(${postIds.join(",")})`;

    const onDelta = (table: keyof PostEngagementCounts, delta: number) =>
      (payload: any) => {
        const row = (payload?.new || payload?.old) as { post_id?: string } | undefined;
        const postId = row?.post_id;
        if (!postId) return;
        setCounts((prev) => {
          const next = { ...prev };
          const current = next[postId] ?? { likes: 0, comments: 0, shares: 0 };
          next[postId] = {
            ...current,
            [table]: Math.max(0, (current[table] ?? 0) + delta),
          };
          return next;
        });
      };

    const suffix = channelSuffixRef.current;

    const likesChannel = supabase
      .channel(`counts-post-likes-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_likes", filter },
        onDelta("likes", 1)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_likes", filter },
        onDelta("likes", -1)
      )
      .subscribe();

    const commentsChannel = supabase
      .channel(`counts-post-comments-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter },
        onDelta("comments", 1)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_comments", filter },
        onDelta("comments", -1)
      )
      .subscribe();

    const sharesChannel = supabase
      .channel(`counts-post-shares-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_shares", filter },
        onDelta("shares", 1)
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_shares", filter },
        onDelta("shares", -1)
      )
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
