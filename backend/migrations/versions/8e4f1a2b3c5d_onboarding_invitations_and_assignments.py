"""add organization onboarding invitations and assignments

Revision ID: 8e4f1a2b3c5d
Revises: 7d2f9a1c8e4b
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8e4f1a2b3c5d"
down_revision: Union[str, None] = "7d2f9a1c8e4b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("vehicles", schema=None, recreate="always") as batch_op:
        batch_op.add_column(sa.Column("assigned_driver_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_vehicles_assigned_driver_id_users", "users", ["assigned_driver_id"], ["id"])
    with op.batch_alter_table("work_orders", schema=None, recreate="always") as batch_op:
        batch_op.add_column(sa.Column("assigned_user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_work_orders_assigned_user_id_users", "users", ["assigned_user_id"], ["id"])
    op.create_table(
        "organization_invitations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("invited_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("role", sa.String(length=48), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_organization_invitations_organization_id", "organization_invitations", ["organization_id"])
    op.create_index("ix_organization_invitations_email", "organization_invitations", ["email"])
    op.create_index("ix_organization_invitations_token_hash", "organization_invitations", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_organization_invitations_token_hash", table_name="organization_invitations")
    op.drop_index("ix_organization_invitations_email", table_name="organization_invitations")
    op.drop_index("ix_organization_invitations_organization_id", table_name="organization_invitations")
    op.drop_table("organization_invitations")
    with op.batch_alter_table("work_orders", schema=None, recreate="always") as batch_op:
        batch_op.drop_constraint("fk_work_orders_assigned_user_id_users", type_="foreignkey")
        batch_op.drop_column("assigned_user_id")
    with op.batch_alter_table("vehicles", schema=None, recreate="always") as batch_op:
        batch_op.drop_constraint("fk_vehicles_assigned_driver_id_users", type_="foreignkey")
        batch_op.drop_column("assigned_driver_id")
