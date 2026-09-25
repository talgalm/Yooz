import { ReactNode } from "react";
import { styled } from "@mui/material/styles";
import { C, HERO_FADE, SHADOW, RADIUS, BP, REDUCED_MOTION } from "./tokens";
import {
  Container,
  H1,
  Lead,
  CtaButton,
  GhostButton,
  GradientText,
  fadeUp,
} from "./styled";
import SoftBlob from "./SoftBlob";

export type HeroTone = "plain" | "photo";

interface HeroProps {
  titleTop: string;
  titleBottom: string;
  titleThird?: string;
  lead?: string;
  bullets?: string[];
  primaryCta?: string;
  primaryHref?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  mediaUrl?: string;
  mediaAlt?: string;
  tone?: HeroTone;
  blobs?: boolean;
  pinkFrame?: boolean;
  children?: ReactNode;
}

const Root = styled("section")<{ tone: HeroTone }>(({ tone }) => ({
  position: "relative",
  overflow: "hidden",
  background: tone === "photo" ? C.heading : HERO_FADE,
  paddingBlock: tone === "photo" ? 0 : "16px 96px",
  [BP.mobile]: { paddingBlock: tone === "photo" ? 0 : "18px 56px" },
}));

const Split = styled("div")({
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 34,
  alignItems: "center",
  "@media (min-width: 901px)": { gridTemplateColumns: "1fr 1.6fr", gap: 28 },
});

const Copy = styled("div")({
  animation: `${fadeUp} 0.6s ease-out both`,
  [REDUCED_MOTION]: { animation: "none" },
});

const Bullets = styled("ul")({
  listStyle: "none",
  margin: "0 0 30px",
  padding: 0,
  display: "grid",
  gap: 13,
});

const Bullet = styled("li")({
  position: "relative",
  paddingInlineStart: 20,
  fontSize: 15.5,
  lineHeight: 1.75,
  color: C.ink,
  "&::before": {
    content: '""',
    position: "absolute",
    insetInlineStart: 0,
    top: 10,
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: C.heading,
  },
  [BP.mobile]: { fontSize: 14.5 },
});

const Actions = styled("div")({
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "center",
});

const BlobField = styled("div")({
  position: "absolute",
  inset: 0,
  zIndex: 0,
  pointerEvents: "none",
  "@media (max-width: 900px)": { opacity: 0.75 },
});

const MediaWrap = styled("div")({
  position: "relative",
  zIndex: 1,
  animation: `${fadeUp} 0.6s ease-out 0.12s both`,
  [REDUCED_MOTION]: { animation: "none" },
});

const PinkFrame = styled("div")({
  position: "absolute",
  inset: "-16px -18px",
  background: C.vennShareEdge,
  borderRadius: 38,
  transform: "rotate(-2.2deg)",
  zIndex: 0,
});

const MediaFrame = styled("div")({
  position: "relative",
  zIndex: 1,
  borderRadius: RADIUS.frame,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const MediaImg = styled("img")({
  width: "100%",
  height: "auto",
  display: "block",
});

const BareImg = styled("img")({
  width: "100%",
  height: "auto",
  display: "block",
  position: "relative",
  zIndex: 1,
});

const MediaFallback = styled("div")({
  width: "100%",
  aspectRatio: "4 / 3",
  borderRadius: RADIUS.frame,
  background: `linear-gradient(135deg, ${C.blobPurple}, ${C.vennShare})`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: C.purple,
  fontSize: 13,
  fontWeight: 700,
  textAlign: "center",
  padding: 24,
});

const PhotoStage = styled("div")({
  position: "relative",
  minHeight: 495,
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
  [BP.mobile]: { minHeight: 360 },
});

const PhotoBg = styled("div")<{ src?: string }>(({ src }) => ({
  position: "absolute",
  inset: 0,
  backgroundImage: src
    ? `linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(91,0,91,0.54) 100%), url(${src})`
    : `linear-gradient(120deg, ${C.heading}, ${C.purpleDeep})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  '[dir="ltr"] &': src
    ? {
        backgroundImage: `linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(91,0,91,0.54) 100%), url(${src})`,
      }
    : {},
}));

const PhotoWash = styled("div")({
  position: "absolute",
  insetInlineStart: 0,
  top: "10%",
  width: "min(56.9%, 860px)",
  '[dir="ltr"] &': {
    width: "min(68%, 1040px)",
    [BP.mobile]: { width: "100%" },
  },
  height: "90%",
  background: "rgba(54,10,77,0.78)",
  borderStartEndRadius: 75,
  [BP.mobile]: {
    top: 0,
    width: "100%",
    height: "100%",
    borderStartEndRadius: 0,
  },
});

const PhotoCopy = styled("div")({
  position: "relative",
  zIndex: 1,
  maxWidth: "min(47.6%, 720px)",
  '[dir="ltr"] &': {
    maxWidth: "min(58%, 900px)",
    [BP.mobile]: { maxWidth: "none" },
    "& h1": {
      fontSize: "clamp(29px, 4vw, 60px)",
      [BP.mobile]: { fontSize: 31, lineHeight: 1.18 },
    },
  },
  marginInlineEnd: "auto",
  paddingInlineStart: 72,
  paddingBlock: "100px 70px",
  color: C.white,
  textAlign: "start",
  animation: `${fadeUp} 0.6s ease-out both`,
  "& h1": {
    color: C.white,
    fontSize: "clamp(31px, 4.6vw, 68px)",
    fontWeight: 700,
    lineHeight: 1.11,
    [BP.mobile]: { fontSize: 46, lineHeight: 1.12 },
  },
  [BP.mobile]: {
    maxWidth: "none",
    paddingInlineStart: 24,
    paddingInlineEnd: 24,
    paddingBlock: "56px 44px",
  },
  [REDUCED_MOTION]: { animation: "none" },
});

const PhotoLead = styled("p")({
  fontSize: "clamp(16px, 1.6vw, 24px)",
  lineHeight: 1.35,
  color: "rgba(255,255,255,0.92)",
  margin: "0 0 28px",
});

const LeadList = styled("ul")({
  display: "flex",
  flexWrap: "wrap",
  gap: 9,
  listStyle: "none",
  margin: "0 0 34px",
  padding: 0,
});

const LeadItem = styled("li")({
  display: "inline-flex",
  alignItems: "center",
  fontSize: "clamp(12.5px, 1.05vw, 15.5px)",
  fontWeight: 500,
  lineHeight: 1.3,
  color: C.white,
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: RADIUS.pill,
  padding: "8px 16px",
  whiteSpace: "nowrap",
  [BP.mobile]: { fontSize: 14, padding: "8px 15px" },
});

const WhiteCta = styled("a")({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: C.white,
  color: C.heading,
  textDecoration: "none",
  borderRadius: RADIUS.button,
  padding: "20px 46px",
  minWidth: 215,
  boxSizing: "border-box",
  fontSize: 24,
  fontWeight: 500,
  boxShadow: SHADOW.card,
  transition: "transform 0.16s ease",
  "&:hover": { transform: "translateY(-2px)" },
  [BP.mobile]: { padding: "14px 30px", minWidth: 0, fontSize: 17 },
  [REDUCED_MOTION]: { transition: "none", "&:hover": { transform: "none" } },
});

const Play = styled("svg")({
  flexShrink: 0,
  '[dir="ltr"] &': { transform: "scaleX(-1)" },
});

function PlayGlyph() {
  return (
    <Play width="16" height="18" viewBox="0 0 12 12" fill="none" aria-hidden focusable="false">
      <path
        d="M9.2 1.8 2.9 6l6.3 4.2z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Play>
  );
}

export default function Hero({
  titleTop,
  titleBottom,
  titleThird,
  lead,
  bullets,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  mediaUrl,
  mediaAlt,
  tone = "plain",
  blobs,
  pinkFrame,
  children,
}: HeroProps) {
  if (tone === "photo") {
    return (
      <Root tone="photo">
        <PhotoStage>
          <PhotoBg src={mediaUrl} />
          <PhotoWash />
          <PhotoCopy>
            <H1>
              {titleTop}
              <br />
              {titleBottom}
            </H1>
            {lead &&
              (lead.includes("|") ? (
                <LeadList>
                  {lead
                    .split("|")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s) => (
                      <LeadItem key={s}>{s}</LeadItem>
                    ))}
                </LeadList>
              ) : (
                <PhotoLead>{lead}</PhotoLead>
              ))}
            {primaryCta && primaryHref && (
              <Actions>
                <WhiteCta href={primaryHref}>{primaryCta}</WhiteCta>
              </Actions>
            )}
            {children}
          </PhotoCopy>
        </PhotoStage>
      </Root>
    );
  }

  return (
    <Root tone="plain">
      {blobs && (
        <BlobField aria-hidden>
          <SoftBlob
            color={C.blobCream}
            intensity={0.95}
            softness={34}
            duration={30}
            style={{ left: "-4%", top: "26%", width: "48%", height: "78%" }}
          />
          <SoftBlob
            color={C.blobPurple}
            intensity={0.8}
            softness={38}
            duration={24}
            delay={-7}
            style={{ left: "5%", top: "2%", width: "52%", height: "86%" }}
          />
        </BlobField>
      )}

      <Container>
        <Split>
          <Copy>
            <H1>
              {titleTop}
              <br />
              <GradientText>{titleBottom}</GradientText>
              {titleThird && (
                <>
                  <br />
                  {titleThird}
                </>
              )}
            </H1>
            {lead && <Lead>{lead}</Lead>}
            {bullets && bullets.length > 0 && (
              <Bullets>
                {bullets.map((b) => (
                  <Bullet key={b}>{b}</Bullet>
                ))}
              </Bullets>
            )}
            {primaryCta && primaryHref && (
              <Actions>
                <CtaButton href={primaryHref}>{primaryCta}</CtaButton>
                {secondaryCta && (
                  <GhostButton href={secondaryHref ?? primaryHref}>
                    <PlayGlyph />
                    {secondaryCta}
                  </GhostButton>
                )}
              </Actions>
            )}
            {children}
          </Copy>

          <MediaWrap>
            {pinkFrame && <PinkFrame aria-hidden />}
            {blobs ? (
              mediaUrl ? (
                <BareImg src={mediaUrl} alt={mediaAlt ?? ""} />
              ) : null
            ) : (
              <MediaFrame>
                {mediaUrl ? (
                  <MediaImg src={mediaUrl} alt={mediaAlt ?? ""} />
                ) : (
                  <MediaFallback>{mediaAlt ?? "Yooz"}</MediaFallback>
                )}
              </MediaFrame>
            )}
          </MediaWrap>
        </Split>
      </Container>
    </Root>
  );
}
