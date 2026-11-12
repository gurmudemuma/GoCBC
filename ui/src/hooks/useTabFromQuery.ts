// useTabFromQuery — honour a `?tab=<index>` deep-link once, on load.
//
// Global search results link to `/portals/<org>?tab=<index>`; portals
// keep their active tab in local state and previously ignored the query
// string, so every search link landed on tab 0. Call this in a portal
// with the tab indices visible for the current role:
//
//   useTabFromQuery(setTabValue, visibleTabs.map((t) => t.index));
//
// It waits until the visible list is non-empty (roles load async — on
// first render the list can be empty and the requested tab would look
// invalid), then applies the param once if it names a visible tab and
// ignores it otherwise (out-of-range / non-numeric / invisible tab
// leaves the portal on its default tab; never a crash, never a blank
// page). It does not run again on later tab changes, so in-portal
// navigation is untouched. Banks is the exception: its tabs are a
// parent/child hierarchy, so it maps `?tab=` to parent+child inline
// instead of using this hook.

import { useEffect, useRef } from 'react';

export function useTabFromQuery(
  setTab: (index: number) => void,
  visibleIndices: number[],
): void {
  const handled = useRef(false);

  // Re-run when the visible set resolves (roles load async); the ref
  // guard makes the param apply at most once.
  const visibleKey = visibleIndices.join(',');

  useEffect(() => {
    if (handled.current) return;
    if (visibleIndices.length === 0) return;
    handled.current = true;
    if (typeof window === 'undefined') return;
    const raw = new URLSearchParams(window.location.search).get('tab');
    if (raw === null) return;
    const index = parseInt(raw, 10);
    if (!Number.isNaN(index) && visibleIndices.includes(index)) {
      setTab(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);
}

export default useTabFromQuery;
