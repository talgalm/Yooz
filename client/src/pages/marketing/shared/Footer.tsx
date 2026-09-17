import { Link } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './Footer.i18n';
import { SECTOR_ROUTES, CONTACT_ANCHOR } from './routes';
import { C, RADIUS, BP } from './tokens';
import { Container } from './styled';

const Root = styled('footer')({
  position: 'relative',
  background: C.footer,
  paddingBlock: '54px 22px',
  [BP.mobile]: { paddingBlock: '34px 18px' },
});

const Columns = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1.1fr 1fr 1fr 1.3fr',
  gap: 36,
  alignItems: 'start',
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr 1fr', gap: 28 },
  [BP.mobile]: { gridTemplateColumns: '1fr', gap: 26 },
});

// ─── Brand column ───

const BrandCol = styled('div')({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 });

/**
 * The asset already carries the "Engage, Share, Grow" lockup - do not re-render it.
 *
 * Measured in the business frame, the footer mark's ink is 81px tall at 1512
 * frame width. The asset is 80% ink and 20% transparent padding, so it renders
 * at 81 / 0.8 = 101 - the footer mark is meaningfully larger than the nav's.
 */
const BrandMark = styled('img')({
  height: 101,
  width: 'auto',
  [BP.mobile]: { height: 72 },
});
const Badges = styled('div')({ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 8 });
const Badge = styled('span')({
  fontSize: 11,
  fontWeight: 600,
  color: C.inkSoft,
  background: C.white,
  border: `1px solid ${C.ruleSoft}`,
  borderRadius: 7,
  padding: '6px 13px',
  whiteSpace: 'nowrap',
});

// ─── Link columns ───

const ColTitle = styled('h4')({
  fontSize: 14.5,
  fontWeight: 800,
  color: C.heading,
  margin: '0 0 14px',
});

const ColList = styled('ul')({ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 11 });

const linkStyle = {
  color: C.ink,
  textDecoration: 'none',
  fontSize: 13.5,
  fontWeight: 500,
  '&:hover': { color: C.purple },
};

const ColLink = styled(Link)(linkStyle);

/**
 * A separate styled anchor rather than `ColLink.withComponent('a')`: that keeps
 * `LinkProps` on the result, so the in-page `#contact` and `#faq` anchors would
 * still be required to pass a `to` prop they have no use for.
 */
const ColAnchor = styled('a')(linkStyle);

// ─── Demo column ───

const DemoBlurb = styled('p')({
  fontSize: 13,
  lineHeight: 1.8,
  color: C.ink,
  margin: '0 0 16px',
});

const DemoCta = styled('a')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: C.purple,
  color: C.white,
  textDecoration: 'none',
  borderRadius: RADIUS.button,
  padding: '12px 28px',
  fontSize: 14,
  fontWeight: 800,
  '&:hover': { background: C.purpleDeep },
});

// ─── Bottom row ───

const Rule = styled('div')({ height: 1, background: C.ruleSoft, marginBlock: '34px 16px' });

const BottomRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
  flexWrap: 'wrap',
  fontSize: 12,
  color: C.inkSoft,
});

const BottomLinks = styled('div')({ display: 'flex', gap: 18, flexWrap: 'wrap' });

export default function Footer() {
  const t = useTranslations(texts);

  return (
    <Root>
      <Container>
        <Columns>
          <BrandCol>
            <BrandMark src="/images/marketing/logo-yooz.png" alt="Yooz - Engage, Share, Grow" />
            <Badges>
              <Badge>{t.accessibility}</Badge>
              <Badge>{t.gdpr}</Badge>
            </Badges>
          </BrandCol>

          <div>
            <ColTitle>{t.colSectors}</ColTitle>
            <ColList>
              {SECTOR_ROUTES.map((r) => (
                <li key={r.key}>
                  <ColLink to={r.path}>{t[r.key]}</ColLink>
                </li>
              ))}
            </ColList>
          </div>

          <div>
            <ColTitle>{t.colCompany}</ColTitle>
            <ColList>
              <li><ColAnchor href={CONTACT_ANCHOR}>{t.about}</ColAnchor></li>
              <li><ColAnchor href="#faq">{t.faqLink}</ColAnchor></li>
              <li><ColAnchor href={CONTACT_ANCHOR}>{t.contact}</ColAnchor></li>
            </ColList>
          </div>

          <div>
            <ColTitle>{t.colDemo}</ColTitle>
            <DemoBlurb>{t.demoBlurb}</DemoBlurb>
            <DemoCta href={CONTACT_ANCHOR}>{t.demoCta}</DemoCta>
          </div>
        </Columns>

        <Rule />

        <BottomRow>
          <span>{t.rights}</span>
          <BottomLinks>
            <ColLink to="/privacy">{t.terms}</ColLink>
            <ColLink to="/privacy">{t.privacy}</ColLink>
            <ColLink to="/privacy">{t.accessibilityStatement}</ColLink>
          </BottomLinks>
        </BottomRow>
      </Container>
    </Root>
  );
}
