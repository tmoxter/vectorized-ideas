import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { testUsers } from '@/test/fixtures/users';
import { createMockSupabaseClient, initializeMockData, resetMockData, getMockMatches } from '@/test/mocks/supabase';

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

    // Mock the fetch API for embeddings endpoint with enriched data
    mockFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

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

  it('should show candidate counter', async () => {
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    });
  });

  it('should navigate to next candidate when next button is clicked', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    // Wait for candidates to load
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click next button
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should show the second candidate
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
    });

    // Counter should update
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('should navigate to previous candidate when previous button is clicked', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    // Wait for candidates to load
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Go to next candidate first
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
    });

    // Click previous button
    const previousButton = screen.getByRole('button', { name: /previous/i });
    await user.click(previousButton);

    // Should show the first candidate again
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });
  });

  it('should disable previous button on first candidate', async () => {
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    const previousButton = screen.getByRole('button', { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it('should disable next button on last candidate', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Navigate to the last candidate
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[2].profile.name)).toBeInTheDocument();
    });

    expect(nextButton).toBeDisabled();
  });

  it('should save match when interested button is clicked', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click interested button
    const interestedButton = screen.getByRole('button', { name: /interested/i });
    await user.click(interestedButton);

    // Should show saving state
    await waitFor(() => {
      expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/match saved/i)).toBeInTheDocument();
    });

    // Should automatically move to next candidate after a delay
    await waitFor(
      () => {
        expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Check that match was saved in mock database
    const matches = getMockMatches();
    expect(matches).toHaveLength(1);
    expect(matches[0].user_a).toBe(currentUser.id);
    expect(matches[0].user_b).toBe(mockCandidates[0].id);
  });

  it('should handle pass action correctly', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    // Click pass button
    const passButton = screen.getByRole('button', { name: /pass/i });
    await user.click(passButton);

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
  });

  it('should handle maybe action correctly', async () => {
    const user = userEvent.setup();
    render(<MatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(mockCandidates[0].profile.name)).toBeInTheDocument();
    });

    const firstCandidateName = mockCandidates[0].profile.name;

    // Click maybe later button
    const maybeButton = screen.getByRole('button', { name: /maybe later/i });
    await user.click(maybeButton);

    // Should automatically move to next candidate after delay
    await waitFor(
      () => {
        expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // First candidate should no longer be displayed
    expect(screen.queryByText(firstCandidateName)).not.toBeInTheDocument();
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

    // Click interested on all candidates
    const interestedButton = screen.getByRole('button', { name: /interested/i });

    // First candidate
    await user.click(interestedButton);
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[1].profile.name)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Second candidate
    await user.click(interestedButton);
    await waitFor(() => {
      expect(screen.getByText(mockCandidates[2].profile.name)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Third (last) candidate
    await user.click(interestedButton);

    // Should show end message
    await waitFor(() => {
      expect(screen.getByText(/you've reviewed all available matches/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
