import { useRef, useState } from "react";
import { styled } from "@mui/material/styles";
import { useTranslations } from "../../../context/LanguageContext";
import { texts } from "./TourismPage.i18n";
import Hero from "../shared/Hero";
import StatStrip from "../shared/StatStrip";
import IconCardRow from "../shared/IconCardRow";
import MarketingEngine from "../shared/MarketingEngine";
import CustomerLogos from "../shared/CustomerLogos";
import ContactForm from "../shared/ContactForm";
import Testimonials from "../shared/Testimonials";
import Faq from "../shared/Faq";
import Reveal from "../shared/Reveal";
import useStopWhenUnseen from "../shared/useStopWhenUnseen";
import { Band, Container, H2, H3, Body, SectionIntro } from "../shared/styled";
import { C, SHADOW, RADIUS, BP, REDUCED_MOTION } from "../shared/tokens";

const BottomLine = styled("p")({
  maxWidth: 940,
  marginInline: "auto",
  marginTop: 40,
  marginBottom: 0,
  background: C.white,
  border: `1.5px solid ${C.vennShareEdge}`,
  borderRadius: RADIUS.pill,
  padding: "20px 32px",
  textAlign: "center",
  fontSize: 15.5,
  lineHeight: 1.7,
  color: C.heading,
  [BP.mobile]: { fontSize: 14, padding: "16px 18px", borderRadius: 20 },
});

const BottomLabel = styled("span")({ fontWeight: 800, display: "block" });

const CaseHead = styled("div")({ textAlign: "center" });

const CaseTag = styled("span")({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  fontWeight: 800,
  color: C.purple,
  background: C.white,
  border: `1px solid ${C.vennEngageEdge}`,
  borderRadius: RADIUS.pill,
  padding: "7px 16px",
  marginBottom: 16,
});

const CaseSubtitle = styled("div")({
  fontSize: "clamp(19px, 2.2vw, 26px)",
  fontWeight: 900,
  color: C.heading,
  marginBottom: 10,
});

const Steps = styled("div")({
  display: "inline-flex",
  background: C.white,
  borderRadius: RADIUS.button,
  boxShadow: SHADOW.card,
  padding: 6,
  gap: 6,
  marginBottom: 30,
  flexWrap: "wrap",
  justifyContent: "center",
  [BP.mobile]: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    gap: 8,
    padding: 8,
  },
});

const Step = styled("button")<{ active?: boolean }>(({ active }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 13,
  fontWeight: 700,
  padding: "10px 18px",
  borderRadius: 8,
  whiteSpace: "nowrap",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  background: active ? C.purple : "transparent",
  color: active ? C.white : C.inkSoft,
  "& svg": { flexShrink: 0 },
  [BP.mobile]: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "20px 1fr",
    alignItems: "center",
    gap: 10,
    textAlign: "start",
    whiteSpace: "normal",
    fontSize: 15,
    padding: "14px 18px",
  },
}));

function StepPlay() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.2 8.4 16 12l-5.8 3.6z" fill="currentColor" />
    </svg>
  );
}

function StepPuzzle() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path
        d="M5 5.4h4.8a2.5 2.5 0 1 1 4.6 0H19v4.4a2.5 2.5 0 1 0 0 4.6V19H5v-4.6a2.5 2.5 0 1 0 0-4.6z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StepSparkles() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M9 5.5 10.4 9.6 14.5 11 10.4 12.4 9 16.5 7.6 12.4 3.5 11 7.6 9.6z" />
      <path d="M17.5 4 18.2 6.05 20.25 6.75 18.2 7.45 17.5 9.5 16.8 7.45 14.75 6.75 16.8 6.05z" />
      <path d="M16.5 14.5 17.1 16.3 18.9 16.9 17.1 17.5 16.5 19.3 15.9 17.5 14.1 16.9 15.9 16.3z" />
    </svg>
  );
}

const STEP_ICONS = [StepPlay, StepPuzzle, StepSparkles];

const STAGE_VIDEOS: (string | undefined)[] = [
  "/images/marketing/case-step-1.mp4",
  "/images/marketing/case-step-2.mp4",
  "/images/marketing/case-step-3.mp4",
];

function RingCheck() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1E8A53"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.3 2.4 2.4 4.8-5" />
    </svg>
  );
}

const CaseCard = styled("div")({
  background: C.white,
  borderRadius: RADIUS.cardLarge,
  boxShadow: SHADOW.cardHover,
  overflow: "hidden",
  width: "100%",
  maxWidth: 1086,
  marginInline: "auto",
  display: "grid",
  gridTemplateColumns: "1fr",
  "@media (min-width: 901px)": { gridTemplateColumns: "0.7fr 1fr" },
});

const CaseCopy = styled("div")({
  padding: "34px 32px",
  [BP.mobile]: { padding: "24px 20px" },
});

const StepLabel = styled("span")({
  display: "inline-block",
  fontSize: 11.5,
  fontWeight: 800,
  color: C.purple,
  background: C.shell,
  borderRadius: 7,
  padding: "5px 12px",
  marginBottom: 14,
});

const Checks = styled("ul")({
  listStyle: "none",
  margin: "18px 0 0",
  padding: 0,
  display: "grid",
  gap: 10,
});

const Check = styled("li")({
  display: "flex",
  gap: 9,
  alignItems: "center",
  fontSize: 13,
  fontWeight: 700,
  color: C.heading,
  "& svg": { flexShrink: 0 },
});

const MediaPanel = styled("div")({
  position: "relative",
  minHeight: 360,
  background:
    "linear-gradient(to bottom, #FAFAFA 0%, #F2F2F2 50%, #CECECE 66%, #A1A1A1 82%, #6E6E6E 100%)",
  overflow: "hidden",
});

const CaseVideo = styled("video")({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

const PlayOverlay = styled("button")({
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: 58,
  height: 58,
  padding: 0,
  border: "none",
  borderRadius: "50%",
  cursor: "pointer",
  background: "rgba(255,255,255,0.82)",
  color: C.heading,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.16s ease, transform 0.16s ease",
  "&:hover": {
    background: "rgba(255,255,255,0.95)",
    transform: "translate(-50%, -50%) scale(1.06)",
  },
  [REDUCED_MOTION]: {
    transition: "none",
    "&:hover": { transform: "translate(-50%, -50%)" },
  },
});

const MediaCaption = styled("div")({
  position: "absolute",
  insetInlineStart: 14,
  bottom: 14,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  maxWidth: "calc(100% - 28px)",
  background: "#252525",
  color: C.white,
  fontSize: 11.5,
  fontWeight: 600,
  borderRadius: RADIUS.pill,
  padding: "6px 12px",
});

const RecDot = styled("span")({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: "#EF4444",
  flexShrink: 0,
});

const CaseMedia = styled("div")({
  background: C.heading,
  minHeight: 280,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.72)",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
  padding: 24,
});

export default function TourismPage() {
  const t = useTranslations(texts);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = t.caseStages[stage];
  const video = STAGE_VIDEOS[stage];
  useStopWhenUnseen(videoRef, { src: video });

  return (
    <>
      <Hero
        titleTop={t.heroTitleTop}
        titleBottom={t.heroTitleBottom}
        titleThird={t.heroTitleThird}
        lead={t.heroLead}
        mediaUrl="/images/marketing/hero-tourism.jpg"
        mediaAlt={t.heroMediaAlt}
        pinkFrame
      >
        <StatStrip items={t.stats} />
      </Hero>

      <Band bg={C.paper} style={{ paddingBottom: 40 }}>
        <Container>
          <H2>{t.knowledgeTitle}</H2>
        </Container>
        <IconCardRow
          items={t.knowledgeCards.map((c) => ({ ...c, iconBg: C.vennShare }))}
          min={200}
        />
        <Container>
          <BottomLine>
            <BottomLabel>{t.bottomLineLabel}</BottomLabel>
            {t.bottomLine}
          </BottomLine>
        </Container>
      </Band>

      <Band bg={C.paperSoft} style={{ paddingBottom: 40 }}>
        <Container>
          <H2>{t.fitTitle}</H2>
          <SectionIntro>{t.fitIntro}</SectionIntro>
        </Container>
        <IconCardRow
          items={t.fitCards.map((c) => ({ ...c, iconBg: C.blobPurple }))}
          min={230}
        />
      </Band>

      <Band bg={C.paper}>
        <Container>
          <CaseHead>
            <CaseTag>
              <img
                src="/images/marketing/icons/tour-book.svg"
                alt=""
                width={20}
                height={20}
                style={{ display: "block" }}
              />
              {t.caseTag}
            </CaseTag>
            <H2 style={{ marginBottom: 6 }}>{t.caseTitle}</H2>
            <CaseSubtitle>{t.caseSubtitle}</CaseSubtitle>
            <SectionIntro style={{ marginBottom: 26 }}>
              {t.caseIntro}
            </SectionIntro>
            <Steps>
              {t.caseSteps.map((s, i) => {
                const Icon = STEP_ICONS[i];
                return (
                  <Step
                    key={s}
                    type="button"
                    active={i === stage}
                    aria-pressed={i === stage}
                    onClick={() => {
                      setStage(i);
                      setPlaying(false);
                    }}
                  >
                    {Icon ? <Icon /> : null}
                    {s}
                  </Step>
                );
              })}
            </Steps>
          </CaseHead>

          <Reveal>
            <CaseCard>
              <CaseCopy>
                <StepLabel>{active.label}</StepLabel>
                <H3 style={{ fontSize: 21 }}>{active.title}</H3>
                <Body>{active.body}</Body>
                <Checks>
                  {active.checks.map((c) => (
                    <Check key={c}>
                      <RingCheck />
                      {c}
                    </Check>
                  ))}
                </Checks>
              </CaseCopy>
              {video ? (
                <MediaPanel>
                  <CaseVideo
                    key={video}
                    ref={videoRef}
                    src={video}
                    playsInline
                    preload="metadata"
                    controls={playing}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                  />
                  {!playing && (
                    <PlayOverlay
                      type="button"
                      onClick={() => videoRef.current?.play()}
                      aria-label={active.mediaAlt}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
                        <path d="M8 5.2 19 12 8 18.8z" />
                      </svg>
                    </PlayOverlay>
                  )}
                  {!playing && (
                    <MediaCaption>
                      <RecDot aria-hidden />
                      {active.mediaAlt}
                    </MediaCaption>
                  )}
                </MediaPanel>
              ) : (
                <CaseMedia>{active.mediaAlt}</CaseMedia>
              )}
            </CaseCard>
          </Reveal>
        </Container>
      </Band>

      <MarketingEngine
        videoUrl="/images/marketing/engine-park.mp4"
        clipUrl="/images/marketing/case-step-3.mp4"
        clipPosterUrl="/images/marketing/keepsake-poster.jpg"
      />

      <CustomerLogos
        title={t.customersTitle}
        items={t.customers}
        bg={C.bandPink}
      />

      <Testimonials title={t.testimonialsTitle} items={t.testimonials} dense />

      <Faq title={t.faqTitle} items={t.faq} />
      <ContactForm tone="purple" closing />
    </>
  );
}
