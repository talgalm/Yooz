import { createContext, useContext } from 'react';

/**
 * Lets the analytics hooks/components target either the admin endpoints
 * (keyed by activity id, behind admin auth) or the public share-link
 * endpoints (keyed by an unguessable token, no auth). Admin usage needs no
 * provider — the default below is the admin source.
 */
export interface AnalyticsSource {
  /** Base URL for a single activity's analytics endpoints (no trailing slash). */
  base: (idOrToken: string) => string;
  /** Read-only public mode — hides admin-only controls (pass grade, share, AI chat). */
  shared: boolean;
}

export const ADMIN_ANALYTICS_SOURCE: AnalyticsSource = {
  base: (id) => `/api/admin/analytics/activities/${id}`,
  shared: false,
};

export function makeSharedSource(token: string): AnalyticsSource {
  return {
    base: () => `/api/shared/stats/${token}`,
    shared: true,
  };
}

const AnalyticsSourceContext = createContext<AnalyticsSource>(ADMIN_ANALYTICS_SOURCE);

export const AnalyticsSourceProvider = AnalyticsSourceContext.Provider;

export function useAnalyticsSource(): AnalyticsSource {
  return useContext(AnalyticsSourceContext);
}
