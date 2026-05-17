from typing import Dict, Optional

from pydantic import BaseModel, Field


DEFAULT_LDAP_ATTR_MAP: Dict[str, str] = {
    "nickname": "givenName",
    "uid": "cn",
    "mail": "mail",
}


class LdapSettingsBase(BaseModel):
    enabled: bool = False
    server_uri: str = ""
    user_search_base: str = ""
    user_search_filter: str = "(uid=%(user)s)"
    user_attr_map: Dict[str, str] = Field(default_factory=lambda: dict(DEFAULT_LDAP_ATTR_MAP))
    always_update_user: bool = True
    cache_timeout: int = Field(default=600, ge=60, le=86400)
    bind_dn: Optional[str] = None


class LdapSettingsUpdate(LdapSettingsBase):
    """bind_password: omit or null = keep existing; empty string = clear."""

    bind_password: Optional[str] = None


class LdapSettingsResponse(LdapSettingsBase):
    bind_password_configured: bool = False
