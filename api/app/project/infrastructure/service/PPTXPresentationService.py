from pathlib import Path

from pptx import Presentation as PPT
from pptx.presentation import Presentation
from pptx.shapes.shapetree import SlidePlaceholders
from pptx.slide import Slide, SlideLayout

from app.powerpoint.domain.entity import Layout
from app.powerpoint.domain.repository import LayoutRepository
from app.powerpoint.infrastructure.service import PPTXTemplateReadService
from app.project.domain.entity import BiblePart, LyricsPart, PlainPart, ValuePart
from app.project.domain.service import PresentationService
from app.project.domain.types import Parts


class PPTXPresentationService(PresentationService):
    def __init__(self, layout_repository: LayoutRepository, template_read_service: PPTXTemplateReadService) -> None:
        self.layout_repository: LayoutRepository = layout_repository
        self.template_read_service: PPTXTemplateReadService = template_read_service

    def _write_plain(self, ppt: Presentation, layouts_dict: dict[str, SlideLayout], part: PlainPart) -> None:
        if part.layout_id is None:
            raise ValueError("Layout ID is required")
        layout_entity: Layout = self.layout_repository.get_by_id(id=part.layout_id)
        ppt.slides.add_slide(layouts_dict[layout_entity.name])

    def _write_value(self, ppt: Presentation, layouts_dict: dict[str, SlideLayout], part: ValuePart) -> None:
        if part.layout_id is None:
            raise ValueError("Layout ID is required")
        layout_entity: Layout = self.layout_repository.get_by_id(id=part.layout_id)
        slide: Slide = ppt.slides.add_slide(layouts_dict[layout_entity.name])

        placeholder_dict: dict[int, str | None] = {
            content.placeholder_shape_id: content.value for content in part.contents.contents
        }

        ppt_placeholders: SlidePlaceholders = slide.placeholders
        for ppt_placeholder in ppt_placeholders:
            if placeholder_dict[ppt_placeholder.shape_id] is not None:
                ppt_placeholder.text = placeholder_dict[ppt_placeholder.shape_id]

    def _write_lyrics(self, ppt: Presentation, layouts_dict: dict[str, SlideLayout], part: LyricsPart) -> None:
        if part.lyrics_layout_id is None:
            raise ValueError("Lyrics layout ID is required")
        lyrics_layout_entity: Layout = self.layout_repository.get_by_id(id=part.lyrics_layout_id)

        title_layout_entity: Layout | None
        if part.title_layout_id is None:
            title_layout_entity = None
        else:
            title_layout_entity = self.layout_repository.get_by_id(id=part.title_layout_id)

        for content in part.contents.contents:
            if content.include_title_slide and title_layout_entity:
                self._write_value(ppt=ppt, layouts_dict=layouts_dict)

    def create_and_save(self, template_file_path: str | Path, parts: list[Parts], save_path: str | Path) -> Path:
        ppt: Presentation = PPT(pptx=str(template_file_path))
        layouts: list[SlideLayout] = self.template_read_service._get_template_slide_layouts(ppt=ppt)
        layouts_dict: dict[str, SlideLayout] = {layout.name: layout for layout in layouts}

        for part in parts:
            if isinstance(part, PlainPart):
                self._write_plain(ppt=ppt, layouts_dict=layouts_dict, part=part)
            elif isinstance(part, ValuePart):
                self._write_value(ppt=ppt, layouts_dict=layouts_dict, part=part)
            elif isinstance(part, LyricsPart):
                self._write_lyrics(ppt=ppt, layouts_dict=layouts_dict, part=part)

        return Path()
