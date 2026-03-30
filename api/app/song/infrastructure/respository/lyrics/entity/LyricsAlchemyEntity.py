from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from core.db.db import Base


class LyricsAlchemyEntity(Base):
    __tablename__: str = "lyrics"

    song_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True, primary_key=True, unique=True)
    lyrics: Mapped[list[dict[str, str]]] = mapped_column(JSON, nullable=False)
