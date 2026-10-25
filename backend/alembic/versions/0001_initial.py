from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("make", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=60), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
    )
    op.create_index("ix_vehicles_make", "vehicles", ["make"])
    op.create_index("ix_vehicles_model", "vehicles", ["model"])
    op.create_index("ix_vehicles_category", "vehicles", ["category"])


def downgrade():
    op.drop_table("vehicles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
