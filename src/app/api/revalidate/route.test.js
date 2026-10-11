// Tests for the revalidate route: it rejects a missing or wrong webhook secret and expires the
// 'cms' tag for the right one.
import { describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";

import { POST } from "./route";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const SECRET = "test-webhook-secret";
const UNAUTHORIZED_BODY = { error: { message: "Unauthorized." } };

function revalidateRequest(authorization) {
  const headers = { "Content-Type": "application/json" };
  if (authorization !== undefined) headers.Authorization = authorization;

  return new Request("http://localhost/api/revalidate", {
    method: "POST",
    headers,
    body: JSON.stringify({ websiteId: "website-1", postId: "post-1" }),
  });
}

describe("POST /api/revalidate", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    vi.stubEnv("HEADLESS_CMS_WEBHOOK_SECRET", SECRET);

    const response = await POST(revalidateRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns 401 when the secret is wrong", async () => {
    vi.stubEnv("HEADLESS_CMS_WEBHOOK_SECRET", SECRET);

    const response = await POST(revalidateRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns 401 when HEADLESS_CMS_WEBHOOK_SECRET is unset", async () => {
    const response = await POST(revalidateRequest(`Bearer ${SECRET}`));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(UNAUTHORIZED_BODY);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns 200 and expires the 'cms' tag for the right secret", async () => {
    vi.stubEnv("HEADLESS_CMS_WEBHOOK_SECRET", SECRET);

    const response = await POST(revalidateRequest(`Bearer ${SECRET}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { revalidated: true } });
    expect(revalidateTag).toHaveBeenCalledWith("cms", { expire: 0 });
  });
});
