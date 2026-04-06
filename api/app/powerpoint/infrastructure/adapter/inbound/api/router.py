from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from ulid import ULID

from app.di.application.usecase import (
    get_get_layouts_use_case,
    get_get_templates_by_user_id_use_case,
    get_read_template_use_case,
    get_update_template_use_case,
)
from app.powerpoint.application.usecase import (
    GetLayoutsUseCase,
    GetTemplatesByUserIDUseCase,
    ReadTemplateUseCase,
    UpdateTemplateUseCase,
)
from app.powerpoint.domain.entity import Layout
from app.powerpoint.domain.exception import InvalidFileReadRequest, TemplateNotFound
from app.powerpoint.infrastructure.adapter.inbound.api.message import (
    GetLayoutResponse,
    GetTemplateResponse,
    ReadTemplateResponse,
    UpdateTemplateResponse,
)

router: APIRouter = APIRouter(tags=["Powerpoint"])


# Template
@router.post("/template/read", status_code=status.HTTP_200_OK, response_model=ReadTemplateResponse)
async def read_template(
    usecase: Annotated[ReadTemplateUseCase, Depends(get_read_template_use_case)],
    file: Annotated[UploadFile, File(...)],
    user_id: Annotated[ULID, Form()],
    template_name: Annotated[str | None, Form()] = None,
):
    try:
        data: bytes = await file.read()
        assert file.filename is not None
        template_file, template = usecase(
            user_id=user_id,
            filedata=data,
            filename=file.filename,
            template_name=template_name,
        )
        return ReadTemplateResponse.from_domain_entity(template_file=template_file, template=template)
    except InvalidFileReadRequest as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/template/update", status_code=status.HTTP_200_OK, response_model=UpdateTemplateResponse)
async def update_template(
    usecase: Annotated[UpdateTemplateUseCase, Depends(get_update_template_use_case)],
    file: Annotated[UploadFile, File(...)],
    user_id: Annotated[ULID, Form()],
    template_id: Annotated[ULID, Form()],
    template_name: Annotated[str | None, Form()] = None,
):
    try:
        data: bytes = await file.read()
        assert file.filename is not None
        template_file, template = usecase(
            user_id=user_id,
            filedata=data,
            filename=file.filename,
            template_id=template_id,
            template_name=template_name,
        )
        return UpdateTemplateResponse.from_domain_entity(template_file=template_file, template=template)

    except TemplateNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidFileReadRequest as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/template/list/{user_id}", status_code=status.HTTP_200_OK, response_model=list[GetTemplateResponse])
def get_template_list(
    user_id: ULID, usecase: Annotated[GetTemplatesByUserIDUseCase, Depends(get_get_templates_by_user_id_use_case)]
):
    template_files, templates = usecase(user_id=user_id)
    return [
        GetTemplateResponse.from_domain_entity(template_file=template_file, template=template)
        for template_file, template in zip(template_files, templates)
    ]


@router.get("/template/layouts/{template_id}", status_code=status.HTTP_200_OK, response_model=list[GetLayoutResponse])
def get_layouts(template_id: ULID, usecase: Annotated[GetLayoutsUseCase, Depends(get_get_layouts_use_case)]):
    layouts: list[Layout] = usecase(template_id=template_id)
    return [GetLayoutResponse.from_domain_entity(layout=layout) for layout in layouts]
