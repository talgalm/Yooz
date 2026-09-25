import { useState, useEffect, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminPublicityTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import { PrimaryButton, OutlineButton, Input, ErrorText } from '../../../components/styled';
import { PageTitle, SectionLabel } from '../styled';
import type { SiteContent, LocalizedText, ContactLead } from '../../../types/publicity';

// ─── Styled ───
const Container = styled('div')({ display: 'flex', flexDirection: 'column', gap: 20 });
const SubTabBar = styled('div')({ display: 'flex', gap: 8 });
const SubTab = styled('button')<{ active?: boolean }>(({ active }) => ({
  border: 'none',
  borderRadius: 10,
  padding: '8px 20px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
  background: active ? 'linear-gradient(135deg, #6c5ce7, #8B2FC9)' : '#f0eef7',
  color: active ? '#fff' : '#5a4a72',
}));
const SectionCard = styled('section')({
  background: '#fff',
  border: '1px solid #ececf4',
  borderRadius: 16,
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});
const SectionHead = styled('h3')({ margin: 0, fontSize: 18, fontWeight: 800, color: '#390363' });
const FieldPair = styled('div')({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, '@media (max-width: 700px)': { gridTemplateColumns: '1fr' } });
const FieldCol = styled('div')({ display: 'flex', flexDirection: 'column', gap: 4 });
const LangTag = styled('span')({ fontSize: 12, fontWeight: 700, color: '#8a7aa5' });
const Row = styled('div')({ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' });
const ItemBox = styled('div')({ border: '1px solid #eee', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 });
const ImgPreview = styled('img')({ height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #eee' });
const SaveBar = styled('div')({ position: 'sticky', bottom: 0, background: '#fff', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid #ececf4' });
const Table = styled('table')({ width: '100%', borderCollapse: 'collapse', fontSize: 14 });
const Th = styled('th')({ textAlign: 'start', padding: '10px 12px', borderBottom: '2px solid #ececf4', color: '#5a4a72' });
const Td = styled('td')({ padding: '10px 12px', borderBottom: '1px solid #f2f0f8', verticalAlign: 'top' });

// ─── Helpers ───
type T = typeof texts.en;

function LocalizedField({ label, value, onChange, t }: { label: string; value: LocalizedText; onChange: (v: LocalizedText) => void; t: T }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <FieldPair>
        <FieldCol>
          <LangTag>{t.he}</LangTag>
          <Input value={value?.he || ''} onChange={(e) => onChange({ he: e.target.value, en: value?.en || '' })} />
        </FieldCol>
        <FieldCol>
          <LangTag>{t.en}</LangTag>
          <Input value={value?.en || ''} dir="ltr" onChange={(e) => onChange({ he: value?.he || '', en: e.target.value })} />
        </FieldCol>
      </FieldPair>
    </div>
  );
}

function ImageField({ label, url, onChange, t }: { label: string; url?: string; onChange: (url: string) => void; t: T }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <Row>
        {url && <ImgPreview src={url} alt="" />}
        <Input style={{ flex: 1, minWidth: 200 }} value={url || ''} placeholder="https://…" onChange={(e) => onChange(e.target.value)} />
        <FileUploadButton accept="image/*" label={t.upload} onUploaded={(u) => onChange(u)} />
      </Row>
    </div>
  );
}

export default function AdminPublicityTab() {
  const t = useTranslations(texts);
  const [sub, setSub] = useState<'content' | 'leads'>('content');
  const [content, setContent] = useState<SiteContent | null>(null);
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    adminApiFetch<{ content: SiteContent }>('/api/site-content').then((r) => setContent(r.content)).catch(() => {});
  }, []);

  const loadLeads = useCallback(() => {
    adminApiFetch<{ leads: ContactLead[] }>('/api/site-content/leads').then((r) => setLeads(r.leads)).catch(() => {});
  }, []);
  useEffect(() => { if (sub === 'leads') loadLeads(); }, [sub, loadLeads]);

  // Immutable patch via structuredClone — content trees are small.
  const patch = (fn: (c: SiteContent) => void) =>
    setContent((prev) => { if (!prev) return prev; const next = structuredClone(prev); fn(next); return next; });

  const save = async () => {
    if (!content) return;
    setSaveState('saving');
    try {
      await adminApiFetch('/api/site-content', { method: 'PUT', body: JSON.stringify({ content }) });
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  };

  const toggleHandled = async (lead: ContactLead) => {
    try {
      await adminApiFetch(`/api/site-content/leads/${lead._id}`, { method: 'PATCH', body: JSON.stringify({ handled: !lead.handled }) });
      loadLeads();
    } catch {}
  };

  return (
    <Container>
      <PageTitle>{t.pageTitle}</PageTitle>
      <SubTabBar>
        <SubTab active={sub === 'content'} onClick={() => setSub('content')}>{t.subContent}</SubTab>
        <SubTab active={sub === 'leads'} onClick={() => setSub('leads')}>{t.subLeads}</SubTab>
      </SubTabBar>

      {sub === 'content' && content && (
        <>
          {/* Branding */}
          <SectionCard>
            <SectionHead>{t.sectionBranding}</SectionHead>
            <ImageField label={t.logo} url={content.brandLogoUrl} onChange={(u) => patch((c) => { c.brandLogoUrl = u; })} t={t} />
          </SectionCard>

          {/* Hero */}
          <SectionCard>
            <SectionHead>{t.sectionHero}</SectionHead>
            <LocalizedField label={t.badge} value={content.hero.badge} onChange={(v) => patch((c) => { c.hero.badge = v; })} t={t} />
            <LocalizedField label={t.title} value={content.hero.title} onChange={(v) => patch((c) => { c.hero.title = v; })} t={t} />
            <LocalizedField label={t.subtitle} value={content.hero.subtitle} onChange={(v) => patch((c) => { c.hero.subtitle = v; })} t={t} />
            <LocalizedField label={t.ctaLabel} value={content.hero.ctaLabel} onChange={(v) => patch((c) => { c.hero.ctaLabel = v; })} t={t} />
            <div>
              <SectionLabel>{t.ctaUrl}</SectionLabel>
              <Input value={content.hero.ctaUrl} onChange={(e) => patch((c) => { c.hero.ctaUrl = e.target.value; })} />
            </div>
            <ImageField label={t.phoneImage} url={content.hero.phoneImageUrl} onChange={(u) => patch((c) => { c.hero.phoneImageUrl = u; })} t={t} />
          </SectionCard>

          {/* Audiences */}
          <SectionCard>
            <SectionHead>{t.sectionAudiences}</SectionHead>
            {content.audiences.map((a, ai) => (
              <ItemBox key={a.key}>
                <LocalizedField label={t.title} value={a.title} onChange={(v) => patch((c) => { c.audiences[ai].title = v; })} t={t} />
                <LocalizedField label={t.description} value={a.description} onChange={(v) => patch((c) => { c.audiences[ai].description = v; })} t={t} />
                <ImageField label={t.image} url={a.imageUrl} onChange={(u) => patch((c) => { c.audiences[ai].imageUrl = u; })} t={t} />
                <SectionLabel>{t.projects}</SectionLabel>
                {a.projects.map((p, pi) => (
                  <ItemBox key={pi}>
                    <LocalizedField label={t.projectTitle} value={p.title} onChange={(v) => patch((c) => { c.audiences[ai].projects[pi].title = v; })} t={t} />
                    <LocalizedField label={t.projectDesc} value={p.description} onChange={(v) => patch((c) => { c.audiences[ai].projects[pi].description = v; })} t={t} />
                    <div>
                      <SectionLabel>{t.projectLink}</SectionLabel>
                      <Input value={p.linkUrl || ''} onChange={(e) => patch((c) => { c.audiences[ai].projects[pi].linkUrl = e.target.value; })} />
                    </div>
                    <Row>
                      <OutlineButton onClick={() => patch((c) => { c.audiences[ai].projects.splice(pi, 1); })}>{t.remove}</OutlineButton>
                    </Row>
                  </ItemBox>
                ))}
                <Row>
                  <OutlineButton onClick={() => patch((c) => { c.audiences[ai].projects.push({ title: { he: '', en: '' }, description: { he: '', en: '' } }); })}>{t.addProject}</OutlineButton>
                </Row>
              </ItemBox>
            ))}
          </SectionCard>

          {/* Engine */}
          <SectionCard>
            <SectionHead>{t.sectionEngine}</SectionHead>
            <LocalizedField label={t.title} value={content.engine.title} onChange={(v) => patch((c) => { c.engine.title = v; })} t={t} />
            <LocalizedField label={t.intro} value={content.engine.intro} onChange={(v) => patch((c) => { c.engine.intro = v; })} t={t} />
            {content.engine.boosters.map((b, bi) => (
              <ItemBox key={b.key}>
                <LocalizedField label={t.title} value={b.title} onChange={(v) => patch((c) => { c.engine.boosters[bi].title = v; })} t={t} />
                <LocalizedField label={t.boosterSubtitle} value={b.subtitle} onChange={(v) => patch((c) => { c.engine.boosters[bi].subtitle = v; })} t={t} />
                <LocalizedField label={t.description} value={b.description} onChange={(v) => patch((c) => { c.engine.boosters[bi].description = v; })} t={t} />
                <ImageField label={t.image} url={b.imageUrl} onChange={(u) => patch((c) => { c.engine.boosters[bi].imageUrl = u; })} t={t} />
              </ItemBox>
            ))}
          </SectionCard>

          {/* Customers */}
          <SectionCard>
            <SectionHead>{t.sectionCustomers}</SectionHead>
            <LocalizedField label={t.title} value={content.customers.title} onChange={(v) => patch((c) => { c.customers.title = v; })} t={t} />
            {content.customers.logos.map((logo, li) => (
              <ItemBox key={li}>
                <div>
                  <SectionLabel>{t.logoName}</SectionLabel>
                  <Input value={logo.name} onChange={(e) => patch((c) => { c.customers.logos[li].name = e.target.value; })} />
                </div>
                <ImageField label={t.image} url={logo.imageUrl} onChange={(u) => patch((c) => { c.customers.logos[li].imageUrl = u; })} t={t} />
                <div>
                  <SectionLabel>{t.logoLink}</SectionLabel>
                  <Input value={logo.linkUrl || ''} onChange={(e) => patch((c) => { c.customers.logos[li].linkUrl = e.target.value; })} />
                </div>
                <Row>
                  <OutlineButton onClick={() => patch((c) => { c.customers.logos.splice(li, 1); })}>{t.remove}</OutlineButton>
                </Row>
              </ItemBox>
            ))}
            <Row>
              <OutlineButton onClick={() => patch((c) => { c.customers.logos.push({ name: '' }); })}>{t.addLogo}</OutlineButton>
            </Row>
          </SectionCard>

          {/* Contact */}
          <SectionCard>
            <SectionHead>{t.sectionContact}</SectionHead>
            <LocalizedField label={t.title} value={content.contact.title} onChange={(v) => patch((c) => { c.contact.title = v; })} t={t} />
            <div>
              <SectionLabel>{t.email}</SectionLabel>
              <Input value={content.contact.email} onChange={(e) => patch((c) => { c.contact.email = e.target.value; })} />
            </div>
            <div>
              <SectionLabel>{t.phone}</SectionLabel>
              <Input value={content.contact.phone} onChange={(e) => patch((c) => { c.contact.phone = e.target.value; })} />
            </div>
          </SectionCard>

          <SaveBar>
            <PrimaryButton onClick={save} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? t.saving : t.save}
            </PrimaryButton>
            {saveState === 'saved' && <span style={{ color: '#2e9e5b', fontWeight: 700 }}>{t.saved}</span>}
            {saveState === 'error' && <ErrorText>{t.saveError}</ErrorText>}
          </SaveBar>
        </>
      )}

      {sub === 'leads' && (
        leads.length === 0 ? (
          <SectionCard><span>{t.noLeads}</span></SectionCard>
        ) : (
          <SectionCard>
            <Table>
              <thead>
                <tr>
                  <Th>{t.handled}</Th>
                  <Th>{t.leadDate}</Th>
                  <Th>{t.leadName}</Th>
                  <Th>{t.leadEmail}</Th>
                  <Th>{t.leadPhone}</Th>
                  <Th>{t.leadCompany}</Th>
                  <Th>{t.leadPosition}</Th>
                  <Th>{t.leadMessage}</Th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id} style={{ opacity: lead.handled ? 0.55 : 1 }}>
                    <Td><input type="checkbox" checked={lead.handled} onChange={() => toggleHandled(lead)} /></Td>
                    <Td>{new Date(lead.createdAt).toLocaleDateString()}</Td>
                    <Td>{lead.name}</Td>
                    <Td>{lead.email}</Td>
                    <Td>{lead.phone || '—'}</Td>
                    <Td>{lead.company || '—'}</Td>
                    <Td>{lead.position || '—'}</Td>
                    <Td>{lead.message || '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </SectionCard>
        )
      )}
    </Container>
  );
}
