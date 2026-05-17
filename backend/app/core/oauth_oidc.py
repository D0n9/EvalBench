"""OAuth2 and OIDC authentication helpers.

Two distinct modes are supported, selected via ``config["mode"]``:

oauth2
    Pure OAuth 2.0 Authorization Code flow.  After exchanging the code for
    an ``access_token`` the implementation calls the configured UserInfo
    endpoint to obtain user claims.  No ``id_token`` is expected or
    validated.  ``jwks_uri`` and ``issuer`` are ignored.

oidc
    OpenID Connect (identity layer on top of OAuth 2.0).  The token
    endpoint must return an ``id_token`` (JWT).  The token is validated
    against the provider's JWKS, including ``iss``, ``aud`` and ``nonce``
    checks.  The UserInfo endpoint is optional – when configured its
    claims are merged on top of the ``id_token`` claims.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from urllib.parse import urlencode
import secrets

import httpx
import jwt

from app.core import security
from app.core.config import settings


STATE_ALGORITHM = security.ALGORITHM


class OAuthOidcError(ValueError):
    pass


def is_enabled(config: Dict[str, Any]) -> bool:
    return bool(config.get("enabled"))


def _mode(config: Dict[str, Any]) -> str:
    return str(config.get("mode") or "oidc").lower()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_authorization_url(config: Dict[str, Any], redirect_uri: str) -> str:
    """Return the provider's authorization URL with a signed *state* token.

    For OIDC mode a *nonce* is included (stored inside the signed state) so
    that it can later be verified against the ``id_token``.  OAuth2 mode
    omits the nonce because there is no ``id_token`` to check it against.
    """
    required = ("client_id", "authorization_endpoint", "token_endpoint")
    missing = [k for k in required if not config.get(k)]
    if missing:
        raise OAuthOidcError(f"Configuration is incomplete: {', '.join(missing)}")

    mode = _mode(config)
    if mode == "oidc":
        _require_oidc_fields(config)
    else:
        _require_oauth2_fields(config)

    nonce: Optional[str] = None
    if mode == "oidc":
        nonce = secrets.token_urlsafe(24)

    state_payload: Dict[str, Any] = {
        "redirect_uri": redirect_uri,
        "mode": mode,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
    }
    if nonce:
        state_payload["nonce"] = nonce

    state = jwt.encode(state_payload, settings.SECRET_KEY, algorithm=STATE_ALGORITHM)

    params: Dict[str, str] = {
        "response_type": "code",
        "client_id": config["client_id"],
        "redirect_uri": redirect_uri,
        "scope": config.get("scope") or ("openid email profile" if mode == "oidc" else "email profile"),
        "state": state,
    }
    if nonce:
        params["nonce"] = nonce

    return f"{config['authorization_endpoint']}?{urlencode(params)}"


def exchange_code_for_claims(config: Dict[str, Any], code: str, state: str) -> Dict[str, Any]:
    """Exchange *code* for user claims using the flow dictated by *mode*."""
    try:
        state_payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[STATE_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise OAuthOidcError("Invalid state token") from exc

    redirect_uri = state_payload.get("redirect_uri")
    if not redirect_uri:
        raise OAuthOidcError("Missing redirect_uri in state token")

    # Prefer the mode stored in the state token (set at auth-URL generation
    # time) so that a config change mid-flight cannot corrupt the flow.
    mode = str(state_payload.get("mode") or _mode(config)).lower()

    token_data = _exchange_code(config, code, redirect_uri)

    if mode == "oidc":
        return _claims_from_oidc(config, token_data, state_payload)
    else:
        return _claims_from_oauth2(config, token_data)


# ---------------------------------------------------------------------------
# OAuth2 helpers
# ---------------------------------------------------------------------------

def _require_oauth2_fields(config: Dict[str, Any]) -> None:
    if not config.get("userinfo_endpoint"):
        raise OAuthOidcError(
            "OAuth2 mode requires a UserInfo endpoint to retrieve user claims"
        )


def _claims_from_oauth2(
    config: Dict[str, Any], token_data: Dict[str, Any]
) -> Dict[str, Any]:
    access_token = token_data.get("access_token")
    if not access_token:
        raise OAuthOidcError("Token endpoint did not return an access_token")

    userinfo_endpoint = config.get("userinfo_endpoint")
    if not userinfo_endpoint:
        raise OAuthOidcError(
            "OAuth2 mode requires a UserInfo endpoint – please configure it"
        )
    claims = _fetch_userinfo(userinfo_endpoint, access_token)
    if not claims:
        raise OAuthOidcError("UserInfo endpoint returned empty claims")
    return claims


# ---------------------------------------------------------------------------
# OIDC helpers
# ---------------------------------------------------------------------------

def _require_oidc_fields(config: Dict[str, Any]) -> None:
    missing = [f for f in ("jwks_uri", "issuer") if not config.get(f)]
    if missing:
        raise OAuthOidcError(
            f"OIDC mode requires: {', '.join(missing)}.  "
            "Configure them or switch to OAuth2 mode."
        )


def _claims_from_oidc(
    config: Dict[str, Any],
    token_data: Dict[str, Any],
    state_payload: Dict[str, Any],
) -> Dict[str, Any]:
    id_token = token_data.get("id_token")
    if not id_token:
        raise OAuthOidcError(
            "OIDC mode: token endpoint did not return an id_token.  "
            "Verify that the 'openid' scope is included and the provider supports OIDC."
        )

    nonce: Optional[str] = state_payload.get("nonce")
    claims = _decode_id_token(config, id_token, nonce)

    # Optionally enrich with UserInfo claims (UserInfo takes precedence for
    # overlapping keys so that the provider's canonical values win).
    access_token = token_data.get("access_token")
    userinfo_endpoint = config.get("userinfo_endpoint")
    if access_token and userinfo_endpoint:
        try:
            userinfo = _fetch_userinfo(userinfo_endpoint, access_token)
            merged = dict(claims)
            merged.update(userinfo)
            claims = merged
        except OAuthOidcError:
            # UserInfo enrichment is optional; do not fail the whole flow.
            pass

    return claims


def _decode_id_token(
    config: Dict[str, Any], id_token: str, nonce: Optional[str]
) -> Dict[str, Any]:
    jwks_uri = config.get("jwks_uri")
    client_id = config.get("client_id")
    issuer = config.get("issuer") or None

    if not jwks_uri:
        raise OAuthOidcError(
            "OIDC mode: jwks_uri is required to verify the id_token signature"
        )

    signing_key = jwt.PyJWKClient(jwks_uri).get_signing_key_from_jwt(id_token)
    decode_options: Dict[str, Any] = {}
    claims = jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"],
        audience=client_id,
        issuer=issuer,
        options=decode_options,
    )

    if nonce and claims.get("nonce") and claims["nonce"] != nonce:
        raise OAuthOidcError("OIDC nonce mismatch – possible replay attack")

    return claims


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _exchange_code(
    config: Dict[str, Any], code: str, redirect_uri: str
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": config.get("client_id"),
    }
    if config.get("client_secret"):
        payload["client_secret"] = config["client_secret"]

    with httpx.Client(timeout=15.0) as client:
        response = client.post(config["token_endpoint"], data=payload)
        response.raise_for_status()
        data = response.json()

    if not isinstance(data, dict):
        raise OAuthOidcError("Token endpoint returned an invalid response")
    return data


def _fetch_userinfo(userinfo_endpoint: str, access_token: str) -> Dict[str, Any]:
    with httpx.Client(timeout=15.0) as client:
        response = client.get(
            userinfo_endpoint,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        data = response.json()

    if not isinstance(data, dict):
        raise OAuthOidcError("UserInfo endpoint returned an invalid response")
    return data


def claim_value(claims: Dict[str, Any], key: str) -> Optional[str]:
    value = claims.get(key)
    if value is None:
        return None
    if isinstance(value, list):
        return str(value[0]) if value else None
    return str(value)
