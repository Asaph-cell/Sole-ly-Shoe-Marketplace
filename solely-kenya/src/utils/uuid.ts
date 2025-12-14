export function generateUUID(): string {
  // Prefer native crypto.randomUUID when available
  const anyCrypto: any = (typeof crypto !== "undefined") ? crypto : undefined;
  if (anyCrypto && typeof anyCrypto.randomUUID === "function") {
    return anyCrypto.randomUUID();
  }

  // Fallback: use crypto.getRandomValues to construct a UUID v4
  if (anyCrypto && typeof anyCrypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    anyCrypto.getRandomValues(bytes);

    // Per RFC 4122 section 4.4
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    const b = Array.from(bytes).map(toHex).join("");
    return `${b.substring(0, 8)}-${b.substring(8, 12)}-${b.substring(12, 16)}-${b.substring(16, 20)}-${b.substring(20)}`;
  }

  // Last resort fallback (lower entropy, but avoids runtime errors)
  const randomHex = (len: number) =>
    Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${("89ab")[Math.floor(Math.random() * 4)]}${randomHex(3)}-${randomHex(12)}`;
}


