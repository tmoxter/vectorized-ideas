# Dev Database Seeding

Seeds the development database with test user profiles, ventures, and embeddings.

## Setup

Install dependencies with pixi:
```bash
pixi install
```

Set required environment variables (`.env` file or shell exports):
```bash
SETTINGS_SUPABASE_SERVICE_ROLE_DEV=your-service-role-key
SETTINGS_OPENAI_KEY=your-openai-api-key
```

See `.env.example` for all available settings.

## Usage

```bash
pixi run python seed_dev.py
```

The script uses Pydantic BaseSettings with:
- `SETTINGS_` prefix for all environment variables
- `SecretStr` for sensitive values (service role, OpenAI key)
- `requests-cache` for embedding API responses (saves costs on re-runs)

## Dev Login

`user_001.yml` is configured for dev magic link login with email `dev@local.test`.

When `NEXT_PUBLIC_AUTH_MODE=dev-magiclink`, clicking "Continue with LinkedIn" logs you in as Alex Chen with seeded profile data.

## User Profiles

YAML files in `dev-user-profiles/` define user data. Structure:

```yaml
email: "user@example.com"
password: "optional-password"  # defaults to "dev-password-123"

profile:
  name: "User Name"
  bio: "User bio"
  achievements: "User achievements"
  avatarurl: null
  region: "City, State"
  timezone: "America/New_York"
  city_id: 12345
  experience: "Work experience"
  education: "Educational background"
  is_published: true
  created_at: "2024-11-01T10:00:00Z"
  updated_at: "2024-11-06T15:30:00Z"

ventures:
  - title: "Venture Title"
    description: "Venture description"
    created_at: "2024-11-02T09:00:00Z"
    updated_at: "2024-11-05T14:00:00Z"

cofounder_preferences:
  - title: "Preference Title"
    description: "Preference description"
    created_at: "2024-11-02T09:15:00Z"
    updated_at: "2024-11-05T14:15:00Z"

user_settings:
  similarity_threshold: 1
  region_scope: "worldwide"
  updated_at: "2024-11-05T15:45:00Z"
```

**Note:** Omit `user_id` and `id` fields - they're auto-generated.

## Process

1. Creates/retrieves auth users via GoTrue Admin API (auto-generates UUIDs)
2. Upserts profiles, ventures, preferences, and settings with auto-populated `user_id`
3. Generates venture embeddings via OpenAI (title + description combined)
4. Stores embeddings in `embeddings` table (entity_type="venture", model, vector, version="v1")

Upsert operations make the script idempotent. OpenAI responses are cached in `.embedding_cache.sqlite` - delete to regenerate.
