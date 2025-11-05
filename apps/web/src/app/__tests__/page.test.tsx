import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseClient: mockSupabaseClient,
}));

// Mock Footer, TypewriterHero, and OidcButton components
vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock("@/components/TypewriterHero", () => ({
  default: () => <div data-testid="typewriter">Hero</div>,
}));

vi.mock("@/components/OidcButton", () => ({
  default: () => <button data-testid="oidc-button">Continue with LinkedIn</button>,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

// Import after mocks
const LandingPage = await import("../page").then((m) => m.default);

describe("LandingPage", () => {
  const testEmail = "test@example.com";
  const testPassword = "password123";

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    (window as any).location = { href: "", origin: "http://localhost" };
  });

  it("should render signup form by default", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    expect(screen.getByText("Join the search")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/password \(min 6 characters\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
  });

  it("should toggle between signup and login modes", async () => {
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

    // Initially in signup mode
    expect(screen.getByText("Join the search")).toBeInTheDocument();

    // Click toggle to login
    const toggleButton = screen.getByText(/already have an account\? log in/i);
    await user.click(toggleButton);

    // Now in login mode
    expect(screen.getByText("welcome back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();

    // Click toggle back to signup
    const toggleBackButton = screen.getByText(/need an account\? sign up/i);
    await user.click(toggleBackButton);

    expect(screen.getByText("Join the search")).toBeInTheDocument();
  });

  it("should handle successful signup", async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-123" },
            session: null,
          },
          error: null,
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    const user = userEvent.setup();
    render(<LandingPage />);

    await user.type(screen.getByPlaceholderText(/email address/i), testEmail);
    await user.type(
      screen.getByPlaceholderText(/password \(min 6 characters\)/i),
      testPassword
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/check your email to confirm your account/i)
      ).toBeInTheDocument();
    });

    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: "http://localhost/auth/callback",
      },
    });
  });

  it("should handle successful login", async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: "user-123" },
            session: { access_token: "token-123" },
          },
          error: null,
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    const user = userEvent.setup();
    render(<LandingPage />);

    // Toggle to login mode
    await user.click(screen.getByText(/already have an account\? log in/i));

    await user.type(screen.getByPlaceholderText(/email address/i), testEmail);
    await user.type(screen.getByPlaceholderText(/password/i), testPassword);
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/logged in successfully/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(window.location.href).toBe("/auth/callback");
    });

    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: testEmail,
      password: testPassword,
    });
  });

  it("should display error messages on failed signup", async () => {
    const errorMessage = "Email already registered";
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: errorMessage },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    const user = userEvent.setup();
    render(<LandingPage />);

    await user.type(screen.getByPlaceholderText(/email address/i), testEmail);
    await user.type(
      screen.getByPlaceholderText(/password \(min 6 characters\)/i),
      testPassword
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it("should render LinkedIn OAuth button", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    const linkedinButton = screen.getByRole("button", {
      name: /continue with linkedin/i,
    });
    expect(linkedinButton).toBeInTheDocument();
  });

  it("should disable submit button when fields are empty", () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<LandingPage />);

    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("should clear form when toggling between modes", async () => {
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

    // Fill in form
    await user.type(screen.getByPlaceholderText(/email address/i), testEmail);
    await user.type(
      screen.getByPlaceholderText(/password \(min 6 characters\)/i),
      testPassword
    );

    // Toggle to login
    await user.click(screen.getByText(/already have an account\? log in/i));

    // Form should be cleared
    expect(screen.getByPlaceholderText(/email address/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/password/i)).toHaveValue("");
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
});
