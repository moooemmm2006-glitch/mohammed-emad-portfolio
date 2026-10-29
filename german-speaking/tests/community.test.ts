import { describe, expect, it } from "vitest";
import ar from "../messages/ar.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import { COMMUNITY_MAX_CAPACITY, COMMUNITY_MAX_MESSAGE_LENGTH, COMMUNITY_PRESENCE_TTL_MS, hashInviteToken, presenceCutoff } from "@/lib/community/service";

describe("study community shared rules", () => {
  it("expires presence after the configured heartbeat window", () => {
    const now = Date.UTC(2026, 9, 30, 12);
    expect(presenceCutoff(now)).toBe(now - 55_000);
    expect(COMMUNITY_PRESENCE_TTL_MS).toBe(55_000);
  });

  it("hashes private invite tokens deterministically without storing the token", () => {
    const first = hashInviteToken("a-secure-invite-token");
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInviteToken("a-secure-invite-token")).toBe(first);
    expect(hashInviteToken("another-token")).not.toBe(first);
  });

  it("keeps room and chat limits within their server-side bounds", () => {
    expect(COMMUNITY_MAX_CAPACITY).toBe(40);
    expect(COMMUNITY_MAX_MESSAGE_LENGTH).toBe(1000);
  });

  it("provides every community UI key in Arabic, German, and English", () => {
    const keys = Object.keys(ar).filter((key) => key.startsWith("community_"));
    for (const key of keys) {
      expect(de, `missing German translation: ${key}`).toHaveProperty(key);
      expect(en, `missing English translation: ${key}`).toHaveProperty(key);
      expect(ar, `missing Arabic translation: ${key}`).toHaveProperty(key);
    }
  });
});
