import { DEFAULT_LANG, LANGS, type Lang } from '../../../utils/languages';
import { MARKETING_ROUTES } from './routes';
import { SITE_NAME, SITE_ORIGIN, pageMeta, pageUrl } from './pageMeta';
import { pageFaq } from './pageFaq';
import { CONTACT_EMAIL, CONTACT_PHONE_INTERNATIONAL } from './contact';

const HOME = MARKETING_ROUTES.find((route) => route.key === 'home')!;

function languageOrder(): Lang[] {
  const others = LANGS.map((l) => l.code).filter((code) => code !== DEFAULT_LANG);
  return [...others, DEFAULT_LANG];
}

function pageList(lang: Lang): string[] {
  return MARKETING_ROUTES.map((route) => {
    const { title, description } = pageMeta(route, lang);
    return `- [${title}](${pageUrl(route, lang)}): ${description}`;
  });
}

function faqList(lang: Lang): string[] {
  return MARKETING_ROUTES.flatMap((route) => {
    const faq = pageFaq(route.key, lang);
    if (!faq.length) return [];
    return [`### ${pageMeta(route, lang).title}`, '', ...faq.flatMap(({ q, a }) => [`**${q}**`, a, '']), ''];
  });
}

export function llmsTxt(): string {
  const order = languageOrder();
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${pageMeta(HOME, order[0]).description}`,
    '',
    ...order.slice(1).map((lang) => pageMeta(HOME, lang).description),
    '',
    `Website: ${SITE_ORIGIN}/`,
    `Contact: ${CONTACT_EMAIL}, ${CONTACT_PHONE_INTERNATIONAL}`,
    '',
  ];
  for (const lang of order) {
    lines.push(`## Pages (${lang})`, '', ...pageList(lang), '');
  }
  for (const lang of order) {
    lines.push(`## FAQ (${lang})`, '', ...faqList(lang));
  }
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
