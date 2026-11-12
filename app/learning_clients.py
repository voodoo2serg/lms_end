"""HTTP adapters: configuration-only destinations, no browser-supplied upstream URLs."""
import os
import secrets
from urllib.parse import quote, urlparse
import httpx


class IntegrationError(Exception):
    def __init__(self, code, retryable=False):
        self.code, self.retryable = code, retryable
        super().__init__(code)


def endpoint(name):
    value = os.getenv(name, "").rstrip("/")
    parsed = urlparse(value)
    allowed = {"https"} | ({"http"} if os.getenv("ALLOW_INTERNAL_HTTP") == "1" else set())
    if parsed.scheme not in allowed or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise IntegrationError(name.lower() + "_not_configured")
    return value


def request(client, method, url, **kwargs):
    try:
        r = client.request(method, url, **kwargs)
    except httpx.HTTPError:
        raise IntegrationError("upstream_network", retryable=True) from None
    if r.status_code >= 400:
        raise IntegrationError("upstream_http_" + str(r.status_code), r.status_code == 429 or r.status_code >= 500)
    return r


class OpenOlat:
    def __init__(self):
        self.base = endpoint("OPENOLAT_URL")
        login, key = os.getenv("OPENOLAT_API_USER"), os.getenv("OPENOLAT_API_KEY")
        if not login or not key:
            raise IntegrationError("openolat_credentials_missing")
        self.client = httpx.Client(auth=(login, key), timeout=25, follow_redirects=False, trust_env=False,
                                   headers={"Accept": "application/json"})

    def close(self):
        self.client.close()

    def call(self, method, path, **kwargs):
        return request(self.client, method, self.base + "/restapi" + path, **kwargs)

    def ensure_user(self, learner):
        # Login is deterministic, so a lost PUT response can be reconciled safely.
        login = "solo-" + learner.id
        response = self.call("GET", "/users", params={"login": login})
        data = response.json()
        users = data if isinstance(data, list) else data.get("users", data.get("userVOes", []))
        matches = [x for x in users if x.get("login") == login]
        if len(matches) > 1:
            raise IntegrationError("openolat_identity_ambiguous")
        if matches:
            if matches[0].get("externalId") != learner.subject:
                raise IntegrationError("openolat_identity_mismatch")
            return str(matches[0]["key"])
        names = learner.name.split(" ", 1)
        user = self.call("PUT", "/users", json={"login": login, "externalId": learner.subject,
            "firstName": names[0], "lastName": names[-1], "email": learner.email,
            "password": secrets.token_urlsafe(48)}).json()
        return str(user["key"])

    def membership(self, group_id, user_id, active):
        group, user = quote(str(group_id), safe=""), quote(str(user_id), safe="")
        if active:
            self.call("PUT", f"/groups/{group}/participants/{user}")
        else:
            # Read first: a lost DELETE response must not create a permanent retry.
            members = self.call("GET", f"/groups/{group}/participants").json()
            rows = members if isinstance(members, list) else members.get("users", [])
            if any(str(x.get("key")) == str(user_id) for x in rows):
                self.call("DELETE", f"/groups/{group}/participants/{user}")

    def bind_keycloak(self, user_id, subject):
        path = "/users/" + quote(str(user_id), safe="") + "/authentications"
        rows = self.call("GET", path).json()
        rows = rows if isinstance(rows, list) else rows.get("authentications", [])
        existing = [x for x in rows if x.get("provider") == "KEYCLOAK"]
        if existing:
            if len(existing) != 1 or existing[0].get("authUsername") != subject:
                raise IntegrationError("openolat_sso_conflict")
            return
        self.call("PUT", path, json={"identityKey": int(user_id), "provider": "KEYCLOAK", "authUsername": subject})


def raga_chat(alias, token_env, messages):
    if not alias or not token_env.startswith("RAGA_"):
        raise IntegrationError("raga_binding_missing")
    token = os.getenv(token_env)
    if not token:
        raise IntegrationError("raga_token_missing")
    with httpx.Client(timeout=50, follow_redirects=False, trust_env=False) as client:
        data = request(client, "POST", endpoint("RAGA_URL") + "/api/gateway/v1/chat/completions",
            headers={"Authorization": "Bearer " + token}, json={"model": alias,
                "messages": messages, "max_tokens": 600, "temperature": 0.2, "stream": False}).json()
    try:
        answer = data["choices"][0]["message"]["content"]
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError()
        return answer[:3500], int(data.get("usage", {}).get("total_tokens", 0))
    except (KeyError, IndexError, TypeError, ValueError):
        raise IntegrationError("raga_invalid_response") from None
