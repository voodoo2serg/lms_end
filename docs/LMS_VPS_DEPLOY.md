# LMS stack VPS deploy (OpenOlat + Keycloak + adapter)

**Host target:** shared RU VPS with voronka / solo_pr / portal.  
**Compose:** `compose.lms.yaml` only. **No BBB** on this host.

## Port map (mandatory on shared VPS)

| Bind | Service |
|------|---------|
| `127.0.0.1:18080` | **voronka** — do not steal |
| `127.0.0.1:18081` | Keycloak |
| `127.0.0.1:18082` | OpenOlat |
| `127.0.0.1:18083` | LMS adapter API (`LMS_API_PORT`) |
| `127.0.0.1:3040` | LMS portal (`portal/`) |

## Verified artifacts (pin in `.env`)

| Artifact | Value |
|----------|-------|
| Keycloak | `26.8.2` (`quay.io/keycloak/keycloak:26.8.2`) |
| OpenOlat WAR | `https://www.openolat.com/releases/openolat_2112.war` |
| WAR SHA256 | `4acc481777d1fad134bbd7ed67797b0ca8bc375ade1533398d3f97b8441f53ab` |

Re-verify checksum before production upgrades (`sha256sum` after HTTPS download).

## Bootstrap

```bash
cd /opt/lms_end
python3 -m scripts.bootstrap_lms --domain solo-pr.ru \
  --keycloak-version 26.8.2 \
  --openolat-war-url https://www.openolat.com/releases/openolat_2112.war \
  --openolat-war-sha256 4acc481777d1fad134bbd7ed67797b0ca8bc375ade1533398d3f97b8441f53ab
# writes .env (if missing) + deploy/generated/realm.json
docker compose -f compose.lms.yaml config --quiet
docker compose -f compose.lms.yaml up -d --build
```

Portal wiring after adapter healthy:

```bash
# portal/.env or compose env
LMS_END_URL=http://127.0.0.1:18083
LMS_END_TOKEN=<same as MEETINGS_API_TOKEN / VORONKA_LMS_TOKEN>
```

Nginx examples: `deploy/lms/nginx-lms.solo-pr.ru.conf` (lms + auth + learn).  
DNS required for public TLS: `auth.solo-pr.ru`, `learn.solo-pr.ru` A → VPS (in addition to existing `lms.solo-pr.ru`).

## Smoke

| Check | Expect |
|-------|--------|
| `curl -sS http://127.0.0.1:18080/health` | voronka still ok |
| `curl -sS http://127.0.0.1:18083/health` | adapter `ok` or `degraded` |
| `curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/` | Keycloak up |
| `curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:18082/` | OpenOlat UI |
| `https://lms.solo-pr.ru/api/health` | portal; `adapter.configured=true` when wired |
| `https://auth.solo-pr.ru` | Keycloak login (needs DNS+LE) |

## Anti-scope

- `docker compose down -v` on Mailu / RAGA / Wi-TED / voronka / solo_pr / portal
- BBB install on this VPS
- Binding adapter to `18080`
