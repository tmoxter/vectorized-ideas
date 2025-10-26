import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { testUsers } from "@/test/fixtures/users";

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  pathname: "/matches",
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useMatches", () => ({
  useMatches: vi.fn(),
}));

vi.mock("@/hooks/useInteraction", () => ({
  useInteraction: vi.fn(),
}));

vi.mock("@/components/Navigation", () => ({
  default: () => <div data-testid="navigation">Navigation</div>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useInteraction } from "@/hooks/useInteraction";
import { profile } from "console";

const MatchesPage = await import("../page").then((m) => m.default);

describe("MatchesPage Integration Tests", () => {
  const currentUser = testUsers[0];
  const mockCandidates = testUsers.slice(1, 4).map((candidate, index) => ({
    id: candidate.id,
    profile: {
      name: candidate.profile.name,
      bio: candidate.profile.bio,
      achievements: candidate.profile.achievements,
      city_name: candidate.profile.region,
      country: "Test Country",
    },
    timezone: candidate.profile.timezone,
    stage: candidate.stage,
    availability_hours: candidate.availability_hours,
    similarity_score: 0.85 - index * 0.1,
    venture: {
      title: candidate.venture.title,
      description: candidate.venture.description,
    },
    preferences: {
      title: candidate.preferences.title,
      description: candidate.preferences.description,
    },
  }));

  const mockLogout = vi.fn();
  const mockRecordInteraction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRecordInteraction.mockResolvedValue(true);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: currentUser.id, email: "test@example.com" },
      isLoading: false,
      logout: mockLogout,
    });

    vi.mocked(useMatches).mockReturnValue({
      candidates: mockCandidates,
      isLoading: false,
      error: "",
      reload: vi.fn(),
    });

    vi.mocked(useInteraction).mockReturnValue({
      recordInteraction: mockRecordInteraction,
      isSubmitting: false,
    });
  });

  it("should render loading state when hook is loading", () => {
    vi.mocked(useMatches).mockReturnValue({
      candidates: [],
      isLoading: true,
      error: "",
      reload: vi.fn(),
    });

    render(<MatchesPage />);
    expect(screen.getByTestId("circles-loader")).toBeInTheDocument();
  });

  it("should load and display candidate matches after authentication", async () => {
    render(<MatchesPage />);

    expect(
      screen.getByText(mockCandidates[0].profile.name)
    ).toBeInTheDocument();
    expect(
      screen.getByText(mockCandidates[0].venture.title)
    ).toBeInTheDocument();
  });

  it("should display all candidate profile sections", async () => {
    render(<MatchesPage />);

    const firstCandidate = mockCandidates[0];

    expect(screen.getByText(firstCandidate.profile.name)).toBeInTheDocument();
    expect(screen.getByText(firstCandidate.profile.bio)).toBeInTheDocument();
    expect(
      screen.getByText(firstCandidate.profile.achievements)
    ).toBeInTheDocument();
    expect(
      screen.getByText(firstCandidate.venture.description)
    ).toBeInTheDocument();
    expect(
      screen.getByText(firstCandidate.preferences.description)
    ).toBeInTheDocument();
    expect(
      screen.getByText(firstCandidate.availability_hours)
    ).toBeInTheDocument();
  });

  it("should display page header with description", async () => {
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/discover profiles/i)).toBeInTheDocument();
    });

    // Should show description
    expect(
      screen.getByText(
        /semantic similarity matches based on your profile and venture ideas/i
      )
    ).toBeInTheDocument();
  });

  it("should automatically advance to next candidate after skip action", async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    expect(
      screen.getByText(mockCandidates[0].profile.name)
    ).toBeInTheDocument();

    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);

    await waitFor(
      () => {
        expect(
          screen.getByText(mockCandidates[1].profile.name)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("should automatically advance to next candidate after like action", async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    expect(
      screen.getByText(mockCandidates[0].profile.name)
    ).toBeInTheDocument();

    const connectButton = screen.getByRole("button", {
      name: /let's connect/i,
    });
    await user.click(connectButton);

    await waitFor(
      () => {
        expect(
          screen.getByText(mockCandidates[1].profile.name)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("should show block user button", async () => {
    render(<MatchesPage />);

    const blockButton = screen.getByRole("button", { name: /block user/i });
    expect(blockButton).toBeInTheDocument();
  });

  it("should show block confirmation dialog when block button is clicked", async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    const blockButton = screen.getByRole("button", { name: /block user/i });
    await user.click(blockButton);

    await waitFor(() => {
      expect(screen.getByText(/block this user\?/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /confirm block/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("should record like interaction when connect button is clicked", async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    const connectButton = screen.getByRole("button", {
      name: /let's connect/i,
    });
    await user.click(connectButton);

    await waitFor(() => {
      expect(mockRecordInteraction).toHaveBeenCalledWith(
        mockCandidates[0].id,
        "like"
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/like recorded/i)).toBeInTheDocument();
    });
  });

  it("should handle skip action correctly", async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    const skipButton = screen.getByRole("button", { name: /skip/i });
    await user.click(skipButton);

    await waitFor(() => {
      expect(mockRecordInteraction).toHaveBeenCalledWith(
        mockCandidates[0].id,
        "pass"
      );
    });
  });

  it("should show message when no candidates are found", async () => {
    vi.mocked(useMatches).mockReturnValue({
      candidates: [],
      isLoading: false,
      error: "",
      reload: vi.fn(),
    });

    render(<MatchesPage />);

    expect(screen.getByText(/no matches found/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /complete profile/i })
    ).toBeInTheDocument();
  });

  it("should display error message when hook returns error", async () => {
    vi.mocked(useMatches).mockReturnValue({
      candidates: [],
      isLoading: false,
      error: "Server error",
      reload: vi.fn(),
    });

    render(<MatchesPage />);

    expect(screen.getByText(/server error/i)).toBeInTheDocument();
  });

  it("should navigate through all candidates when clicking connect", async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    expect(
      screen.getByText(mockCandidates[0].profile.name)
    ).toBeInTheDocument();

    const connectButton = screen.getByRole("button", {
      name: /let's connect/i,
    });
    await user.click(connectButton);

    await waitFor(
      () => {
        expect(
          screen.getByText(mockCandidates[1].profile.name)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    expect(mockRecordInteraction).toHaveBeenCalledWith(
      mockCandidates[0].id,
      "like"
    );
  });
});
