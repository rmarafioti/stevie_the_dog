# Stevie The Dog: this site

Everything particular to this website. The shared CMS docs in `docs/cms/` are synced unchanged from the client-kit repo and never edited here. Where they say "recorded in `docs/site.md`", the value is below.

## Site Details

| Detail              | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Website name        | Stevie The Dog                                                                              |
| Production URL      | `https://www.steviethedog.com`: the exact URL stored in the CMS, no redirect                |
| Vercel project      | stevie_the_dog, in 3DWD's Vercel Pro team                                                   |
| CMS media folder    | `steviethedog`: this site's upload folder in 3DWD's Cloudinary account, given by the CMS    |
| Static image folder | `stevie_the_dog`: the site's own images (`_data/photos.js`), in the same Cloudinary account |
| Pages               | `/`: home page (hero photo, intro and the blog)                                             |
| Post links          | new tab (the default), set in `_components/FormattedText.jsx`                               |

`next/image` loads only from `3dwd/steviethedog/` (production uploads), `3dwd-dev/steviethedog/` (local uploads) and `stevie_the_dog/` (the site's own images), set in `next.config.mjs`.

## Abilities this site uses

- **Posts (live):** read `docs/cms/posts.md`. Posts render in `_components/Blog.jsx`, below the hero on `/`. There is no posts route and no page per post. Built: `_lib/getPosts.js`, `_lib/parseParagraph.js` and `_components/FormattedText.jsx`.
- **Galleries (added in the CMS, not shown yet):** read `docs/cms/galleries.md` once Rich decides where a gallery goes. Until then there is no `_lib/getGallery.js`, and `next.config.mjs` has no gallery crop rows.

## Quirks

- Locally, the CMS sends its revalidate call to the stored production URL, not to this machine. After a dashboard change, POST to `localhost:3001/api/revalidate` by hand (with the local webhook secret) to see it.
- Each CMS environment issues its own API key and webhook secret, so the local ones never work on staging or production. Production's are in 1Password (3DWD Clients).
