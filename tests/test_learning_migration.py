"""Verify revisions 0007→0008 against a pre-learning schema, including downgrade."""
import importlib.util
import os
os.environ.setdefault('DATABASE_URL','sqlite://')
os.environ.setdefault('REDIS_URL','redis://localhost:6379/0')
from sqlalchemy import create_engine, inspect
from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.db import Base
from app import site_ingress  # noqa: F401
from app import learning_models  # noqa: F401


def _load(name, path):
    spec=importlib.util.spec_from_file_location(name, path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


def test_learning_migration_upgrade_downgrade_upgrade():
    engine=create_engine('sqlite://')
    Base.metadata.create_all(engine,tables=[t for t in Base.metadata.sorted_tables if not t.name.startswith('learning_')])
    m7=_load('learning_revision_0007','migrations/versions/0007_learning.py')
    m8=_load('learning_revision_0008','migrations/versions/0008_lms_decouple.py')
    with engine.begin() as conn:
        context=MigrationContext.configure(conn)
        with Operations.context(context):
            m7.upgrade()
            expected_0007={
                'learning_ai_usage','learning_jobs','learning_courses','learning_site_receipts',
                'learning_users','learning_bot_links','learning_enrollments','learning_messages',
                'learning_notices','learning_reminders',
            }
            assert expected_0007.issubset(set(inspect(conn).get_table_names()))
            m8.upgrade()
            names=set(inspect(conn).get_table_names())
            assert 'learning_access_grants' in names and 'learning_outbound_events' in names
            user_cols={c['name'] for c in inspect(conn).get_columns('learning_users')}
            course_cols={c['name'] for c in inspect(conn).get_columns('learning_courses')}
            assert 'voronka_profile_id' in user_cols
            assert 'commerce_product_id' in course_cols
            m8.downgrade()
            names=set(inspect(conn).get_table_names())
            assert 'learning_access_grants' not in names and 'learning_outbound_events' not in names
            m7.downgrade()
            assert not expected_0007.intersection(set(inspect(conn).get_table_names()))
            m7.upgrade(); m8.upgrade()
            # Final model columns for core learning tables must be present.
            final_users={c.name for c in Base.metadata.tables['learning_users'].columns}
            assert final_users.issubset({c['name'] for c in inspect(conn).get_columns('learning_users')}) or \
                final_users == {c['name'] for c in inspect(conn).get_columns('learning_users')}
            assert {c['name'] for c in inspect(conn).get_columns('learning_access_grants')} == \
                {c.name for c in Base.metadata.tables['learning_access_grants'].columns}
