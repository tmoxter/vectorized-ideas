import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockExtractBearerToken = vi.hoisted(() => vi.fn());
const mockAuthenticateUser = vi.hoisted(() => vi.fn());
const mockDeleteAccount = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/server/logic/auth", () => ({
  extractBearerToken: mockExtractBearerToken,
  authenticateUser: mockAuthenticateUser,
}));

vi.mock("@/server/services/account.service", () => ({
  deleteAccount: mockDeleteAccount,
}));

const { DELETE } = await import("../route");

describe("DELETE /api/delete-account", () => {
  const testUserId = "test-user-123";
  const validToken = "valid-token-xyz";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should return 401 when authorization header is missing", async () => {
    mockExtractBearerToken.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/delete-account", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when authorization header does not start with Bearer", async () => {
    mockExtractBearerToken.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/delete-account", {
      method: "DELETE",
      headers: {
        Authorization: "Token abc123",
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when user is not authenticated", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: null,
      error: new Error("Invalid token"),
    });

    const request = new NextRequest("http://localhost/api/delete-account", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should successfully delete user account and all related data", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });
    mockCreateClient.mockReturnValue({});
    mockDeleteAccount.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost/api/delete-account", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Account deleted successfully");
    expect(mockDeleteAccount).toHaveBeenCalledWith(
      expect.anything(),
      testUserId
    );
  });

  it("should return 500 when auth user deletion fails", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });
    mockCreateClient.mockReturnValue({});
    mockDeleteAccount.mockRejectedValue(
      new Error("Error deleting user from auth: Failed to delete auth user")
    );

    const request = new NextRequest("http://localhost/api/delete-account", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("An unexpected error occurred");
  });

  it("should handle unexpected errors gracefully", async () => {
    mockExtractBearerToken.mockReturnValue(validToken);
    mockAuthenticateUser.mockRejectedValue(new Error("Network error"));

    const request = new NextRequest("http://localhost/api/delete-account", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("An unexpected error occurred");
  });
});
