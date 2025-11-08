#!/usr/bin/env python3
"""
Seed script for dev environment.
Reads user profiles from dev-user-profiles/ and upserts them to the database.
"""

import yaml
import httpx
import requests_cache
from pathlib import Path
from supabase import create_client, Client
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="SETTINGS_",
        extra="ignore"
    )

    next_public_supabase_url_dev: str = "http://127.0.0.1:54321"
    gotrue_url: str = "http://127.0.0.1:54321/auth/v1"
    embedding_model: str = "text-embedding-3-small"
    supabase_service_role_dev: SecretStr
    openai_key: SecretStr


def get_or_create_user(
    email: str,
    service_role_key: SecretStr,
    gotrue_url: str = None,
    password: str | None = None,
    meta: dict | None = None,
) -> str:
    """Get existing user or create new user in auth.users via GoTrue admin API.

    Args:
        email: User email address
        service_role_key: Supabase service role key (SecretStr)
        password: Optional password for the user
        meta: Optional user metadata

    Returns:
        The user's UUID
    """
    key = service_role_key.get_secret_value()
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    # Try to lookup existing user
    r = httpx.get(f"{gotrue_url}/admin/users", params={"email": email}, headers=headers, timeout=10)
    r.raise_for_status()
    items = r.json().get("users") or r.json().get("data") or []
    matching_users = [u for u in items if u.get("email") == email]
    if matching_users:
        existing_id = matching_users[0]["id"]
        print(f"  ✓ User already exists: {email} (ID: {existing_id})")
        return existing_id

    payload = {
        "email": email,
        "email_confirm": True,
        "user_metadata": meta or {},
    }
    if password:
        payload["password"] = password

    r = httpx.post(f"{gotrue_url}/admin/users", json=payload, headers=headers, timeout=10)
    r.raise_for_status()
    created_id = r.json()["id"]
    print(f"  ✓ Created new user: {email} (ID: {created_id})")
    return created_id


def load_user_profiles(profiles_dir: Path) -> list[dict]:
    """Load all YAML user profile files from the specified directory."""
    profiles = []

    if not profiles_dir.exists():
        raise FileNotFoundError(f"Profiles directory not found: {profiles_dir}")

    for yaml_file in sorted(profiles_dir.glob("*.yml")):
        print(f"Loading profile: {yaml_file.name}")
        with open(yaml_file, "r") as f:
            data = yaml.safe_load(f)
            profiles.append(data)

    return profiles


def upsert_profile(supabase: Client, profile_data: dict) -> None:
    """Upsert user profile to the profiles table."""
    supabase.table("profiles").upsert(
        profile_data,
        on_conflict="user_id"
    ).execute()
    print(f"  ✓ Profile upserted: {profile_data.get('name', 'Unknown')}")


def upsert_ventures(supabase: Client, ventures: list[dict]) -> list[dict]:
    """Upsert user ventures to the user_ventures table.

    Returns:
        List of venture records with their IDs from the database
    """
    venture_records = []
    for venture in ventures:
        response = supabase.table("user_ventures").upsert(
            venture,
            on_conflict="id"
        ).execute()
        venture_records.extend(response.data)
    print(f"  ✓ {len(ventures)} venture(s) upserted")
    return venture_records


def upsert_cofounder_preferences(supabase: Client, preferences: list[dict]) -> None:
    """Upsert cofounder preferences to the user_cofounder_preference table."""
    for pref in preferences:
        supabase.table("user_cofounder_preference").upsert(
            pref,
            on_conflict="id"
        ).execute()
    print(f"  ✓ {len(preferences)} cofounder preference(s) upserted")


def upsert_user_settings(supabase: Client, settings: dict) -> None:
    """Upsert user settings to the user_settings table."""
    supabase.table("user_settings").upsert(
        settings,
        on_conflict="id"
    ).execute()
    print(f"  ✓ User settings upserted")


def get_embedding(text: str, openai_key: SecretStr, model: str) -> list[float]:
    """Get embedding from OpenAI API using requests with caching.

    Args:
        text: Text to embed
        openai_key: OpenAI API key (SecretStr)
        model: Embedding model to use

    Returns:
        List of floats representing the embedding vector
    """

    session = requests_cache.CachedSession(
        cache_name=str(Path(__file__).parent / ".embedding_cache"),
        backend="sqlite",
        expire_after=None,  # Cache indefinitely
    )

    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {openai_key.get_secret_value()}",
        "Content-Type": "application/json",
    }
    payload = {
        "input": text,
        "model": model,
    }
    response = session.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    embedding = data["data"][0]["embedding"]

    if getattr(response, 'from_cache', False):
        print(f"    ↻ Used cached embedding")
    else:
        print(f"    ✓ Generated new embedding")

    return embedding


def upsert_venture_embeddings(
    supabase: Client,
    user_id: str,
    venture_records: list[dict],
    openai_key: SecretStr,
    embedding_model: str,
) -> None:
    """Generate and upsert embeddings for user ventures.

    Args:
        supabase: Supabase client
        user_id: User ID
        venture_records: List of venture records from database (with IDs)
        openai_key: OpenAI API key (SecretStr)
        embedding_model: Model to use for embeddings
    """
    for venture in venture_records:
        venture_id = str(venture.get("id"))
        title = venture.get("title", "")
        description = venture.get("description", "")

        # Combine title and description for embedding
        text = f"{title}\n\n{description}"
        vector = get_embedding(text, openai_key, embedding_model)

        embedding_record = {
            "entity_id": venture_id,
            "user_id": user_id,
            "entity_type": "venture",
            "model": embedding_model,
            "vector": vector,
            "version": "v1",
        }

        supabase.table("embeddings").upsert(
            embedding_record,
            on_conflict="entity_id"
        ).execute()

    print(f"  ✓ {len(venture_records)} venture embedding(s) upserted")


def seed_user(
    supabase: Client,
    user_data: dict,
    settings: Settings,
) -> None:
    """Seed a single user with all their data."""
    email = user_data.get("email")
    password = user_data.get("password", "dev-password-123")
    user_metadata = {
        "name": user_data.get("profile", {}).get("name"),
    }
    user_id = get_or_create_user(
        email=email,
        service_role_key=settings.supabase_service_role_dev,
        gotrue_url=settings.gotrue_url,
        password=password,
        meta=user_metadata,
    )

    # Populate user_id in all data structures
    if "profile" in user_data:
        user_data["profile"]["user_id"] = user_id

    for venture in user_data.get("ventures", []):
        venture["user_id"] = user_id

    for pref in user_data.get("cofounder_preferences", []):
        pref["user_id"] = user_id

    if "user_settings" in user_data:
        user_data["user_settings"]["user_id"] = user_id

    if profile := user_data.get("profile", None):
        upsert_profile(supabase, profile)

    if ventures := user_data.get("ventures", None):
        venture_records = upsert_ventures(supabase, ventures)
        upsert_venture_embeddings(
            supabase,
            user_id=user_id,
            venture_records=venture_records,
            openai_key=settings.openai_key,
            embedding_model=settings.embedding_model,
        )

    if c_pref := user_data.get("cofounder_preferences", None):
        upsert_cofounder_preferences(supabase, c_pref)

    if settings := user_data.get("user_settings", None):
        upsert_user_settings(supabase, settings)

    print(f"User {email} seeded successfully\n")


def seed_user_profiles():
    """Main seeding function."""

    settings = Settings()

    print("Starting dev database seeding")
    print(f"Supabase URL: {settings.next_public_supabase_url_dev}")
    print(f"GoTrue URL: {settings.gotrue_url}")

    supabase: Client = create_client(
        settings.next_public_supabase_url_dev,
        settings.supabase_service_role_dev.get_secret_value()
    )

    profiles_dir = Path(__file__).parent / "dev-user-profiles"
    user_profiles = load_user_profiles(profiles_dir)
    print(f"\nFound {len(user_profiles)} user profile(s) to seed\n")

    # Seed each user
    for user_data in user_profiles:
        try:
            seed_user(supabase, user_data=user_data, settings=settings)
        except Exception as e:
            print(f"Error seeding user {user_data.get('email')}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"Seeding completed! {len(user_profiles)} user(s) processed")


if __name__ == "__main__":
    seed_user_profiles()