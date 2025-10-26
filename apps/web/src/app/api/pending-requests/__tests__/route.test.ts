import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @supabase/supabase-js
const mockCreateClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Import after mocks are set up
const { GET } = await import('../route');

describe('GET /api/pending-requests', () => {
  const testUserId = 'test-user-123';
  const targetUserId = 'target-user-456';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  it('should return 401 when authorization header is missing', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn(),
      },
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('No authorization header');
    expect(mockClient.auth.getUser).not.toHaveBeenCalled();
  });

  it('should return 401 when user is not authenticated', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('User not authenticated');
  });

  it('should return 500 when environment variables are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Missing Supabase configuration');

    // Restore for other tests
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  });

  it('should fetch pending requests with default limit and offset', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      from: vi.fn(),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    await GET(request);

    expect(mockClient.rpc).toHaveBeenCalledWith('pending_requests', {
      p_user: testUserId,
      p_limit: 50,
      p_offset: 0,
    });
  });

  it('should respect custom limit and offset parameters', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      from: vi.fn(),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests?limit=10&offset=20', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    await GET(request);

    expect(mockClient.rpc).toHaveBeenCalledWith('pending_requests', {
      p_user: testUserId,
      p_limit: 10,
      p_offset: 20,
    });
  });

  it('should enrich pending requests with profile, venture, and preferences', async () => {
    const mockRpcData = [
      {
        user_id: targetUserId,
        stage: 'MVP',
        timezone: 'America/Los_Angeles',
        availability_hours: '30+ hours/week',
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      }),
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: 'John Doe',
                bio: 'Software engineer',
                achievements: 'Built 3 startups',
                experience: '10 years',
                education: 'MIT',
                city_id: 1,
              },
              error: null,
            }),
          };
        }
        if (table === 'user_ventures') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                title: 'AI Platform',
                description: 'Building an AI-powered tool',
              },
              error: null,
            }),
          };
        }
        if (table === 'user_cofounder_preference') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                title: 'Technical Co-founder',
                description: 'Looking for ML expertise',
              },
              error: null,
            }),
          };
        }
        if (table === 'cities') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: 'San Francisco',
                country_name: 'United States',
              },
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toEqual({
      id: targetUserId,
      stage: 'MVP',
      timezone: 'America/Los_Angeles',
      availability_hours: '30+ hours/week',
      created_at: '2025-01-01T00:00:00Z',
      profile: {
        name: 'John Doe',
        bio: 'Software engineer',
        achievements: 'Built 3 startups',
        experience: '10 years',
        education: 'MIT',
        city_id: 1,
        city_name: 'San Francisco',
        country: 'United States',
      },
      venture: {
        title: 'AI Platform',
        description: 'Building an AI-powered tool',
      },
      preferences: {
        title: 'Technical Co-founder',
        description: 'Looking for ML expertise',
      },
    });
  });

  it('should handle profiles without city_id', async () => {
    const mockRpcData = [
      {
        user_id: targetUserId,
        stage: 'Ideation',
        timezone: 'UTC',
        availability_hours: '20 hours/week',
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      }),
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                name: 'Jane Smith',
                bio: 'Product manager',
                achievements: 'PM at Google',
                experience: '5 years',
                education: 'Stanford',
                city_id: null,
              },
              error: null,
            }),
          };
        }
        if (table === 'user_ventures') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                title: 'SaaS Platform',
                description: 'Building B2B SaaS',
              },
              error: null,
            }),
          };
        }
        if (table === 'user_cofounder_preference') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                title: 'Engineering Co-founder',
                description: 'Need technical expertise',
              },
              error: null,
            }),
          };
        }
        return {};
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].profile.city_id).toBeNull();
    expect(data.items[0].profile.city_name).toBeUndefined();
    expect(data.items[0].profile.country).toBeUndefined();
  });

  it('should filter out null entries when enrichment fails', async () => {
    const mockRpcData = [
      { user_id: 'user-1', stage: 'MVP', timezone: 'UTC', availability_hours: '30h', created_at: '2025-01-01' },
      { user_id: null, stage: 'MVP', timezone: 'UTC', availability_hours: '30h', created_at: '2025-01-01' }, // No user_id
      { user_id: 'user-3', stage: 'MVP', timezone: 'UTC', availability_hours: '30h', created_at: '2025-01-01' },
    ];

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      }),
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { name: 'Test User' },
          error: null,
        }),
      })),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should filter out the entry with null user_id
    expect(data.items).toHaveLength(2);
  });

  it('should handle RPC errors', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC function error' },
      }),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('RPC function error');
  });

  it('should handle enrichment errors gracefully', async () => {
    const mockRpcData = [
      {
        user_id: targetUserId,
        stage: 'MVP',
        timezone: 'UTC',
        availability_hours: '30h',
        created_at: '2025-01-01',
      },
    ];

    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcData,
        error: null,
      }),
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Database error')),
      })),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should filter out entries that failed enrichment
    expect(data.items).toHaveLength(0);
  });

  it('should handle empty RPC response', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
      from: vi.fn(),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it('should handle unexpected errors', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('Network error')),
      },
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Server error');
  });

  it('should handle null RPC data', async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      from: vi.fn(),
    };
    mockCreateClient.mockReturnValue(mockClient);

    const request = new NextRequest('http://localhost/api/pending-requests', {
      headers: {
        'Authorization': 'Bearer valid-token',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });
});
