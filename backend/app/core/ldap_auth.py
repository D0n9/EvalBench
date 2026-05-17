from dataclasses import dataclass
from typing import Any, Dict, Optional

from cachetools import TTLCache
from ldap3 import ALL, ANONYMOUS, SIMPLE, SUBTREE, Connection, Server
from ldap3.core.exceptions import LDAPBindError, LDAPException
import logging

logger = logging.getLogger(__name__)

_ldap_caches: Dict[int, TTLCache] = {}


@dataclass
class LdapRuntimeConfig:
    enabled: bool
    server_uri: str
    user_search_base: str
    user_search_filter: str
    user_attr_map: Dict[str, str]
    always_update_user: bool
    cache_timeout: int
    bind_dn: Optional[str]
    bind_password: Optional[str]

    @classmethod
    def from_db_dict(cls, raw: Dict[str, Any]) -> "LdapRuntimeConfig":
        return cls(
            enabled=bool(raw.get("enabled")),
            server_uri=raw.get("server_uri") or "",
            user_search_base=raw.get("user_search_base") or "",
            user_search_filter=raw.get("user_search_filter") or "(uid=%(user)s)",
            user_attr_map=raw.get("user_attr_map") or {},
            always_update_user=bool(raw.get("always_update_user", True)),
            cache_timeout=int(raw.get("cache_timeout") or 600),
            bind_dn=raw.get("bind_dn"),
            bind_password=raw.get("bind_password"),
        )


def _cache_for(timeout: int) -> TTLCache:
    timeout = max(60, min(timeout, 86400))
    if timeout not in _ldap_caches:
        _ldap_caches[timeout] = TTLCache(maxsize=1000, ttl=timeout)
    return _ldap_caches[timeout]


def clear_ldap_auth_cache() -> None:
    _ldap_caches.clear()


def ldap_mail_fallback(username: str, server_uri: str) -> str:
    try:
        host = server_uri.split("//", 1)[1].split(":")[0].split("/")[0]
        if host:
            return f"{username}@{host}"
    except Exception:
        pass
    return f"{username}@ldap.local"


def authenticate(
    config: LdapRuntimeConfig,
    username: str,
    password: str,
) -> Optional[Dict[str, Any]]:
    if not config.enabled or not config.server_uri or not config.user_search_base:
        return None

    clean_username = username.strip()
    logger.info("LDAP authentication attempt for user: %s", clean_username)

    cache = _cache_for(config.cache_timeout)
    cache_key = f"{config.server_uri}:{clean_username}:{password}"
    if cache_key in cache:
        return cache[cache_key]

    try:
        server = Server(config.server_uri, get_info=ALL)
        search_filter = config.user_search_filter % {"user": clean_username}

        if config.bind_dn and config.bind_password:
            conn = Connection(
                server,
                user=config.bind_dn,
                password=config.bind_password,
                authentication=SIMPLE,
                raise_exceptions=True,
                auto_bind=True,
            )
        else:
            conn = Connection(
                server,
                authentication=ANONYMOUS,
                raise_exceptions=True,
                auto_bind=True,
            )

        conn.search(
            search_base=config.user_search_base,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=list(config.user_attr_map.values()),
        )

        if not conn.entries:
            conn.unbind()
            return None

        entry = conn.entries[0]
        user_dn = entry.entry_dn

        user_conn = Connection(
            server,
            user=user_dn,
            password=password,
            authentication=SIMPLE,
            raise_exceptions=True,
        )
        if not user_conn.bind():
            conn.unbind()
            return None

        user_info = _extract_user_info(entry, config.user_attr_map)
        user_info["dn"] = user_dn
        user_info["is_ldap_user"] = True

        conn.unbind()
        user_conn.unbind()

        cache[cache_key] = user_info
        return user_info

    except LDAPBindError as e:
        logger.error("LDAP bind error: %s", e)
        return None
    except LDAPException as e:
        logger.error("LDAP error: %s", e)
        return None
    except Exception as e:
        logger.error("Unexpected error during LDAP authentication: %s", e)
        return None


def _extract_user_info(entry, attr_map: Dict[str, str]) -> Dict[str, Any]:
    user_info: Dict[str, Any] = {}
    for local_attr, ldap_attr in attr_map.items():
        try:
            if hasattr(entry, ldap_attr):
                value = getattr(entry, ldap_attr).value
                if value:
                    user_info[local_attr] = value
        except Exception as e:
            logger.warning("Failed to extract attribute %s: %s", ldap_attr, e)
    return user_info
