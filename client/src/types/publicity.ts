
import type { Lang } from '../context/LanguageContext';

export interface LocalizedText extends Partial<Record<Lang, string>> {
  he: string;
  en: string;
}

export interface Project {
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
  linkUrl?: string;
}

export interface Audience {
  key: string;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
  projects: Project[];
}

export interface Booster {
  key: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
}

export interface CustomerLogo {
  name: string;
  imageUrl?: string;
  linkUrl?: string;
}

export interface SiteContent {
  _id?: string;
  brandLogoUrl: string;
  hero: {
    badge: LocalizedText;
    title: LocalizedText;
    subtitle: LocalizedText;
    ctaLabel: LocalizedText;
    ctaUrl: string;
    phoneImageUrl: string;
  };
  audiences: Audience[];
  engine: {
    title: LocalizedText;
    intro: LocalizedText;
    boosters: Booster[];
  };
  customers: {
    title: LocalizedText;
    logos: CustomerLogo[];
  };
  contact: {
    title: LocalizedText;
    email: string;
    phone: string;
  };
}

export interface ContactLead {
  _id: string;
  name: string;
  company?: string;
  position?: string;
  email: string;
  phone?: string;
  message?: string;
  handled: boolean;
  createdAt: string;
}
