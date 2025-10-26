import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabaseClient: mockSupabaseClient,
}));

// Mock Navigation and Footer components
vi.mock('@/components/Navigation', () => ({
  default: ({ onLogout }: any) => (
    <div data-testid="navigation">
      <button onClick={onLogout} data-testid="logout-button">Logout</button>
    </div>
  ),
}));

vi.mock('@/components/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// Import after mocks
const HomePage = await import('../page').then(m => m.default);

describe('HomePage', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';
  const testToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    global.fetch = vi.fn();
  });

  it('should redirect to landing page when not authenticated', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<HomePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should display loading state initially', () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<HomePage />);
    expect(screen.getByTestId('circles-loader')).toBeInTheDocument();
  });

  it('should fetch and display banner data', async () => {
    const bannerData = {
      total_profiles: 42,
      related_topics: 15,
    };

    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => bannerData,
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      // Banner content is duplicated for ticker animation, so use getAllByText
      const profilesText = screen.getAllByText(/42 profiles matching your location filter/i);
      expect(profilesText.length).toBeGreaterThan(0);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/banner-counts', {
      headers: {
        Authorization: `Bearer ${testToken}`,
      },
    });
  });

  it('should navigate to matches page when Discover Profiles button is clicked', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ total_profiles: 0, related_topics: 0 }),
    });

    const user = userEvent.setup();
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    const discoverButton = screen.getByText('Discover Profiles');
    await user.click(discoverButton);

    expect(mockPush).toHaveBeenCalledWith('/matches');
  });

  it('should navigate to pending requests when button is clicked', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ total_profiles: 0, related_topics: 0 }),
    });

    const user = userEvent.setup();
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    const pendingButton = screen.getByText('Pending Requests');
    await user.click(pendingButton);

    expect(mockPush).toHaveBeenCalledWith('/pending-requests');
  });

  it('should navigate to profile when My Profile button is clicked', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ total_profiles: 0, related_topics: 0 }),
    });

    const user = userEvent.setup();
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    const profileButton = screen.getByText('My Profile');
    await user.click(profileButton);

    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('should navigate to settings when Settings button is clicked', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ total_profiles: 0, related_topics: 0 }),
    });

    const user = userEvent.setup();
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    const settingsButton = screen.getByText('Settings');
    await user.click(settingsButton);

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('should handle logout', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ total_profiles: 0, related_topics: 0 }),
    });

    const user = userEvent.setup();
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    const logoutButton = screen.getByTestId('logout-button');
    await user.click(logoutButton);

    expect(mockClient.auth.signOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should handle banner data fetch errors gracefully', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: testUserId, email: testEmail },
              access_token: testToken,
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    // Should still render navigation section even if banner fails
    await waitFor(() => {
      const discoverButtons = screen.getAllByText('Discover Profiles');
      expect(discoverButtons.length).toBeGreaterThan(0);
    });
  });
});
