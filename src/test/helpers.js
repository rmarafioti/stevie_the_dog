// Shared test helpers for the edges of the app. mockFetch is the only fake network: no test
// calls the real CMS.
import { vi } from "vitest";

// Replaces the global fetch with a mock that resolves to a JSON response, and returns the mock
// so a test can check what was sent.
export function mockFetch({ status = 200, body }) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
