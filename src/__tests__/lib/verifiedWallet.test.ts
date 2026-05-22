import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select:  vi.fn().mockReturnThis(),
      eq:      vi.fn().mockReturnThis(),
      single:  mockSingle,
    })),
  },
}));

import { getVerifiedWallet } from "@/lib/verifiedWallet";

const REAL_WALLET    = "0xAaBbCcDdEeFf00112233445566778899AaBbCcDd";
const ATTACKER_WALLET = "0x1111111111111111111111111111111111111111";

describe("getVerifiedWallet — derives the credited wallet server-side (C-1, C-2)", () => {
  beforeEach(() => {
    mockSingle.mockReset();
  });

  it("returns the lowercased profile wallet when body is omitted", async () => {
    mockSingle.mockResolvedValueOnce({ data: { wallet_address: REAL_WALLET } });
    const r = await getVerifiedWallet("did:privy:abc");
    expect(r.ok).toBe(true);
    expect(r.ok && r.wallet).toBe(REAL_WALLET.toLowerCase());
  });

  it("accepts a matching body wallet (case-insensitive)", async () => {
    mockSingle.mockResolvedValueOnce({ data: { wallet_address: REAL_WALLET } });
    const r = await getVerifiedWallet("did:privy:abc", REAL_WALLET.toUpperCase());
    expect(r.ok).toBe(true);
    expect(r.ok && r.wallet).toBe(REAL_WALLET.toLowerCase());
  });

  it("rejects an attacker-supplied wallet that does not match the profile (C-1 + C-2)", async () => {
    mockSingle.mockResolvedValueOnce({ data: { wallet_address: REAL_WALLET } });
    const r = await getVerifiedWallet("did:privy:abc", ATTACKER_WALLET);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("mismatch");
  });

  it("returns no_profile when the row does not exist", async () => {
    mockSingle.mockResolvedValueOnce({ data: null });
    const r = await getVerifiedWallet("did:privy:ghost");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("no_profile");
  });

  it("returns no_wallet when the profile has no synced wallet", async () => {
    mockSingle.mockResolvedValueOnce({ data: { wallet_address: null } });
    const r = await getVerifiedWallet("did:privy:abc");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("no_wallet");
  });

  it("returns no_wallet when stored value is not a 0x40-hex address", async () => {
    mockSingle.mockResolvedValueOnce({ data: { wallet_address: "not-a-wallet" } });
    const r = await getVerifiedWallet("did:privy:abc");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toBe("no_wallet");
  });

  it("never returns the attacker wallet — even when body and profile differ", async () => {
    mockSingle.mockResolvedValueOnce({ data: { wallet_address: REAL_WALLET } });
    const r = await getVerifiedWallet("did:privy:abc", ATTACKER_WALLET);
    if (r.ok) {
      throw new Error("expected mismatch, got ok");
    }
    expect(r.reason).toBe("mismatch");
  });
});
