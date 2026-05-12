import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockMaybySingle = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybySingle,
    })),
  },
}));

import { isEnvAdmin, isAdmin } from "@/lib/admin";

describe("isEnvAdmin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true for a matching email", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com,super@corp.co");
    expect(isEnvAdmin("admin@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isEnvAdmin("ADMIN@EXAMPLE.COM")).toBe(true);
  });

  it("returns false for an email not in the list", () => {
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
    expect(isEnvAdmin("other@example.com")).toBe(false);
  });

  it("returns false when ADMIN_EMAILS is empty", () => {
    vi.stubEnv("ADMIN_EMAILS", "");
    expect(isEnvAdmin("anyone@example.com")).toBe(false);
  });

  it("handles whitespace around emails", () => {
    vi.stubEnv("ADMIN_EMAILS", " admin@example.com , super@corp.co ");
    expect(isEnvAdmin("super@corp.co")).toBe(true);
  });
});

describe("isAdmin", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAILS", "root@corp.com");
    mockMaybySingle.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false for null email", async () => {
    expect(await isAdmin(null)).toBe(false);
  });

  it("returns false for undefined email", async () => {
    expect(await isAdmin(undefined)).toBe(false);
  });

  it("returns true for an env admin without hitting the DB", async () => {
    expect(await isAdmin("root@corp.com")).toBe(true);
    expect(mockMaybySingle).not.toHaveBeenCalled();
  });

  it("returns true when email is in the DB admin_users table", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: { id: 42 } });
    expect(await isAdmin("dbadmin@example.com")).toBe(true);
  });

  it("returns false when email is in neither env nor DB", async () => {
    mockMaybySingle.mockResolvedValueOnce({ data: null });
    expect(await isAdmin("nobody@example.com")).toBe(false);
  });
});
