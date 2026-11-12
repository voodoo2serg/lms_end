"""Readiness report without printing credentials; does not send paid requests."""
import json
import os
from app.db import Session
from sqlalchemy import text
from app.learning_clients import OpenOlat, IntegrationError

def main():
    report={}
    try:
        with Session() as db:db.execute(text('SELECT 1'))
        report['database']='reachable'
    except Exception:report['database']='unreachable'
    try:
        c=OpenOlat()
        try:c.call('GET','/users/me')
        finally:c.close()
        report['openolat']='authenticated'
    except IntegrationError as e:report['openolat']=e.code
    except Exception:report['openolat']='unverified'
    report['raga']='configured_not_billed_or_tested' if os.getenv('RAGA_URL') and os.getenv('RAGA_FUNNEL_TOKEN') else 'not_configured'
    report['ai_enabled']=os.getenv('AI_ENABLED')=='1'
    report['payments']='test_mode' if os.getenv('ROBOKASSA_TEST','1')=='1' else 'live_requires_shop_acceptance'
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
