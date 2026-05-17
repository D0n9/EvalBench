from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.platform_setting import PlatformSetting
from app.schemas.ldap_settings import (
    DEFAULT_LDAP_ATTR_MAP,
    LdapSettingsResponse,
    LdapSettingsUpdate,
)
from app.schemas.oauth_settings import OAuthSettingsResponse, OAuthSettingsUpdate

# Backward-compat aliases
OAuthOidcSettingsResponse = OAuthSettingsResponse
OAuthOidcSettingsUpdate = OAuthSettingsUpdate

LDAP_SETTINGS_KEY = "ldap"
OAUTH_OIDC_SETTINGS_KEY = "oauth_oidc"


def _default_ldap_value() -> Dict[str, Any]:
    return {
        "enabled": False,
        "server_uri": "",
        "user_search_base": "",
        "user_search_filter": "(uid=%(user)s)",
        "user_attr_map": dict(DEFAULT_LDAP_ATTR_MAP),
        "always_update_user": True,
        "cache_timeout": 600,
        "bind_dn": None,
        "bind_password": None,
    }


def get_ldap_raw(db: Session) -> Dict[str, Any]:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == LDAP_SETTINGS_KEY).first()
    if not row or not isinstance(row.value, dict):
        return _default_ldap_value()
    merged = _default_ldap_value()
    merged.update(row.value)
    if not merged.get("user_attr_map"):
        merged["user_attr_map"] = dict(DEFAULT_LDAP_ATTR_MAP)
    return merged


def get_ldap_settings(db: Session) -> LdapSettingsResponse:
    raw = get_ldap_raw(db)
    return LdapSettingsResponse(
        enabled=bool(raw.get("enabled")),
        server_uri=raw.get("server_uri") or "",
        user_search_base=raw.get("user_search_base") or "",
        user_search_filter=raw.get("user_search_filter") or "(uid=%(user)s)",
        user_attr_map=raw.get("user_attr_map") or dict(DEFAULT_LDAP_ATTR_MAP),
        always_update_user=bool(raw.get("always_update_user", True)),
        cache_timeout=int(raw.get("cache_timeout") or 600),
        bind_dn=raw.get("bind_dn"),
        bind_password_configured=bool(raw.get("bind_password")),
    )


def update_ldap_settings(db: Session, obj_in: LdapSettingsUpdate) -> LdapSettingsResponse:
    current = get_ldap_raw(db)
    payload = obj_in.model_dump(exclude_unset=True)

    bind_password = payload.pop("bind_password", None)
    if bind_password is not None:
        current["bind_password"] = bind_password if bind_password else None

    for key, value in payload.items():
        current[key] = value

    row = db.query(PlatformSetting).filter(PlatformSetting.key == LDAP_SETTINGS_KEY).first()
    if row:
        row.value = current
    else:
        row = PlatformSetting(key=LDAP_SETTINGS_KEY, value=current)
        db.add(row)
    db.commit()
    db.refresh(row)
    return get_ldap_settings(db)


def _default_oauth_oidc_value() -> Dict[str, Any]:
    return {
        "enabled": False,
        "mode": "oidc",
        "provider_name": "SSO",
        "client_id": "",
        "client_secret": None,
        "authorization_endpoint": "",
        "token_endpoint": "",
        "userinfo_endpoint": "",
        "jwks_uri": "",
        "issuer": "",
        "scope": "openid email profile",
        "username_claim": "email",
        "email_claim": "email",
        "full_name_claim": "name",
        "auto_create_users": True,
        "always_update_user": True,
    }


def get_oauth_oidc_raw(db: Session) -> Dict[str, Any]:
    row = db.query(PlatformSetting).filter(PlatformSetting.key == OAUTH_OIDC_SETTINGS_KEY).first()
    if not row or not isinstance(row.value, dict):
        return _default_oauth_oidc_value()
    merged = _default_oauth_oidc_value()
    merged.update(row.value)
    return merged


def get_oauth_oidc_settings(db: Session) -> OAuthSettingsResponse:
    raw = get_oauth_oidc_raw(db)
    return OAuthSettingsResponse(
        enabled=bool(raw.get("enabled")),
        mode=raw.get("mode") or "oidc",
        provider_name=raw.get("provider_name") or "SSO",
        client_id=raw.get("client_id") or "",
        authorization_endpoint=raw.get("authorization_endpoint") or "",
        token_endpoint=raw.get("token_endpoint") or "",
        userinfo_endpoint=raw.get("userinfo_endpoint") or "",
        jwks_uri=raw.get("jwks_uri") or "",
        issuer=raw.get("issuer") or "",
        scope=raw.get("scope") or "openid email profile",
        username_claim=raw.get("username_claim") or "email",
        email_claim=raw.get("email_claim") or "email",
        full_name_claim=raw.get("full_name_claim") or "name",
        auto_create_users=bool(raw.get("auto_create_users", True)),
        always_update_user=bool(raw.get("always_update_user", True)),
        client_secret_configured=bool(raw.get("client_secret")),
    )


def update_oauth_oidc_settings(
    db: Session, obj_in: OAuthSettingsUpdate
) -> OAuthSettingsResponse:
    current = get_oauth_oidc_raw(db)
    payload = obj_in.model_dump(exclude_unset=True)

    client_secret = payload.pop("client_secret", None)
    if client_secret is not None:
        current["client_secret"] = client_secret if client_secret else None

    for key, value in payload.items():
        current[key] = value

    row = db.query(PlatformSetting).filter(PlatformSetting.key == OAUTH_OIDC_SETTINGS_KEY).first()
    if row:
        row.value = current
    else:
        row = PlatformSetting(key=OAUTH_OIDC_SETTINGS_KEY, value=current)
        db.add(row)
    db.commit()
    db.refresh(row)
    return get_oauth_oidc_settings(db)
