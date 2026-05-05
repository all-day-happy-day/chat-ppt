from app.project.infrastructure.repository.ppt_file.inmemory_registry import ExportRegistry

_EXPORT_REGISTRY: ExportRegistry = ExportRegistry()


def get_export_registry() -> ExportRegistry:
    return _EXPORT_REGISTRY
