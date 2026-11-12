"""Money/access/AI integration invariants; providers are HTTP-contract doubles."""
import os
import json
import time
from datetime import timedelta
from unittest.mock import patch
import httpx
import jwt
import pytest
from sqlalchemy import select, func
from test_crm import crm, contact, product, order
from test_operational import system
from app import main, learning_api, learning_service, site_ingress
from app.learning_auth import claims
from app.db import now, Identity, Connection, Run, Version, Outbox
from app.crm_models import Payment, Profile
from app.learning_models import Learner, Course, Enrollment, LearningJob, Reminder, LearningNotice, LearningMessage, AIUsage
from app.learning_clients import OpenOlat, IntegrationError


@pytest.fixture
def learning(crm, monkeypatch):
    for mod in (learning_api, learning_service, site_ingress):
        monkeypatch.setattr(mod, 'Session', crm.db)
    monkeypatch.setenv('PLATFORM_PROJECT_ID', 'p')
    monkeypatch.setenv('OIDC_AUDIENCE', 'solo-api')
    monkeypatch.setenv('OPENOLAT_URL', 'https://learn.example.ru')
    monkeypatch.setenv('AI_ENABLED', '1')
    monkeypatch.setenv('AI_USER_DAILY_REQUESTS', '30')
    monkeypatch.setenv('AI_DAILY_BUDGET_MICRO_USD', '5000000')
    crm.claims = {'sub':'subject-one','email':'anna@example.ru','email_verified':True,'name':'Анна',
        'exp':time.time()+300,'resource_access':{'solo-api':{'roles':['owner']}}}
    main.app.dependency_overrides[claims] = lambda: crm.claims
    c=contact(crm,email='anna@example.ru')
    p=product(crm,kind='course',name='Соло-PR')
    o=order(crm,c,p)
    with crm.db.begin() as db:
        db.add(Course(id='pr',project_id='p',product_id=p['id'],title='Соло-PR',olat_course_id='101',
            olat_group_id='202',raga_alias='course-pr',raga_token_env='RAGA_PR_TOKEN'))
    crm.person,crm.item,crm.order=c,p,o
    r=crm.client.get('/api/learning/me')
    assert r.status_code==200,r.text
    crm.learner_id=r.json()['id']
    yield crm
    main.app.dependency_overrides.clear()


def pay(s, external='paid', amount=100000, kind='payment'):
    with s.db.begin() as db:
        db.add(Payment(id=external,order_id=s.order['id'],provider='test',external_id=external,
            amount_minor=amount,kind=kind))
        db.flush();learning_service.reconcile(db)


def test_account_is_stable_and_other_user_cannot_read_chat(learning):
    s=learning
    assert s.client.get('/api/learning/me').json()['id']==s.learner_id
    pay(s)
    s.client.put('/api/learning/preferences',json={'ai_enabled':True,'reminders':True})
    r=s.client.post('/api/learning/chat',json={'course_id':'pr','question':'Что дальше?','request_key':'question-001'})
    assert r.status_code==202,r.text
    mid=r.json()['id']
    s.claims={**s.claims,'sub':'subject-two','email':'other@example.ru'}
    assert s.client.get('/api/learning/chat/'+mid).status_code==404
    assert s.client.post('/api/learning/courses/pr/launch').status_code==403


def test_refund_revokes_access_without_deleting_academic_identity(learning):
    s=learning;pay(s)
    with s.db.begin() as db:
        e=db.scalar(select(Enrollment));assert e.desired
        e.state='active';db.get(Learner,s.learner_id).olat_id='900'
    assert s.client.post('/api/learning/courses/pr/launch').json()['url'].endswith('/101')
    pay(s,'refund',kind='refund')
    with s.db() as db:
        e=db.scalar(select(Enrollment));assert not e.desired and e.revision==2
        assert db.get(Learner,s.learner_id).olat_id=='900'
    assert s.client.post('/api/learning/courses/pr/launch').status_code==403


def test_repeat_reconcile_has_one_job_per_revision(learning):
    pay(learning)
    for _ in range(3):
        with learning.db.begin() as db:learning_service.reconcile(db)
    with learning.db() as db:
        assert db.scalar(select(func.count()).select_from(Enrollment))==1
        assert db.scalar(select(func.count()).select_from(LearningJob))==1


def test_chat_uses_only_course_alias_and_replay_does_not_bill_twice(learning):
    s=learning;pay(s)
    s.client.put('/api/learning/preferences',json={'ai_enabled':True,'reminders':False})
    payload={'course_id':'pr','question':'Объясни задачу','request_key':'question-001'}
    a=s.client.post('/api/learning/chat',json=payload);b=s.client.post('/api/learning/chat',json=payload)
    assert a.json()['id']==b.json()['id']
    assert s.client.post('/api/learning/chat',json={**payload,'question':'Иной вопрос'}).status_code==409
    with s.db() as db:job=db.scalar(select(LearningJob).where(LearningJob.kind=='chat'))
    with patch('app.learning_service.raga_chat',return_value=('Начните с цели коммуникации',42)) as provider:
        learning_service.run_chat(job);learning_service.run_chat(job)
        assert provider.call_count==1
        assert provider.call_args.args[0:2]==('course-pr','RAGA_PR_TOKEN')
    result=s.client.get('/api/learning/chat/'+a.json()['id']).json()
    assert result['state']=='completed' and 'цели' in result['answer']


def test_ai_budget_reserves_failed_calls(learning,monkeypatch):
    monkeypatch.setenv('AI_DAILY_BUDGET_MICRO_USD','50000')
    with patch('app.learning_service.raga_chat',side_effect=IntegrationError('upstream_network',True)):
        with pytest.raises(IntegrationError):learning_service.generate('a','learning','course-pr','RAGA_PR_TOKEN','q','c')
    with pytest.raises(IntegrationError,match='budget_exhausted'):
        learning_service.reserve_ai('b','learning','course-pr')
    with learning.db() as db:
        assert db.scalar(select(AIUsage)).status=='failed'


def test_reminder_cancelled_by_preferences_before_delivery(learning):
    s=learning;pay(s)
    s.client.put('/api/learning/preferences',json={'ai_enabled':False,'reminders':True})
    r=s.client.post('/api/learning/admin/reminders',json={'learner_id':s.learner_id,'course_id':'pr',
        'external_key':'hw-1','title':'Сдать анализ аудитории','kind':'homework','due_at':(now()-timedelta(seconds=1)).isoformat()})
    assert r.status_code==200,r.text
    with s.db.begin() as db:learning_service.schedule(db)
    s.client.put('/api/learning/preferences',json={'ai_enabled':False,'reminders':False})
    with s.db() as db:job=db.scalar(select(LearningJob).where(LearningJob.kind=='reminder'))
    learning_service.run_reminder(job)
    with s.db() as db:assert db.scalar(select(LearningNotice)) is None


def test_reminder_survives_ai_outage_and_does_not_invent_dates(learning):
    s=learning;pay(s)
    s.client.put('/api/learning/preferences',json={'ai_enabled':True,'reminders':True})
    with s.db.begin() as db:
        r=Reminder(id='rem',learner_id=s.learner_id,course_id='pr',external_key='hw1',title='Анализ аудитории',kind='homework',due_at=now(),use_ai=True,state='queued')
        db.add(r);db.add(LearningJob(id='job',dedupe_key='rem1',kind='reminder',target_id='rem'))
    with s.db() as db:job=db.get(LearningJob,'job')
    with patch('app.learning_service.raga_chat',side_effect=IntegrationError('unavailable')):
        learning_service.run_reminder(job);learning_service.run_reminder(job)
    with s.db() as db:
        notices=list(db.scalars(select(LearningNotice)))
        assert len(notices)==1 and 'Анализ аудитории' in notices[0].body


def test_site_receipt_is_authenticated_and_idempotent(learning,monkeypatch):
    s=learning;monkeypatch.setenv('SITE_BRIDGE_TOKEN','x'*40)
    p={'id':'site-request','name':'Новый','contact_type':'telegram','contact':'@user','topic':'Курс','consent':'version=1; accepted=true','created':now().isoformat()}
    assert s.client.post('/api/integrations/site/leads',json=p).status_code==401
    headers={'Authorization':'Bearer '+'x'*40}
    a=s.client.post('/api/integrations/site/leads',json=p,headers=headers)
    b=s.client.post('/api/integrations/site/leads',json=p,headers=headers)
    assert a.status_code==200 and a.json()==b.json()
    assert s.client.post('/api/integrations/site/leads',json={**p,'contact':'@different'},headers=headers).status_code==409


def test_openolat_http_contract_and_lost_response_recovery(monkeypatch):
    monkeypatch.setenv('OPENOLAT_URL','https://learn.example.ru')
    monkeypatch.setenv('OPENOLAT_API_USER','service');monkeypatch.setenv('OPENOLAT_API_KEY','secret')
    calls=[]
    def handler(req):
        calls.append((req.method,req.url.path))
        if req.url.path=='/restapi/users':return httpx.Response(200,json=[{'key':9,'login':'solo-u','externalId':'sub'}])
        if req.url.path.endswith('/authentications'):return httpx.Response(200,json=[{'provider':'KEYCLOAK','authUsername':'sub'}])
        if req.method=='GET':return httpx.Response(200,json=[{'key':9}])
        return httpx.Response(200)
    c=OpenOlat();c.client.close();c.client=httpx.Client(transport=httpx.MockTransport(handler))
    from types import SimpleNamespace
    assert c.ensure_user(SimpleNamespace(id='u',subject='sub'))=='9'
    c.bind_keycloak('9','sub');c.membership('2','9',True);c.membership('2','9',False);c.close()
    assert ('PUT','/restapi/groups/2/participants/9') in calls
    assert ('DELETE','/restapi/groups/2/participants/9') in calls


def test_staff_route_rejects_student(learning):
    learning.claims['resource_access']={'solo-api':{'roles':['student']}}
    assert learning.client.get('/api/learning/admin').status_code==403


def test_checkout_never_accepts_browser_price_and_never_grants_test_money(learning,monkeypatch):
    s=learning
    monkeypatch.setenv('ROBOKASSA_LOGIN','test-shop')
    monkeypatch.setenv('ROBOKASSA_TEST','1')
    monkeypatch.setenv('ROBOKASSA_TEST_PASSWORD1','test-password')
    p={'course_id':'pr','request_key':'checkout-001'}
    assert s.client.post('/api/learning/checkout',json={**p,'price_minor':1}).status_code==422
    a=s.client.post('/api/learning/checkout',json=p)
    b=s.client.post('/api/learning/checkout',json=p)
    assert a.status_code==200,a.text
    assert a.json()['order_id']==b.json()['order_id']
    assert a.json()['test'] is True
    assert s.client.post('/api/learning/courses/pr/launch').status_code==403


def test_funnel_ai_uses_durable_outbox_and_respects_stop(learning,monkeypatch):
    from app.db import Funnel, Entry
    from app.runtime import advance, consume
    s=learning
    monkeypatch.setenv('RAGA_FUNNEL_ALIAS','solo-funnel')
    graph={'start':'ai','nodes':{'ai':{'type':'ai','prompt':'Поздоровайся','fallback':'Здравствуйте','next':'end'},'end':{'type':'finish'}}}
    with s.db.begin() as db:
        profile=db.get(Profile,s.person['id'])
        db.add(Identity(id='ai-id',contact_id=profile.contact_id,connection_id='tg',external_user_id='555',chat_id='555'))
        db.add(Funnel(id='ai-funnel',name='AI',connection_ids=['tg'],draft=graph));db.flush()
        db.add(Version(id='ai-version',funnel_id='ai-funnel',graph=graph));db.flush()
        db.add(Entry(token='ai-entry',funnel_id='ai-funnel',connection_id='tg',attribution={}));db.flush()
        run=Run(id='ai-run',identity_id='ai-id',version_id='ai-version',entry_token='ai-entry',current='ai',status='active',state={})
        db.add(run);db.flush();advance(db,run,db.get(Identity,'ai-id'))
        assert run.status=='ai_pending'
    with s.db() as db:job=db.scalar(select(LearningJob).where(LearningJob.kind=='funnel_ai'))
    with patch('app.learning_service.raga_chat',return_value=('Рады видеть вас!',30)):
        learning_service.run_funnel_ai(job)
    with s.db() as db:
        assert db.get(Run,'ai-run').status=='completed'
        message=db.scalar(select(Outbox).where(Outbox.run_id=='ai-run'))
        assert message.payload['text']=='Рады видеть вас!'
    with s.db.begin() as db:
        consume(db,db.get(Connection,'tg'),{'user_id':'555','chat_id':'555','text':'/stop'})
    with s.db() as db:
        assert db.scalar(select(Outbox).where(Outbox.run_id=='ai-run')).status=='cancelled'


def test_one_time_bot_link_requires_proof_and_cannot_be_replayed(learning):
    from app.runtime import consume
    from app.learning_models import BotLink
    s=learning
    response=s.client.post('/api/learning/bindings',json={'connection_id':'tg'})
    assert response.status_code==200,response.text
    payload=response.json()['url'].split('start=')[1]
    with s.db.begin() as db:
        consume(db,db.get(Connection,'tg'),{'user_id':'777','chat_id':'777','text':'/start '+payload,'start':True,'payload':payload})
    with s.db() as db:
        bound=db.scalar(select(Identity).where(Identity.external_user_id=='777'))
        assert bound.contact_id==db.get(Profile,s.person['id']).contact_id
        assert db.scalar(select(BotLink)) is None
    with s.db.begin() as db:
        consume(db,db.get(Connection,'tg'),{'user_id':'888','chat_id':'888','text':'/start '+payload,'start':True,'payload':payload})
    with s.db() as db:
        assert db.scalar(select(Identity).where(Identity.external_user_id=='888')).contact_id!=db.get(Profile,s.person['id']).contact_id


def test_expired_wrong_audience_and_forged_tokens_rejected(monkeypatch):
    from cryptography.hazmat.primitives.asymmetric import rsa
    from app import learning_auth
    key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    from types import SimpleNamespace
    monkeypatch.setenv('OIDC_ISSUER','https://auth.example.ru/realms/solo-pr')
    monkeypatch.setenv('OIDC_AUDIENCE','solo-api')
    monkeypatch.setattr(learning_auth,'jwks',lambda _:SimpleNamespace(get_signing_key_from_jwt=lambda _:SimpleNamespace(key=key.public_key())))
    data={'sub':'u','email':'u@example.ru','email_verified':True,'iss':'https://auth.example.ru/realms/solo-pr','aud':'solo-api','iat':time.time(),'exp':time.time()+300}
    token=jwt.encode(data,key,algorithm='RS256')
    assert learning_auth.claims('Bearer '+token)['sub']=='u'
    for changes in [{'exp':time.time()-1},{'aud':'other'},{'email_verified':False}]:
        with pytest.raises(Exception) as e:learning_auth.claims('Bearer '+jwt.encode({**data,**changes},key,algorithm='RS256'))
        assert e.value.status_code==401
