from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from ulid import ULID

from core.db.db import Base


class CredentialsAlchemyEntity(Base):
    __tablename__ = "credentials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(ULID()))
    user_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    access_key: Mapped[str] = mapped_column(String(512), nullable=False)
    refresh_key: Mapped[str] = mapped_column(String(512), nullable=False)
