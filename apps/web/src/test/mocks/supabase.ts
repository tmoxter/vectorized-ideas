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
let mockMatches: Array<{ user_a: string; user_b: string; created_at: string; active?: boolean }> = [];
let mockEmbeddings: Array<{
  entity_type: string;
  entity_id: string;
  user_id: string;
  vector: number[];
}> = [];
let mockInteractions: Array<{
  id: string;
  actor_user: string;
  target_user: string;
  action: 'like' | 'pass' | 'block';
  actor_current_idea: string | null;
  target_current_idea: string | null;
  created_at: string;
  updated_at: string;
}> = [];

// Initialize mock embeddings for test users
export function initializeMockData() {
  mockMatches = [];
  mockInteractions = [];
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
  mockInteractions = [];
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

      // Add select method for when querying specific fields like "id"
      const originalSelect = queryBuilder.select;
      queryBuilder.select = vi.fn().mockImplementation((fields?: string) => {
        // Return chainable builder that supports eq, order, limit
        return {
          ...queryBuilder,
          select: originalSelect,
        };
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

    // Mock cities table
    if (table === 'cities') {
      queryBuilder.maybeSingle.mockImplementation(() => {
        const cityId = (queryBuilder.eq as any).mock.calls.find(
          (call: any) => call[0] === 'id'
        )?.[1];

        // Mock city data
        const mockCities: Record<number, { id: number; name: string; country_name: string }> = {
          1: { id: 1, name: 'San Francisco', country_name: 'United States' },
          2: { id: 2, name: 'Austin', country_name: 'United States' },
          3: { id: 3, name: 'Seattle', country_name: 'United States' },
          4: { id: 4, name: 'New York', country_name: 'United States' },
          5: { id: 5, name: 'Boston', country_name: 'United States' },
        };

        if (cityId && mockCities[cityId]) {
          return Promise.resolve({ data: mockCities[cityId], error: null });
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
        const match = {
          ...data,
          created_at: data.created_at || new Date().toISOString(),
        };
        mockMatches.push(match);

        // Return chainable object with select method
        return {
          select: vi.fn().mockResolvedValue({ data: match, error: null }),
          then: (resolve: any) => resolve({ data: match, error: null }),
        };
      });

      queryBuilder.select.mockImplementation(() => {
        return {
          ...queryBuilder,
          data: mockMatches,
          error: null,
        };
      });
    }

    // Mock interactions table
    if (table === 'interactions') {
      queryBuilder.insert.mockImplementation((data: any) => {
        // Check for duplicates
        const exists = mockInteractions.find(
          i => i.actor_user === data.actor_user &&
               i.target_user === data.target_user &&
               i.action === data.action
        );

        if (exists) {
          // Return error for duplicate
          return {
            select: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'duplicate key value violates unique constraint' }
            }),
            then: (resolve: any) => resolve({
              data: null,
              error: { message: 'duplicate key value violates unique constraint' }
            }),
          };
        }

        const interaction = {
          id: `interaction-${Date.now()}-${Math.random()}`,
          ...data,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockInteractions.push(interaction);
        return {
          select: vi.fn().mockResolvedValue({ data: interaction, error: null }),
          then: (resolve: any) => resolve({ data: interaction, error: null }),
        };
      });

      queryBuilder.upsert.mockImplementation((data: any) => {
        const existingIndex = mockInteractions.findIndex(
          i => i.actor_user === data.actor_user &&
               i.target_user === data.target_user &&
               i.action === data.action
        );

        if (existingIndex >= 0) {
          mockInteractions[existingIndex] = {
            ...mockInteractions[existingIndex],
            ...data,
            updated_at: new Date().toISOString(),
          };
          return {
            select: vi.fn().mockResolvedValue({ data: mockInteractions[existingIndex], error: null }),
            then: (resolve: any) => resolve({ data: mockInteractions[existingIndex], error: null }),
          };
        } else {
          const interaction = {
            id: `interaction-${Date.now()}-${Math.random()}`,
            ...data,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mockInteractions.push(interaction);
          return {
            select: vi.fn().mockResolvedValue({ data: interaction, error: null }),
            then: (resolve: any) => resolve({ data: interaction, error: null }),
          };
        }
      });

      queryBuilder.select.mockImplementation((fields?: string) => {
        // Return a chainable query builder for filtering
        let filteredInteractions = [...mockInteractions];

        return {
          eq: vi.fn().mockImplementation((field: string, value: any) => {
            filteredInteractions = filteredInteractions.filter(i => (i as any)[field] === value);
            return {
              eq: vi.fn().mockImplementation((field2: string, value2: any) => {
                filteredInteractions = filteredInteractions.filter(i => (i as any)[field2] === value2);
                return {
                  eq: vi.fn().mockImplementation((field3: string, value3: any) => {
                    filteredInteractions = filteredInteractions.filter(i => (i as any)[field3] === value3);
                    return {
                      limit: vi.fn().mockReturnValue(Promise.resolve({
                        data: filteredInteractions.slice(0, 1),
                        error: null,
                      })),
                    };
                  }),
                  limit: vi.fn().mockReturnValue(Promise.resolve({
                    data: filteredInteractions.slice(0, 1),
                    error: null,
                  })),
                };
              }),
              limit: vi.fn().mockReturnValue(Promise.resolve({
                data: filteredInteractions.slice(0, 1),
                error: null,
              })),
            };
          }),
          limit: vi.fn().mockReturnValue(Promise.resolve({
            data: filteredInteractions.slice(0, 1),
            error: null,
          })),
        };
      });

      queryBuilder.delete.mockImplementation(() => {
        // Return chainable query builder for filtering before delete
        const deleteFilters: Record<string, any> = {};

        const deleteBuilder = {
          eq: vi.fn().mockImplementation((field: string, value: any) => {
            deleteFilters[field] = value;
            return deleteBuilder;
          }),
          then: (resolve: any) => {
            // Actually perform the delete when promise is resolved
            const initialLength = mockInteractions.length;
            mockInteractions = mockInteractions.filter(i => {
              return !Object.entries(deleteFilters).every(([field, value]) => (i as any)[field] === value);
            });
            const deletedCount = initialLength - mockInteractions.length;
            return resolve({ data: null, error: null, count: deletedCount });
          },
        };

        return deleteBuilder;
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
    if (fn === 'knn_candidates' || fn === 'knn_candidates_excl' || fn === 'knn_candidates_interact_prefs_applied') {
      const { p_idea_id, p_limit = 20, p_model, p_version, p_probes } = params;

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
          // For the new function, use 'idea_sim' instead of 'similarity_score' to match actual DB response
          return {
            user_id: user.id,
            venture_id: candidateEmb.entity_id,
            similarity_score: similarity,
            idea_sim: similarity, // Add this field for the new function
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

    // Mock insert_like_interaction RPC
    if (fn === 'insert_like_interaction') {
      const { p_actor_user, p_target_user } = params;

      // Check if already exists
      const exists = mockInteractions.find(
        i => i.actor_user === p_actor_user &&
             i.target_user === p_target_user &&
             (i.action === 'like' || i.action === 'pass')
      );

      if (!exists) {
        const interaction = {
          id: `interaction-${Date.now()}-${Math.random()}`,
          actor_user: p_actor_user,
          target_user: p_target_user,
          action: 'like' as const,
          actor_current_idea: null,
          target_current_idea: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockInteractions.push(interaction);
      }

      return Promise.resolve({ data: null, error: null });
    }

    // Mock insert_pass_interaction RPC
    if (fn === 'insert_pass_interaction') {
      const { p_actor_user, p_target_user } = params;

      const existingIndex = mockInteractions.findIndex(
        i => i.actor_user === p_actor_user &&
             i.target_user === p_target_user &&
             i.action === 'pass'
      );

      const now = new Date().toISOString();

      if (existingIndex >= 0) {
        // Update created_at for existing pass
        mockInteractions[existingIndex].created_at = now;
        mockInteractions[existingIndex].updated_at = now;
      } else {
        // Insert new pass interaction
        const interaction = {
          id: `interaction-${Date.now()}-${Math.random()}`,
          actor_user: p_actor_user,
          target_user: p_target_user,
          action: 'pass' as const,
          actor_current_idea: null,
          target_current_idea: null,
          created_at: now,
          updated_at: now,
        };
        mockInteractions.push(interaction);
      }

      return Promise.resolve({ data: null, error: null });
    }

    // Mock block_user RPC
    if (fn === 'block_user') {
      const { p_actor, p_target } = params;

      const interaction = {
        id: `interaction-${Date.now()}-${Math.random()}`,
        actor_user: p_actor,
        target_user: p_target,
        action: 'block' as const,
        actor_current_idea: null,
        target_current_idea: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockInteractions.push(interaction);

      return Promise.resolve({ data: null, error: null });
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

// Get mock interactions for testing
export function getMockInteractions() {
  return mockInteractions;
}

// Add a mock interaction
export function addMockInteraction(
  actorUser: string,
  targetUser: string,
  action: 'like' | 'pass' | 'block',
  actorCurrentIdea: string | null = null,
  targetCurrentIdea: string | null = null
) {
  mockInteractions.push({
    id: `interaction-${Date.now()}-${Math.random()}`,
    actor_user: actorUser,
    target_user: targetUser,
    action,
    actor_current_idea: actorCurrentIdea,
    target_current_idea: targetCurrentIdea,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
