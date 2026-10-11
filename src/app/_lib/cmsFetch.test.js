// Tests for cmsFetch: what it sends to the CMS, what it returns, and how it fails.
import { describe, expect, it, vi } from "vitest";

import { mockFetch } from "@/test/helpers";
import { cmsFetch } from "./cmsFetch";

const API_URL = "https://cms.test";
const API_KEY = "test-api-key";
const OPTIONS = { tag: "posts", empty: [] };

function stubCmsEnv() {
  vi.stubEnv("HEADLESS_CMS_API_URL", API_URL);
  vi.stubEnv("HEADLESS_CMS_API_KEY", API_KEY);
}

describe("cmsFetch", () => {
  it("returns the empty value without calling fetch when HEADLESS_CMS_API_URL is unset", async () => {
    const fetchMock = mockFetch({ body: { data: [] } });

    const result = await cmsFetch("/api/public/posts", OPTIONS);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends GET {url}{path} with the API key as a Bearer token", async () => {
    stubCmsEnv();
    const fetchMock = mockFetch({ body: { data: [] } });

    await cmsFetch("/api/public/posts", OPTIONS);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cms.test/api/public/posts");
    expect(init.method ?? "GET").toBe("GET");
    expect(init.headers).toEqual({ Authorization: "Bearer test-api-key" });
  });

  it("tags the request 'cms' plus its own tag, with an hourly fallback", async () => {
    stubCmsEnv();
    const fetchMock = mockFetch({ body: { data: [] } });

    await cmsFetch("/api/public/posts", OPTIONS);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.next).toEqual({ tags: ["cms", "posts"], revalidate: 3600 });
  });

  it("returns the unwrapped data", async () => {
    stubCmsEnv();
    const posts = [{ id: "post-1", header: "Hello", body: [], links: [] }];
    mockFetch({ body: { data: posts } });

    const result = await cmsFetch("/api/public/posts", OPTIONS);

    expect(result).toEqual(posts);
  });

  it("throws when the CMS returns 401", async () => {
    stubCmsEnv();
    mockFetch({
      status: 401,
      body: { error: { message: "Invalid API key." } },
    });

    const request = cmsFetch("/api/public/posts", OPTIONS);

    await expect(request).rejects.toThrow(
      "Headless CMS request failed: /api/public/posts HTTP 401",
    );
  });

  it("throws when the CMS returns 500", async () => {
    stubCmsEnv();
    mockFetch({
      status: 500,
      body: { error: { message: "Something went wrong, please try again." } },
    });

    const request = cmsFetch("/api/public/posts", OPTIONS);

    await expect(request).rejects.toThrow(
      "Headless CMS request failed: /api/public/posts HTTP 500",
    );
  });
});
