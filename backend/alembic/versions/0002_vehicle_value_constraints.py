from alembic import op

revision = "0002_vehicle_constraints"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("vehicles") as batch_op:
        batch_op.create_check_constraint("ck_vehicles_price_positive", "price > 0")
        batch_op.create_check_constraint(
            "ck_vehicles_quantity_range", "quantity >= 0 AND quantity <= 100000"
        )


def downgrade():
    with op.batch_alter_table("vehicles") as batch_op:
        batch_op.drop_constraint("ck_vehicles_quantity_range", type_="check")
        batch_op.drop_constraint("ck_vehicles_price_positive", type_="check")
