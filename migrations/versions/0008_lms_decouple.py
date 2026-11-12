"""Decouple learning schema from CRM money FKs; add grant sync + outbound events.

LMS-2 / LMS-3: adapter tables keep soft external ids only.
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"


def _drop_fk_if_exists(table: str, column: str):
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    rows = bind.execute(sa.text(
        "SELECT tc.constraint_name FROM information_schema.table_constraints tc "
        "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name "
        "AND tc.table_schema = kcu.table_schema "
        "WHERE tc.table_name = :table AND tc.constraint_type = 'FOREIGN KEY' "
        "AND kcu.column_name = :column AND tc.table_schema = current_schema()"
    ), {"table": table, "column": column}).fetchall()
    for (name,) in rows:
        op.drop_constraint(name, table, type_="foreignkey")


def upgrade():
    # Soft external ids (nullable until backfilled).
    with op.batch_alter_table("learning_users") as batch:
        batch.add_column(sa.Column("voronka_profile_id", sa.String(length=36), nullable=True))
    op.create_index("ix_learning_users_voronka_profile_id", "learning_users", ["voronka_profile_id"])
    with op.batch_alter_table("learning_courses") as batch:
        batch.add_column(sa.Column("commerce_product_id", sa.String(length=36), nullable=True))
    op.create_index("ix_learning_courses_commerce_product_id", "learning_courses", ["commerce_product_id"])
    op.create_index("ix_learning_courses_project_id", "learning_courses", ["project_id"])

    # Drop FKs into CRM money / project tables (and funnel connection soft-ref).
    for table, column in (
        ("learning_users", "profile_id"),
        ("learning_courses", "product_id"),
        ("learning_courses", "project_id"),
        ("learning_bot_links", "connection_id"),
        ("learning_site_receipts", "profile_id"),
    ):
        _drop_fk_if_exists(table, column)

    # profile_id becomes nullable soft ref for LMS-only learners created via M2M.
    with op.batch_alter_table("learning_users") as batch:
        batch.alter_column("profile_id", existing_type=sa.String(length=36), nullable=True)

    # Backfill external ids from legacy columns when present.
    op.execute(sa.text(
        "UPDATE learning_users SET voronka_profile_id = profile_id "
        "WHERE voronka_profile_id IS NULL AND profile_id IS NOT NULL"))
    op.execute(sa.text(
        "UPDATE learning_courses SET commerce_product_id = product_id "
        "WHERE commerce_product_id IS NULL"))

    op.create_table(
        "learning_access_grants",
        sa.Column("id", sa.String(length=80), nullable=False),
        sa.Column("keycloak_sub", sa.String(length=200), nullable=False),
        sa.Column("voronka_profile_id", sa.String(length=36), nullable=True),
        sa.Column("course_id", sa.String(length=80), nullable=False),
        sa.Column("commerce_product_id", sa.String(length=36), nullable=True),
        sa.Column("capability", sa.String(length=40), nullable=False),
        sa.Column("min_paid_percent", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_learning_access_grants_keycloak_sub", "learning_access_grants", ["keycloak_sub"])
    op.create_index("ix_learning_access_grants_course_id", "learning_access_grants", ["course_id"])

    op.create_table(
        "learning_outbound_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("dedupe_key", sa.String(length=240), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedupe_key"),
    )


def downgrade():
    op.drop_table("learning_outbound_events")
    op.drop_index("ix_learning_access_grants_course_id", table_name="learning_access_grants")
    op.drop_index("ix_learning_access_grants_keycloak_sub", table_name="learning_access_grants")
    op.drop_table("learning_access_grants")
    op.drop_index("ix_learning_courses_project_id", table_name="learning_courses")
    op.drop_index("ix_learning_courses_commerce_product_id", table_name="learning_courses")
    with op.batch_alter_table("learning_courses") as batch:
        batch.drop_column("commerce_product_id")
    op.drop_index("ix_learning_users_voronka_profile_id", table_name="learning_users")
    with op.batch_alter_table("learning_users") as batch:
        batch.drop_column("voronka_profile_id")
        batch.alter_column("profile_id", existing_type=sa.String(length=36), nullable=False)
    # FK recreate is intentionally omitted: re-coupling to CRM money tables is out of scope.
