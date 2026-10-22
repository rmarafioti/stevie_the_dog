// One paragraph's text with its formatting, built as React elements and never as raw HTML, so
// <, > and & in the text show as typed. The caller keeps line breaks with white-space: pre-line.
import { parseParagraph } from "../_lib/parseParagraph";

// Only an https:// link is built, and it opens in a new tab; any other shows its characters
// as typed.
function renderLink(segment, key) {
  if (!segment.url.startsWith("https://"))
    return `[${segment.text}](${segment.url})`;
  return (
    <a key={key} href={segment.url} target="_blank" rel="noopener noreferrer">
      {segment.text}
    </a>
  );
}

// Segments are in text order and never reorder, so the index is a stable key.
function renderSegments(segments) {
  return segments.map((segment, index) => {
    if (segment.type === "text") return segment.text;
    if (segment.type === "link") return renderLink(segment, index);
    const children = renderSegments(segment.children);
    if (segment.type === "bold") return <b key={index}>{children}</b>;
    if (segment.type === "italic") return <i key={index}>{children}</i>;
    return (
      <b key={index}>
        <i>{children}</i>
      </b>
    );
  });
}

export default function FormattedText({ text }) {
  return renderSegments(parseParagraph(text));
}
