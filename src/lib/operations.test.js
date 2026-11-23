import { beforeEach, expect, it } from "vitest";
import { webcrypto } from "node:crypto";
import { operationKey, acknowledge } from "./operations";
beforeEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
  sessionStorage.clear();
});
it("retains uncertain operation identity across remounts and isolates actors and payloads", async () => {
  const a = await operationKey("1:1", "receiving:payload");
  const b = await operationKey("1:1", "receiving:payload");
  expect(b).toEqual(a);
  expect((await operationKey("2:1", "receiving:payload")).key).not.toBe(a.key);
  expect((await operationKey("1:1", "receiving:changed")).key).not.toBe(a.key);
  expect(sessionStorage.getItem("jamila-operation-keys-v1")).not.toContain(
    "receiving",
  );
  acknowledge(a.hash);
  expect((await operationKey("1:1", "receiving:payload")).key).not.toBe(a.key);
});
