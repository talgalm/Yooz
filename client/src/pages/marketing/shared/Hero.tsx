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
 * The hero frame is 1512 x 634 in the file, cut back by ~35% here by request -
 * at full height it ate most of the viewport on every screen size. The padding
 * and type inside came down with it: the stage grows past `minHeight` whenever
 * the copy is taller, so trimming this alone would have changed nothing.
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
 * Two layers, not one. The photograph carries its own gradient fill, whose
 * direction and strength both come from the file rather than being assumed:
 *
 *   handles  start=(0, 0.5) -> end=(1, 0.5)   i.e. horizontal, left to right
 *   stops    FFFFFF a0.00  ->  5B005B a1.00
 *   fill opacity 0.54                          i.e. never full strength
 *
 * So the end stop composites to 54% alpha, baked in here because CSS gradients
 * have no layer-opacity equivalent. Running it `to bottom` at full strength (an
 * earlier guess) darkened the foot of the hero and made the copy panel read as a
 * hard-edged box against it.
 */
const PhotoBg = styled("div")<{ src?: string }>(({ src }) => ({
  position: "absolute",
  inset: 0,
  backgroundImage: src
    ? `linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(91,0,91,0.54) 100%), url(${src})`
    : `linear-gradient(120deg, ${C.heading}, ${C.purpleDeep})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  /**
   * CSS gradients have no logical direction, so this has to be mirrored by hand.
   * The wash darkens toward whichever edge the copy panel sits on - the inline
   * start, so the right under RTL and the left under LTR.
   */
  '[dir="ltr"] &': src
    ? {
        backgroundImage: `linear-gradient(to left, rgba(255,255,255,0) 0%, rgba(91,0,91,0.54) 100%), url(${src})`,
      }
    : {},
}));

/**
 * The copy panel: `SOLID 360A4D` at 78% opacity, inset rather than full-bleed.
 * In the file it runs x730..1512 and y224..723 of a hero starting at y89 - so it
 * floats against the right edge, clear of the top and bottom.
 */
const PhotoWash = styled("div")({
  position: "absolute",
  /**
   * Inline-START, matching the copy's `margin-inline-end: auto`, which puts the
   * text at the inline start too. Under RTL that is the right edge, as the file
   * has it; under LTR both flip to the left together. `inset-inline-END` is the
   * opposite edge and split the two apart - panel on one side, its own text on
   * the other.
   */
  insetInlineStart: 0,
  /**
   * The panel's top is a PERCENTAGE of the stage while the copy's is a fixed
   * `padding-block` - so the two only agree at one stage height. At the file's
   * 634 the frame's 21.3% sat above the copy's 200px padding; once that padding
   * came down to 100 the panel started BELOW the heading and its first line
   * spilled onto bare photograph. Raised to keep the copy inside its backdrop,
   * and the height raised with it so the panel stays flush to the foot.
   */
  top: "10%",
  /**
   * 782px at the 1512 frame width, opened to 860 so the H1 sets on two lines
   * instead of three. Capped so it stops growing on wide screens. English runs
   * longer than the Hebrew this was measured from, so LTR gets more room.
   */
  width: "min(56.9%, 860px)",
  '[dir="ltr"] &': { width: "min(68%, 1040px)" },
  height: "90%",
  background: "rgba(54,10,77,0.78)",
  /**
   * `radii=[75, 0, 0, 0]` in the file - only the top-left corner is rounded. The
   * panel is flush to the right frame edge and to its own foot, so that is the
   * one corner actually floating over the photograph.
   */
  borderStartEndRadius: 75,
  [BP.mobile]: {
    top: 0,
    width: "100%",
    height: "100%",
    borderStartEndRadius: 40,
  },
});

/** Text is right-aligned in the file (H1 at x757, lead at x826), not centred. */
const PhotoCopy = styled("div")({
  position: "relative",
  zIndex: 1,
  /**
   * Same basis as the panel behind it so the two scale together below 1512 and
   * freeze together above it. Opened past the frame's 655 to hold the H1 on two
   * lines. A fixed px here let the panel outgrow the copy on wide screens.
   */
  maxWidth: "min(47.6%, 720px)",
  /** Matches the panel's own LTR widening - English needs the longer measure. */
  '[dir="ltr"] &': { maxWidth: "min(58%, 900px)" },
  /**
   * `margin-inline-END: auto` to sit at the inline START, which under RTL is the
   * RIGHT edge - where the copy panel is. Using `margin-inline-start: auto` did
   * the opposite and threw the text to the left, away from its own panel.
   */
  marginInlineEnd: "auto",
  /**
   * The panel's own padding in the file is `39/100/49/74`. Eased back to 72 on
   * the inline start and opened up at the top by request - both deliberate steps
   * away from the measured values, so restore 100 / 39 if the file wins.
   */
  paddingInlineStart: 72,
  paddingBlock: "100px 70px",
  color: C.white,
  textAlign: "start",
  animation: `${fadeUp} 0.6s ease-out both`,
  /**
   * The file sets this at 80/700/89. Scaled back with the stage - the H1 is the
   * single biggest contributor to the hero's height, so leaving it at 80 would
   * have held the section tall no matter what `minHeight` said.
   */
  "& h1": {
    color: C.white,
    fontSize: "clamp(31px, 4.6vw, 68px)",
    fontWeight: 700,
    lineHeight: 1.11,
  },
  /** The panel goes full-bleed at this width, so the copy has to as well. */
  [BP.mobile]: { maxWidth: "none", paddingInlineStart: 24, paddingInlineEnd: 24 },
  [REDUCED_MOTION]: { animation: "none" },
});

/** 24 / 400 in the file - an earlier pass had this at 15.5. */
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
  [BP.mobile]: { fontSize: 12, padding: "6px 13px" },
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
