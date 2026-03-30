from sqlalchemy.orm import Session

from app.song.domain.repository import SongRespository


class AlchemySongRepository(SongRespository):
    def __init__(self, db: Session) -> None:
        self.db: Session = db
