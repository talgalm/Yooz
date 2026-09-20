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

/**
 * `plain` is the standard split hero: copy one side, art the other.
 * `photo` is the Academy variant: a full-bleed photograph with a violet wash
 * over the reading side and white copy laid on top.
 */
export type HeroTone = "plain" | "photo";

interface HeroProps {
  titleTop: string;
  /** Second line, carrying the magenta sweep. */
  titleBottom: string;
  titleThird?: string;
  lead?: string;
  bullets?: string[];
  primaryCta: string;
  primaryHref: string;
  secondaryCta?: string;
  secondaryHref?: string;
  mediaUrl?: string;
  mediaAlt?: string;
  tone?: HeroTone;
  /** Cream and violet washes behind the art (Home). */
  blobs?: boolean;
  /** Rotated pink card behind the photo (Tourism). */
  pinkFrame?: boolean;
  /** Extra content under the actions, e.g. a StatStrip. */
  children?: ReactNode;
}

/**
 * The hero has no bottom edge. It dissolves into the section below over roughly
 * 180px - see `HERO_FADE`. Cutting it off with a flat rectangle is the single
 * most visible way to get this section wrong.
 */
const Root = styled("section")<{ tone: HeroTone }>(({ tone }) => ({
  position: "relative",
  overflow: "hidden",
  background: tone === "photo" ? C.heading : HERO_FADE,
  // Measured: the art begins 14px under the 90px nav, so the top pad is small.
  paddingBlock: tone === "photo" ? 0 : "16px 96px",
  [BP.mobile]: { paddingBlock: tone === "photo" ? 0 : "18px 56px" },
}));

/**
 * Not a 50/50 split - the art takes the wider column, with the copy (first
 * child, so the right-hand side under RTL) narrower.
 *
 * Eased back from 1.95 to 1.6, which takes the art from ~66% of the row to ~62%
 * and hands the difference to the copy, where the bullet list was wrapping hard.
 */
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

// ─── Art ───

/**
 * The washes are page-level, not part of the media column: measured against the
 * 1512-wide frame they run from the left edge to roughly 55% of the page.
 */
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

/** The rotated pink card peeking out behind the Tourism photo. */
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

/** The Home art is a cut-out with its own transparency - no frame, no clipping. */
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

// ─── Photo (Academy) variant ───

/**
 * 1512 x 634 in the file, cut back ~35%. The stage grows past `minHeight`
 * whenever the copy is taller, so this, the padding and the H1 are one sizing
 * decision - changing any of them alone does nothing.
 */
const PhotoStage = styled("div")({
  position: "relative",
  minHeight: 495,
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
  [BP.mobile]: { minHeight: 360 },
});

/**
 * The file's gradient is horizontal, FFFFFF a0 -> 5B005B a1 at 0.54 fill
 * opacity. The end stop is baked to 54% alpha here because CSS gradients have no
 * layer-opacity equivalent.
 */
const PhotoBg = styled("div")<{ src?: string }>(({ src }) => ({
  position: "absolute",
  inset: 0,
  backgroundImage: src
    ? `linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(91,0,91,0.54) 100%), url(${src})`
    : `linear-gradient(120deg, ${C.heading}, ${C.purpleDeep})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  /** Gradients carry no logical direction, so mirror it to follow the panel. */
  '[dir="ltr"] &': src
    ? {
        backgroundImage: `linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(91,0,91,0.54) 100%), url(${src})`,
      }
    : {},
}));

/** The copy panel: `SOLID 360A4D` at 78%, x730..1512 / y224..723 in the file. */
const PhotoWash = styled("div")({
  position: "absolute",
  /** Inline-start, matching the copy's `margin-inline-end: auto`, so both sit on the same side. */
  insetInlineStart: 0,
  /**
   * Coupled to `PhotoCopy`'s `padding-block`: this is a percentage of the stage
   * and that is fixed px, so they agree at only one height. Move either and
   * check the heading still lands inside the panel.
   */
  top: "10%",
  /** 782 at the 1512 frame, opened to 860 to hold the H1 on two lines. */
  width: "min(56.9%, 860px)",
  /**
   * The mobile reset is nested inside this rule on purpose: `[dir="ltr"] &` is
   * (0,1,1) against `BP.mobile`'s bare class at (0,1,0), and media queries add
   * no specificity - so the LTR rule wins at every width otherwise.
   */
  '[dir="ltr"] &': {
    width: "min(68%, 1040px)",
    [BP.mobile]: { width: "100%" },
  },
  height: "90%",
  background: "rgba(54,10,77,0.78)",
  /** `radii=[75,0,0,0]` in the file: the one corner floating over the photo. */
  borderStartEndRadius: 75,
  /** Full-bleed here, so the floating corner has no edge to round against. */
  [BP.mobile]: {
    top: 0,
    width: "100%",
    height: "100%",
    borderStartEndRadius: 0,
  },
});

/** Text is right-aligned in the file (H1 at x757, lead at x826), not centred. */
const PhotoCopy = styled("div")({
  position: "relative",
  zIndex: 1,
  /** Same basis as the panel, so the two scale and freeze together. */
  maxWidth: "min(47.6%, 720px)",
  /** English needs the longer measure; mobile nested for the specificity reason above. */
  '[dir="ltr"] &': {
    maxWidth: "min(58%, 900px)",
    [BP.mobile]: { maxWidth: "none" },
    /** Same reason as the shared `H1`: English needs a smaller measure here. */
    "& h1": {
      fontSize: "clamp(29px, 4vw, 60px)",
      [BP.mobile]: { fontSize: 31, lineHeight: 1.18 },
    },
  },
  /** `inline-END: auto` parks the box at the inline START - the panel's side. */
  marginInlineEnd: "auto",
  /** File has 39/100/49/74; eased to 72 here. */
  paddingInlineStart: 72,
  paddingBlock: "100px 70px",
  color: C.white,
  textAlign: "start",
  animation: `${fadeUp} 0.6s ease-out both`,
  /** File: 80/700/89. Scaled back with the stage - it drives the hero's height. */
  "& h1": {
    color: C.white,
    fontSize: "clamp(31px, 4.6vw, 68px)",
    fontWeight: 700,
    lineHeight: 1.11,
    /**
     * This selector outranks `H1`'s own class, so the shared mobile size never
     * reaches it - without this the Academy hero stayed at the 31px floor while
     * every other hero went to 48.
     */
    [BP.mobile]: { fontSize: 46, lineHeight: 1.12 },
  },
  /** Full-bleed here, and `paddingBlock` must be reset or phones inherit 170px of it. */
  [BP.mobile]: {
    maxWidth: "none",
    paddingInlineStart: 24,
    paddingInlineEnd: 24,
    paddingBlock: "56px 44px",
  },
  [REDUCED_MOTION]: { animation: "none" },
});

/** 24 / 400 in the file. */
const PhotoLead = styled("p")({
  fontSize: "clamp(16px, 1.6vw, 24px)",
  lineHeight: 1.35,
  color: "rgba(255,255,255,0.92)",
  margin: "0 0 28px",
});

/**
 * A pipe-delimited lead is rendered as a marked list rather than as prose.
 *
 * In the file this is one text node reading "a | b | c | d | e". Set as a
 * paragraph the pipes break wherever the line happens to end, stranding one at
 * the edge. As list items each phrase stays whole and wraps as a unit.
 *
 * Rendered as small translucent pills. A dot-marker variant was tried in between
 * and rejected; the pills read better here, just sized down so they sit under the
 * 80px headline rather than competing with it.
 */
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
  // Button box is 215 x 68 with 24 / 500 type.
  padding: "20px 46px",
  minWidth: 215,
  boxSizing: "border-box",
  fontSize: 24,
  fontWeight: 500,
  boxShadow: SHADOW.card,
  transition: "transform 0.16s ease",
  "&:hover": { transform: "translateY(-2px)" },
  /** 215 x 68 at 24pt is a desktop box - on a phone it runs most of the width. */
  [BP.mobile]: { padding: "14px 30px", minWidth: 0, fontSize: 17 },
  [REDUCED_MOTION]: { transition: "none", "&:hover": { transform: "none" } },
});

/**
 * The marker on the secondary CTA. Drawn rather than typed: the `◁` character it
 * replaced is a font glyph, so its weight, size and vertical alignment were at
 * the mercy of whichever face happened to cover that codepoint. `currentColor`
 * keeps it locked to the button's text colour, including on hover.
 */
/**
 * The path puts its apex at x=2.9 and its base at x=9.2, so it points LEFT -
 * correct for Hebrew. An SVG path carries no logical direction, so LTR has to
 * mirror it by hand, the same as the `ArrowGlyph` in `FeatureSplit`.
 */
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
            <Actions>
              <WhiteCta href={primaryHref}>{primaryCta}</WhiteCta>
            </Actions>
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
          {/* Positions traced from the frame: cream low-left, violet above it. */}
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
            <Actions>
              <CtaButton href={primaryHref}>{primaryCta}</CtaButton>
              {secondaryCta && (
                <GhostButton href={secondaryHref ?? primaryHref}>
                  <PlayGlyph />
                  {secondaryCta}
                </GhostButton>
              )}
            </Actions>
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
