import { useRef, useState } from "react";
import { styled } from "@mui/material/styles";
import { useTranslations } from "../../../context/LanguageContext";
import { texts } from "./TourismPage.i18n";
import Hero from "../shared/Hero";
import StatStrip from "../shared/StatStrip";
import IconCardRow from "../shared/IconCardRow";
import MarketingEngine from "../shared/MarketingEngine";
import CustomerLogos from "../shared/CustomerLogos";
import Testimonials from "../shared/Testimonials";
import ContactForm from "../shared/ContactForm";
import Faq from "../shared/Faq";
import Reveal from "../shared/Reveal";
import { Band, Container, H2, H3, Body, SectionIntro } from "../shared/styled";
import { C, SHADOW, RADIUS, BP, REDUCED_MOTION } from "../shared/tokens";
import { CONTACT_ANCHOR } from "../shared/routes";

/** The single-line takeaway between the two card rows. */
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

// ─── Case study ───

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
});

/** A real button: the chips switch the card beneath them, so they are controls. */
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
  [BP.mobile]: { fontSize: 11.5, padding: "8px 12px" },
}));

/**
 * Step markers, traced from the frame at y2432 (x643 / x826 / x1013).
 *
 * Inline rather than `<img>` so they inherit `currentColor` from the chip: the
 * active step is white on purple and the other two are #675A6D, the same colour
 * as their own label, so one drawing serves both states.
 */
function StepPlay() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      {/*
        Points RIGHT and does NOT mirror. Verified against the frame: isolated at
        30x the comp's chip icon (x1006..1020, y2426..2439) has its flat edge on
        the left and its apex on the right, in Hebrew. A play triangle is a
        transport control, not a directional cue like the CTA arrow.
      */}
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

/** Positional, not translated copy - so it lives here rather than in the i18n. */
const STEP_ICONS = [StepPlay, StepPuzzle, StepSparkles];

/**
 * Also positional. Only stage 1's clip has been supplied so far; the other two
 * fall back to the placeholder panel until their footage arrives.
 */
const STAGE_VIDEOS: (string | undefined)[] = [
  "/images/marketing/case-step-1.mp4",
  undefined,
  undefined,
];

/** The comp closes each line with a ringed tick, not a bare glyph. */
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
  display: "grid",
  gridTemplateColumns: "1fr",
  /**
   * Measured: the card runs x214..1300 with the copy taking 449 and the media
   * 637 - not an even split. DOM order puts the copy first, which under RTL is
   * the right-hand column, as the frame has it.
   */
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

/**
 * The clip is portrait (285x374 inside a 637-wide panel in the frame) and is
 * letterboxed against a grey ramp, not cropped to fill. Sampled down the bars:
 * FAFAFA at the top, holding F2F2F2 to halfway, then CECECE / A1A1A1 / 747474.
 */
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
  /** `contain`, not `cover` - cropping a portrait clip to fill is what made it huge. */
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

/** Sampled from the frame: #252525 pill, white text, #EF4444 dot. */
const MediaCaption = styled("div")({
  position: "absolute",
  /** Bottom-right in the frame, which under RTL is the inline start. */
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
  /**
   * The frame shows a play affordance over a still, so the clip does not
   * autoplay - it waits for the click, and the overlay hides once it is running.
   */
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const active = t.caseStages[stage];
  const video = STAGE_VIDEOS[stage];

  return (
    <>
      <Hero
        titleTop={t.heroTitleTop}
        titleBottom={t.heroTitleBottom}
        titleThird={t.heroTitleThird}
        lead={t.heroLead}
        primaryCta={t.heroCta}
        primaryHref={CONTACT_ANCHOR}
        secondaryCta={t.heroSecondary}
        secondaryHref={CONTACT_ANCHOR}
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
            {/* Open book with a ribbon, traced from the frame at x789..803 / y2221..2232.
                It is NOT a play marker, and its #A855F7 is lighter than the label's
                #6B21A8 - so it carries its own colour rather than currentColor.
                Glyph first: the first flex child renders rightmost under RTL, which is
                the side the comp puts it on. */}
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
            {/* Icon first: the first flex child lands at the inline start, which
                under RTL is the right - the side the frame puts it on. */}
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
              {/* Stages 2 and 3 have no footage yet, so they keep the placeholder. */}
              {video ? (
                <MediaPanel>
                  {/*
                    Not muted: `play()` runs off the overlay click, so it is a user
                    gesture and browsers allow sound. Native controls appear once it
                    is running - without them there was no way to pause. No `loop`,
                    so it ends and hands back to the overlay.
                  */}
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
                  {/* Hidden while playing so it does not sit over the controls bar. */}
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

      <MarketingEngine videoUrl="/images/marketing/engine-park.mp4" />

      <CustomerLogos
        title={t.customersTitle}
        items={t.customers}
        bg={C.bandPink}
      />

      <ContactForm tone="purple" />
      <Testimonials items={t.testimonials} />
      <Faq title={t.faqTitle} items={t.faq} />
    </>
  );
}
