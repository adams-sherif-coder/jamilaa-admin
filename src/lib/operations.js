// Keep only hashes/UUIDs in tab storage; never persist contacts, passwords or payloads.
const storageKey = "jamila-operation-keys-v1";
function read() {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey) ?? "{}");
  } catch {
    return {};
  }
}
export async function operationKey(actor, signature) {
  if (!actor) throw new Error("يجب التحقق من الحساب قبل تنفيذ العملية");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${actor}:${signature}`),
  );
  const hash = Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
  const journal = read();
  journal[hash] ??= crypto.randomUUID();
  sessionStorage.setItem(storageKey, JSON.stringify(journal));
  return { hash, key: journal[hash] };
}
export function acknowledge(hash) {
  const journal = read();
  delete journal[hash];
  sessionStorage.setItem(storageKey, JSON.stringify(journal));
}
