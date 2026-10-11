# Stevie the Dog

The website for Stevie, a little dog in the big city of Chicago: [www.steviethedog.com](https://www.steviethedog.com).

A static Next.js site hosted on Vercel. Blog posts are managed in the 3D Web Dev Headless CMS and fetched from its public API at build and regeneration time; everything else (pages, layout, styling) lives in this repo. The CMS integration is documented in [docs/client-website.md](docs/client-website.md), and project conventions in [CLAUDE.md](CLAUDE.md).

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The site runs on port 3001 because the CMS dashboard uses 3000 and the CMS API uses 4000 locally.

`.env.local` holds three server-only values. Never commit them or prefix them with `NEXT_PUBLIC_`:

| Variable                      | Value                                             |
| ----------------------------- | ------------------------------------------------- |
| `HEADLESS_CMS_API_URL`        | `http://localhost:4000` locally (the CMS backend) |
| `HEADLESS_CMS_API_KEY`        | this website's API key, from the CMS              |
| `HEADLESS_CMS_WEBHOOK_SECRET` | this website's webhook secret, from the CMS       |

On Vercel, set the same three variables, with `HEADLESS_CMS_API_URL=https://api.3dwebdev.com`.

## Scripts

| Command              | What it does                      |
| -------------------- | --------------------------------- |
| `npm run dev`        | Start the dev server              |
| `npm run build`      | Production build                  |
| `npm run start`      | Serve the production build        |
| `npm run lint`       | ESLint                            |
| `npm run format`     | Prettier, run before every commit |
| `npm test`           | Vitest, run once                  |
| `npm run test:watch` | Vitest in watch mode              |
