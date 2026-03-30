from pydantic import BaseModel, model_validator

from app.bible.domain.exception import UnsupportedVersion

from .AvailableBibleVersions import AvailableBibleVersions


class BiblePhrase(BaseModel):
    version: AvailableBibleVersions
    book: str
    chapter: int
    verse: int
    phrase: str

    @model_validator(mode="after")
    def validate_version(self) -> "BiblePhrase":
        if self.version.value not in AvailableBibleVersions:
            raise UnsupportedVersion(f"Unsupported version: {self.version}")
        return self
