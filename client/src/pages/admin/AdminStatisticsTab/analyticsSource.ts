import { createContext, useContext } from 'react';

export interface AnalyticsSource {
  base: (idOrToken: string) => string;
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
