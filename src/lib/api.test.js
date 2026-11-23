import { afterEach, expect, it, vi } from "vitest";
import { request } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "XSRF-TOKEN=; Max-Age=0";
});
it("sends session credentials, decoded CSRF and unchanged idempotency key", async () => {
  document.cookie = "XSRF-TOKEN=a%2Bb";
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true, data: { id: 7 } }), {
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(
    await request("/api/v1/admin/receivings", {
      method: "POST",
      body: { reference: "001" },
      key: "stable-operation-uuid",
    }),
  ).toEqual({ id: 7 });
  expect(fetchMock.mock.calls[0][1]).toMatchObject({
    credentials: "include",
    headers: {
      "X-XSRF-TOKEN": "a+b",
      "Idempotency-Key": "stable-operation-uuid",
    },
    body: '{"reference":"001"}',
  });
});
it("returns a real 422 error and fields without optimistic success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "validation_failed",
            message: { ar: "بيانات غير صحيحة" },
            fields: { quantity: ["invalid"] },
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } },
      ),
    ),
  );
  await expect(request("/test")).rejects.toMatchObject({
    status: 422,
    code: "validation_failed",
    fields: { quantity: ["invalid"] },
  });
});
it("does not automatically retry a mutation on transport failure", async () => {
  document.cookie = "XSRF-TOKEN=token";
  const fetchMock = vi.fn().mockRejectedValue(new TypeError("lost response"));
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    request("/test", { method: "POST", body: {}, key: "same-key" }),
  ).rejects.toMatchObject({ status: "NETWORK" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
