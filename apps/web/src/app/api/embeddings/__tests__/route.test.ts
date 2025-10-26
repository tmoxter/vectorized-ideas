import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { testUsers } from "@/test/fixtures/users";
import {
  createMockSupabaseClient,
  initializeMockData,
  resetMockData,
} from "@/test/mocks/supabase";

// Mock the Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

describe("GET /api/embeddings", () => {
  beforeEach(() => {
    // Reset and initialize mock data before each test
    resetMockData();
    initializeMockData();

    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("should return matching candidates for a valid user with venture", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const testUser = testUsers[0]; // Alice

    // Mock the Supabase client
    (createClient as any).mockReturnValue(
      createMockSupabaseClient(testUser.id)
    );

    // Create mock request
    const mockRequest = new NextRequest(
      `http://localhost:3000/api/embeddings?userId=${testUser.id}&limit=5`
    );

    // Call the GET handler
    const response = await GET(mockRequest);
    const data = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("baseVenture");
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.length).toBeLessThanOrEqual(5);

    // Check that the base venture matches the user's venture
    expect(data.baseVenture.id).toBe(testUser.venture.id);
    expect(data.baseVenture.title).toBe(testUser.venture.title);

    // Check candidate structure
    const firstCandidate = data.items[0];
    expect(firstCandidate).toHaveProperty("id");
    expect(firstCandidate).toHaveProperty("similarity_score");
    expect(firstCandidate).toHaveProperty("stage");
    expect(firstCandidate).toHaveProperty("timezone");
    expect(firstCandidate).toHaveProperty("profile");
    expect(firstCandidate).toHaveProperty("venture");
    expect(firstCandidate).toHaveProperty("preferences");

    // Check nested profile structure
    expect(firstCandidate.profile).toHaveProperty("name");
    expect(firstCandidate.profile).toHaveProperty("bio");
    expect(firstCandidate.profile).toHaveProperty("achievements");
    expect(firstCandidate.profile).toHaveProperty("region");

    // Check nested venture structure
    expect(firstCandidate.venture).toHaveProperty("title");
    expect(firstCandidate.venture).toHaveProperty("description");

    // Check nested preferences structure
    expect(firstCandidate.preferences).toHaveProperty("title");
    expect(firstCandidate.preferences).toHaveProperty("description");

    // Ensure the user is not matched with themselves
    expect(firstCandidate.id).not.toBe(testUser.id);

    // Similarity scores should be between -1 and 1 (for normalized vectors)
    expect(firstCandidate.similarity_score).toBeGreaterThanOrEqual(-1);
    expect(firstCandidate.similarity_score).toBeLessThanOrEqual(1);
  });

  it("should return candidates sorted by similarity score (descending)", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const testUser = testUsers[1]; // Bob

    (createClient as any).mockReturnValue(
      createMockSupabaseClient(testUser.id)
    );

    const mockRequest = new NextRequest(
      `http://localhost:3000/api/embeddings?userId=${testUser.id}&limit=10`
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items.length).toBeGreaterThan(1);

    // Check that similarity scores are in descending order
    for (let i = 1; i < data.items.length; i++) {
      expect(data.items[i - 1].similarity_score).toBeGreaterThanOrEqual(
        data.items[i].similarity_score
      );
    }
  });

  it("should respect the limit parameter", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const testUser = testUsers[0];

    (createClient as any).mockReturnValue(
      createMockSupabaseClient(testUser.id)
    );

    const mockRequest = new NextRequest(
      `http://localhost:3000/api/embeddings?userId=${testUser.id}&limit=2`
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items.length).toBeLessThanOrEqual(2);
  });

  it("should use default limit of 20 when limit is not specified", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const testUser = testUsers[0];

    (createClient as any).mockReturnValue(
      createMockSupabaseClient(testUser.id)
    );

    const mockRequest = new NextRequest(
      `http://localhost:3000/api/embeddings?userId=${testUser.id}`
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should return all available candidates (4 in our test data, since we exclude the user)
    expect(data.items.length).toBe(4);
  });

  it("should return 400 error when userId is missing", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    (createClient as any).mockReturnValue(createMockSupabaseClient());

    const mockRequest = new NextRequest("http://localhost:3000/api/embeddings");

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error");
    expect(data.error).toBe("userId required");
  });

  it("should return 404 error when user has no venture", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const nonExistentUserId = "non-existent-user-id";

    (createClient as any).mockReturnValue(
      createMockSupabaseClient(nonExistentUserId)
    );

    const mockRequest = new NextRequest(
      `http://localhost:3000/api/embeddings?userId=${nonExistentUserId}`
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty("error");
    expect(data.error).toBe("No venture found for user");
  });

  it("should include all expected fields in candidate responses", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const testUser = testUsers[2]; // Carol

    (createClient as any).mockReturnValue(
      createMockSupabaseClient(testUser.id)
    );

    const mockRequest = new NextRequest(
      `http://localhost:3000/api/embeddings?userId=${testUser.id}&limit=3`
    );

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);

    data.items.forEach((candidate: any) => {
      // Check all required top-level fields
      expect(candidate).toHaveProperty("id");
      expect(candidate).toHaveProperty("similarity_score");
      expect(candidate).toHaveProperty("stage");
      expect(candidate).toHaveProperty("timezone");
      expect(candidate).toHaveProperty("availability_hours");
      expect(candidate).toHaveProperty("profile");
      expect(candidate).toHaveProperty("venture");
      expect(candidate).toHaveProperty("preferences");

      // Check field types
      expect(typeof candidate.id).toBe("string");
      expect(typeof candidate.similarity_score).toBe("number");
      expect(typeof candidate.stage).toBe("string");

      // Check nested profile fields
      expect(candidate.profile).toHaveProperty("name");
      expect(candidate.profile).toHaveProperty("bio");
      expect(candidate.profile).toHaveProperty("achievements");
      expect(candidate.profile).toHaveProperty("region");

      // Check nested venture fields
      expect(candidate.venture).toHaveProperty("title");
      expect(candidate.venture).toHaveProperty("description");

      // Check nested preferences fields
      expect(candidate.preferences).toHaveProperty("title");
      expect(candidate.preferences).toHaveProperty("description");
    });
  });

  it("should handle different user profiles correctly", async () => {
    const { createClient } = await import("@supabase/supabase-js");

    // Test with multiple different users
    for (const testUser of testUsers.slice(0, 3)) {
      (createClient as any).mockReturnValue(
        createMockSupabaseClient(testUser.id)
      );

      const mockRequest = new NextRequest(
        `http://localhost:3000/api/embeddings?userId=${testUser.id}&limit=3`
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items.length).toBeGreaterThan(0);

      // Each user should get different candidates
      expect(data.baseVenture.user_id).toBe(testUser.id);
    }
  });
});
