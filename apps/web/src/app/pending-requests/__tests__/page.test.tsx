import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

// Mock components
vi.mock('@/components/Navigation', () => ({
  default: () => <div data-testid="navigation">Navigation</div>,
}));

vi.mock('@/components/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

// Import after mocks
const PendingRequestsPage = await import('../page').then(m => m.default);

describe('PendingRequestsPage', () => {
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
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    render(<PendingRequestsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should display loading state initially when authenticated', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: 'test-user', email: 'test@example.com' },
              access_token: 'test-token',
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<PendingRequestsPage />);

    // Should show loader initially
    expect(screen.getByTestId('circles-loader')).toBeInTheDocument();
  });

  it('should fetch pending requests data', async () => {
    const mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: 'test-user', email: 'test@example.com' },
              access_token: 'test-token',
            },
          },
        }),
        signOut: vi.fn(),
      },
    };
    mockSupabaseClient.mockReturnValue(mockClient);

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<PendingRequestsPage />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByTestId('circles-loader')).not.toBeInTheDocument();
    });

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalled();
  });
});
