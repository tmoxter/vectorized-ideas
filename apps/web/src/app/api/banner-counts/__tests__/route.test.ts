import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockCreateClient = vi.hoisted(() => vi.fn());
const mockAuthenticateUser = vi.hoisted(() => vi.fn());
const mockExtractBearerToken = vi.hoisted(() => vi.fn());
const mockGetBannerCounts = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/server/logic/auth", () => ({
  extractBearerToken: mockExtractBearerToken,
  authenticateUser: mockAuthenticateUser,
}));

vi.mock("@/server/services/matching.service", () => ({
  getBannerCounts: mockGetBannerCounts,
}));

const { GET } = await import("../route");

describe("GET /api/banner-counts", () => {
  const testUserId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should return 401 when authorization header is missing", async () => {
    mockExtractBearerToken.mockReturnValue(null);

    const request = new NextRequest("http://localhost/api/banner-counts");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("No authorization header");
    expect(mockAuthenticateUser).not.toHaveBeenCalled();
  });

  it("should return 401 when user is not authenticated", async () => {
    mockExtractBearerToken.mockReturnValue("invalid-token");
    mockAuthenticateUser.mockResolvedValue({
      user: null,
      error: new Error("Invalid token"),
    });

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("User not authenticated");
  });

  it("should return banner counts successfully", async () => {
    mockExtractBearerToken.mockReturnValue("valid-token");
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });
    mockCreateClient.mockReturnValue({});
    mockGetBannerCounts.mockResolvedValue({
      total_profiles: 42,
      related_topics: 15,
    });

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      total_profiles: 42,
      related_topics: 15,
    });
    expect(mockGetBannerCounts).toHaveBeenCalledWith(
      expect.anything(),
      testUserId
    );
  });

  it("should handle service errors gracefully", async () => {
    mockExtractBearerToken.mockReturnValue("valid-token");
    mockAuthenticateUser.mockResolvedValue({
      user: { id: testUserId },
      error: null,
    });
    mockCreateClient.mockReturnValue({});
    mockGetBannerCounts.mockRejectedValue(new Error("Service error"));

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Server error");
  });

  it("should handle missing environment variables", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Missing Supabase configuration");

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });
});
