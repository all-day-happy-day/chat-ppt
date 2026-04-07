from typing import TypeAlias, Union

from app.project.domain.entity.BiblePart import BiblePart
from app.project.domain.entity.LyricsPart import LyricsPart
from app.project.domain.entity.PlainPart import PlainPart
from app.project.domain.entity.ValuePart import ValuePart

Parts: TypeAlias = Union[BiblePart, LyricsPart, PlainPart, ValuePart]
