// Switch to small HF model maybe? Might need to serve it elsewhere considering vercel is serverless
// and we will need to cold start and load the model on every request

// Update version and model together, re-embedd latest entries per users
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_VERSION = "v1";

export function normalizeVector(vector: number[]): number[] {
  const norm = Math.hypot(...vector);
  return norm > 0 ? vector.map((x) => x / norm) : vector;
}
