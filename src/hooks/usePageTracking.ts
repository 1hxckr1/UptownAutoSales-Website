import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, trackScrollDepth, trackTimeOnPage } from '../lib/analytics';

const SCROLL_MILESTONES = [25, 50, 75, 90];

export function usePageTracking() {
  const location = useLocation();
  const pageEntryTime = useRef(Date.now());
  const previousPath = useRef(location.pathname);
  const reachedMilestones = useRef(new Set<number>());
  const maxScroll = useRef(0);

  useEffect(() => {
    const url = window.location.origin + location.pathname + location.search;
    trackPageView(url, document.title);

    pageEntryTime.current = Date.now();
    reachedMilestones.current.clear();
    maxScroll.current = 0;

    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      if (pct > maxScroll.current) maxScroll.current = pct;

      for (const milestone of SCROLL_MILESTONES) {
        if (pct >= milestone && !reachedMilestones.current.has(milestone)) {
          reachedMilestones.current.add(milestone);
          trackScrollDepth(milestone);
        }
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      const seconds = Math.round((Date.now() - pageEntryTime.current) / 1000);
      if (seconds > 0) {
        const prevUrl = window.location.origin + previousPath.current;
        trackTimeOnPage(seconds, prevUrl, maxScroll.current);
      }
      previousPath.current = location.pathname;
    };
  }, [location.pathname, location.search]);
}
