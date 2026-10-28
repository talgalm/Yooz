import type { ComponentType } from 'react';
import HomePage from '../HomePage';
import BusinessPage from '../BusinessPage';
import TourismPage from '../TourismPage';
import AcademyPage from '../AcademyPage';
import AboutPage from '../AboutPage';
import type { MarketingRoute } from './routes';

export const MARKETING_PAGES: Record<MarketingRoute['key'], ComponentType> = {
  home: HomePage,
  business: BusinessPage,
  tourism: TourismPage,
  academy: AcademyPage,
  about: AboutPage,
};
