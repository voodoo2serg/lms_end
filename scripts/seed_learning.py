"""Create exactly one configured project, preserving existing CRM records."""
import os
from app.db import Session, Project, Admin

def main():
    pid=os.environ['PLATFORM_PROJECT_ID']
    with Session.begin() as db:
        if not db.get(Project,pid):db.add(Project(id=pid,name='Соло-PR',goal='Сообщество и обучение'))
        aid=int(os.environ['OWNER_TELEGRAM_ID'])
        if not db.get(Admin,aid):db.add(Admin(telegram_id=aid,role='owner',active=True,connection_ids=[]))
    print('Project ready. Bind the Keycloak owner subject through OIDC_STAFF_MAP.')

if __name__=='__main__':main()
