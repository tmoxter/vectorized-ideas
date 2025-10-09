export interface TestUser {
  id: string;
  email: string;
  profile: {
    user_id: string;
    name: string;
    bio: string;
    achievements: string;
    region: string;
    timezone: string;
  };
  venture: {
    id: string;
    user_id: string;
    title: string;
    description: string;
  };
  preferences: {
    user_id: string;
    title: string;
    description: string;
  };
  stage: string;
  availability_hours: string;
}

// Test users with varying profiles for matching scenarios
export const testUsers: TestUser[] = [
  {
    id: 'user-1-test-id',
    email: 'alice@example.com',
    profile: {
      user_id: 'user-1-test-id',
      name: 'Alice Chen',
      bio: 'Full-stack developer with 8 years of experience in building scalable web applications. Passionate about AI/ML and developer tools.',
      achievements: 'Led engineering team at Series B startup. Built developer platform used by 10k+ engineers.',
      region: 'San Francisco, CA',
      timezone: 'America/Los_Angeles',
    },
    venture: {
      id: 'venture-1',
      user_id: 'user-1-test-id',
      title: 'AI-Powered Code Review Assistant',
      description: 'Building an intelligent code review tool that uses LLMs to provide contextual feedback and catch bugs before they reach production.',
    },
    preferences: {
      user_id: 'user-1-test-id',
      title: 'Technical Co-founder with Product Sense',
      description: 'Looking for someone with strong product intuition and experience in developer tools or B2B SaaS.',
    },
    stage: 'Ideation',
    availability_hours: '15-20 hours/week',
  },
  {
    id: 'user-2-test-id',
    email: 'bob@example.com',
    profile: {
      user_id: 'user-2-test-id',
      name: 'Bob Martinez',
      bio: 'Product manager turned entrepreneur. 5 years at Google working on developer products. Love thinking about tools that make engineers more productive.',
      achievements: 'Launched 3 successful features at Google Cloud. Grew user base from 0 to 100k.',
      region: 'Austin, TX',
      timezone: 'America/Chicago',
    },
    venture: {
      id: 'venture-2',
      user_id: 'user-2-test-id',
      title: 'Developer Productivity Analytics',
      description: 'Platform to help engineering teams understand their workflow bottlenecks and improve developer experience using data-driven insights.',
    },
    preferences: {
      user_id: 'user-2-test-id',
      title: 'Technical Co-founder (Backend/Infrastructure)',
      description: 'Need someone strong in backend systems, data pipelines, and scaling infrastructure.',
    },
    stage: 'MVP',
    availability_hours: '30+ hours/week',
  },
  {
    id: 'user-3-test-id',
    email: 'carol@example.com',
    profile: {
      user_id: 'user-3-test-id',
      name: 'Carol Kim',
      bio: 'Climate tech enthusiast and software engineer. Previously worked on renewable energy optimization at Tesla.',
      achievements: 'Built energy management system that reduced costs by 30%. Published research on smart grid optimization.',
      region: 'Seattle, WA',
      timezone: 'America/Los_Angeles',
    },
    venture: {
      id: 'venture-3',
      user_id: 'user-3-test-id',
      title: 'Carbon Footprint Tracker for Businesses',
      description: 'SaaS platform helping companies measure, track, and reduce their carbon emissions with real-time data and actionable insights.',
    },
    preferences: {
      user_id: 'user-3-test-id',
      title: 'Business Co-founder with Climate Tech Experience',
      description: 'Looking for someone with sales/BD experience in enterprise SaaS, ideally with climate tech or sustainability background.',
    },
    stage: 'Prototype',
    availability_hours: '20-25 hours/week',
  },
  {
    id: 'user-4-test-id',
    email: 'david@example.com',
    profile: {
      user_id: 'user-4-test-id',
      name: 'David Okonkwo',
      bio: 'ML engineer passionate about making AI more accessible. Built recommendation systems at Netflix.',
      achievements: 'Improved recommendation accuracy by 15%. Contributed to open-source ML frameworks.',
      region: 'New York, NY',
      timezone: 'America/New_York',
    },
    venture: {
      id: 'venture-4',
      user_id: 'user-4-test-id',
      title: 'No-Code ML Platform',
      description: 'Enabling non-technical users to build and deploy machine learning models without writing code. Think Webflow for ML.',
    },
    preferences: {
      user_id: 'user-4-test-id',
      title: 'Design-focused Co-founder',
      description: 'Need someone with exceptional UX/UI skills to make complex ML concepts simple and intuitive.',
    },
    stage: 'Ideation',
    availability_hours: '10-15 hours/week',
  },
  {
    id: 'user-5-test-id',
    email: 'emma@example.com',
    profile: {
      user_id: 'user-5-test-id',
      name: 'Emma Rodriguez',
      bio: 'Healthcare tech veteran. Built patient management systems and telemedicine platforms. Interested in improving healthcare accessibility.',
      achievements: 'Scaled telemedicine platform to 500k users. HIPAA compliance expert.',
      region: 'Boston, MA',
      timezone: 'America/New_York',
    },
    venture: {
      id: 'venture-5',
      user_id: 'user-5-test-id',
      title: 'Mental Health Support Platform',
      description: 'Connecting people with licensed therapists through an affordable, accessible platform. Using AI for initial screening and therapist matching.',
    },
    preferences: {
      user_id: 'user-5-test-id',
      title: 'Healthcare/Medical Professional',
      description: 'Looking for someone with clinical background or healthcare operations experience to ensure we build something truly helpful.',
    },
    stage: 'MVP',
    availability_hours: '25-30 hours/week',
  },
];

// Generate mock embeddings (normalized random vectors for testing)
export function generateMockEmbedding(seed: number): number[] {
  const embedding = new Array(1536).fill(0).map((_, i) => {
    // Use seed to make embeddings deterministic but different
    return Math.sin(seed * 0.1 + i * 0.01) * Math.cos(seed * 0.05 + i * 0.02);
  });

  // Normalize the embedding
  const norm = Math.hypot(...embedding);
  return embedding.map(x => x / norm);
}

// Calculate cosine similarity (for testing match quality)
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  return dotProduct; // Already normalized
}

// Get test users with embeddings
export function getUsersWithEmbeddings() {
  return testUsers.map((user, index) => ({
    ...user,
    embedding: generateMockEmbedding(index + 1),
  }));
}

// Find matching candidates based on embedding similarity
export function findMatchingCandidates(
  userId: string,
  limit: number = 20
): Array<TestUser & { similarity_score: number }> {
  const usersWithEmbeddings = getUsersWithEmbeddings();
  const currentUser = usersWithEmbeddings.find(u => u.id === userId);

  if (!currentUser) return [];

  // Calculate similarity scores for all other users
  const matches = usersWithEmbeddings
    .filter(u => u.id !== userId)
    .map(candidate => ({
      ...candidate,
      similarity_score: cosineSimilarity(currentUser.embedding, candidate.embedding),
    }))
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, limit);

  return matches;
}
