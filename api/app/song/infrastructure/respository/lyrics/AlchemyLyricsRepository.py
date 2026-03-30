from sqlalchemy.orm import Session

from app.song.domain.repository import LyricsRepository


class AlchemyLyricsRepository(LyricsRepository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db
