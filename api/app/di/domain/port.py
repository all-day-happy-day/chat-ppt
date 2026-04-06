from app.powerpoint.domain.port.outbound import TemplateFileStoragePort
from app.powerpoint.infrastructure.adapter.outbound.stoarge import LocalDiskTemplateFileStorage


# Powerpoint
def get_template_file_storage_port() -> TemplateFileStoragePort:
    return LocalDiskTemplateFileStorage()
