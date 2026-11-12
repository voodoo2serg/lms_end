"""Render an ignored Keycloak realm. Does not print passwords or create live accounts."""
import json
import os
from pathlib import Path

def main():
    site=os.environ['SITE_ORIGIN'].rstrip('/')
    learn=os.environ['OPENOLAT_URL'].rstrip('/')
    realm={
        'realm':'solo-pr','enabled':True,'registrationAllowed':True,'verifyEmail':True,
        'loginWithEmailAllowed':True,'duplicateEmailsAllowed':False,'resetPasswordAllowed':True,
        'accessTokenLifespan':300,'sslRequired':'external',
        'requiredActions':[{'alias':'terms_and_conditions','name':'Terms and Conditions',
            'providerId':'terms_and_conditions','enabled':True,'defaultAction':True,'priority':50}],
        'clients':[
            {'clientId':'solo-site','enabled':True,'protocol':'openid-connect','publicClient':False,
             'secret':os.environ['OIDC_CLIENT_SECRET'],'standardFlowEnabled':True,
             'directAccessGrantsEnabled':False,'redirectUris':[site+'/api/learning/auth/callback'],
             'webOrigins':[site],'attributes':{'pkce.code.challenge.method':'S256'},
             'protocolMappers':[{'name':'solo-api-audience','protocol':'openid-connect',
                'protocolMapper':'oidc-audience-mapper','config':{'included.client.audience':'solo-api',
                'access.token.claim':'true','id.token.claim':'false'}}]},
            {'clientId':'solo-api','enabled':True,'protocol':'openid-connect','bearerOnly':True},
            {'clientId':'solo-openolat','enabled':True,'protocol':'openid-connect','publicClient':False,
             'secret':os.environ['OPENOLAT_OIDC_SECRET'],'standardFlowEnabled':True,
             'directAccessGrantsEnabled':False,'redirectUris':[learn+'/oauthcallback'], 'webOrigins':[learn]},
        ],
        'roles':{'client':{'solo-api':[{'name':x} for x in ['owner','manager','editor','teacher','student']]}}
    }
    out=Path('deploy/generated');out.mkdir(parents=True,exist_ok=True)
    p=out/'realm.json';p.write_text(json.dumps(realm,ensure_ascii=False,indent=2));p.chmod(0o600)
    print('Realm configuration written. Configure SMTP and assign the owner role in Keycloak before launch.')

if __name__=='__main__':main()
