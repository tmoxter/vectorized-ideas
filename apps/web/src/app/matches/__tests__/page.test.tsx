import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { testUsers } from '@/test/fixtures/users';
import { createMockSupabaseClient, initializeMockData, resetMockData, getMockMatches, getMockInteractions, addMockInteraction } from '@/test/mocks/supabase';

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/matches',
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock Supabase client
const mockSupabaseClient = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabaseClient: mockSupabaseClient,
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Import the component after all mocks are set up
const MatchesPage = await import('../page').then(m => m.default);

describe('MatchesPage Integration Tests', () => {
  const currentUser = testUsers[0]; // Alice
  const mockCandidates = testUsers.slice(1, 4); // Bob, Carol, David

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    resetMockData();
    initializeMockData();
    mockPush.mockClear();

    // Mock the Supabase client
    mockSupabaseClient.mockReturnValue(createMockSupabaseClient(currentUser.id));

    // Mock the fetch API for embeddings and interactions endpoints
    mockFetch.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

      // If input is a Request object, extract body from it
      let requestBody = init?.body;
      if (input instanceof Request && input.body) {
        const reader = input.body.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) {
            chunks.push(result.value);
          }
        }
        const decoder = new TextDecoder();
        requestBody = decoder.decode(chunks.reduce((acc, chunk) => {
          const tmp = new Uint8Array(acc.length + chunk.length);
          tmp.set(acc, 0);
          tmp.set(chunk, acc.length);
          return tmp;
        }, new Uint8Array()));
      }

      if (url.includes('/api/embeddings')) {
        const mockResponse = {
          items: mockCandidates.map((candidate, index) => ({
            id: candidate.id,
            stage: candidate.stage,
            timezone: candidate.profile.timezone,
            availability_hours: candidate.availability_hours,
            similarity_score: 0.85 - index * 0.1, // Decreasing similarity
            profile: {
              name: candidate.profile.name,
              bio: candidate.profile.bio,
              achievements: candidate.profile.achievements,
              region: candidate.profile.region,
            },
            venture: {
              title: candidate.venture.title,
              description: candidate.venture.description,
            },
            preferences: {
              title: candidate.preferences.title,
              description: candidate.preferences.description,
            },
          })),
          baseVenture: currentUser.venture,
        };

        return Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (url.includes('/api/interactions')) {
        // Parse the body to get interaction details
        let body: any = {};
        if (requestBody) {
          if (typeof requestBody === 'string') {
            body = JSON.parse(requestBody);
          } else {
            // Body might be a Buffer or other type
            body = JSON.parse(requestBody.toString());
          }
        }

        // Record interaction directly using the helper function
        if (body.targetUserId && body.action) {
          addMockInteraction(currentUser.id, body.targetUserId, body.action);
        }

        return Promise.resolve(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should render loading state initially', () => {
    render(<MatchesPage />);
    expect(screen.getByText(/loading potential matches/i)).toBeInTheDocument();
  });

  it('should load and display candidate matches after authentication', async () => {
    render(<MatchesPage />);

    // Wait for the matches to load
    await waitFor(() => {
      expect(screen.queryByText(/loading potential matches/i)).not.toBeInTheDocument();
    });

    // Check that the first candidate is displayed
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Check that venture title is displayed
    expect(screen.getByText(mockCandidates[0].venture.title)).toBeInTheDocument();

    // Check that similarity score is displayed
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });

  it('should display all candidate profile sections', async () => {
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    const firstCandidate = mockCandidates[0];

    // Check all content is displayed
    expect(screen.getByText(firstCandidate.profile.bio)).toBeInTheDocument();
    expect(screen.getByText(firstCandidate.profile.achievements)).toBeInTheDocument();
    expect(screen.getByText(firstCandidate.venture.description)).toBeInTheDocument();
    expect(screen.getByText(firstCandidate.preferences.description)).toBeInTheDocument();
    expect(screen.getByText(firstCandidate.availability_hours)).toBeInTheDocument();
  });

  it('should display page header with description', async () => {
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/discover profiles/i)).toBeInTheDocument();
    });

    // Should show description
    expect(screen.getByText(/semantic similarity matches based on your profile and venture ideas/i)).toBeInTheDocument();
  });

  it('should automatically advance to next candidate after skip action', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    // Wait for candidates to load
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click skip button
    const skipButton = screen.getByRole('button', { name: /skip/i });
    await user.click(skipButton);

    // Should automatically show the second candidate after delay
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should automatically advance to next candidate after like action', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    // Wait for candidates to load
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click "Let's connect" button
    const connectButton = screen.getByRole('button', { name: /let's connect/i });
    await user.click(connectButton);

    // Should automatically show the second candidate after delay
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should show block user button', async () => {
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Block button should be present
    const blockButton = screen.getByRole('button', { name: /block user/i });
    expect(blockButton).toBeInTheDocument();
  });

  it('should show block confirmation dialog when block button is clicked', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click block button
    const blockButton = screen.getByRole('button', { name: /block user/i });
    await user.click(blockButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/block this user\?/i)).toBeInTheDocument();
    });

    // Should show confirm and cancel buttons
    expect(screen.getByRole('button', { name: /confirm block/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should record like interaction when connect button is clicked', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click "Let's connect" button
    const connectButton = screen.getByRole('button', { name: /let's connect/i });
    await user.click(connectButton);

    // Should show saving state
    await waitFor(() => {
      expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/like recorded/i)).toBeInTheDocument();
    });

    // Should automatically move to next candidate after a delay
    await waitFor(
      () => {
        expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Check that like interaction was recorded
    const interactions = getMockInteractions();
    expect(interactions).toHaveLength(1);
    expect(interactions[0].actor_user).toBe(currentUser.id);
    expect(interactions[0].target_user).toBe(mockCandidates[0].id);
    expect(interactions[0].action).toBe('like');

    // No manual match should be created (only via API when reciprocal)
    const matches = getMockMatches();
    expect(matches).toHaveLength(0);
  });

  it('should handle skip action correctly and record pass interaction', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click skip button
    const skipButton = screen.getByRole('button', { name: /skip/i });
    await user.click(skipButton);

    // Should move to next candidate
    await waitFor(
      () => {
        expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Should NOT save a match
    const matches = getMockMatches();
    expect(matches).toHaveLength(0);

    // But should record a pass interaction
    const interactions = getMockInteractions();
    expect(interactions).toHaveLength(1);
    expect(interactions[0].actor_user).toBe(currentUser.id);
    expect(interactions[0].target_user).toBe(mockCandidates[0].id);
    expect(interactions[0].action).toBe('pass');
  });

  it('should redirect to home page when not authenticated', async () => {
    // Mock unauthenticated state
    mockSupabaseClient.mockReturnValue(createMockSupabaseClient(undefined));

    render(<MatchesPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('should show message when no candidates are found', async () => {
    // Mock empty response
    mockFetch.mockImplementationOnce((input: RequestInfo | URL) => {
      return Promise.resolve(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no potential matches found/i)).toBeInTheDocument();
    });

    // Should show link to complete profile
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument();
  });

  it('should display error message when API call fails', async () => {
    // Mock API error
    mockFetch.mockImplementationOnce((input: RequestInfo | URL) => {
      return Promise.resolve(
        new Response(JSON.stringify({ error: 'Server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading matches: server error/i)).toBeInTheDocument();
    });
  });

  it('should show end message after reviewing all candidates', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click "Let's connect" on all candidates
    // First candidate
    const connectButton1 = screen.getByRole('button', { name: /let's connect/i });
    await user.click(connectButton1);
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Second candidate
    const connectButton2 = screen.getByRole('button', { name: /let's connect/i });
    await user.click(connectButton2);
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[2].profile.name)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Third (last) candidate
    const connectButton3 = screen.getByRole('button', { name: /let's connect/i });
    await user.click(connectButton3);

    // Should show end message
    await waitFor(() => {
      expect(screen.getByText(/you've reviewed all available matches/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify all interactions were recorded
    const interactions = getMockInteractions();
    expect(interactions).toHaveLength(3);
  });
});
