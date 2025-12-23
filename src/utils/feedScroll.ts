// Utility helpers for restoring the feed scroll position consistently

export type FeedScrollAnchor = {
  postId?: string;
  offset?: number;
  scrollTop?: number;
};

export const storeFeedScrollAnchor = () => {
  const container = document.querySelector('[data-feed-scroll-container]') as HTMLDivElement | null;

  if (!container) {
    sessionStorage.setItem('feed_scroll_anchor', JSON.stringify({ scrollTop: window.scrollY } satisfies FeedScrollAnchor));
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const postEls = Array.from(container.querySelectorAll<HTMLElement>('[data-feed-post-id]'));

  const firstVisible = postEls.find((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > containerRect.top + 1; // at least partially visible
  });

  const postId = firstVisible?.getAttribute('data-feed-post-id') || undefined;
  const offset = firstVisible
    ? firstVisible.getBoundingClientRect().top - containerRect.top
    : undefined;

  sessionStorage.setItem(
    'feed_scroll_anchor',
    JSON.stringify({
      postId,
      offset,
      scrollTop: container.scrollTop,
    } satisfies FeedScrollAnchor)
  );
};
