import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock @supabase/supabase-js
const mockCreateClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import after mocks are set up
const { GET } = await import("../route");

describe("GET /api/banner-counts", () => {
  const testUserId = "test-user-123";
  const testVentureId = "venture-456";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should return 401 when authorization header is missing", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn(),
      },
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/banner-counts");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("No authorization header");
    expect(mockClient.auth.getUser).not.toHaveBeenCalled();
  });

  it("should return 401 when user is not authenticated", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Invalid token" },
        }),
      },
    };
    mockCreateClient.mockReturnValue(mockClient);

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

  it("should return default counts when user has no venture", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "user_ventures") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      total_profiles: 0,
      related_topics: 0,
    });
  });

  it("should return banner counts successfully", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "user_ventures") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: testVentureId,
                title: "Test Venture",
                created_at: "2025-01-01T00:00:00Z",
              },
              error: null,
            }),
          };
        }
        if (table === "embeddings") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                version: "1",
              },
              error: null,
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            loc_count: 42,
            sim_count: 15,
          },
        ],
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

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
    expect(mockClient.rpc).toHaveBeenCalledWith("banner_counts", {
      p_user: testUserId,
      p_idea_id: testVentureId,
      p_model: "text-embedding-3-small",
      p_version: "1",
    });
  });

  it("should use default version when no embedding found", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "user_ventures") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: testVentureId,
                title: "Test Venture",
                created_at: "2025-01-01T00:00:00Z",
              },
              error: null,
            }),
          };
        }
        if (table === "embeddings") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ loc_count: 10, sim_count: 5 }],
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    await GET(request);

    expect(mockClient.rpc).toHaveBeenCalledWith("banner_counts", {
      p_user: testUserId,
      p_idea_id: testVentureId,
      p_model: "text-embedding-3-small",
      p_version: "1", // default version
    });
  });

  it("should handle RPC errors gracefully", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "user_ventures") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: testVentureId,
                title: "Test",
                created_at: "2025-01-01T00:00:00Z",
              },
              error: null,
            }),
          };
        }
        if (table === "embeddings") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { version: "1" }, error: null }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "RPC function error" },
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("RPC function error");
  });

  it("should return default counts when RPC returns empty data", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "user_ventures") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: testVentureId,
                title: "Test",
                created_at: "2025-01-01T00:00:00Z",
              },
              error: null,
            }),
          };
        }
        if (table === "embeddings") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { version: "1" }, error: null }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      total_profiles: 0,
      related_topics: 0,
    });
  });

  it("should handle venture query errors", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "user_ventures") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          };
        }
        return {};
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/banner-counts", {
      headers: {
        Authorization: "Bearer valid-token",
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Error fetching user venture");
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

    // Restore for other tests
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  });
});
