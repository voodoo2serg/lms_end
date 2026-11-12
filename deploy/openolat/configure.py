"""Create a profile from runtime environment; secrets never enter the image."""
import os
from pathlib import Path

def prop(value):
    return str(value).replace('\\','\\\\').replace('\n','\\n').replace('\r','\\r')

settings={
    'server.domainname':os.environ['OPENOLAT_DOMAIN'],
    'server.port':'443', 'server.port.ssl':'443', 'server.ssl.enabled':'true',
    'server.contextpath':'', 'userdata.dir':'/data/openolat',
    'db.vendor':'postgresql', 'db.source':'local', 'db.host':'learning-db',
    'db.host.port':'5432','db.name':'openolat','db.user':'openolat','db.pass':os.environ['OPENOLAT_DB_PASSWORD'],
    'auto.upgrade.database':'true','restapi.enable':'true','restapi.api.access':'apikey',
    'restapi.auditlog.body':'false','restapi.ratelimit.enabled':'true',
    'oauth.keycloak.enabled':'true','oauth.keycloak.root':'true',
    'oauth.keycloak.client.id':'solo-openolat','oauth.keycloak.client.secret':os.environ['OPENOLAT_OIDC_SECRET'],
    'oauth.keycloak.endpoint':'https://'+os.environ['AUTH_DOMAIN'],'oauth.keycloak.context':'',
    'oauth.keycloak.realm':'solo-pr','oauth.keycloak.attributename.useridentifyer':'sub',
}
root=Path('/usr/local/tomcat/webapps/ROOT/WEB-INF/classes')
(root/'olat.local.properties').write_text('\n'.join(k+'='+prop(v) for k,v in settings.items())+'\n')
# Spring's profile filename follows the documented olat.local.properties.<profile> convention.
(root/'olat.local.properties.solo').write_text((root/'olat.local.properties').read_text())
Path('/usr/local/tomcat/lib/olat.local.properties').write_text((root/'olat.local.properties').read_text())
