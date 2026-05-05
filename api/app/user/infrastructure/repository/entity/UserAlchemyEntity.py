from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column
from ulid import ULID

from app.user.domain.enum import Role
from core.db.db import Base


class UserAlchemyEntity(Base):
    __tablename__ = "user"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(ULID()))
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(tz=timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(tz=timezone.utc)
    )
    last_sign_in: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.USER)
