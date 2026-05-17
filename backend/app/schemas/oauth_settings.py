from typing import Literal, Optional

from pydantic import BaseModel, Field

# "oauth2" - Authorization Code + UserInfo endpoint only (no id_token verification)
# "oidc"   - OpenID Connect: id_token verified via JWKS, issuer/audience/nonce checks
AuthMode = Literal["oauth2", "oidc"]


class OAuthSettingsBase(BaseModel):
    enabled: bool = False
    mode: AuthMode = "oidc"
    provider_name: str = "SSO"
    client_id: str = ""
    authorization_endpoint: str = ""
    token_endpoint: str = ""

    # ---- OAuth2 fields (required in oauth2 mode) ----
    userinfo_endpoint: str = ""

    # ---- OIDC-only fields (required in oidc mode) ----
    jwks_uri: str = ""
    issuer: str = ""

    scope: str = "openid email profile"
    username_claim: str = "email"
    email_claim: str = "email"
    full_name_claim: str = "name"
    auto_create_users: bool = True
    always_update_user: bool = True


class OAuthSettingsUpdate(OAuthSettingsBase):
    """client_secret: omit or null = keep existing; empty string = clear."""

    client_secret: Optional[str] = None


class OAuthSettingsResponse(OAuthSettingsBase):
    client_secret_configured: bool = False


# Backward-compat aliases (used in existing admin.py / crud imports)
OAuthOidcSettingsBase = OAuthSettingsBase
OAuthOidcSettingsUpdate = OAuthSettingsUpdate
OAuthOidcSettingsResponse = OAuthSettingsResponse


class OAuthProviderPublic(BaseModel):
    enabled: bool = False
    provider_name: str = "SSO"


class OAuthAuthorizeRequest(BaseModel):
    redirect_uri: str


class OAuthAuthorizeResponse(BaseModel):
    authorization_url: str


class OAuthCallbackRequest(BaseModel):
    code: str = Field(..., min_length=1)
    state: str = Field(..., min_length=1)
