import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  pathname: "/auth/callback",
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseClient: mockSupabaseClient,
}));

// Import the component after all mocks are set up
const AuthCallback = await import("../page").then((m) => m.default);

describe("AuthCallback Routing Logic", () => {
  const testUserId = "test-user-123";
  const testUserEmail = "test@example.com";

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it("should render loading state initially", () => {
    // Mock authenticated user with profile
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testUserEmail },
              access_token: "mock-token",
            },
          },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { user_id: testUserId },
          error: null,
        }),
      })),
    };

    mockSupabaseClient.mockReturnValue(mockClient);

    render(<AuthCallback />);
    // Check for the loading spinner instead of text
    expect(screen.getByTestId("circles-loader")).toBeInTheDocument();
  });

  it("should redirect to /home when user has a profile", async () => {
    // Mock authenticated user with profile
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testUserEmail },
              access_token: "mock-token",
            },
          },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { user_id: testUserId },
          error: null,
        }),
      })),
    };

    mockSupabaseClient.mockReturnValue(mockClient);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/home");
    });
  });

  it("should redirect to /profile when user does not have a profile", async () => {
    // Mock authenticated user without profile
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testUserEmail },
              access_token: "mock-token",
            },
          },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    };

    mockSupabaseClient.mockReturnValue(mockClient);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/profile");
    });
  });

  it("should redirect to / when user is not authenticated", async () => {
    // Mock unauthenticated state
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };

    mockSupabaseClient.mockReturnValue(mockClient);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("should redirect to /profile when there is an error checking profile", async () => {
    // Mock authenticated user but database error
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testUserEmail },
              access_token: "mock-token",
            },
          },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
      })),
    };

    mockSupabaseClient.mockReturnValue(mockClient);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/profile");
    });
  });

  it("should redirect to /profile when there is an unexpected error", async () => {
    // Mock authenticated user but unexpected error
    const mockClient = {
      auth: {
        getSession: vi.fn().mockRejectedValue(new Error("Network error")),
      },
    };

    mockSupabaseClient.mockReturnValue(mockClient);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/profile");
    });
  });

  it("should query the profiles table with correct user_id", async () => {
    const mockFrom = vi.fn();
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: testUserId },
      error: null,
    });

    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testUserEmail },
              access_token: "mock-token",
            },
          },
        }),
      },
      from: mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        maybeSingle: mockMaybeSingle,
      }),
    };

    mockSupabaseClient.mockReturnValue(mockClient);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(mockSelect).toHaveBeenCalledWith("user_id");
      expect(mockEq).toHaveBeenCalledWith("user_id", testUserId);
      expect(mockMaybeSingle).toHaveBeenCalled();
    });
  });
});
