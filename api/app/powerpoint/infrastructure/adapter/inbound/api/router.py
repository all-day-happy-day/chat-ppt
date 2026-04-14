from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from ulid import ULID

from app.di.application.usecase import (
    get_change_template_name_use_case,
    get_delete_template_use_case,
    get_get_layouts_use_case,
    get_get_templates_by_user_id_use_case,
    get_read_template_use_case,
    get_update_template_use_case,
)
from app.powerpoint.application.usecase import (
    ChangeTemplateNameUseCase,
    DeleteTemplateUseCase,
    GetLayoutsUseCase,
    GetTemplatesByUserIDUseCase,
    ReadTemplateUseCase,
    UpdateTemplateUseCase,
)
from app.powerpoint.domain.entity import Template
from app.powerpoint.domain.exception import FileNotPPTX, InvalidFileReadRequest, TemplateFileNotFound, TemplateNotFound
from app.powerpoint.infrastructure.adapter.inbound.api.message import (
    ChangeTemplateNameRequest,
    ChangeTemplateNameResponse,
    GetLayoutResponse,
    GetTemplateResponse,
    ReadTemplateResponse,
    UpdateTemplateResponse,
)

router: APIRouter = APIRouter(tags=["Powerpoint"])


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
    except FileNotPPTX as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/template/update", status_code=status.HTTP_200_OK, response_model=UpdateTemplateResponse)
async def update_template(
    usecase: Annotated[UpdateTemplateUseCase, Depends(get_update_template_use_case)],
    file: Annotated[UploadFile, File(...)],
    user_id: Annotated[ULID, Form()],
    template_id: Annotated[ULID, Form()],
):
    try:
        data: bytes = await file.read()
        assert file.filename is not None
        template_file, template = usecase(
            user_id=user_id,
            filedata=data,
            filename=file.filename,
            template_id=template_id,
        )
        return UpdateTemplateResponse.from_domain_entity(template_file=template_file, template=template)

    except TemplateNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidFileReadRequest as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except FileNotPPTX as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/template/name", status_code=status.HTTP_200_OK, response_model=ChangeTemplateNameResponse)
def change_template_name(
    request_model: ChangeTemplateNameRequest,
    usecase: Annotated[ChangeTemplateNameUseCase, Depends(get_change_template_name_use_case)],
):
    try:
        template_file, template = usecase(template_id=request_model.template_id, new_name=request_model.new_name)
        return ChangeTemplateNameResponse.from_domain_entity(template_file=template_file, template=template)
    except TemplateNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/template/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: ULID, usecase: Annotated[DeleteTemplateUseCase, Depends(get_delete_template_use_case)]
):
    try:
        usecase(template_id=template_id)
    except TemplateNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except TemplateFileNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


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
    try:
        template: Template = usecase(template_id=template_id)
        return [
            GetLayoutResponse.from_domain_entity(layout=layout, slide_size=template.slide_size)
            for layout in template.layouts
        ]
    except TemplateNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
