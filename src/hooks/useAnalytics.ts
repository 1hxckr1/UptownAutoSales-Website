import { useCallback } from 'react';
import {
  trackEvent,
  trackCtaClick,
  trackLeadSubmission,
  trackScrollDepth,
  trackTimeOnPage,
} from '../lib/analytics';

export function useAnalytics() {
  const track = useCallback(
    (eventType: string, data?: Record<string, unknown>) => trackEvent(eventType, data),
    [],
  );

  const ctaClick = useCallback(
    (ctaType: string, meta?: Record<string, unknown>) => trackCtaClick(ctaType, meta),
    [],
  );

  const leadSubmission = useCallback(
    (formType: string, success: boolean, meta?: Record<string, unknown>) =>
      trackLeadSubmission(formType, success, meta),
    [],
  );

  const scrollDepth = useCallback((depth: number) => trackScrollDepth(depth), []);

  const timeOnPage = useCallback(
    (seconds: number, url: string, scrollDepth?: number) => trackTimeOnPage(seconds, url, scrollDepth),
    [],
  );

  return { track, ctaClick, leadSubmission, scrollDepth, timeOnPage };
}
