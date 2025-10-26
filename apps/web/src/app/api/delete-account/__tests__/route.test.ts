import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @supabase/supabase-js
const mockCreateClient = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

// Import after mocks are set up
const { DELETE } = await import('../route');

describe('DELETE /api/delete-account', () => {
  const testUserId = 'test-user-123';
  const validToken = 'valid-token-xyz';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  it('should return 401 when authorization header is missing', async () => {
    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when authorization header does not start with Bearer', async () => {
    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Token abc123',
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 when user is not authenticated', async () => {
    const mockUserClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid token' },
        }),
      },
    };
    mockCreateClient.mockReturnValue(mockUserClient);

    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should successfully delete user account and all related data', async () => {
    const deletedTables: string[] = [];

    const mockUserClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
    };

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((column: string, value: string) => {
            deletedTables.push(`${table}.${column}`);
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        },
      },
    };

    // First call returns user client, second call returns admin client
    mockCreateClient
      .mockReturnValueOnce(mockUserClient)
      .mockReturnValueOnce(mockAdminClient);

    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Account deleted successfully');

    // Verify all tables were deleted from
    expect(deletedTables).toContain('profile_embeddings.user_id');
    expect(deletedTables).toContain('venture_embeddings.user_id');
    expect(deletedTables).toContain('interactions.actor_user');
    expect(deletedTables).toContain('interactions.target_user');
    expect(deletedTables).toContain('matches.user_a');
    expect(deletedTables).toContain('matches.user_b');
    expect(deletedTables).toContain('user_cofounder_preference.user_id');
    expect(deletedTables).toContain('user_ventures.user_id');
    expect(deletedTables).toContain('user_data.user_id');
    expect(deletedTables).toContain('profiles.user_id');

    // Verify auth user was deleted
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(testUserId);
  });

  it('should return 500 when auth user deletion fails', async () => {
    const mockUserClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
    };

    const mockAdminClient = {
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Failed to delete auth user' },
          }),
        },
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockUserClient)
      .mockReturnValueOnce(mockAdminClient);

    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete user account');
  });

  it('should handle unexpected errors gracefully', async () => {
    const mockUserClient = {
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('Network error')),
      },
    };
    mockCreateClient.mockReturnValue(mockUserClient);

    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });
    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('An unexpected error occurred');
  });

  it('should extract token correctly from Bearer header', async () => {
    const mockUserClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
    };

    const mockAdminClient = {
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        },
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockUserClient)
      .mockReturnValueOnce(mockAdminClient);

    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });
    await DELETE(request);

    // Verify the token was extracted correctly (without "Bearer ")
    expect(mockUserClient.auth.getUser).toHaveBeenCalledWith(validToken);
  });

  it('should delete interactions both as actor and target', async () => {
    const interactionDeletes: string[] = [];

    const mockUserClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
    };

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === 'interactions') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((column: string, value: string) => {
              interactionDeletes.push(column);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockUserClient)
      .mockReturnValueOnce(mockAdminClient);

    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });
    await DELETE(request);

    // Verify interactions were deleted for both actor and target
    expect(interactionDeletes).toContain('actor_user');
    expect(interactionDeletes).toContain('target_user');
  });

  it('should delete matches both as user_a and user_b', async () => {
    const matchDeletes: string[] = [];

    const mockUserClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: testUserId } },
          error: null,
        }),
      },
    };

    const mockAdminClient = {
      from: vi.fn((table: string) => {
        if (table === 'matches') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((column: string, value: string) => {
              matchDeletes.push(column);
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
      },
    };

    mockCreateClient
      .mockReturnValueOnce(mockUserClient)
      .mockReturnValueOnce(mockAdminClient);

    const request = new NextRequest('http://localhost/api/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${validToken}`,
      },
    });
    await DELETE(request);

    // Verify matches were deleted for both user_a and user_b
    expect(matchDeletes).toContain('user_a');
    expect(matchDeletes).toContain('user_b');
  });
});
