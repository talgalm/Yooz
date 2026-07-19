import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { styled } from '@mui/material/styles';

const InlineLink = styled('a')({
  color: 'inherit',
  fontWeight: 700,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  wordBreak: 'break-all',
});

// One capture group so String.split() keeps the matched URLs at odd indices.
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * Turns bare URLs (https://…, http://…, www.…) inside plain text into
 * clickable links that open in a new tab. Non-URL text passes through
 * untouched, so the result can be rendered inside pre-wrap containers.
 */
export function linkifyText(text: string): ReactNode {
  if (!text || !/https?:\/\/|www\./i.test(text)) return text;
  const parts = text.split(URL_PATTERN);
  return parts.map((part, i) => {
    if (!part) return null;
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    // Sentence punctuation stuck to the end of a URL isn't part of it.
    const trailing = part.match(/[.,!?;:)\]"'»…]+$/);
    const url = trailing ? part.slice(0, -trailing[0].length) : part;
    const href = /^www\./i.test(url) ? `https://${url}` : url;
    return (
      <Fragment key={i}>
        <InlineLink href={href} target="_blank" rel="noopener noreferrer">
          {url}
        </InlineLink>
        {trailing ? trailing[0] : null}
      </Fragment>
    );
  });
}
