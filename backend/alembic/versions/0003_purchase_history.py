import sqlalchemy as sa
from alembic import op


revision = "0003_purchase_history"
down_revision = "0002_vehicle_constraints"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "purchases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("purchaser_id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=True),
        sa.Column("make", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["purchaser_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["vehicle_id"], ["vehicles.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_purchases_purchaser_id", "purchases", ["purchaser_id"])
    op.create_index("ix_purchases_vehicle_id", "purchases", ["vehicle_id"])


def downgrade():
    op.drop_index("ix_purchases_vehicle_id", table_name="purchases")
    op.drop_index("ix_purchases_purchaser_id", table_name="purchases")
    op.drop_table("purchases")
