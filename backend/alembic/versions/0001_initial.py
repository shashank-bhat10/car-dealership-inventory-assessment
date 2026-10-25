from alembic import op
import sqlalchemy as sa
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    op.create_table("users", sa.Column("id",sa.Integer(),primary_key=True),sa.Column("email",sa.String(254),nullable=False),sa.Column("password_hash",sa.String(255),nullable=False),sa.Column("is_admin",sa.Boolean(),nullable=False))
    op.create_index("ix_users_email","users",["email"],unique=True)
    op.create_table("vehicles",sa.Column("id",sa.Integer(),primary_key=True),sa.Column("make",sa.String(80),nullable=False),sa.Column("model",sa.String(100),nullable=False),sa.Column("category",sa.String(60),nullable=False),sa.Column("price",sa.Numeric(12,2),nullable=False),sa.Column("quantity",sa.Integer(),nullable=False))
    for col in ("make","model","category"): op.create_index(f"ix_vehicles_{col}","vehicles",[col])
def downgrade():
    op.drop_table("vehicles"); op.drop_index("ix_users_email",table_name="users"); op.drop_table("users")
