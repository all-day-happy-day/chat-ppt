from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from ulid import ULID

from app.di.application.usecase import (
    get_create_project_container_use_case,
    get_create_project_use_case,
    get_create_variable_use_case,
    get_delete_project_container_use_case,
    get_delete_project_use_case,
    get_delete_variable_use_case,
    get_export_ppt_use_case,
    get_get_all_variables_use_case,
    get_get_paged_project_containers_use_case,
    get_get_paged_projects_use_case,
    get_get_partial_projects_use_case,
    get_get_project_containers_use_case,
    get_get_projects_use_case,
    get_get_variable_use_case,
    get_patch_project_container_use_case,
    get_patch_project_use_case,
    get_patch_variable_use_case,
)
from app.project.application.command import PatchProjectCommand, PatchProjectContainerCommand
from app.project.application.usecase import (
    CreateProjectContainerUseCase,
    CreateProjectUseCase,
    CreateVariableUseCase,
    DeleteProjectContainerUseCase,
    DeleteProjectUseCase,
    DeleteVariableUseCase,
    ExportPPTUseCase,
    GetAllVariablesUseCase,
    GetPagedProjectContainersUseCase,
    GetPagedProjectsUseCase,
    GetPartialProjectsUseCase,
    GetProjectContainersUseCase,
    GetProjectsUseCase,
    GetVariableUseCase,
    PatchProjectContainerUseCase,
    PatchProjectUseCase,
    PatchVariableUseCase,
)
from app.project.domain.entity import Project, ProjectContainer
from app.project.domain.exception import (
    DuplicatedVariable,
    ProjectContainerNotCompleted,
    ProjectContainerNotFound,
    ProjectNotFound,
    VariableNotFound,
)
from app.project.domain.valueobject import Variable
from app.project.infrastructure.adapter.inbound.api.message import (
    CreateProjectContainerRequest,
    CreateProjectContainerResponse,
    CreateProjectRequest,
    CreateProjectResponse,
    CreateVariableRequest,
    CreateVariableResponse,
    ExportPPTRequest,
    ExportPPTResponse,
    GetProjectContainerResponse,
    GetProjectResponse,
    GetVariableResponse,
    PatchProjectContainerRequest,
    PatchProjectContainerResponse,
    PatchProjectRequest,
    PatchProjectResponse,
    PatchVariableRequest,
    PatchVariableResponse,
)
from app.shared.page import Page, PagingOptions

router: APIRouter = APIRouter(tags=["Project"])


# Project
@router.get("/{user_id}", status_code=status.HTTP_200_OK, response_model=list[GetProjectResponse])
def get_projects(user_id: ULID, usecase: Annotated[GetProjectsUseCase, Depends(get_get_projects_use_case)]):
    projects: list[Project] = usecase(user_id=user_id)
    return [GetProjectResponse.from_domain_entity(project) for project in projects]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CreateProjectResponse)
def create_project(
    request_model: CreateProjectRequest, usecase: Annotated[CreateProjectUseCase, Depends(get_create_project_use_case)]
):
    project: Project = usecase(
        template_id=request_model.template_id,
        user_id=request_model.user_id,
        name=request_model.name,
    )
    return CreateProjectResponse.from_domain_entity(project)


@router.patch("/{project_id}", status_code=status.HTTP_200_OK, response_model=PatchProjectResponse)
def patch_project(
    project_id: ULID,
    request_model: PatchProjectRequest,
    usecase: Annotated[PatchProjectUseCase, Depends(get_patch_project_use_case)],
):
    try:
        command: PatchProjectCommand = PatchProjectCommand.model_validate(request_model.model_dump(mode="json"))
        project: Project = usecase(project_id=project_id, command=command)
        return PatchProjectResponse.from_domain_entity(project)
    except ProjectNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: ULID, usecase: Annotated[DeleteProjectUseCase, Depends(get_delete_project_use_case)]):
    try:
        usecase(project_id=project_id)
    except ProjectNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{user_id}/page", status_code=status.HTTP_200_OK, response_model=Page[GetProjectResponse])
def get_paged_projects(
    user_id: ULID,
    paging_options: Annotated[PagingOptions, Depends()],
    usecase: Annotated[GetPagedProjectsUseCase, Depends(get_get_paged_projects_use_case)],
):
    projects: Page[Project] = usecase(user_id=user_id, paging_options=paging_options)
    return Page(
        items=[GetProjectResponse.from_domain_entity(project) for project in projects.items],
        page=projects.page,
        size=projects.size,
        total_items=projects.total_items,
        total_pages=projects.total_pages,
    )


@router.get("/{user_id}/partial", status_code=status.HTTP_200_OK, response_model=list[GetProjectResponse])
def get_partial_projects(
    user_id: ULID,
    size: int,
    usecase: Annotated[GetPartialProjectsUseCase, Depends(get_get_partial_projects_use_case)],
):
    projects: list[Project] = usecase(user_id=user_id, size=size)
    return [GetProjectResponse.from_domain_entity(project) for project in projects]


# Project Container
@router.get("/container/{project_id}", status_code=status.HTTP_200_OK, response_model=list[GetProjectContainerResponse])
def get_project_containers(
    project_id: ULID, usecase: Annotated[GetProjectContainersUseCase, Depends(get_get_project_containers_use_case)]
):
    project_containers: list[ProjectContainer] = usecase(project_id=project_id)
    return [
        GetProjectContainerResponse.from_domain_entity(project_container) for project_container in project_containers
    ]


@router.post("/container", status_code=status.HTTP_201_CREATED, response_model=CreateProjectContainerResponse)
def create_project_container(
    request_model: CreateProjectContainerRequest,
    usecase: Annotated[CreateProjectContainerUseCase, Depends(get_create_project_container_use_case)],
):
    project_container: ProjectContainer = usecase(
        project_id=request_model.project_id,
        container_name=request_model.container_name,
    )
    return CreateProjectContainerResponse.from_domain_entity(project_container)


@router.patch(
    "/container/{project_container_id}", status_code=status.HTTP_200_OK, response_model=PatchProjectContainerResponse
)
def patch_project_container(
    project_container_id: ULID,
    request_model: PatchProjectContainerRequest,
    usecase: Annotated[PatchProjectContainerUseCase, Depends(get_patch_project_container_use_case)],
):
    try:
        command: PatchProjectContainerCommand = PatchProjectContainerCommand.model_validate(
            request_model.model_dump(mode="json")
        )
        project_container: ProjectContainer = usecase(project_container_id=project_container_id, command=command)
        return PatchProjectContainerResponse.from_domain_entity(project_container)
    except ProjectContainerNotFound as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/container/{project_container_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_container(
    project_container_id: ULID,
    usecase: Annotated[DeleteProjectContainerUseCase, Depends(get_delete_project_container_use_case)],
):
    try:
        usecase(project_container_id=project_container_id)
    except ProjectContainerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/container/{project_id}/page", status_code=status.HTTP_200_OK, response_model=Page[GetProjectContainerResponse]
)
def get_paged_project_containers(
    project_id: ULID,
    paging_options: Annotated[PagingOptions, Depends()],
    usecase: Annotated[GetPagedProjectContainersUseCase, Depends(get_get_paged_project_containers_use_case)],
):
    project_containers: Page[ProjectContainer] = usecase(project_id=project_id, paging_options=paging_options)
    return Page(
        items=[
            GetProjectContainerResponse.from_domain_entity(project_container)
            for project_container in project_containers.items
        ],
        page=project_containers.page,
        size=project_containers.size,
        total_items=project_containers.total_items,
        total_pages=project_containers.total_pages,
    )


@router.post(
    "/container/export/{project_container_id}", status_code=status.HTTP_200_OK, response_model=ExportPPTResponse
)
def export_ppt(
    project_container_id: ULID,
    request_model: ExportPPTRequest,
    usecase: Annotated[ExportPPTUseCase, Depends(get_export_ppt_use_case)],
):
    try:
        path: Path = usecase(project_container_id=project_container_id, save_path=request_model.save_path)
        return ExportPPTResponse(path=path)
    except ProjectNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProjectContainerNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ProjectContainerNotCompleted as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{project_id}/variables", status_code=status.HTTP_200_OK, response_model=list[GetVariableResponse])
def get_variables(
    project_id: ULID, usecase: Annotated[GetAllVariablesUseCase, Depends(get_get_all_variables_use_case)]
):
    variables: list[Variable] = usecase(project_id=project_id)
    return [GetVariableResponse.from_domain_entity(variable) for variable in variables]


@router.get("/{project_id}/variables/{name}", status_code=status.HTTP_200_OK, response_model=GetVariableResponse)
def get_variable(
    project_id: ULID,
    name: str,
    usecase: Annotated[GetVariableUseCase, Depends(get_get_variable_use_case)],
):
    variable: Variable = usecase(project_id=project_id, name=name)
    return GetVariableResponse.from_domain_entity(variable)


@router.post("/{project_id}/variables", status_code=status.HTTP_201_CREATED, response_model=CreateVariableResponse)
def create_variable(
    project_id: ULID,
    request_model: CreateVariableRequest,
    usecase: Annotated[CreateVariableUseCase, Depends(get_create_variable_use_case)],
):
    try:
        variable: Variable = usecase(project_id=project_id, name=request_model.name, value=request_model.value)
        return CreateVariableResponse.from_domain_entity(variable)
    except DuplicatedVariable as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.patch("/{project_id}/variables/{name}", status_code=status.HTTP_200_OK, response_model=PatchVariableResponse)
def patch_variable(
    project_id: ULID,
    name: str,
    request_model: PatchVariableRequest,
    usecase: Annotated[PatchVariableUseCase, Depends(get_patch_variable_use_case)],
):
    variable: Variable = usecase(project_id=project_id, name=name, new_value=request_model.value)
    return PatchVariableResponse.from_domain_entity(variable)


@router.delete("/{project_id}/variables/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variable(
    project_id: ULID,
    name: str,
    usecase: Annotated[DeleteVariableUseCase, Depends(get_delete_variable_use_case)],
):
    try:
        usecase(project_id=project_id, name=name)
    except VariableNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
