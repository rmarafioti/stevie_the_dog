# Galleries

How a client website shows one of its site owner's photo galleries. It builds on `client-website.md` in this folder: a gallery is fetched through its cmsFetch() (Fetching CMS data), its images follow its Images section, and its revalidate route refreshes it.

A site shows a gallery only once the site owner and Rich decide where it goes. Nothing below is built until then: getGallery.js and the two remotePatterns entries are added when the site first shows a gallery. `docs/site.md` says whether this site shows galleries, and where.

## The gallery route

GET {HEADLESS_CMS_API_URL}/api/public/galleries/:slug, with the header from `client-website.md` → The API this website calls, server side only. It returns one gallery.

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
- The slug: the site owner gives Rich the gallery's "Gallery Code", the slug, to say which gallery goes where. The slug is generated when the gallery is created, 8 random lowercase letters and digits (`k3x9p2qa`), and never changes, so a rename never breaks the site. Galleries made before this rule keep their name-based slugs.

Errors:

- 404 "Gallery not found." when this website has no published gallery with that slug (a draft, a deleted gallery, another website's gallery, or any gallery while the galleries ability is turned off or removed, all give the same answer).
- 401, 429 and 500 as in `client-website.md` → The API this website calls.

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

## Images

A site that shows gallery crops needs two more remotePatterns entries, beside the three in `client-website.md` → Images:

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

- A cropped URL has one more path segment than a stored src (the crop, before the version): https://res.cloudinary.com/dzpne110u/image/upload/c_crop,x_200,y_0,w_800,h_800/v1760000000/3dwd/<media_folder>/abc123.jpg. In a pattern, \* matches exactly one segment, so the base one-\* entries refuse a cropped URL and the \*/\* entries accept it. Both still refuse a sibling folder such as `<media_folder>-2` (checked against Next.js 16.4.3's matcher, 2026-10-31).
- Render each image with next/image, styled max-width: 100%; height: auto. Use the thumbnail or mobile crop where the site's design calls for it, and the full image when the crop is null.

## Testing

Beside `client-website.md` → Testing: publish a gallery in the CMS dashboard and check that its page renders its images in order, with captions, crops where they were made, and the full image where they weren't. A wrong Gallery Code and a draft gallery each show the site's 404 page. Editing, drafting, publishing and deleting the gallery each show on the live site within moments.

## Done when

- getGallery(slug) fetches through cmsFetch() with the galleries tag, returns null on a 404 and when the API URL is unset, and the page calls notFound() on null
- Images render in order, with crops where present, and load only from this website's folders (the two crop entries added)
- npm test passes: getGallery() is tested
- Every page that renders a gallery builds as static
- The CMS operator's live test passes for the gallery
