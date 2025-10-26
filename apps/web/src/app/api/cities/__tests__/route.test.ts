import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock @supabase/supabase-js
const mockCreateClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import after mocks are set up
const { GET } = await import("../route");

describe("GET /api/cities", () => {
  const mockCities = [
    {
      id: 1,
      name: "San Francisco",
      admin1: "California",
      country_name: "United States",
      country_iso2: "US",
      lat: 37.7749,
      lon: -122.4194,
      population: 873965,
    },
    {
      id: 2,
      name: "San Jose",
      admin1: "California",
      country_name: "United States",
      country_iso2: "US",
      lat: 37.3382,
      lon: -121.8863,
      population: 1035317,
    },
    {
      id: 3,
      name: "Santa Clara",
      admin1: "California",
      country_name: "United States",
      country_iso2: "US",
      lat: 37.3541,
      lon: -121.9552,
      population: 127134,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("should return empty array for query length less than 2", async () => {
    const mockClient = {
      rpc: vi.fn(),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/cities?q=s");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
    expect(mockClient.rpc).not.toHaveBeenCalled();
  });

  it("should search cities successfully", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: mockCities,
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/cities?q=san");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockClient.rpc).toHaveBeenCalledWith("search_cities", {
      p_q: "san",
      p_country_iso2: null,
      p_limit: 10,
    });

    expect(data.items).toHaveLength(3);
    expect(data.items[0]).toEqual({
      id: 1,
      label: "San Francisco, California (United States)",
      name: "San Francisco",
      admin1: "California",
      country: "United States",
      iso2: "US",
      lat: 37.7749,
      lon: -122.4194,
      population: 873965,
    });
  });

  it("should respect limit parameter", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: mockCities.slice(0, 2),
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest(
      "http://localhost/api/cities?q=san&limit=2"
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockClient.rpc).toHaveBeenCalledWith("search_cities", {
      p_q: "san",
      p_country_iso2: null,
      p_limit: 2,
    });
    expect(data.items).toHaveLength(2);
  });

  it("should filter by country when provided", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: mockCities,
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest(
      "http://localhost/api/cities?q=san&country=US"
    );
    const response = await GET(request);

    expect(mockClient.rpc).toHaveBeenCalledWith("search_cities", {
      p_q: "san",
      p_country_iso2: "US",
      p_limit: 10,
    });
  });

  it("should handle cities without admin1", async () => {
    const cityWithoutAdmin1 = {
      id: 4,
      name: "Monaco",
      admin1: null,
      country_name: "Monaco",
      country_iso2: "MC",
      lat: 43.7384,
      lon: 7.4246,
      population: 39242,
    };

    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: [cityWithoutAdmin1],
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/cities?q=monaco");
    const response = await GET(request);
    const data = await response.json();

    expect(data.items[0].label).toBe("Monaco (Monaco)");
  });

  it("should handle RPC errors", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection error" },
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/cities?q=san");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Database connection error");
  });

  it("should trim whitespace from query", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest(
      "http://localhost/api/cities?q=%20%20san%20%20"
    );
    await GET(request);

    expect(mockClient.rpc).toHaveBeenCalledWith("search_cities", {
      p_q: "san",
      p_country_iso2: null,
      p_limit: 10,
    });
  });

  it("should use default limit of 10 when not specified", async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: mockCities,
        error: null,
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest("http://localhost/api/cities?q=san");
    await GET(request);

    expect(mockClient.rpc).toHaveBeenCalledWith("search_cities", {
      p_q: "san",
      p_country_iso2: null,
      p_limit: 10,
    });
  });
});
