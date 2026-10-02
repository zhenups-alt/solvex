from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, Numeric, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

json_type = JSON().with_variant(JSONB(), "postgresql")


class RiskProfileRecord(Base):
    __tablename__ = "risk_profiles"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    wallet_address: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    risk_level: Mapped[str] = mapped_column(String(24))
    investment_cap_usd: Mapped[Decimal] = mapped_column(Numeric(20, 6))
    max_single_trade_usd: Mapped[Decimal] = mapped_column(Numeric(20, 6))
    max_daily_turnover_usd: Mapped[Decimal] = mapped_column(Numeric(20, 6))
    max_slippage_bps: Mapped[int]
    max_drawdown_pct: Mapped[Decimal] = mapped_column(Numeric(8, 4))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DecisionLogRecord(Base):
    __tablename__ = "decision_logs"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    wallet_address: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    proposal: Mapped[dict] = mapped_column(json_type)
    shariah_result: Mapped[dict] = mapped_column(json_type)
    risk_result: Mapped[dict] = mapped_column(json_type)
    execution_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    simulation: Mapped[dict | None] = mapped_column(json_type, nullable=True)
    execution: Mapped[dict | None] = mapped_column(json_type, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
