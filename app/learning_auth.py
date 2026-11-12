"""Verified Keycloak JWTs; local CRM remains available during migration."""
import os
from functools import lru_cache
import jwt
from fastapi import Header, HTTPException
from app.learning_clients import endpoint


@lru_cache(maxsize=4)
def jwks(url):
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=300, timeout=5)


def claims(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Войдите через единый аккаунт")
    try:
        issuer = endpoint("OIDC_ISSUER")
        token = authorization[7:]
        key = jwks(issuer + "/protocol/openid-connect/certs").get_signing_key_from_jwt(token)
        data = jwt.decode(token, key.key, algorithms=["RS256"], audience=os.environ["OIDC_AUDIENCE"],
                          issuer=issuer, options={"require": ["exp", "iat", "sub", "iss", "aud"]})
        if data.get("email_verified") is not True or not data.get("email"):
            raise ValueError("email not verified")
        if data.get("typ") not in {None, "Bearer", "at+jwt"}:
            raise ValueError("not an access token")
        return data
    except Exception:
        raise HTTPException(401, "Не удалось подтвердить аккаунт") from None


def staff(data):
    roles = set(data.get("resource_access", {}).get(os.getenv("OIDC_AUDIENCE", "solo-api"), {}).get("roles", []))
    if not roles.intersection({"owner", "teacher"}):
        raise HTTPException(403, "Нужна роль владельца или преподавателя")
    return data


def owner(data):
    roles = data.get("resource_access", {}).get(os.getenv("OIDC_AUDIENCE", "solo-api"), {}).get("roles", [])
    if "owner" not in roles:
        raise HTTPException(403, "Нужна роль владельца")
    return data
