import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextResponse } from "next/server";

// Mock @supabase/supabase-js
const mockCreateClient = vi.hoisted(() => vi.fn());
vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

// Import after mocks are set up
const { GET } = await import("../route");

describe("GET /api/dev-login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables before each test
    delete process.env.NEXT_PUBLIC_AUTH_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL_DEV;
    delete process.env.SUPABASE_SERVICE_ROLE_DEV;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("should return 404 when AUTH_MODE is not dev-magiclink", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "production";

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Not available");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("should return 404 when AUTH_MODE is undefined", async () => {
    // NEXT_PUBLIC_AUTH_MODE is undefined by default in beforeEach

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Not available");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("should return 404 when Supabase URL is not localhost", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "https://production.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Not available");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("should return 404 when Supabase URL hostname is not 127.0.0.1", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "http://192.168.1.100:54321";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Not available");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("should redirect to action_link when magic link is generated successfully (localhost)", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const mockActionLink = "http://localhost:54321/auth/v1/verify?token=abc123";
    const mockAdmin = {
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: {
              properties: {
                action_link: mockActionLink,
              },
            },
            error: null,
          }),
        },
      },
    };
    mockCreateClient.mockReturnValue(mockAdmin);

    const response = await GET();

    expect(mockCreateClient).toHaveBeenCalledWith(
      "http://localhost:54321",
      "test-service-role-key",
      { auth: { persistSession: false } }
    );
    expect(mockAdmin.auth.admin.generateLink).toHaveBeenCalledWith({
      type: "magiclink",
      email: "dev@local.test",
      options: { redirectTo: "http://localhost:3000/" },
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(mockActionLink);
  });

  it("should redirect to action_link when magic link is generated successfully (127.0.0.1)", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const mockActionLink = "http://127.0.0.1:54321/auth/v1/verify?token=abc123";
    const mockAdmin = {
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: {
              properties: {
                action_link: mockActionLink,
              },
            },
            error: null,
          }),
        },
      },
    };
    mockCreateClient.mockReturnValue(mockAdmin);

    const response = await GET();

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(mockActionLink);
  });

  it("should return 500 when generateLink returns an error", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const mockAdmin = {
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Invalid service role key" },
          }),
        },
      },
    };
    mockCreateClient.mockReturnValue(mockAdmin);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Invalid service role key");
  });

  it("should return 500 when action_link is missing", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const mockAdmin = {
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: {
              properties: {},
            },
            error: null,
          }),
        },
      },
    };
    mockCreateClient.mockReturnValue(mockAdmin);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("no action_link");
  });

  it("should return 500 when data is null without error", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const mockAdmin = {
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        },
      },
    };
    mockCreateClient.mockReturnValue(mockAdmin);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("no action_link");
  });

  it("should return 404 when Supabase URL is invalid", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "dev-magiclink";
    process.env.NEXT_PUBLIC_SUPABASE_URL_DEV = "not-a-valid-url";
    process.env.SUPABASE_SERVICE_ROLE_DEV = "test-service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Not available");
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
