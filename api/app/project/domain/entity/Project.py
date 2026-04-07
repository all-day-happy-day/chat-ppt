from datetime import datetime

from pydantic import BaseModel, Field
from ulid import ULID

from app.project.domain.exception import PartNotFound
from app.project.domain.types import Parts


class Project(BaseModel):
    id: ULID = Field(default_factory=lambda: ULID())
    name: str
    template_id: ULID
    user_id: ULID
    parts: list[Parts] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    def reorder_part(self, part_id: ULID, new_order: int) -> None:
        sorted_parts: list[Parts] = sorted(self.parts, key=lambda part: part.order)
        target: Parts | None = next((part for part in sorted_parts if part.id == part_id), None)
        if target is None:
            raise PartNotFound(f"Part with id {part_id} not found")

        sorted_parts.remove(target)
        clamped_order: int = min(new_order, len(sorted_parts))
        sorted_parts.insert(clamped_order, target)

        for i, part in enumerate(sorted_parts):
            part.order = i
        self.parts = sorted_parts

    def add_part(self, part: Parts, order: int) -> None:
        sorted_parts: list[Parts] = sorted(self.parts, key=lambda part: part.order)
        clamped_order: int = min(order, len(sorted_parts))
        sorted_parts.insert(clamped_order, part)
        for i, p in enumerate(sorted_parts):
            p.order = i
        self.parts = sorted_parts

    def remove_part(self, part_id: ULID) -> None:
        sorted_parts: list[Parts] = sorted(self.parts, key=lambda part: part.order)
        target: Parts | None = next((part for part in self.parts if part.id == part_id), None)
        if target is None:
            raise PartNotFound(f"Part with id {part_id} not found")
        sorted_parts.remove(target)
        for i, part in enumerate(sorted_parts):
            part.order = i
        self.parts = sorted_parts
