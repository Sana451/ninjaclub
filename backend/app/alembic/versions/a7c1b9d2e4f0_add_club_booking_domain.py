"""add club booking domain

Revision ID: a7c1b9d2e4f0
Revises: fe56fa70289e
Create Date: 2026-10-15 12:00:00.000000

"""
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "a7c1b9d2e4f0"
down_revision = "fe56fa70289e"
branch_labels = None
depends_on = None


def _s(length: int | None = None) -> sa.types.TypeEngine:
    return sqlmodel.sql.sqltypes.AutoString(length=length)


def upgrade() -> None:
    op.add_column("user", sa.Column("phone", _s(32), nullable=True))

    op.create_table(
        "club",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", _s(255), nullable=False),
        sa.Column("address", _s(500), nullable=False),
        sa.Column("phone", _s(32), nullable=False),
        sa.Column("email", _s(255), nullable=True),
        sa.Column("club_time_from", _s(5), nullable=False),
        sa.Column("club_time_to", _s(5), nullable=False),
        sa.Column("work_days", _s(64), nullable=False),
        sa.Column("description", _s(), nullable=True),
        sa.Column("social", sa.JSON(), nullable=True),
    )
    op.create_table(
        "trainer",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("surname", _s(100), nullable=False),
        sa.Column("name", _s(100), nullable=False),
        sa.Column("patronymic", _s(100), nullable=True),
        sa.Column("photo", _s(500), nullable=True),
        sa.Column("description", _s(), nullable=True),
        sa.Column("function", _s(255), nullable=True),
        sa.Column("gender", _s(1), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False),
    )
    op.create_table(
        "training",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", _s(255), nullable=False),
        sa.Column("description", _s(), nullable=True),
        sa.Column("level", _s(16), nullable=False),
        sa.Column("age_group", _s(16), nullable=False),
        sa.Column("color", _s(16), nullable=False),
        sa.Column("text_color", _s(16), nullable=False),
        sa.Column("is_personal", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "weeklyslot",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("training_id", sa.Integer(), sa.ForeignKey("training.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trainer_id", sa.Integer(), sa.ForeignKey("trainer.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("time_start", sa.Time(), nullable=False),
        sa.Column("time_end", sa.Time(), nullable=False),
        sa.Column("records_limit", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "scheduleitem",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("training_id", sa.Integer(), sa.ForeignKey("training.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trainer_id", sa.Integer(), sa.ForeignKey("trainer.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("time_start", sa.Time(), nullable=False),
        sa.Column("time_end", sa.Time(), nullable=False),
        sa.Column("records_limit", sa.Integer(), nullable=False),
        sa.Column("status", _s(16), nullable=False),
        sa.Column("description", _s(), nullable=True),
        sa.Column("weekly_slot_id", sa.Integer(), sa.ForeignKey("weeklyslot.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("trainer_id", "date", "time_start", name="uq_schedule_slot"),
    )
    op.create_index("ix_scheduleitem_date", "scheduleitem", ["date"])
    op.create_table(
        "servicecatalog",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("category", _s(32), nullable=False),
        sa.Column("name", _s(255), nullable=False),
        sa.Column("description", _s(), nullable=True),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("visits_count", sa.Integer(), nullable=True),
        sa.Column("valid_days", sa.Integer(), nullable=False),
        sa.Column("is_single", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False),
    )
    op.create_table(
        "userservice",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("catalog_id", sa.Integer(), sa.ForeignKey("servicecatalog.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("visits_total", sa.Integer(), nullable=True),
        sa.Column("visits_left", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("status", _s(16), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_userservice_user_id", "userservice", ["user_id"])
    op.create_table(
        "registration",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("schedule_item_id", sa.Integer(), sa.ForeignKey("scheduleitem.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", _s(16), nullable=False),
        sa.Column("user_service_id", sa.Integer(), sa.ForeignKey("userservice.id", ondelete="SET NULL"), nullable=True),
        sa.Column("attended", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_registration_user_id", "registration", ["user_id"])
    op.create_index("ix_registration_schedule_item_id", "registration", ["schedule_item_id"])
    op.create_table(
        "personalavailability",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("trainer_id", sa.Integer(), sa.ForeignKey("trainer.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("time_from", sa.Time(), nullable=False),
        sa.Column("time_to", sa.Time(), nullable=False),
        sa.Column("slot_minutes", sa.Integer(), nullable=False),
    )
    op.create_table(
        "contactrequest",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", _s(255), nullable=False),
        sa.Column("phone", _s(32), nullable=False),
        sa.Column("kind", _s(16), nullable=False),
        sa.Column("comment", _s(1000), nullable=True),
        sa.Column("status", _s(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    for table in (
        "contactrequest",
        "personalavailability",
        "registration",
        "userservice",
        "servicecatalog",
        "scheduleitem",
        "weeklyslot",
        "training",
        "trainer",
        "club",
    ):
        op.drop_table(table)
    op.drop_column("user", "phone")
