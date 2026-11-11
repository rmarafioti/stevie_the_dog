# Posts

How a client website shows its site owner's posts. It builds on `client-website.md` in this folder: posts are fetched through its cmsFetch() (Fetching CMS data), their images follow its Images section, and its revalidate route refreshes them.

## The posts route

GET {HEADLESS_CMS_API_URL}/api/public/posts, with the header from `client-website.md` → The API this website calls.

Success: 200 { "data": PublicPost[] }, the website's published posts that aren't deleted, newest createdAt first. A draft is hidden from the website. While the posts ability is turned off, the list is [].

```
PublicPost { id, header, subHeader, postDate, createdAt, updatedAt,
             body: [{ type: 'paragraph', text } | { type: 'image', image: { src, width, height, altText } }] }
```

- header, subHeader and postDate are null when the site owner left them empty. postDate is a date only, YYYY-MM-DD. createdAt and updatedAt are ISO 8601.
- body is the post's content in the order the site owner arranged it: at least 1 paragraph, at most 5 paragraphs and 5 images. A paragraph's text keeps the line breaks the site owner typed, and may contain formatting markup (Paragraph formatting, below).
- An image's src, width and height are as `client-website.md` → The API this website calls describes.
- The list never answers 404. Its errors are the shared ones (401, 429, 500).

src/app/_lib/getPosts.js:

```js
// This website's published posts from the Headless CMS, newest first. Server Components only.
import { cmsFetch } from "./cmsFetch";

export function getPosts() {
  return cmsFetch("/api/public/posts", { tag: "posts", empty: [] });
}
```

- Its own tag is posts, beside the shared cms tag. It passes no notFound, since the list never answers 404.

## Rendering posts

- Posts may render on their own route or inside an existing page through a component. Either way, every page that renders posts must build as static.
- Render posts in the order returned (newest first).
- Render each post's body in order:
  - **paragraph:** the text rendered with FormattedText (Paragraph formatting, below), inside an element styled with white-space: pre-line, so the site owner's line breaks show
  - **image:** next/image with src, width, height and alt={altText}, styled max-width: 100%; height: auto (`client-website.md` → Images)
- Render header, subHeader and postDate only when present. Skip any that are null or empty, never render "null" or an empty heading.
- Render only the documented body types (paragraph, image) and skip any other type, so a type added later never renders as an empty element.
- Body elements have no id. Key them by their index in the list.
- Recommended heading structure: header as a heading at the level that fits the page, the same level for every post; subHeader as a `<p>` (a subtitle isn't a heading), grouped with header in an `<hgroup>` when there is one, or a plain `<p>` when there isn't; postDate in `<time dateTime={postDate}>`. Show postDate first, before header and subHeader, so a reader sees how recent the post is before anything else (the CMS preview uses the same order).
- Format postDate for display without letting a time zone shift the day. Parse YYYY-MM-DD into its parts, or format it with timeZone: "UTC".
- Post images need only the base remotePatterns entries (`client-website.md` → Images).
- Styling and placement belong to each website, apart from the two functional styles above: white-space: pre-line on paragraphs and max-width: 100%; height: auto on images.
- With no posts (an empty array), render nothing, or a short message the site chooses.

## Paragraph formatting

A paragraph's text is stored exactly as the site owner typed it, and four patterns in it render as formatting. The two files below render it. They follow the Paragraph formatting rules in the CMS's API contract, so this website renders a post the same way as the CMS dashboard and its preview.

- `**text**` is bold, `*text*` is italic, `***text***` is bold and italic, and `[link text](https://…)` is a link. A link may also sit inside bold, italic or bold-italic, as in `**[our menu](https://…)**`.
- Read left to right. A pattern that doesn't complete shows as typed: `5 * 3 * 2`, `** not bold **`, `*open`, `[no url]`. `_text_` is not italic.
- Formatting never crosses a line break, and markup inside link text shows as typed.
- Bold renders as `<b>`, italic as `<i>`, bold-italic as `<b><i>…</i></b>`, and a link as `<a href={url}>`, inside any format around it. A link is built only when its URL starts with https://; otherwise its characters show as typed.
- A link opens in a new tab: `target="_blank" rel="noopener noreferrer"`, for every link a paragraph builds. A site that wants links in the same tab removes those two attributes from renderLink and records it in `docs/site.md`.
- The CMS editor makes links bold by default, so most links arrive as `**[text](url)**`. Style links so they read as links (underlined, for example), not only as bold text.
- HTML is never stored or rendered. Build elements from the text and never set raw HTML (no dangerouslySetInnerHTML), so <, > and & show as typed.

src/app/_lib/parseParagraph.js:

```js
// A paragraph's text as the segments FormattedText renders, left to right. The rules are in
// docs/cms/posts.md, Paragraph formatting.
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
```

src/app/_components/FormattedText.jsx:

```js
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
```

- Render a paragraph element as `<p style={{ whiteSpace: "pre-line" }}><FormattedText text={element.text} /></p>`, or the same with a class. FormattedText has no state or effects, so it works in a server component.
- Test FormattedText against every row of the table below. They are the same examples the CMS dashboard is tested against.

Rendering examples (the input as stored, then the result written as HTML; a renderer builds the equivalent elements):

Every `<a>` in the Output column also carries `target="_blank" rel="noopener noreferrer"` on a client website.

| Input | Output |
| --- | --- |
| `Hello **world**` | `Hello <b>world</b>` |
| `An *easy* walk` | `An <i>easy</i> walk` |
| `See [our menu](https://example.com/menu).` | `See <a href="https://example.com/menu">our menu</a>.` |
| `**Bold** and *italic* and [a link](https://example.com)` | `<b>Bold</b> and <i>italic</i> and <a href="https://example.com">a link</a>` |
| `5 * 3 * 2` | `5 * 3 * 2` |
| `** not bold **` | `** not bold **` |
| `*open` | `*open` |
| `[no url]` | `[no url]` |
| `[menu] (https://example.com)` | `[menu] (https://example.com)` |
| `**across`, then a line break, then `lines**` | The same, as typed (formatting never crosses a line break) |
| `_not italic_` | `_not italic_` |
| `**a *b* c**` | `<b>a *b* c</b>` |
| `[**Menu**](https://example.com)` | `<a href="https://example.com">**Menu**</a>` |
| `<b>hi</b> & more` | `<b>hi</b> & more` (shown as typed, never as HTML) |
| `***both***` | `<b><i>both</i></b>` |
| `*** spaced ***` | `*** spaced ***` |
| `**a*` | `*<i>a</i>` |
| `**[our menu](https://example.com/menu)**` | `<b><a href="https://example.com/menu">our menu</a></b>` |
| `*see [the map](https://example.com/map)*` | `<i>see <a href="https://example.com/map">the map</a></i>` |
| `***[both](https://example.com)***` | `<b><i><a href="https://example.com">both</a></i></b>` |
| `**[a](https://example.com/**x)**` | `<b><a href="https://example.com/**x">a</a></b>` |
| `[menu](http://example.com)` (can't be saved; a preview can show it) | `[menu](http://example.com)` |

## Testing

Beside `client-website.md` → Testing, create posts in the CMS dashboard and check that they render. Cover paragraphs only, paragraphs and images interleaved, line breaks, formatting (bold, italic, bold-italic, a link, a link inside bold, and markup left as typed such as `5 * 3 * 2`), empty optional fields, and a draft post, which must not appear. Creating, editing, drafting, publishing and deleting a post each show on the live site within moments.

## Done when

- getPosts() fetches through cmsFetch() with the posts tag, and returns [] when the API URL is unset
- Posts render newest first; each body renders in order; paragraphs keep line breaks; formatting renders as in the rendering examples, with no raw HTML; images use next/image; empty optional fields don't render
- npm test passes: getPosts() and FormattedText (every row of the rendering examples) are tested
- Every page that renders posts builds as static
- The CMS operator's live test passes for posts
