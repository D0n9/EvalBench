from datetime import timedelta, datetime
from typing import Any
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.ldap_auth import LdapRuntimeConfig, authenticate as ldap_authenticate, ldap_mail_fallback
from app.core.oauth_oidc import (
    OAuthOidcError,
    build_authorization_url,
    claim_value,
    exchange_code_for_claims,
)
from app.crud import crud_user, crud_platform_setting
from app.schemas.oauth_settings import (
    OAuthAuthorizeRequest,
    OAuthAuthorizeResponse,
    OAuthCallbackRequest,
    OAuthProviderPublic,
)
from app.schemas.token import Token

router = APIRouter()


def _issue_token_for_user(user) -> Token:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


def _safe_username(value: str) -> str:
    username = value.strip().lower()
    username = re.sub(r"[^a-z0-9@._-]+", "-", username)
    return username.strip("-") or "oauth-user"


@router.get("/oauth2/provider", response_model=OAuthProviderPublic)
def read_oauth_provider(db: Session = Depends(deps.get_db)) -> OAuthProviderPublic:
    config = crud_platform_setting.get_oauth_oidc_raw(db)
    return OAuthProviderPublic(
        enabled=bool(config.get("enabled")),
        provider_name=config.get("provider_name") or "OAuth2/OIDC",
    )


@router.post("/oauth2/authorize", response_model=OAuthAuthorizeResponse)
def create_oauth_authorization_url(
    payload: OAuthAuthorizeRequest,
    db: Session = Depends(deps.get_db),
) -> OAuthAuthorizeResponse:
    config = crud_platform_setting.get_oauth_oidc_raw(db)
    if not config.get("enabled"):
        raise HTTPException(status_code=404, detail="OAuth2/OIDC sign-in is disabled")
    try:
        authorization_url = build_authorization_url(config, payload.redirect_uri)
    except OAuthOidcError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return OAuthAuthorizeResponse(authorization_url=authorization_url)


@router.post("/oauth2/callback", response_model=Token)
def oauth_callback(
    payload: OAuthCallbackRequest,
    db: Session = Depends(deps.get_db),
) -> Any:
    config = crud_platform_setting.get_oauth_oidc_raw(db)
    if not config.get("enabled"):
        raise HTTPException(status_code=404, detail="OAuth2/OIDC sign-in is disabled")

    try:
        claims = exchange_code_for_claims(config, payload.code, payload.state)
    except OAuthOidcError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=400, detail="OAuth2/OIDC sign-in failed") from e

    username_claim = config.get("username_claim") or "email"
    email_claim = config.get("email_claim") or "email"
    full_name_claim = config.get("full_name_claim") or "name"

    username = claim_value(claims, username_claim) or claim_value(claims, "sub")
    if not username:
        raise HTTPException(status_code=400, detail="OAuth2/OIDC username claim is missing")
    username = _safe_username(username)
    if username == "admin":
        raise HTTPException(status_code=400, detail="The built-in admin user cannot sign in via OAuth2/OIDC")

    email = claim_value(claims, email_claim)
    full_name = claim_value(claims, full_name_claim) or claim_value(claims, "preferred_username")
    user = crud_user.authenticate_oauth_oidc(
        db,
        username=username,
        email=email,
        full_name=full_name,
        auto_create_users=bool(config.get("auto_create_users", True)),
        always_update_user=bool(config.get("always_update_user", True)),
    )
    if not user:
        raise HTTPException(status_code=400, detail="User is not allowed to sign in")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    user.last_login = datetime.now()
    db.add(user)
    db.commit()
    return _issue_token_for_user(user)

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    Login endpoint supporting both LDAP and local authentication.

    - LDAP Authentication: For platform users (is_ldap_user=True)
      - Authenticates against LDAP server
      - Auto-creates/updates user in local DB on first login
      - Cannot authenticate super admins

    - Local Authentication: For built-in users (is_superuser=True)
      - Authenticates against local hashed password
      - Super admin (e.g., 'admin') uses this path
    """
    ldap_raw = crud_platform_setting.get_ldap_raw(db)
    ldap_config = LdapRuntimeConfig.from_db_dict(ldap_raw)
    if ldap_config.enabled and form_data.username.lower() != "admin":
        ldap_info = ldap_authenticate(ldap_config, form_data.username, form_data.password)
        if ldap_info:
            mail = ldap_info.get("mail") or ldap_mail_fallback(
                form_data.username, ldap_config.server_uri
            )
            user = crud_user.authenticate_ldap(
                db, mail, ldap_info, always_update_user=ldap_config.always_update_user
            )
            if not user or not user.is_active:
                raise HTTPException(status_code=400, detail="Inactive user")
            
            # Update last login
            user.last_login = datetime.now()
            db.add(user)
            db.commit()

            return _issue_token_for_user(user)

    user = crud_user.authenticate(
        db, username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Update last login
    user.last_login = datetime.now()
    db.add(user)
    db.commit()

    return _issue_token_for_user(user)
