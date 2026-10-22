// A paragraph's text as the segments FormattedText renders, left to right. The rules are in
// docs/client-website.md, Paragraph formatting.
// - { type: "text", text }
// - { type: "link", text, url }
// - { type: "bold" | "italic" | "boldItalic", children }: children are text and link segments
//   only, because a format holds links and nothing else.
// At [ try a link; at *** bold-italic, at ** bold, at a single * italic. If a pattern doesn't
// complete, its first character is plain text and reading moves on one character.

const FORMATS = [
  { type: "boldItalic", marker: "***" },
  { type: "bold", marker: "**" },
  { type: "italic", marker: "*" },
];

// The link starting at the [ at `open`, or null. Link text has no ] and no line break; the URL
// has no whitespace and ends at the first ).
function linkAt(text, open) {
  let close = open + 1;
  while (close < text.length && text[close] !== "]" && text[close] !== "\n")
    close += 1;
  if (text[close] !== "]" || text[close + 1] !== "(") return null;
  const urlStart = close + 2;
  let urlEnd = urlStart;
  while (
    urlEnd < text.length &&
    text[urlEnd] !== ")" &&
    !/\s/.test(text[urlEnd])
  )
    urlEnd += 1;
  if (text[urlEnd] !== ")") return null;
  return {
    segment: {
      type: "link",
      text: text.slice(open + 1, close),
      url: text.slice(urlStart, urlEnd),
    },
    end: urlEnd + 1,
  };
}

// The next `marker` from `from` on the same line, skipping links whole, or -1.
function closerFrom(text, marker, from) {
  let index = from;
  while (index < text.length && text[index] !== "\n") {
    const link = text[index] === "[" ? linkAt(text, index) : null;
    if (link) {
      index = link.end;
      continue;
    }
    if (text.startsWith(marker, index)) return index;
    index += 1;
  }
  return -1;
}

// The text and links between `start` and `end`, as segments.
function linksWithin(text, start, end) {
  const children = [];
  let plain = "";
  let index = start;
  while (index < end) {
    const link = text[index] === "[" ? linkAt(text, index) : null;
    if (link) {
      if (plain) children.push({ type: "text", text: plain });
      plain = "";
      children.push(link.segment);
      index = link.end;
      continue;
    }
    plain += text[index];
    index += 1;
  }
  if (plain) children.push({ type: "text", text: plain });
  return children;
}

// The format opening at the * at `open`, or null. It applies only when the text between the
// markers isn't empty and doesn't start or end with a space, so "5 * 3 * 2" stays as typed.
function formatAt(text, open) {
  const { type, marker } = FORMATS.find((format) =>
    text.startsWith(format.marker, open),
  );
  const innerStart = open + marker.length;
  const close = closerFrom(text, marker, innerStart);
  if (close === -1) return null;
  const inner = text.slice(innerStart, close);
  if (inner === "" || inner.trim() !== inner) return null;
  return {
    segment: { type, children: linksWithin(text, innerStart, close) },
    end: close + marker.length,
  };
}

export function parseParagraph(text) {
  const segments = [];
  let plain = "";
  let index = 0;
  while (index < text.length) {
    let found = null;
    if (text[index] === "[") found = linkAt(text, index);
    if (text[index] === "*") found = formatAt(text, index);
    if (!found) {
      plain += text[index];
      index += 1;
      continue;
    }
    if (plain) segments.push({ type: "text", text: plain });
    plain = "";
    segments.push(found.segment);
    index = found.end;
  }
  if (plain) segments.push({ type: "text", text: plain });
  return segments;
}
