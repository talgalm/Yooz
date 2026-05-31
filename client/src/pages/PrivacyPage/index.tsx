import { styled } from '@mui/material/styles';
import { useTranslations, useLang } from '../../context/LanguageContext';
import { texts } from './PrivacyPage.i18n';

const Wrapper = styled('div')<{ dir: 'ltr' | 'rtl' }>(({ dir }) => ({
  minHeight: '100dvh',
  background: '#0f2b30',
  color: '#F2F7FF',
  padding: '40px 20px 60px',
  fontFamily: "'Rubik', sans-serif",
  direction: dir,
  display: 'flex',
  justifyContent: 'center',
}));

const Container = styled('div')({
  width: '100%',
  maxWidth: 760,
  lineHeight: 1.7,
});

const LangToggle = styled('button')({
  background: 'transparent',
  color: '#39CABC',
  border: '1px solid #39CABC',
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 13,
  cursor: 'pointer',
  marginBottom: 24,
  fontFamily: "'Rubik', sans-serif",
});

const Title = styled('h1')({
  fontSize: 32,
  margin: '0 0 6px',
});

const Updated = styled('div')({
  fontSize: 13,
  opacity: 0.7,
  marginBottom: 28,
});

const Section = styled('section')({
  marginBottom: 22,
});

const H2 = styled('h2')({
  fontSize: 19,
  margin: '0 0 8px',
  color: '#39CABC',
});

const P = styled('p')({
  margin: '0 0 8px',
  fontSize: 15,
});

const Ul = styled('ul')({
  margin: '0 0 8px',
  paddingInlineStart: 20,
  fontSize: 15,
});

const ContactLink = styled('a')({
  color: '#39CABC',
});

export default function PrivacyPage() {
  const t = useTranslations(texts);
  const { lang, setLang, dir } = useLang();

  return (
    <Wrapper dir={dir}>
      <Container>
        <LangToggle onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>
          {lang === 'he' ? 'English' : 'עברית'}
        </LangToggle>
        <Title>{t.title}</Title>
        <Updated>{t.lastUpdated}</Updated>

        <Section>
          <H2>{t.introHeader}</H2>
          <P>{t.introBody}</P>
        </Section>

        <Section>
          <H2>{t.dataHeader}</H2>
          <P>{t.dataIntro}</P>
          <Ul>
            <li>{t.dataItem1}</li>
            <li>{t.dataItem2}</li>
            <li>{t.dataItem3}</li>
            <li>{t.dataItem4}</li>
            <li>{t.dataItem5}</li>
          </Ul>
        </Section>

        <Section>
          <H2>{t.useHeader}</H2>
          <Ul>
            <li>{t.useItem1}</li>
            <li>{t.useItem2}</li>
            <li>{t.useItem3}</li>
          </Ul>
        </Section>

        <Section>
          <H2>{t.shareHeader}</H2>
          <P>{t.shareBody}</P>
        </Section>

        <Section>
          <H2>{t.socialHeader}</H2>
          <P>{t.socialBody}</P>
        </Section>

        <Section>
          <H2>{t.cookiesHeader}</H2>
          <P>{t.cookiesBody}</P>
        </Section>

        <Section>
          <H2>{t.rightsHeader}</H2>
          <P>{t.rightsBody}</P>
        </Section>

        <Section>
          <H2>{t.retentionHeader}</H2>
          <P>{t.retentionBody}</P>
        </Section>

        <Section>
          <H2>{t.childrenHeader}</H2>
          <P>{t.childrenBody}</P>
        </Section>

        <Section>
          <H2>{t.changesHeader}</H2>
          <P>{t.changesBody}</P>
        </Section>

        <Section>
          <H2>{t.contactHeader}</H2>
          <P>
            {t.contactBody}{' '}
            <ContactLink href={`mailto:${t.contactEmail}`}>{t.contactEmail}</ContactLink>
          </P>
        </Section>
      </Container>
    </Wrapper>
  );
}
