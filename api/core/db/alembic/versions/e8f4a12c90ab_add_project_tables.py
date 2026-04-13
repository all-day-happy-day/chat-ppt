"""Add project, project-container, and project-part tables.

Revision ID: e8f4a12c90ab
Revises: 198b9674e6c9
Create Date: 2026-04-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e8f4a12c90ab"
down_revision: Union[str, Sequence[str], None] = "198b9674e6c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "project",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("template_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["template_id"], ["ppt-template.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
    op.create_index(op.f("ix_project_template_id"), "project", ["template_id"], unique=False)
    op.create_index(op.f("ix_project_user_id"), "project", ["user_id"], unique=False)
    op.create_table(
        "project-container",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("container_name", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
    op.create_index(
        op.f("ix_project-container_project_id"),
        "project-container",
        ["project_id"],
        unique=False,
    )
    op.create_table(
        "project-part",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("container_id", sa.String(length=36), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("type", sa.Enum("LYRICS", "BIBLE", "VALUE", "PLAIN", name="parttype"), nullable=False),
        sa.Column("contents", sa.JSON(), nullable=False),
        sa.Column("additional_data", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["container_id"], ["project-container.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id"),
    )
    op.create_index(op.f("ix_project-part_project_id"), "project-part", ["project_id"], unique=False)
    op.create_index(op.f("ix_project-part_container_id"), "project-part", ["container_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_project-part_container_id"), table_name="project-part")
    op.drop_index(op.f("ix_project-part_project_id"), table_name="project-part")
    op.drop_table("project-part")
    sa.Enum("LYRICS", "BIBLE", "VALUE", "PLAIN", name="parttype").drop(op.get_bind(), checkfirst=True)
    op.drop_index(op.f("ix_project-container_project_id"), table_name="project-container")
    op.drop_table("project-container")
    op.drop_index(op.f("ix_project_user_id"), table_name="project")
    op.drop_index(op.f("ix_project_template_id"), table_name="project")
    op.drop_table("project")
