import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllEnvs());
it.each([
  ["true", "false", true, false],
  ["false", "true", false, true],
  ["true", "true", true, true],
  ["", "", false, false],
])(
  "uses explicit provider deployment flags (%s/%s)",
  async (website, pos, expectedWebsite, expectedPos) => {
    vi.resetModules();
    vi.stubEnv("VITE_WEBSITE_ENABLED", website);
    vi.stubEnv("VITE_POS_ENABLED", pos);
    const { modules } = await import("./api");
    expect(modules).toEqual({ website: expectedWebsite, pos: expectedPos });
  },
);
