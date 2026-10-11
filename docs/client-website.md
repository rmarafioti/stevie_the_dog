# Client to Website

How a client website shows the posts its site owner manages in the Headless CMS App, and how it updates within moments whenever a post changes. Copy this file into the client website's repo as docs/client-website.md and import it from that repo's CLAUDE.md (@docs/client-website.md). Everything a client website needs is in this file.

## How it works

1. The site owner creates, edits, archives or reactivates a post in the CMS dashboard.
2. The CMS calls this website's POST /api/revalidate route, signed with the website's webhook secret.
3. The route marks the cached posts as stale.
4. On the next visit, the page fetches the website's active posts from the CMS API (GET /api/public/posts, signed with the website's API key) and regenerates.

The page stays static (fast, good for SEO) and still shows a change within moments, with no rebuild or redeploy. A time-based fallback re-fetches every hour in case a revalidation call is ever missed.

## Environment variables

Add these to .env.local for development and to the Vercel project for production. All three are server-only: never prefix them with NEXT_PUBLIC_, never use them in a Client Component, and never commit them.

| Variable | Value |
| --- | --- |
| HEADLESS_CMS_API_URL | https://api.3dwebdev.com in production, http://localhost:4000 locally |
| HEADLESS_CMS_API_KEY | this website's API key (shown once when the website was created in the CMS) |
| HEADLESS_CMS_WEBHOOK_SECRET | this website's webhook secret (shown once, at the same time) |

Add the three names, with empty values, to .env.example so the next developer knows they exist.

## The API this website calls

GET {HEADLESS_CMS_API_URL}/api/public/posts with the header Authorization: Bearer <HEADLESS_CMS_API_KEY>. No cookie and no other headers.

Success: 200 { "data": PublicPost[] }, the website's active posts only, newest first.

```
PublicPost { id, header, subHeader, postDate, createdAt, updatedAt,
             body: [{ type: 'paragraph', text } | { type: 'image', image: { src, width, height, altText } }],
             links: [{ name, url }] }
```

- header, subHeader and postDate are null when the site owner left them empty. postDate is a date only, YYYY-MM-DD. createdAt and updatedAt are ISO 8601.
- body is the post's content in the order the site owner arranged it: at least 1 paragraph, at most 5 paragraphs and 5 images. A paragraph's text keeps the line breaks the site owner typed.
- Images are hosted on Cloudinary (src is an https://res.cloudinary.com/... URL). width and height are whole numbers.
- links are in the order the site owner added them, at most 10.

Errors arrive as { "error": { "message": "..." } }:

- 401 "Invalid API key." means the key is missing or wrong, or the website has been deactivated in the CMS.
- 500 "Something went wrong, please try again." means a server error.

## Fetching CMS data

Fetch all CMS data through one server-only function, src/app/_lib/cmsFetch.js. Each kind of CMS content gets its own small function next to it, named getX (src/app/_lib/getPosts.js today), and only Server Components call them. Never fetch CMS data from the browser (a client-side hook or useEffect): that would expose the API key and make the page dynamic.

src/app/_lib/cmsFetch.js:

```js
// The only place this website calls the Headless CMS. Server-only: the API key never reaches the
// browser. Every request is tagged "cms", so /api/revalidate can expire all CMS data at once.
import "server-only";

export async function cmsFetch(path, { tag, empty }) {
  // Not wired up yet: render nothing rather than fail the build.
  if (!process.env.HEADLESS_CMS_API_URL) return empty;

  const response = await fetch(`${process.env.HEADLESS_CMS_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${process.env.HEADLESS_CMS_API_KEY}` },
    next: { tags: ["cms", tag], revalidate: 3600 },
  });

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
// This website's active posts from the Headless CMS, newest first. Server Components only.
import { cmsFetch } from "./cmsFetch";

export function getPosts() {
  return cmsFetch("/api/public/posts", { tag: "posts", empty: [] });
}
```

- next.tags: ["cms", tag] gives every request the shared cms tag, which the revalidate route expires, plus its own tag (posts), so a site can later expire one kind of content on its own. The CMS's revalidation call doesn't say what changed, so the route refreshes all CMS data; re-fetching data that didn't change costs almost nothing.
- next.revalidate: 3600 is the hourly fallback.
- empty is what cmsFetch returns before HEADLESS_CMS_API_URL is set: [] for a list such as posts.
- Install server-only (npm install server-only) so an accidental import from a Client Component fails at build time.
- Add a new getX function (getHours, for example) only once the CMS serves that data and this guide specs it.
- The snippets are already formatted with Prettier's defaults (double quotes, 80-character lines), so npm run format leaves a copied snippet unchanged.

## Rendering posts

- Posts may render on their own route or inside an existing page through a component. Either way, every page that renders posts must build as static.
- Render posts in the order returned (newest first).
- Render each post's body in order:
  - **paragraph:** the text in an element styled with white-space: pre-line, so the site owner's line breaks show
  - **image:** next/image with src, width, height and alt={altText}, styled max-width: 100%; height: auto so a large photo never overflows its container
- Render header, subHeader, postDate and links only when present. Skip any that are null or empty, never render "null" or an empty heading.
- Render only the documented body types (paragraph, image) and skip any other type, so a type added later never renders as an empty element.
- Body elements and links have no id. Key them by their index in the list; two links can share a URL, so url isn't a safe key.
- Recommended heading structure: header as a heading at the level that fits the page, the same level for every post; subHeader as a <p> (a subtitle isn't a heading), grouped with header in an <hgroup> when there is one, or a plain <p> when there isn't; postDate in <time dateTime={postDate}>. The order of these inside a post is the site's choice.
- Format postDate for display without letting a time zone shift the day. Parse YYYY-MM-DD into its parts, or format it with timeZone: "UTC".
- Let next/image load Cloudinary images by adding the host to next.config.mjs:

```
images: {
  remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
},
```

- Styling and placement belong to each website, apart from the two functional styles above: white-space: pre-line on paragraphs and max-width: 100%; height: auto on images. This guide covers data and structure only.
- With no posts (an empty array), render nothing, or a short message the site chooses.

## The revalidate route

Create src/app/api/revalidate/route.js. The CMS calls it after every create, edit, archive or reactivate:

- POST {website URL}/api/revalidate
- headers Authorization: Bearer <webhook secret> and Content-Type: application/json
- body { "websiteId": "...", "postId": "..." }
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
- The body (websiteId, postId) is informational. All CMS data shares the cms tag, so the route doesn't need it. A site that later gives each post its own page can use postId to expire a narrower tag.
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
   - Create posts in the CMS dashboard and check that they render. Cover paragraphs only, paragraphs and images interleaved, line breaks, links, empty optional fields, and an archived post, which must not appear.
2. **Static build:** run next build and confirm every page that renders posts is static, then next start and confirm it still shows the posts.
3. **Deployed:** deploy with all three env vars set.
   - A POST /api/revalidate with a wrong secret returns 401.
   - The CMS operator then runs the webhook and live-update tests from their side (their docs/client-website-test.md).

Before the CMS backend is available, a throwaway mock of GET /api/public/posts (kept outside the repo, with HEADLESS_CMS_API_URL pointed at it) can check rendering, caching and revalidation. It never replaces the test against the real CMS.

## Done when

- Every CMS request goes through cmsFetch(), which is server-only, sends the Bearer API key, tags the request cms plus its own tag with an hourly fallback, throws on errors, and returns its empty value when the API URL is unset (getPosts() returns [])
- Posts render newest first; each body renders in order; paragraphs keep line breaks; images use next/image; empty optional fields don't render
- /api/revalidate accepts only POST, checks the secret with timingSafeEqual, returns 401 on a bad secret, and expires the cms tag
- npm test passes: cmsFetch(), each getX() and the revalidate route are tested (the Unit Tests section of CLAUDE.md)
- Every page that renders posts builds as static
- The three env vars are set in .env.local and on Vercel, none are NEXT_PUBLIC_, and none are committed
- The website's stored URL serves the site directly, with no redirect
- The CMS operator's live test passes: creating, editing, archiving and reactivating a post each show on the live site within moments
