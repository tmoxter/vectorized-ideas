import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/usePendingRequests", () => ({
  usePendingRequests: vi.fn(),
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
import { usePendingRequests } from "@/hooks/usePendingRequests";
import { useInteraction } from "@/hooks/useInteraction";

const PendingRequestsPage = await import("../page").then((m) => m.default);

describe("PendingRequestsPage", () => {
  const mockLogout = vi.fn();
  const mockRecordInteraction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRecordInteraction.mockResolvedValue(true);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: "test-user", email: "test@example.com" },
      isLoading: false,
      logout: mockLogout,
    });

    vi.mocked(useInteraction).mockReturnValue({
      recordInteraction: mockRecordInteraction,
      isSubmitting: false,
    });
  });

  it("should display loading state when auth is loading", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: true,
      logout: mockLogout,
    });

    vi.mocked(usePendingRequests).mockReturnValue({
      requests: [],
      isLoading: false,
      error: "",
      reload: vi.fn(),
    });

    render(<PendingRequestsPage />);

    expect(screen.getByTestId("circles-loader")).toBeInTheDocument();
  });

  it("should show empty state when no pending requests", () => {
    vi.mocked(usePendingRequests).mockReturnValue({
      requests: [],
      isLoading: false,
      error: "",
      reload: vi.fn(),
    });

    render(<PendingRequestsPage />);

    expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
  });

  it("should display pending requests when available", () => {
    const mockRequests = [
      {
        id: "user-1",
        name: "Test User",
        bio: "Test bio",
        achievements: "Test achievements",
        created_at: new Date().toISOString(),
      },
    ];

    vi.mocked(usePendingRequests).mockReturnValue({
      requests: mockRequests,
      isLoading: false,
      error: "",
      reload: vi.fn(),
    });

    render(<PendingRequestsPage />);

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });
});
