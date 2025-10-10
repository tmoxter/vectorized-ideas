import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testUsers } from '@/test/fixtures/users';
import { createMockSupabaseClient, initializeMockData, resetMockData, getMockInteractions, getMockMatches, addMockInteraction } from '@/test/mocks/supabase';

// Mock @supabase/supabase-js - use vi.hoisted to avoid hoisting issues
const mockCreateClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Import after mocks are set up
const { POST } = await import('../route');

describe('Interactions API Route', () => {
  const currentUser = testUsers[0]; // Alice
  const targetUser = testUsers[1]; // Bob

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockData();
    initializeMockData();

    // Mock createClient to return our mock Supabase client
    mockCreateClient.mockImplementation((url: string, key: string) => {
      // For service role client
      if (key === process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createMockSupabaseClient(currentUser.id);
      }
      // For anon key client (auth check)
      return createMockSupabaseClient(currentUser.id);
    });
  });

  describe('POST /api/interactions', () => {
    it('should record a like interaction successfully', async () => {
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'like',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify interaction was recorded
      const interactions = getMockInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].actor_user).toBe(currentUser.id);
      expect(interactions[0].target_user).toBe(targetUser.id);
      expect(interactions[0].action).toBe('like');
    });

    it('should record a pass interaction successfully', async () => {
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'pass',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify interaction was recorded
      const interactions = getMockInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].actor_user).toBe(currentUser.id);
      expect(interactions[0].target_user).toBe(targetUser.id);
      expect(interactions[0].action).toBe('pass');
    });

    it('should record a block interaction successfully', async () => {
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'block',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify interaction was recorded
      const interactions = getMockInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].actor_user).toBe(currentUser.id);
      expect(interactions[0].target_user).toBe(targetUser.id);
      expect(interactions[0].action).toBe('block');
    });

    it('should not create duplicate like interactions', async () => {
      const request1 = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'like',
        }),
      });

      const request2 = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'like',
        }),
      });

      // First request
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Second request (duplicate)
      const response2 = await POST(request2);
      expect(response2.status).toBe(200);

      // Should still only have one interaction
      const interactions = getMockInteractions();
      expect(interactions).toHaveLength(1);
    });

    it('should update timestamp for repeated pass interactions', async () => {
      const request1 = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'pass',
        }),
      });

      // First pass
      await POST(request1);
      const firstInteractions = getMockInteractions();
      const firstTimestamp = firstInteractions[0].created_at;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const request2 = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'pass',
        }),
      });

      // Second pass
      await POST(request2);
      const secondInteractions = getMockInteractions();

      // Should still only have one interaction
      expect(secondInteractions).toHaveLength(1);

      // But timestamp should be updated
      expect(secondInteractions[0].created_at).not.toBe(firstTimestamp);
    });

    it('should return 400 when targetUserId is missing', async () => {
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          action: 'like',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should return 400 when action is missing', async () => {
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should return 400 when action is invalid', async () => {
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'invalid_action',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid action');
    });

    it('should return 401 when authorization header is missing', async () => {
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'like',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No authorization header');
    });

    it('should return 401 when user is not authenticated', async () => {
      // Mock unauthenticated state
      mockCreateClient.mockImplementation(() => {
        return createMockSupabaseClient(undefined);
      });

      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer invalid-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'like',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('User not authenticated');
    });

    it('should create a match when there is a reciprocal like', async () => {
      // First, Bob likes Alice (creating the reciprocal like)
      addMockInteraction(targetUser.id, currentUser.id, 'like');

      // Now Alice likes Bob back
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'like',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify interaction was recorded
      const interactions = getMockInteractions();
      expect(interactions).toHaveLength(2); // Bob's like + Alice's like

      // Verify match was created
      const matches = getMockMatches();
      expect(matches).toHaveLength(1);
      expect(matches[0].user_a).toBe(currentUser.id);
      expect(matches[0].user_b).toBe(targetUser.id);
      expect(matches[0].active).toBe(true);
    });

    it('should not create a match when there is no reciprocal like', async () => {
      // Alice likes Bob (no reciprocal like exists)
      const request = new Request('http://localhost/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          action: 'like',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify interaction was recorded
      const interactions = getMockInteractions();
      expect(interactions).toHaveLength(1);

      // Verify no match was created
      const matches = getMockMatches();
      expect(matches).toHaveLength(0);
    });
  });
});
