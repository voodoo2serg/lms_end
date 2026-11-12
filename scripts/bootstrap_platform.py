"""Generate local deployment config; never overwrite an existing .env or print secrets."""
import argparse
import os
from pathlib import Path
import secrets
from uuid import uuid4
from scripts.configure_platform import main as render_realm


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--domain',required=True)
    p.add_argument('--keycloak-version',required=True)
    p.add_argument('--openolat-war-url',required=True)
    p.add_argument('--openolat-war-sha256',required=True)
    p.add_argument('--project-id',default=None)
    a=p.parse_args()
    if Path('.env').exists():
        raise SystemExit('.env already exists; edit it and render the realm separately')
    if not a.openolat_war_url.startswith('https://') or len(a.openolat_war_sha256)!=64:
        raise SystemExit('Use an official HTTPS WAR URL and a verified SHA256')
    values={line.split('=',1)[0]:line.split('=',1)[1] for line in Path('.env.example').read_text().splitlines() if line and not line.startswith('#') and '=' in line}
    for name in ['POSTGRES_PASSWORD','LEARNING_DB_ROOT_PASSWORD','OPENOLAT_DB_PASSWORD','KEYCLOAK_DB_PASSWORD',
                 'KEYCLOAK_ADMIN_PASSWORD','OPENOLAT_OIDC_SECRET','OIDC_CLIENT_SECRET','SITE_BRIDGE_TOKEN']:
        values[name]=secrets.token_urlsafe(36)
    values.update(SITE_ORIGIN='https://'+a.domain,DOMAIN='api.'+a.domain,API_DOMAIN='api.'+a.domain,
        AUTH_DOMAIN='auth.'+a.domain,LEARN_DOMAIN='learn.'+a.domain,OPENOLAT_URL='https://learn.'+a.domain,
        OIDC_ISSUER='https://auth.'+a.domain+'/realms/solo-pr',LEARNING_API_URL='https://api.'+a.domain,
        PLATFORM_PROJECT_ID=a.project_id or str(uuid4()),OWNER_TELEGRAM_ID='-1',
        LEARNING_SESSION_KEY=secrets.token_hex(32),KEYCLOAK_VERSION=a.keycloak_version,
        OPENOLAT_WAR_URL=a.openolat_war_url,OPENOLAT_WAR_SHA256=a.openolat_war_sha256)
    values['DATABASE_URL']='postgresql+psycopg://funnel:'+values['POSTGRES_PASSWORD']+'@db:5432/funnel'
    path=Path('.env');path.write_text('\n'.join(k+'='+v for k,v in values.items())+'\n');path.chmod(0o600)
    os.environ.update(values)
    render_realm()
    print('Local config created. Configure SMTP, RAGA, bot and payment keys before enabling these features.')


if __name__=='__main__':main()
