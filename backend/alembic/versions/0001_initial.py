"""Create risk profiles and decision logs.

Revision ID: 0001_initial
Revises: None
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "risk_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("wallet_address", sa.String(length=64), nullable=False),
        sa.Column("risk_level", sa.String(length=24), nullable=False),
        sa.Column("investment_cap_usd", sa.Numeric(20, 6), nullable=False),
        sa.Column("max_single_trade_usd", sa.Numeric(20, 6), nullable=False),
        sa.Column("max_daily_turnover_usd", sa.Numeric(20, 6), nullable=False),
        sa.Column("max_slippage_bps", sa.Integer(), nullable=False),
        sa.Column("max_drawdown_pct", sa.Numeric(8, 4), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_risk_profiles_wallet_address", "risk_profiles", ["wallet_address"], unique=True
    )
    op.create_table(
        "decision_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("wallet_address", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("proposal", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("shariah_result", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("risk_result", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("execution_allowed", sa.Boolean(), nullable=False),
        sa.Column("simulation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("execution", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_decision_logs_status", "decision_logs", ["status"], unique=False)
    op.create_index(
        "ix_decision_logs_wallet_address", "decision_logs", ["wallet_address"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_decision_logs_wallet_address", table_name="decision_logs")
    op.drop_index("ix_decision_logs_status", table_name="decision_logs")
    op.drop_table("decision_logs")
    op.drop_index("ix_risk_profiles_wallet_address", table_name="risk_profiles")
    op.drop_table("risk_profiles")
