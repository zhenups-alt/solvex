"""Archive completed paper sessions without deleting or renumbering their ledger."""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0003_paper_sessions"
down_revision = "0002_paper_and_auth"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "paper_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("wallet_address", sa.String(64), nullable=False, index=True),
        sa.Column("start_version", sa.Integer(), nullable=False),
        sa.Column("end_version", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON().with_variant(JSONB(), "postgresql"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("wallet_address", "start_version"),
    )


def downgrade():
    op.drop_table("paper_sessions")
