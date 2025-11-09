import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMockSupabaseClient,
  initializeMockData,
  resetMockData,
} from "@/test/mocks/supabase";

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  pathname: "/profile",
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseClient: mockSupabaseClient,
}));

// Mock embeddings client functions
const mockEmbedProfile = vi.fn();
const mockEmbedIdea = vi.fn();

vi.mock("@/lib/embeddings-client", () => ({
  embedProfile: mockEmbedProfile,
  embedIdea: mockEmbedIdea,
  createProfileEmbeddingText: (profile: any) => {
    const parts = [
      profile.name && `Name: ${profile.name}`,
      profile.bio && `Bio: ${profile.bio}`,
      profile.achievements && `Experience: ${profile.achievements}`,
      profile.region && `Location: ${profile.region}`,
    ].filter(Boolean);
    return parts.join("\n\n");
  },
  createVentureEmbeddingText: (venture: any) => {
    const parts = [
      venture.title && `Project: ${venture.title}`,
      venture.description && `Description: ${venture.description}`,
    ].filter(Boolean);
    return parts.join("\n\n");
  },
}));

// Mock CityPicker component
vi.mock("../city_selection", () => ({
  CityPicker: ({ onChange, defaultCity }: any) => (
    <div data-testid="city-picker">City: {defaultCity?.name || "None"}</div>
  ),
}));

// Import the component after all mocks are set up
const ProfilePage = await import("../page").then((m) => m.default);

describe("ProfilePage Integration Tests", () => {
  const testUserId = "test-user-123";
  const testUserEmail = "test@example.com";

  // Track database state
  let mockProfilesDb: any[] = [];
  let mockVenturesDb: any[] = [];
  let mockPreferencesDb: any[] = [];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockData();
    initializeMockData();
    mockPush.mockClear();
    mockEmbedProfile.mockClear();
    mockEmbedIdea.mockClear();

    // Reset database state
    mockProfilesDb = [];
    mockVenturesDb = [];
    mockPreferencesDb = [];

    // Mock embeddings to return success
    mockEmbedProfile.mockResolvedValue({ success: true });
    mockEmbedIdea.mockResolvedValue({ success: true });

    // Create a mock Supabase client with database state tracking
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
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn((table: string) => {
        const queryBuilder = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };

        // Handle different table operations
        if (table === "profiles") {
          queryBuilder.single.mockImplementation(() => {
            const profile = mockProfilesDb.find(
              (p) => p.user_id === testUserId
            );
            if (profile) {
              return Promise.resolve({ data: profile, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });

          queryBuilder.upsert.mockImplementation((data: any) => {
            const existingIndex = mockProfilesDb.findIndex(
              (p) => p.user_id === data.user_id
            );
            if (existingIndex >= 0) {
              mockProfilesDb[existingIndex] = {
                ...mockProfilesDb[existingIndex],
                ...data,
              };
            } else {
              mockProfilesDb.push(data);
            }
            return Promise.resolve({ data, error: null });
          });
        }

        if (table === "user_ventures") {
          queryBuilder.single.mockImplementation(() => {
            const venture = mockVenturesDb.find(
              (v) => v.user_id === testUserId
            );
            if (venture) {
              return Promise.resolve({ data: venture, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });

          queryBuilder.upsert.mockImplementation((data: any) => {
            const existingIndex = mockVenturesDb.findIndex(
              (v) => v.user_id === data.user_id
            );
            if (existingIndex >= 0) {
              mockVenturesDb[existingIndex] = {
                ...mockVenturesDb[existingIndex],
                ...data,
              };
            } else {
              const newVenture = { ...data, id: `venture-${Date.now()}` };
              mockVenturesDb.push(newVenture);
            }
            return Promise.resolve({ data, error: null });
          });
        }

        if (table === "user_cofounder_preference") {
          queryBuilder.single.mockImplementation(() => {
            const pref = mockPreferencesDb.find(
              (p) => p.user_id === testUserId
            );
            if (pref) {
              return Promise.resolve({ data: pref, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });

          queryBuilder.upsert.mockImplementation((data: any) => {
            const existingIndex = mockPreferencesDb.findIndex(
              (p) => p.user_id === data.user_id
            );
            if (existingIndex >= 0) {
              mockPreferencesDb[existingIndex] = {
                ...mockPreferencesDb[existingIndex],
                ...data,
              };
            } else {
              mockPreferencesDb.push(data);
            }
            return Promise.resolve({ data, error: null });
          });
        }

        // Special handling for "user_cofounder_preferences" (with 's')
        if (table === "user_cofounder_preferences") {
          queryBuilder.single.mockImplementation(() => {
            const pref = mockPreferencesDb.find(
              (p) => p.user_id === testUserId
            );
            if (pref) {
              return Promise.resolve({ data: pref, error: null });
            }
            return Promise.resolve({
              data: null,
              error: { message: "Not found" },
            });
          });
        }

        return queryBuilder;
      }),
    };

    mockSupabaseClient.mockReturnValue(mockClient);
  });

  it("should render loading state initially", () => {
    render(<ProfilePage />);
    expect(screen.getByTestId("circles-loader")).toBeInTheDocument();
  });

  it("should load and display empty form for new user", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Check that form is rendered with empty fields
    expect(screen.getByPlaceholderText(/your full name/i)).toHaveValue("");
    expect(screen.getByTestId("city-picker")).toBeInTheDocument();
  });

  it("should load existing profile data", async () => {
    // Pre-populate database with existing data
    mockProfilesDb = [
      {
        user_id: testUserId,
        name: "John Doe",
        bio: "Software engineer with 10 years experience",
        achievements: "Built 3 successful startups",
        region: "San Francisco, CA",
        is_published: false,
      },
    ];

    mockVenturesDb = [
      {
        id: "venture-1",
        user_id: testUserId,
        title: "AI Code Assistant",
        description: "Building an AI-powered coding tool",
      },
    ];

    mockPreferencesDb = [
      {
        user_id: testUserId,
        title: "Technical Co-founder",
        description: "Looking for someone with ML experience",
      },
    ];

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Wait for profile data to be loaded into form fields
    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Check that existing data is loaded
    expect(
      screen.getByDisplayValue("Software engineer with 10 years experience")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("AI Code Assistant")).toBeInTheDocument();
  });

  it("should save profile as draft without generating embeddings", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in form fields
    await user.type(
      screen.getByPlaceholderText(/your full name/i),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(/AI-powered code review platform/i),
      "DevTools Pro"
    );
    await user.type(
      screen.getByPlaceholderText(/explain the problem you're solving/i),
      "A comprehensive development toolkit for modern teams"
    );

    // Click save as draft
    const saveDraftButton = screen.getByRole("button", {
      name: /save as draft/i,
    });
    await user.click(saveDraftButton);

    // Wait for save confirmation
    await waitFor(() => {
      expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
    });

    // Verify data was written to all three tables
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockProfilesDb[0]).toMatchObject({
      user_id: testUserId,
      name: "Jane Smith",
      is_published: false,
    });

    expect(mockVenturesDb).toHaveLength(1);
    expect(mockVenturesDb[0]).toMatchObject({
      user_id: testUserId,
      title: "DevTools Pro",
      description: "A comprehensive development toolkit for modern teams",
    });

    // Embeddings should not be generated for draft
    expect(mockEmbedProfile).not.toHaveBeenCalled();
    expect(mockEmbedIdea).not.toHaveBeenCalled();
  });

  it("should publish profile and generate embeddings", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in required fields
    await user.type(
      screen.getByPlaceholderText(/your full name/i),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\/yourprofile/i),
      "https://www.linkedin.com/in/janesmith"
    );
    // City is now a CityPicker component, not a text input
    await user.type(
      screen.getByPlaceholderText(/brief background about yourself/i),
      "Experienced product manager"
    );
    await user.type(
      screen.getByPlaceholderText(/AI-powered code review platform/i),
      "DevTools Pro"
    );
    await user.type(
      screen.getByPlaceholderText(/explain the problem you're solving/i),
      "A comprehensive development toolkit for modern teams"
    );

    // Click publish
    const publishButton = screen.getByRole("button", {
      name: /save & publish/i,
    });
    await user.click(publishButton);

    // Wait for publish confirmation
    await waitFor(() => {
      expect(
        screen.getByText(/profile published successfully/i)
      ).toBeInTheDocument();
    });

    // Verify data was written with is_published = true
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockProfilesDb[0]).toMatchObject({
      user_id: testUserId,
      name: "Jane Smith",
      bio: "Experienced product manager",
      is_published: true,
      // Note: city_id is now used instead of region
    });

    expect(mockVenturesDb).toHaveLength(1);
    expect(mockVenturesDb[0]).toMatchObject({
      user_id: testUserId,
      title: "DevTools Pro",
    });

    // Embeddings should be generated
    expect(mockEmbedProfile).toHaveBeenCalledWith(
      testUserId,
      expect.stringContaining("Jane Smith")
    );
    expect(mockEmbedIdea).toHaveBeenCalled();

    // Should redirect to matches page after publish
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/matches");
      },
      { timeout: 2000 }
    );
  });

  it("should disable publish button when required fields are missing", async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    const publishButton = screen.getByRole("button", {
      name: /save & publish/i,
    });

    // Should be disabled initially
    expect(publishButton).toBeDisabled();
  });

  it("should enable publish button when all required fields are filled", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    const publishButton = screen.getByRole("button", {
      name: /save & publish/i,
    });
    expect(publishButton).toBeDisabled();

    // Fill in required fields
    await user.type(
      screen.getByPlaceholderText(/your full name/i),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\/yourprofile/i),
      "https://www.linkedin.com/in/janesmith"
    );
    await user.type(
      screen.getByPlaceholderText(/AI-powered code review platform/i),
      "DevTools Pro"
    );
    await user.type(
      screen.getByPlaceholderText(/explain the problem you're solving/i),
      "A toolkit for developers"
    );

    // Should now be enabled
    await waitFor(() => {
      expect(publishButton).not.toBeDisabled();
    });
  });

  it("should update existing profile data", async () => {
    // Pre-populate with existing data
    mockProfilesDb = [
      {
        user_id: testUserId,
        name: "John Doe",
        bio: "Old bio",
        region: "SF",
        is_published: false,
      },
    ];

    mockVenturesDb = [
      {
        id: "venture-1",
        user_id: testUserId,
        title: "Old Title",
        description: "Old description",
      },
    ];

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Update the name
    const nameInput = screen.getByDisplayValue("John Doe");
    await user.clear(nameInput);
    await user.type(nameInput, "John Updated");

    // Save draft
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
    });

    // Verify data was updated (upserted)
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockProfilesDb[0].name).toBe("John Updated");
  });

  it("should handle save errors gracefully", async () => {
    // Mock an error in the upsert operation
    const mockClient = mockSupabaseClient();
    mockClient.from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          upsert: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database connection failed" },
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      };
    });

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in required fields
    await user.type(
      screen.getByPlaceholderText(/your full name/i),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(/AI-powered code review platform/i),
      "DevTools"
    );
    await user.type(
      screen.getByPlaceholderText(/explain the problem you're solving/i),
      "A toolkit"
    );

    // Try to save
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error saving profile/i)).toBeInTheDocument();
    });
  });

  it("should redirect to home when not authenticated", async () => {
    // Mock unauthenticated state
    const mockClient = mockSupabaseClient();
    mockClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: null },
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("should save all form fields correctly", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill in all fields
    await user.type(
      screen.getByPlaceholderText(/your full name/i),
      "Alice Johnson"
    );
    // City is now a CityPicker component, not a text input
    await user.type(
      screen.getByPlaceholderText(/brief background about yourself/i),
      "Full-stack developer with AI expertise"
    );
    await user.type(
      screen.getByPlaceholderText(/previous companies, projects/i),
      "Ex-Google, built ML platform"
    );
    await user.type(
      screen.getByPlaceholderText(/AI-powered code review platform/i),
      "CodeReview AI"
    );
    await user.type(
      screen.getByPlaceholderText(/explain the problem you're solving/i),
      "Automated code review using machine learning"
    );
    await user.type(
      screen.getByPlaceholderText(/seeking technical co-founder/i),
      "Technical Co-founder Needed"
    );
    await user.type(
      screen.getByPlaceholderText(/describe ideal co-founder skills/i),
      "Looking for backend engineer with ML experience"
    );

    // Save as draft
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    await waitFor(() => {
      expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
    });

    // Verify all data was saved correctly
    expect(mockProfilesDb[0]).toMatchObject({
      name: "Alice Johnson",
      bio: "Full-stack developer with AI expertise",
      achievements: "Ex-Google, built ML platform",
      // Note: city_id is now used instead of region
    });

    expect(mockVenturesDb[0]).toMatchObject({
      title: "CodeReview AI",
      description: "Automated code review using machine learning",
    });

    expect(mockPreferencesDb[0]).toMatchObject({
      title: "Technical Co-founder Needed",
      description: "Looking for backend engineer with ML experience",
    });
  });

  it("should handle embedding generation errors without blocking save", async () => {
    // Mock embedding functions to return errors
    mockEmbedProfile.mockResolvedValue({
      success: false,
      error: "OpenAI API error",
    });
    mockEmbedIdea.mockResolvedValue({
      success: false,
      error: "OpenAI API error",
    });

    const user = userEvent.setup();
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
    });

    // Fill and publish
    await user.type(
      screen.getByPlaceholderText(/your full name/i),
      "Jane Smith"
    );
    await user.type(
      screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\/yourprofile/i),
      "https://www.linkedin.com/in/janesmith"
    );
    await user.type(
      screen.getByPlaceholderText(/AI-powered code review platform/i),
      "DevTools"
    );
    await user.type(
      screen.getByPlaceholderText(/explain the problem you're solving/i),
      "A toolkit"
    );

    await user.click(screen.getByRole("button", { name: /save & publish/i }));

    // Should show success with embedding error noted
    await waitFor(() => {
      expect(screen.getByText(/embedding error/i)).toBeInTheDocument();
    });

    // Data should still be saved
    expect(mockProfilesDb).toHaveLength(1);
    expect(mockVenturesDb).toHaveLength(1);
  });

  describe("LinkedIn URL Validation", () => {
    it("should accept valid LinkedIn URLs", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test valid URL
      await user.type(linkedinInput, "https://www.linkedin.com/in/johndoe");

      // Should not show error
      expect(
        screen.queryByText(/url must be in the format/i)
      ).not.toBeInTheDocument();
    });

    it("should accept valid LinkedIn URLs with hyphens and trailing slash", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test URL with hyphens and trailing slash
      await user.type(linkedinInput, "https://www.linkedin.com/in/john-doe-123/");

      // Should not show error
      expect(
        screen.queryByText(/url must be in the format/i)
      ).not.toBeInTheDocument();
    });

    it("should reject LinkedIn URLs with wrong domain", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test invalid domain
      await user.type(linkedinInput, "https://linkedin.co.uk/in/johndoe");

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should reject LinkedIn URLs without https", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test URL without https
      await user.type(linkedinInput, "http://www.linkedin.com/in/johndoe");

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should reject non-LinkedIn URLs", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test completely different URL
      await user.type(linkedinInput, "https://www.facebook.com/johndoe");

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should reject LinkedIn URLs with wrong path", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinInput = screen.getByPlaceholderText(
        /https:\/\/www.linkedin.com\/in\/yourprofile/i
      );

      // Test URL with company path instead of /in/
      await user.type(linkedinInput, "https://www.linkedin.com/company/johndoe");

      // Should show error
      await waitFor(() => {
        expect(
          screen.getByText(/url must be in the format/i)
        ).toBeInTheDocument();
      });
    });

    it("should disable publish button when LinkedIn URL is invalid", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all required fields except valid LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(/your full name/i),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\/yourprofile/i),
        "https://facebook.com/jane"
      );
      await user.type(
        screen.getByPlaceholderText(/AI-powered code review platform/i),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(/explain the problem you're solving/i),
        "A toolkit for developers"
      );

      // Publish button should be disabled due to invalid LinkedIn URL
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });
      await waitFor(() => {
        expect(publishButton).toBeDisabled();
      });
    });

    it("should disable publish button when LinkedIn URL is empty", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all required fields except LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(/your full name/i),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(/AI-powered code review platform/i),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(/explain the problem you're solving/i),
        "A toolkit for developers"
      );

      // Publish button should be disabled without LinkedIn URL
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });
      expect(publishButton).toBeDisabled();
    });

    it("should enable publish button when LinkedIn URL is valid", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all required fields with valid LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(/your full name/i),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\/yourprofile/i),
        "https://www.linkedin.com/in/janesmith"
      );
      await user.type(
        screen.getByPlaceholderText(/AI-powered code review platform/i),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(/explain the problem you're solving/i),
        "A toolkit for developers"
      );

      // Publish button should be enabled
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });
      await waitFor(() => {
        expect(publishButton).not.toBeDisabled();
      });
    });

    it("should save LinkedIn URL to avatarurl field", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      const linkedinUrl = "https://www.linkedin.com/in/janesmith";

      // Fill in required fields
      await user.type(
        screen.getByPlaceholderText(/your full name/i),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\/yourprofile/i),
        linkedinUrl
      );
      await user.type(
        screen.getByPlaceholderText(/AI-powered code review platform/i),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(/explain the problem you're solving/i),
        "A comprehensive development toolkit"
      );

      // Save as draft
      await user.click(screen.getByRole("button", { name: /save as draft/i }));

      await waitFor(() => {
        expect(screen.getByText(/profile saved as draft/i)).toBeInTheDocument();
      });

      // Verify LinkedIn URL was saved to avatarurl field
      expect(mockProfilesDb).toHaveLength(1);
      expect(mockProfilesDb[0]).toMatchObject({
        user_id: testUserId,
        name: "Jane Smith",
        avatarurl: linkedinUrl,
      });
    });

    it("should load LinkedIn URL from avatarurl field", async () => {
      // Pre-populate database with LinkedIn URL in avatarurl
      mockProfilesDb = [
        {
          user_id: testUserId,
          name: "John Doe",
          avatarurl: "https://www.linkedin.com/in/johndoe",
          is_published: false,
        },
      ];

      mockVenturesDb = [
        {
          id: "venture-1",
          user_id: testUserId,
          title: "Test Project",
          description: "Test description",
        },
      ];

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Wait for profile data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
      });

      // Verify LinkedIn URL is loaded
      expect(
        screen.getByDisplayValue("https://www.linkedin.com/in/johndoe")
      ).toBeInTheDocument();
    });

    it("should prevent publishing with validation error message when LinkedIn URL is invalid", async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByTestId("circles-loader")).not.toBeInTheDocument();
      });

      // Fill in all fields with invalid LinkedIn URL
      await user.type(
        screen.getByPlaceholderText(/your full name/i),
        "Jane Smith"
      );
      await user.type(
        screen.getByPlaceholderText(/https:\/\/www.linkedin.com\/in\/yourprofile/i),
        "invalid-url"
      );
      await user.type(
        screen.getByPlaceholderText(/AI-powered code review platform/i),
        "DevTools Pro"
      );
      await user.type(
        screen.getByPlaceholderText(/explain the problem you're solving/i),
        "A toolkit"
      );

      // Try to publish (button should be disabled, but test the validation logic)
      const publishButton = screen.getByRole("button", {
        name: /save & publish/i,
      });

      // Button should be disabled
      expect(publishButton).toBeDisabled();

      // Error message should be visible
      expect(
        screen.getByText(/url must be in the format/i)
      ).toBeInTheDocument();
    });
  });
});
