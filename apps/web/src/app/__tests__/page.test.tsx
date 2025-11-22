import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseClient: mockSupabaseClient,
}));

// Mock Footer, TypewriterHero, and MagneticLoginButton components
vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock("@/components/TypewriterHero", () => ({
  default: () => <div data-testid="typewriter">Hero</div>,
}));

vi.mock("@/components/MagneticLoginButton", () => ({
  default: () => <div data-testid="magnetic-login-button">Continue with LinkedIn</div>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

// Import after mocks
const LandingPage = await import("../page").then((m) => m.default);

describe("LandingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    (window as any).location = { href: "", origin: "http://localhost" };
  });

  it("should render MagneticLoginButton", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    const loginButton = screen.getByTestId("magnetic-login-button");
    expect(loginButton).toBeInTheDocument();
    expect(loginButton).toHaveTextContent(/continue with linkedin/i);
  });

  it("should render TypewriterHero component", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    expect(screen.getByTestId("typewriter")).toBeInTheDocument();
  });

  it("should render Footer component", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("should render 'How it works' section", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Semantic Similarity")).toBeInTheDocument();
    expect(screen.getByText("Visibility")).toBeInTheDocument();
    expect(screen.getByText("Connect on LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Discover")).toBeInTheDocument();
  });

  it("should render FAQ section", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  it("should expand and collapse FAQ items", async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    const user = userEvent.setup();
    render(<LandingPage />);

    const faqButton = screen.getByText(
      /Aren't there already alternative platforms out there\?/i
    );

    // FAQ should not be expanded initially
    expect(
      screen.queryByText(/Yes, but we found it hard to find people/i)
    ).not.toBeInTheDocument();

    // Click to expand
    await user.click(faqButton);

    // FAQ content should be visible
    expect(
      screen.getByText(/Yes, but we found it hard to find people/i)
    ).toBeInTheDocument();

    // Click again to collapse
    await user.click(faqButton);

    // FAQ content should be hidden
    await waitFor(() => {
      expect(
        screen.queryByText(/Yes, but we found it hard to find people/i)
      ).not.toBeInTheDocument();
    });
  });

  it("should redirect to /matches when authenticated and logo is clicked", async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "token-123" } },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    const user = userEvent.setup();
    render(<LandingPage />);

    // Wait for authentication check
    await waitFor(() => {
      const logo = screen.getByAltText("vectorized-ideas logo");
      expect(logo).toBeInTheDocument();
    });

    const logoButton = screen.getByText("vectorized-ideas").closest("button");
    expect(logoButton).toBeInTheDocument();

    await user.click(logoButton!);

    await waitFor(() => {
      expect(window.location.href).toBe("/matches");
    });
  });
});
