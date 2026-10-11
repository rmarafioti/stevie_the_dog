// Tests for getPosts: its wiring to cmsFetch (path, tag and empty value).
import { describe, expect, it, vi } from "vitest";

import { mockFetch } from "@/test/helpers";
import { getPosts } from "./getPosts";

describe("getPosts", () => {
  it("requests /api/public/posts with the 'posts' tag", async () => {
    vi.stubEnv("HEADLESS_CMS_API_URL", "https://cms.test");
    vi.stubEnv("HEADLESS_CMS_API_KEY", "test-api-key");
    const fetchMock = mockFetch({ body: { data: [] } });

    await getPosts();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cms.test/api/public/posts");
    expect(init.next.tags).toEqual(["cms", "posts"]);
  });

  it("returns [] when HEADLESS_CMS_API_URL is unset", async () => {
    mockFetch({ body: { data: [] } });

    const posts = await getPosts();

    expect(posts).toEqual([]);
  });
});
