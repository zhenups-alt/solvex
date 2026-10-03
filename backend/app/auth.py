"""One-use wallet challenges and revocable, hashed bearer sessions. No private keys."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.models import WalletChallengeRecord, WalletSessionRecord

router = APIRouter(prefix="/api/v1/auth", tags=["wallet authentication"])
bearer = HTTPBearer(auto_error=False)
BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def decode_base58(value: str, expected_length: int) -> bytes:
    if not value or len(value) > 100:
        raise ValueError("invalid base58 length")
    number = 0
    for char in value:
        number = number * 58 + BASE58.index(char)
    decoded = b"\0" * (len(value) - len(value.lstrip("1")))
    decoded += number.to_bytes((number.bit_length() + 7) // 8, "big")
    if len(decoded) != expected_length:
        raise ValueError("invalid decoded length")
    return decoded


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class ChallengeRequest(BaseModel):
    wallet_address: str = Field(min_length=32, max_length=44)


class VerifyRequest(ChallengeRequest):
    signature: str = Field(min_length=64, max_length=100)


@router.post("/challenge")
async def challenge(payload: ChallengeRequest, session: AsyncSession = Depends(get_session)):
    try:
        decode_base58(payload.wallet_address, 32)
    except ValueError as error:
        raise HTTPException(422, "Invalid Solana wallet address") from error
    now = datetime.now(UTC)
    expires = now + timedelta(minutes=5)
    domain = get_settings().cors_origin_list[0]
    message = (
        f"Solvex sign-in\nOrigin: {domain}\nWallet: {payload.wallet_address}\n"
        f"Nonce: {secrets.token_hex(32)}\nExpires: {expires.isoformat()}\n"
        "Sign in to manage your Solvex settings and virtual portfolio. "
        "This message does not authorize any blockchain transaction or fund transfer."
    )
    # One outstanding challenge per wallet; replacement invalidates the previous nonce.
    record = await session.get(WalletChallengeRecord, payload.wallet_address)
    if record is None:
        session.add(
            WalletChallengeRecord(
                wallet_address=payload.wallet_address,
                message=message,
                expires_at=expires,
            )
        )
    else:
        await session.execute(
            update(WalletChallengeRecord)
            .where(
                WalletChallengeRecord.wallet_address == payload.wallet_address,
            )
            .values(message=message, expires_at=expires)
        )
    await session.execute(
        delete(WalletSessionRecord).where(
            WalletSessionRecord.expires_at < now,
        )
    )
    await session.commit()
    return {"message": message, "expires_at": expires}


@router.post("/verify")
async def verify(payload: VerifyRequest, session: AsyncSession = Depends(get_session)):
    now = datetime.now(UTC)
    record = await session.get(WalletChallengeRecord, payload.wallet_address)
    if record is None or utc(record.expires_at) <= now:
        raise HTTPException(401, "Sign-in challenge expired; request a new one")
    try:
        Ed25519PublicKey.from_public_bytes(decode_base58(payload.wallet_address, 32)).verify(
            decode_base58(payload.signature, 64),
            record.message.encode(),
        )
    except (ValueError, InvalidSignature) as error:
        raise HTTPException(401, "Invalid wallet signature") from error
    consumed = await session.execute(
        delete(WalletChallengeRecord)
        .execution_options(
            synchronize_session=False,
        )
        .where(
            WalletChallengeRecord.wallet_address == payload.wallet_address,
            WalletChallengeRecord.message == record.message,
            WalletChallengeRecord.expires_at > now,
        )
    )
    if consumed.rowcount != 1:
        await session.rollback()
        raise HTTPException(401, "Sign-in challenge already used")
    token = secrets.token_urlsafe(32)
    expires = now + timedelta(hours=24)
    session.add(
        WalletSessionRecord(
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            wallet_address=payload.wallet_address,
            expires_at=expires,
        )
    )
    await session.commit()
    return {"token": token, "expires_at": expires, "wallet_address": payload.wallet_address}


async def authenticated_wallet(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> str:
    if credentials is None:
        raise HTTPException(401, "Sign in with your wallet to continue")
    token_hash = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    record = await session.scalar(
        select(WalletSessionRecord).where(
            WalletSessionRecord.token_hash == token_hash,
            WalletSessionRecord.expires_at > datetime.now(UTC),
        )
    )
    if record is None:
        raise HTTPException(401, "Wallet session expired; sign in again")
    return record.wallet_address


def require_owner(authenticated: str, requested: str) -> None:
    if authenticated != requested:
        raise HTTPException(403, "This wallet cannot change another wallet's settings")
