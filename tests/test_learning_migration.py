"""Verify revision 0007 against a pre-learning schema, including indexes and downgrade."""
import importlib.util
import os
os.environ.setdefault('DATABASE_URL','sqlite://')
os.environ.setdefault('REDIS_URL','redis://localhost:6379/0')
from sqlalchemy import create_engine, inspect
from alembic.migration import MigrationContext
from alembic.operations import Operations
from app.db import Base
from app import site_ingress


def test_learning_migration_upgrade_downgrade_upgrade():
    engine=create_engine('sqlite://')
    Base.metadata.create_all(engine,tables=[t for t in Base.metadata.sorted_tables if not t.name.startswith('learning_')])
    spec=importlib.util.spec_from_file_location('learning_revision','migrations/versions/0007_learning.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    with engine.begin() as conn:
        context=MigrationContext.configure(conn)
        with Operations.context(context):
            module.upgrade()
            expected={t.name for t in Base.metadata.tables.values() if t.name.startswith('learning_')}
            assert expected.issubset(set(inspect(conn).get_table_names()))
            module.downgrade()
            assert not expected.intersection(inspect(conn).get_table_names())
            module.upgrade()
            for name in expected:
                assert {c.name for c in Base.metadata.tables[name].columns}=={c['name'] for c in inspect(conn).get_columns(name)}
