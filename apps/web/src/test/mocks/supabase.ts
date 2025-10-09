import { vi } from 'vitest';
import { testUsers, generateMockEmbedding } from '../fixtures/users';

export interface MockSupabaseClient {
  from: (table: string) => any;
  auth: {
    getSession: () => Promise<any>;
    getUser: (token: string) => Promise<any>;
    signOut: () => Promise<any>;
  };
  rpc: (fn: string, params: any) => Promise<any>;
}

// Mock database state
let mockMatches: Array<{ user_a: string; user_b: string; created_at: string }> = [];
let mockEmbeddings: Array<{
  entity_type: string;
  entity_id: string;
  user_id: string;
  vector: number[];
}> = [];

// Initialize mock embeddings for test users
export function initializeMockData() {
  mockMatches = [];
  mockEmbeddings = testUsers.map((user, index) => ({
    entity_type: 'idea',
    entity_id: user.venture.id,
    user_id: user.id,
    vector: generateMockEmbedding(index + 1),
  }));
}

// Reset mock data
export function resetMockData() {
  mockMatches = [];
  mockEmbeddings = [];
}

// Helper to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  return dotProduct;
}

// Create a mock Supabase client
export function createMockSupabaseClient(currentUserId?: string): MockSupabaseClient {
  const mockFrom = (table: string) => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    // Mock profiles table
    if (table === 'profiles') {
      queryBuilder.maybeSingle.mockImplementation(() => {
        const userId = (queryBuilder.eq as any).mock.calls.find(
          (call: any) => call[0] === 'user_id'
        )?.[1];

        const user = testUsers.find(u => u.id === userId);
        if (user) {
          return Promise.resolve({ data: user.profile, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      queryBuilder.single.mockImplementation(() => {
        const userId = (queryBuilder.eq as any).mock.calls.find(
          (call: any) => call[0] === 'user_id'
        )?.[1];

        const user = testUsers.find(u => u.id === userId);
        if (user) {
          return Promise.resolve({ data: user.profile, error: null });
        }
        return Promise.resolve({ data: null, error: { message: 'Not found' } });
      });
    }

    // Mock user_ventures table
    if (table === 'user_ventures') {
      queryBuilder.maybeSingle.mockImplementation(() => {
        const userId = (queryBuilder.eq as any).mock.calls.find(
          (call: any) => call[0] === 'user_id'
        )?.[1];

        const user = testUsers.find(u => u.id === userId);
        if (user) {
          return Promise.resolve({ data: user.venture, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      queryBuilder.single.mockImplementation(() => {
        const userId = (queryBuilder.eq as any).mock.calls.find(
          (call: any) => call[0] === 'user_id'
        )?.[1];

        const user = testUsers.find(u => u.id === userId);
        if (user) {
          return Promise.resolve({ data: user.venture, error: null });
        }
        return Promise.resolve({ data: null, error: { message: 'Not found' } });
      });
    }

    // Mock user_cofounder_preference table
    if (table === 'user_cofounder_preference') {
      queryBuilder.maybeSingle.mockImplementation(() => {
        const userId = (queryBuilder.eq as any).mock.calls.find(
          (call: any) => call[0] === 'user_id'
        )?.[1];

        const user = testUsers.find(u => u.id === userId);
        if (user) {
          return Promise.resolve({ data: user.preferences, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });
    }

    // Mock embeddings table
    if (table === 'embeddings') {
      queryBuilder.single.mockImplementation(() => {
        const entityId = (queryBuilder.eq as any).mock.calls.find(
          (call: any) => call[0] === 'entity_id'
        )?.[1];

        const embedding = mockEmbeddings.find(e => e.entity_id === entityId);
        if (embedding) {
          return Promise.resolve({ data: embedding, error: null });
        }
        return Promise.resolve({ data: null, error: { message: 'Not found' } });
      });

      queryBuilder.upsert.mockImplementation((data: any) => {
        const existingIndex = mockEmbeddings.findIndex(
          e => e.entity_id === data.entity_id
        );
        if (existingIndex >= 0) {
          mockEmbeddings[existingIndex] = { ...mockEmbeddings[existingIndex], ...data };
        } else {
          mockEmbeddings.push(data);
        }
        return Promise.resolve({ data, error: null });
      });
    }

    // Mock matches table
    if (table === 'matches') {
      queryBuilder.insert.mockImplementation((data: any) => {
        mockMatches.push(data);
        return Promise.resolve({ data, error: null });
      });
    }

    return queryBuilder;
  };

  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({
      data: {
        session: currentUserId
          ? {
              user: {
                id: currentUserId,
                email: testUsers.find(u => u.id === currentUserId)?.email,
              },
            }
          : null,
      },
    }),
    getUser: vi.fn().mockImplementation((token: string) => {
      if (currentUserId) {
        return Promise.resolve({
          data: {
            user: {
              id: currentUserId,
              email: testUsers.find(u => u.id === currentUserId)?.email,
            },
          },
          error: null,
        });
      }
      return Promise.resolve({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  const mockRpc = vi.fn().mockImplementation((fn: string, params: any) => {
    if (fn === 'knn_candidates') {
      const { p_idea_id, p_limit = 20 } = params;

      // Find the embedding for the query idea
      const queryEmbedding = mockEmbeddings.find(e => e.entity_id === p_idea_id);
      if (!queryEmbedding) {
        return Promise.resolve({ data: null, error: { message: 'Embedding not found' } });
      }

      // Calculate similarities and return simple candidates (API will enrich them)
      const candidates = mockEmbeddings
        .filter(e => e.entity_id !== p_idea_id)
        .map(candidateEmb => {
          const similarity = cosineSimilarity(queryEmbedding.vector, candidateEmb.vector);
          const user = testUsers.find(u => u.venture.id === candidateEmb.entity_id);

          if (!user) return null;

          // Return simple candidate structure - API will enrich it
          return {
            user_id: user.id,
            venture_id: candidateEmb.entity_id,
            similarity_score: similarity,
            stage: user.stage,
            timezone: user.profile.timezone,
            availability_hours: user.availability_hours,
          };
        })
        .filter(c => c !== null)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, p_limit);

      return Promise.resolve({ data: candidates, error: null });
    }

    return Promise.resolve({ data: null, error: { message: 'Unknown RPC function' } });
  });

  return {
    from: mockFrom,
    auth: mockAuth,
    rpc: mockRpc,
  };
}

// Get mock matches for testing
export function getMockMatches() {
  return mockMatches;
}

// Add a mock match
export function addMockMatch(userA: string, userB: string) {
  mockMatches.push({
    user_a: userA,
    user_b: userB,
    created_at: new Date().toISOString(),
  });
}
