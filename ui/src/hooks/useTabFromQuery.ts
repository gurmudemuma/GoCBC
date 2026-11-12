// useTabFromQuery — honour a `?tab=<index>` deep-link, on load AND on
// same-page client-side navigation.
//
// Global search results and notification "View" actions link to
// `/portals/<org>?tab=<index>`; portals keep their active tab in local
// state and previously ignored the query string, so every search link
// landed on tab 0. Call this in a portal with the tab indices visible
// for the current role:
//
//   useTabFromQuery(setTabValue, visibleTabs.map((t) => t.index));
//
// It waits until the visible list is non-empty (roles load async — on
// first render the list can be empty and the requested tab would look
// invalid), then applies the param if it names a visible tab and ignores
// it otherwise (out-of-range / non-numeric / invisible tab leaves the
// portal on its default tab; never a crash, never a blank page).
//
// It re-applies whenever `?tab=` CHANGES — a search click or notification
// View does a client-side `router.push` to the same portal page (no
// remount), so a mount-only hook would ignore the new param and leave
// the old tab selected. The last-applied value is remembered so a
// repeated navigation to the same tab is a no-op, and in-portal tab
// clicks (which do not change the query string) are untouched. Banks is
// the exception: its tabs are a parent/child hierarchy, so it maps
// `?tab=` to parent+child inline instead of using this hook.

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export function useTabFromQuery(
  setTab: (index: number) => void,
  visibleIndices: number[],
): void {
  const router = useRouter();
  const appliedTab = useRef<number | null>(null);

  // Re-run when the visible set resolves (roles load async) or when the
  // `?tab=` query value changes (same-page client-side navigation).
  const visibleKey = visibleIndices.join(',');

  useEffect(() => {
    if (visibleIndices.length === 0) return;
    if (!router.isReady) return;
    const raw = router.query.tab;
    if (typeof raw !== 'string') return;
    const index = parseInt(raw, 10);
    if (Number.isNaN(index) || !visibleIndices.includes(index)) return;
    if (appliedTab.current === index) return;
    appliedTab.current = index;
    setTab(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey, router.query.tab, router.isReady]);
}

export default useTabFromQuery;
