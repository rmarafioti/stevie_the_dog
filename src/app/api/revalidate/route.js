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
