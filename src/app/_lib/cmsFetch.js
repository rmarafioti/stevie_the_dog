// The only place this website calls the Headless CMS. Server-only: the API key never reaches the
// browser. Every request is tagged 'cms', so /api/revalidate can expire all CMS data at once.
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
