import os
from alembic import context
from sqlalchemy import create_engine
from app.db import Base
from app import site_ingress  # register site receipt table

target_metadata = Base.metadata
with create_engine(os.environ["DATABASE_URL"]).connect() as connection:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()
