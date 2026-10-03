"""Wallet sessions and isolated autonomous paper portfolios."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0002_paper_and_auth"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    json_type = sa.JSON().with_variant(JSONB(), "postgresql")
    op.create_table(
        "wallet_challenges",
        sa.Column("wallet_address", sa.String(64), primary_key=True),
        sa.Column("message", sa.String(1000), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "wallet_sessions",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("wallet_address", sa.String(64), nullable=False, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
    )
    op.create_table(
        "paper_accounts",
        sa.Column("wallet_address", sa.String(64), primary_key=True),
        sa.Column("status", sa.String(24), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("state", json_type, nullable=False),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_table(
        "paper_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("wallet_address", sa.String(64), nullable=False, index=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("data", json_type, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("wallet_address", "version"),
    )


def downgrade():
    for table in ("paper_events", "paper_accounts", "wallet_sessions", "wallet_challenges"):
        op.drop_table(table)
