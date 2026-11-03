# Client to Website

How a client website shows the posts and galleries its site owner manages in the Headless CMS App, and how it updates within moments whenever one changes. Copy this file into the client website's repo as docs/client-website.md and import it from that repo's CLAUDE.md (@docs/client-website.md). Everything a client website needs is in this file.

## How it works

1. The site owner creates, edits, drafts, publishes or deletes a post or a gallery in the CMS dashboard.
2. The CMS calls this website's POST /api/revalidate route, signed with the website's webhook secret.
3. The route marks the cached CMS data as stale.
4. On the next visit, the page fetches the website's published posts from the CMS API (GET /api/public/posts, signed with the website's API key) and regenerates.

The page stays static (fast, good for SEO) and still shows a change within moments, with no rebuild or redeploy. A time-based fallback re-fetches every hour in case a revalidation call is ever missed.

## Environment variables

Add these to .env.local for development and to the Vercel project for production. All three are server-only: never prefix them with NEXT_PUBLIC_, never use them in a Client Component, and never commit them.

| Variable | Value |
| --- | --- |
| `HEADLESS_CMS_API_URL` | https://api.3dwebdev.com in production, http://localhost:4000 locally |
| `HEADLESS_CMS_API_KEY` | this website's API key (shown once when the website was created in the CMS) |
| `HEADLESS_CMS_WEBHOOK_SECRET` | this website's webhook secret (shown once, at the same time) |

Add the three names, with empty values, to .env.example so the next developer knows they exist.

## The API this website calls

GET {HEADLESS_CMS_API_URL}/api/public/posts with the header Authorization: Bearer `<HEADLESS_CMS_API_KEY>`. No cookie and no other headers.

Success: 200 { "data": PublicPost[] }, the website's published posts that aren't deleted, newest createdAt first. A draft is hidden from the website.

```
PublicPost { id, header, subHeader, postDate, createdAt, updatedAt,
             body: [{ type: 'paragraph', text } | { type: 'image', image: { src, width, height, altText } }] }
```

- header, subHeader and postDate are null when the site owner left them empty. postDate is a date only, YYYY-MM-DD. createdAt and updatedAt are ISO 8601.
- body is the post's content in the order the site owner arranged it: at least 1 paragraph, at most 5 paragraphs and 5 images. A paragraph's text keeps the line breaks the site owner typed, and may contain formatting markup (see Paragraph formatting).
- Images are uploaded by the site owner to 3DWD's Cloudinary account, into this website's own upload folder (its media folder, recorded in CLAUDE.md → Site Details): src is an https://res.cloudinary.com/dzpne110u/image/upload/… URL in `3dwd/<media_folder>/`, or in `3dwd-dev/<media_folder>/` when the CMS runs locally. width and height are whole numbers, the stored size: Cloudinary scales a large photo down to fit 2500 × 2500 as it stores it.

Errors arrive as { "error": { "message": "..." } }:

- 401 "Invalid API key." means the key is missing or wrong, or the website has been deactivated in the CMS.
- 429 "Too many requests. Please try again later." means a CMS rate limit was hit: more than 30 calls a minute with this website's key (every public route counts together, posts and galleries), or more than 10 calls a minute with a wrong key from one address. cmsFetch() throws on it like any other error, so the last good page stays up.
- 500 "Something went wrong, please try again." means a server error.

## Fetching CMS data

Fetch all CMS data through one server-only function, src/app/_lib/cmsFetch.js. Each kind of CMS content gets its own small function next to it, named getX (src/app/_lib/getPosts.js today), and only Server Components call them. Never fetch CMS data from the browser (a client-side hook or useEffect): that would expose the API key and make the page dynamic.

src/app/_lib/cmsFetch.js:

```js
// The only place this website calls the Headless CMS. Server-only: the API key never reaches the
// browser. Every request is tagged "cms", so /api/revalidate can expire all CMS data at once.
import "server-only";

export async function cmsFetch(path, { tag, empty, notFound }) {
  // Not wired up yet: render nothing rather than fail the build.
  if (!process.env.HEADLESS_CMS_API_URL) return empty;

  const response = await fetch(`${process.env.HEADLESS_CMS_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${process.env.HEADLESS_CMS_API_KEY}` },
    next: { tags: ["cms", tag], revalidate: 3600 },
  });

  // A resource that isn't published (a gallery code that doesn't exist) isn't a failure: return
  // the caller's notFound value so the page can show its 404.
  if (response.status === 404 && notFound !== undefined) return notFound;

  // Throw instead of returning empty, so a failed regeneration keeps the last good page.
  if (!response.ok)
    throw new Error(
      `Headless CMS request failed: ${path} HTTP ${response.status}`,
    );

  const { data } = await response.json();
  return data;
}
```

src/app/_lib/getPosts.js:

```js
// This website's published posts from the Headless CMS, newest first. Server Components only.
import { cmsFetch } from "./cmsFetch";

export function getPosts() {
  return cmsFetch("/api/public/posts", { tag: "posts", empty: [] });
}
```

- next.tags: `["cms", tag]` gives every request the shared cms tag, which the revalidate route expires, plus its own tag (posts), so a site can later expire one kind of content on its own. The route doesn't read which post or gallery the CMS's revalidation call names, so it refreshes all CMS data; re-fetching data that didn't change costs almost nothing.
- next.revalidate: 3600 is the hourly fallback.
- empty is what cmsFetch returns before HEADLESS_CMS_API_URL is set: [] for a list such as posts, null for a single item such as a gallery.
- notFound is optional: what cmsFetch returns when the CMS answers 404 (null for a gallery, so the page can call notFound()). Without it, a 404 throws like any other error. getPosts() doesn't pass it, since the posts list never answers 404.
- Install server-only (npm install server-only) so an accidental import from a Client Component fails at build time.
- Add a new getX function (getHours, for example) only once the CMS serves that data and this guide specs it.
- The snippets are already formatted with Prettier's defaults (double quotes, 80-character lines), so npm run format leaves a copied snippet unchanged.

## Rendering posts

- Posts may render on their own route or inside an existing page through a component. Either way, every page that renders posts must build as static.
- Render posts in the order returned (newest first).
- Render each post's body in order:
  - **paragraph:** the text rendered with FormattedText (see Paragraph formatting), inside an element styled with white-space: pre-line, so the site owner's line breaks show
  - **image:** next/image with src, width, height and alt={altText}, styled max-width: 100%; height: auto so a large photo never overflows its container
- Render header, subHeader and postDate only when present. Skip any that are null or empty, never render "null" or an empty heading.
- Render only the documented body types (paragraph, image) and skip any other type, so a type added later never renders as an empty element.
- Body elements have no id. Key them by their index in the list.
- Recommended heading structure: header as a heading at the level that fits the page, the same level for every post; subHeader as a `<p>` (a subtitle isn't a heading), grouped with header in an `<hgroup>` when there is one, or a plain `<p>` when there isn't; postDate in `<time dateTime={postDate}>`. Show postDate first, before header and subHeader, so a reader sees how recent the post is before anything else (the CMS preview uses the same order).
- Format postDate for display without letting a time zone shift the day. Parse YYYY-MM-DD into its parts, or format it with timeZone: "UTC".
- Let next/image load this website's images by allowing only its own folders in next.config.mjs, never all of res.cloudinary.com. Replace `<media_folder>` with this website's media folder and `<static folder>` with the Cloudinary folder of the site's own images (both in CLAUDE.md → Site Details):

```js
images: {
  remotePatterns: [
    // Uploads from the CMS: production, then local testing.
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      pathname: "/dzpne110u/image/upload/*/3dwd/<media_folder>/**",
    },
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      pathname: "/dzpne110u/image/upload/*/3dwd-dev/<media_folder>/**",
    },
    // This website's own static images.
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      pathname: "/dzpne110u/image/upload/**/<static folder>/**",
    },
  ],
},
```

- The first two entries allow the site owner's uploads (production, then local testing), the third this website's own static images. Another website's folder, a sibling folder such as steviethedog-2, and other Cloudinary accounts are refused. Drop the third entry if the site's own images live in public/.
- Styling and placement belong to each website, apart from the two functional styles above: white-space: pre-line on paragraphs and max-width: 100%; height: auto on images. This guide covers data and structure only.
- With no posts (an empty array), render nothing, or a short message the site chooses.

## Galleries

A site shows a gallery only once the site owner and Rich decide where it goes. Until then, nothing below is built; the snippet and the two remotePatterns rows are added when the site first shows a gallery.

GET {HEADLESS_CMS_API_URL}/api/public/galleries/:slug with the same header as posts, Authorization: Bearer `<HEADLESS_CMS_API_KEY>`, server side only. It returns one gallery.

Success: 200 { "data": PublicGallery }.

```
PublicGallery { id, slug, title, copy, createdAt, updatedAt,
                images: [{ src, width, height, altText, caption,
                           thumbnail: CroppedImage | null, mobile: CroppedImage | null }] }
CroppedImage { src, width, height }
```

- title, copy and caption are null when empty. copy is plain text with no formatting markup; render it with white-space: pre-line.
- A gallery has 1 to 30 images, in the order the site owner arranged them. galleryName and image ids are never returned.
- thumbnail is a square crop and mobile a crop at least as tall as wide. Each is a Cloudinary URL that cuts that rectangle from the stored image, with the crop's own width and height for next/image. Either is null when the site owner didn't crop one; the site then shows the full image.
- A gallery's crops are consistent: every image has a thumbnail or none does, the same for mobile, and every mobile crop has one shape.
- The slug: the site owner gives Rich the gallery's "Gallery Code", the slug, to say which gallery goes where. It is made from the gallery name at create and never changes, so a rename never breaks the site.

Errors:

- 404 "Gallery not found." when this website has no published gallery with that slug (a draft, a deleted gallery or another website's gallery all give the same answer).
- 401 "Invalid API key." and 429 "Too many requests. Please try again later." as for posts.

src/app/_lib/getGallery.js:

```js
// One of this website's published galleries from the Headless CMS, by its Gallery Code (slug),
// or null when there is none. Server Components only.
import { cmsFetch } from "./cmsFetch";

export function getGallery(slug) {
  return cmsFetch(`/api/public/galleries/${slug}`, {
    tag: "galleries",
    empty: null,
    notFound: null,
  });
}
```

- It has its own tag (galleries) beside the shared cms tag, and next.revalidate 3600 like every CMS fetch.
- When it returns null, the page calls notFound() from next/navigation, so a wrong or unpublished Gallery Code shows the site's 404 page. 401, 429 and 500 still throw, so the last good page stays up.

A site that shows gallery crops needs two more remotePatterns entries, beside the three it has. Add them only when the site first shows a gallery:

```js
    // Gallery crops from the CMS: production, then local testing.
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      pathname: "/dzpne110u/image/upload/*/*/3dwd/<media_folder>/**",
    },
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
      pathname: "/dzpne110u/image/upload/*/*/3dwd-dev/<media_folder>/**",
    },
```

- A cropped URL has one more path segment than a stored src (the crop, before the version): https://res.cloudinary.com/dzpne110u/image/upload/c_crop,x_200,y_0,w_800,h_800/v1760000000/3dwd/steviethedog/abc123.jpg. In a pattern, \* matches exactly one segment, so the existing one-\* rows refuse a cropped URL and the \*/\* rows accept it. Both still refuse a sibling folder such as steviethedog-2 (checked against Next.js 16.4.3's matcher, 2026-10-31).

## Paragraph formatting

A paragraph's text is stored exactly as the site owner typed it, and four patterns in it render as formatting. The two files below render it. They follow the Paragraph formatting rules in the CMS's API contract, so this website renders a post the same way as the CMS dashboard and its preview.

- `**text**` is bold, `*text*` is italic, `***text***` is bold and italic, and `[link text](https://…)` is a link. A link may also sit inside bold, italic or bold-italic, as in `**[our menu](https://…)**`.
- Read left to right. A pattern that doesn't complete shows as typed: `5 * 3 * 2`, `** not bold **`, `*open`, `[no url]`. `_text_` is not italic.
- Formatting never crosses a line break, and markup inside link text shows as typed.
- Bold renders as `<b>`, italic as `<i>`, bold-italic as `<b><i>…</i></b>`, and a link as `<a href={url}>`, inside any format around it. A link is built only when its URL starts with https://; otherwise its characters show as typed.
- A link opens in a new tab: `target="_blank" rel="noopener noreferrer"`, for every link a paragraph builds. A site that wants links in the same tab removes those two attributes from renderLink and records it in CLAUDE.md → Site Details.
- The CMS editor makes links bold by default, so most links arrive as `**[text](url)**`. Style links so they read as links (underlined, for example), not only as bold text.
- HTML is never stored or rendered. Build elements from the text and never set raw HTML (no dangerouslySetInnerHTML), so <, > and & show as typed.

src/app/_lib/parseParagraph.js:

```js
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

## The revalidate route

Create src/app/api/revalidate/route.js. The CMS calls it after a create, edit, draft or publish, or delete of a post or a gallery, and when one of the website's abilities (posts, galleries) is turned on or off, removed or restored:

- POST {website URL}/api/revalidate
- headers Authorization: Bearer `<webhook secret>` and Content-Type: application/json
- body { "websiteId": "...", "postId": "..." } for a post, { "websiteId": "...", "galleryId": "..." } for a gallery, or { "websiteId": "...", "ability": "posts" | "galleries" } for an ability
- a 5 second timeout

The CMS only logs the result. It never retries, and a failure never blocks the site owner.

```js
// Called by the Headless CMS whenever this website's CMS content changes. Verifies the webhook
// secret, then expires the cached CMS data so the next visit regenerates with fresh data.
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

function hasValidSecret(request) {
  const expected = Buffer.from(
    `Bearer ${process.env.HEADLESS_CMS_WEBHOOK_SECRET ?? ""}`,
  );
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    Boolean(process.env.HEADLESS_CMS_WEBHOOK_SECRET) &&
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

export async function POST(request) {
  if (!hasValidSecret(request)) {
    return Response.json(
      { error: { message: "Unauthorized." } },
      { status: 401 },
    );
  }

  revalidateTag("cms", { expire: 0 });
  return Response.json({ data: { revalidated: true } });
}
```

- Only POST is exported, so other methods get 405 from Next.js.
- Compare the secret with timingSafeEqual, never ===. Return 401 when it is missing or wrong.
- Respond fast: do no other work in this route.
- Never log the Authorization header or the secret.
- The body (websiteId, plus postId, galleryId or ability) is informational. All CMS data shares the cms tag, so the route doesn't need it. The route must not require postId or galleryId: it expires the whole cms tag whatever the body names. A site that later gives each post its own page can use postId to expire a narrower tag.
- **The URL must not redirect.** The CMS calls the exact website URL it has stored, for example https://www.example.com. If that URL redirects (www to bare domain, or the other way), the redirect drops the Authorization header and the call fails with 401. Store the URL the site is actually served on.

## Check the installed Next.js version

The caching APIs changed between Next.js versions. Before writing the code, check the installed next package (node_modules/next/package.json, and the docs it bundles in node_modules/next/dist/docs/ where present):

- **Next.js 16:** revalidateTag(tag, profile) takes two arguments. { expire: 0 } makes the next visit fetch fresh posts. The recommended "max" profile would serve one stale visit first, then update in the background. Prefer { expire: 0 }, since a site owner checks the change right after saving.
- **Earlier versions:** revalidateTag("cms") takes one argument and expires immediately.
- Confirm that fetch with next: { tags, revalidate } still caches in the installed version, and that every page using getPosts() builds as static (○ or ● in the next build output, not ƒ).
- Keep next.revalidate on every CMS fetch. In Next.js 16, a fetch that sends an Authorization header and has no explicit cache setting is not cached; next.revalidate is the setting that makes the cmsFetch request cacheable.

## Testing

1. **Local rendering:**
   - Run the CMS backend locally (port 4000).
   - Set HEADLESS_CMS_API_URL=http://localhost:4000 and the API key in .env.local, then run this site.
   - Create posts in the CMS dashboard and check that they render. Cover paragraphs only, paragraphs and images interleaved (the images uploaded from the post form, loading from `3dwd-dev/<media_folder>/`), line breaks, formatting (bold, italic, bold-italic, a link, a link inside bold, and markup left as typed such as `5 * 3 * 2`), empty optional fields, and a draft post, which must not appear.
2. **Static build:** run next build and confirm every page that renders posts is static, then next start and confirm it still shows the posts.
3. **Deployed:** deploy with all three env vars set.
   - A POST /api/revalidate with a wrong secret returns 401.
   - The CMS operator then runs the webhook and live-update tests from their side (their docs/client-website-test.md).

Before the CMS backend is available, a throwaway mock of GET /api/public/posts (kept outside the repo, with HEADLESS_CMS_API_URL pointed at it) can check rendering, caching and revalidation. It never replaces the test against the real CMS.

## Done when

- Every CMS request goes through cmsFetch(), which is server-only, sends the Bearer API key, tags the request cms plus its own tag with an hourly fallback, throws on errors, returns its notFound value on a 404 when one is given (getGallery() returns null), and returns its empty value when the API URL is unset (getPosts() returns [])
- Posts render newest first; each body renders in order; paragraphs keep line breaks; formatting renders as in the rendering examples, with no raw HTML; images use next/image, allowed only from this website's folders in next.config.mjs; empty optional fields don't render
- /api/revalidate accepts only POST, checks the secret with timingSafeEqual, returns 401 on a bad secret, and expires the cms tag
- npm test passes: cmsFetch(), each getX() and the revalidate route are tested (the Unit Tests section of CLAUDE.md)
- Every page that renders posts builds as static
- The three env vars are set in .env.local and on Vercel, none are NEXT_PUBLIC_, and none are committed
- The website's stored URL serves the site directly, with no redirect
- The CMS operator's live test passes: creating, editing, drafting, publishing and deleting a post each show on the live site within moments
