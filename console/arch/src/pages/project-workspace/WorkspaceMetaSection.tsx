import type { GetProjectResponse } from "../../types/project";

import { NotionCalendarIcon, NotionDocumentIcon, NotionHistoryIcon, NotionPersonIcon } from "./icons";
import { NotionPropertyRow } from "./NotionPropertyRow";
import { formatInstant, shortenId } from "./utils";

import type { ReactElement, RefObject } from "react";

export type WorkspaceMetaSectionProps = {
  titleHeadingRef: RefObject<HTMLHeadingElement | null>;
  projectInformationRef: RefObject<HTMLDivElement | null>;
  project: GetProjectResponse;
  workspaceMetaError: string | null;
  templateDisplayName: string | null;
  ownerUsername: string;
  defaultLayoutId: string | null;
};

export const WorkspaceMetaSection = ({
  titleHeadingRef,
  projectInformationRef,
  project,
  workspaceMetaError,
  templateDisplayName,
  ownerUsername,
  defaultLayoutId,
}: WorkspaceMetaSectionProps): ReactElement => {
  return (
    <>
      <section
        className="shrink-0 border-b border-neutral-200/90 px-4 pb-2 pt-8 dark:border-white/[0.08] sm:px-8 sm:pb-4 sm:pt-10"
        aria-label="Project details"
      >
        <div className="mx-auto w-full max-w-[900px]">
          <h1
            ref={titleHeadingRef}
            id="project-workspace-title"
            className="text-[32px] font-bold leading-[1.2] tracking-tight text-neutral-900 sm:text-[40px] dark:text-neutral-50"
          >
            {project.name}
          </h1>
          {workspaceMetaError !== null ? (
            <p className="mt-2 text-[14px] text-amber-700 dark:text-amber-400/90" role="status">
              {workspaceMetaError}
            </p>
          ) : null}
          <div
            ref={projectInformationRef}
            className="mt-10 overflow-x-hidden overflow-y-hidden border-t border-neutral-200/90 dark:border-white/[0.08]"
          >
            <div className="divide-y divide-neutral-200/90 dark:divide-white/[0.08]">
              <NotionPropertyRow icon={<NotionPersonIcon />} label="Owner">
                <span className="block truncate" title={ownerUsername}>
                  {ownerUsername}
                </span>
              </NotionPropertyRow>
              <NotionPropertyRow icon={<NotionDocumentIcon />} label="Template">
                <p
                  className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[14px] leading-snug text-neutral-800 dark:text-neutral-200"
                  title={project.template_id}
                >
                  <span className="min-w-0 font-medium">{templateDisplayName ?? shortenId(project.template_id)}</span>
                  <span className="shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden>
                    ·
                  </span>
                  <span className="min-w-0 truncate font-mono text-[13px] text-neutral-500 dark:text-neutral-400">
                    {project.template_id}
                  </span>
                </p>
              </NotionPropertyRow>
              <NotionPropertyRow icon={<NotionCalendarIcon />} label="Created">
                {formatInstant(project.created_at)}
              </NotionPropertyRow>
              <NotionPropertyRow icon={<NotionHistoryIcon />} label="Last edited">
                {formatInstant(project.updated_at)}
              </NotionPropertyRow>
            </div>
          </div>
        </div>
      </section>

      <div className="shrink-0" aria-label="Project notices">
        {defaultLayoutId === null && workspaceMetaError === null ? (
          <p
            className="mx-auto mb-4 w-full max-w-none px-4 text-center text-[13px] text-neutral-500 sm:px-6 dark:text-neutral-400"
            role="status"
          >
            No default slide layout id was read from this template, so thumbnails that depend on a layout may look
            minimal until you pick layouts in Edit.
          </p>
        ) : null}
      </div>
    </>
  );
};
