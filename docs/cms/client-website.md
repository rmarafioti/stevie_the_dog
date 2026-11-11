# Client to Website

How a client website shows the content its site owner manages in the Headless CMS App, and how it updates within moments whenever that content changes. This file is the base every client website builds on. Each ability the site uses has its own doc beside it, which builds on this one:

- `posts.md`: the site owner's posts, and paragraph formatting.
- `galleries.md`: photo galleries.

This folder, `docs/cms/`, is copied unchanged from the `client-kit` repo into every client website's repo. Never edit it here: a change is made in `client-kit` and arrives as a sync pull request, and CI fails when this folder differs from `client-kit`. To ask for a change, tell Rich: the backend session makes it in `client-kit`. What is particular to this website (its name, pages, design, quirks, its media folder and which abilities it uses) is in `docs/site.md`.

## How it works

1. The site owner creates, edits, drafts, publishes, deletes or restores a post or a gallery in the CMS dashboard, a draft's go-live date passes, or an ability is turned on or off.
2. The CMS calls this website's POST /api/revalidate route, signed with the website's webhook secret.
3. The route marks the cached CMS data as stale.
4. On the next visit, the page fetches the website's published content from the CMS API (signed with the website's API key) and regenerates.

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

Every route is a GET under {HEADLESS_CMS_API_URL}/api/public/, with the header Authorization: Bearer `<HEADLESS_CMS_API_KEY>`. No cookie and no other headers. Each ability's doc gives its route and the shape it returns.

Success: 200 { "data": ... }.

Images are uploaded by the site owner to 3DWD's Cloudinary account, into this website's own upload folder (its media folder, recorded in `docs/site.md`): an image's src is an https://res.cloudinary.com/dzpne110u/image/upload/… URL in `3dwd/<media_folder>/`, or in `3dwd-dev/<media_folder>/` when the CMS runs locally. width and height are whole numbers, the stored size: Cloudinary scales a large photo down to fit 2500 × 2500 as it stores it.

Errors arrive as { "error": { "message": "..." } }:

- 401 "Invalid API key." means the key is missing or wrong, or the website has been deactivated in the CMS.
- 429 "Too many requests. Please try again later." means a CMS rate limit was hit: more than 30 calls a minute with this website's key (every public route counts together), or more than 10 calls a minute with a wrong key from one address. cmsFetch() throws on it like any other error, so the last good page stays up.
- 500 "Something went wrong, please try again." means a server error.
- A route that fetches one item by its code answers 404 when there is none; its ability's doc gives the message.

## Fetching CMS data

Fetch all CMS data through one server-only function, src/app/_lib/cmsFetch.js. Each kind of CMS content gets its own small function next to it, named getX (getPosts.js, getGallery.js), given in its ability's doc, and only Server Components call them. Never fetch CMS data from the browser (a client-side hook or useEffect): that would expose the API key and make the page dynamic.

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

- next.tags: `["cms", tag]` gives every request the shared cms tag, which the revalidate route expires, plus its own tag (posts, galleries), so a site can later expire one kind of content on its own. The route doesn't read which post or gallery the CMS's revalidation call names, so it refreshes all CMS data; re-fetching data that didn't change costs almost nothing.
- next.revalidate: 3600 is the hourly fallback.
- empty is what cmsFetch returns before HEADLESS_CMS_API_URL is set: [] for a list such as posts, null for a single item such as a gallery.
- notFound is optional: what cmsFetch returns when the CMS answers 404 (null for a gallery, so the page can call notFound()). Without it, a 404 throws like any other error. A list never answers 404, so its getX doesn't pass it.
- Install server-only (npm install server-only) so an accidental import from a Client Component fails at build time.
- Add a new getX function (getHours, for example) only once the CMS serves that data and an ability doc in this folder specs it.
- The snippets in these docs are already formatted with Prettier's defaults (double quotes, 80-character lines), so npm run format leaves a copied snippet unchanged.

## Images

Render CMS images with next/image, styled max-width: 100%; height: auto so a large photo never overflows its container. Let next/image load this website's images by allowing only its own folders in next.config.mjs, never all of res.cloudinary.com. Replace `<media_folder>` with this website's media folder and `<static folder>` with the Cloudinary folder of the site's own images (both in `docs/site.md`):

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

- The first two entries allow the site owner's uploads (production, then local testing), the third this website's own static images. Another website's folder, a sibling folder such as `<media_folder>-2`, and other Cloudinary accounts are refused. Drop the third entry if the site's own images live in public/.
- An ability may add entries of its own (galleries.md → Images adds two for gallery crops).
- Styling and placement belong to each website, apart from the functional styles the docs name. These docs cover data and structure only.

## The revalidate route

Create src/app/api/revalidate/route.js. The CMS calls it after a create, edit, draft or publish, delete or restore of a post or a gallery, when a draft's go-live date passes, and when one of the website's abilities (posts, galleries) is turned on or off, removed or restored:

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

- **Next.js 16:** revalidateTag(tag, profile) takes two arguments. { expire: 0 } makes the next visit fetch fresh content. The recommended "max" profile would serve one stale visit first, then update in the background. Prefer { expire: 0 }, since a site owner checks the change right after saving.
- **Earlier versions:** revalidateTag("cms") takes one argument and expires immediately.
- Confirm that fetch with next: { tags, revalidate } still caches in the installed version, and that every page that renders CMS content builds as static (○ or ● in the next build output, not ƒ).
- Keep next.revalidate on every CMS fetch. In Next.js 16, a fetch that sends an Authorization header and has no explicit cache setting is not cached; next.revalidate is the setting that makes the cmsFetch request cacheable.

## Testing

1. **Local rendering:**
   - Run the CMS backend locally (port 4000).
   - Set HEADLESS_CMS_API_URL=http://localhost:4000 and the API key in .env.local, then run this site.
   - Create content in the CMS dashboard and check that it renders: each ability's doc lists the cases to cover. Images upload from the CMS forms and load from `3dwd-dev/<media_folder>/`.
2. **Static build:** run next build and confirm every page that renders CMS content is static, then next start and confirm it still shows the content.
3. **Deployed:** deploy with all three env vars set.
   - A POST /api/revalidate with a wrong secret returns 401.
   - The CMS operator then runs the webhook and live-update tests from their side (their docs/client-website-test.md).

Before the CMS backend is available, a throwaway mock of the public routes (kept outside the repo, with HEADLESS_CMS_API_URL pointed at it) can check rendering, caching and revalidation. It never replaces the test against the real CMS.

## Done when

- Every CMS request goes through cmsFetch(), which is server-only, sends the Bearer API key, tags the request cms plus its own tag with an hourly fallback, throws on errors, returns its notFound value on a 404 when one is given, and returns its empty value when the API URL is unset
- CMS images use next/image, allowed only from this website's folders in next.config.mjs
- /api/revalidate accepts only POST, checks the secret with timingSafeEqual, returns 401 on a bad secret, and expires the cms tag
- npm test passes: cmsFetch(), each getX() and the revalidate route are tested (the Unit Tests section of this repo's CLAUDE.md)
- Every page that renders CMS content builds as static
- The three env vars are set in .env.local and on Vercel, none are NEXT_PUBLIC_, and none are committed
- The website's stored URL serves the site directly, with no redirect
- Each ability the site uses meets its own doc's Done when
