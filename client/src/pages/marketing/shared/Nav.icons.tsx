/**
 * The nav's own drawings. They take `currentColor`, so each one picks up the
 * link's hover and active colour rather than carrying its own.
 */

export function HomeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M3.5 10.6 12 3.8l8.5 6.8" />
      <path d="M5.8 9v10.7h12.4V9" />
      <path d="M10 19.7v-5.2h4v5.2" />
    </svg>
  );
}

/**
 * The plain "i" in a circle. A team mark, a business card and a speech bubble
 * were all tried instead and dropped - the "i" is the one that reads at a glance.
 */
export function InfoIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.2v5.3" />
      <circle cx="12" cy="7.9" r="0.4" fill="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** The language switcher's globe. */
export function GlobeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.7 4 5.7 4 9s-1.4 6.3-4 9c-2.6-2.7-4-5.7-4-9s1.4-6.3 4-9Z" />
    </svg>
  );
}
