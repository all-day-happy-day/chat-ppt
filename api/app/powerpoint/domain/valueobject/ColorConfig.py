from typing import Any, Literal, Self

from pydantic import BaseModel, Field, field_serializer, model_validator
from pydantic_extra_types import Color


class ColorConfig(BaseModel):
    color_type: Literal["solid", "none"]
    color: Color | None
    alpha: float | None = Field(ge=0.0, le=1.0)

    @field_serializer("color")
    def serialize_color(self, color: Color | None, _info: Any) -> str | None:
        if color is None:
            return None
        return color.as_hex()

    @model_validator(mode="after")
    def validate_color(self) -> Self:
        if self.color_type == "none" and self.color is not None:
            raise ValueError("Color type is none but the color is set.")
        elif self.color_type == "solid" and self.color is None:
            raise ValueError("Color type is solid but the color is not set.")
        return self

    @model_validator(mode="after")
    def validate_alpha(self) -> Self:
        if self.color_type == "solid" and self.alpha is None:
            raise ValueError("Alpha is not set.")
        return self
