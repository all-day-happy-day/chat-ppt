import type { ReactElement, RefObject } from "react";
import { Link } from "react-router-dom";
import type { GetProjectResponse } from "../../types/project";

export type WorkspaceBackNavProps = {
  navRef: RefObject<HTMLElement | null>;
  project: GetProjectResponse | null;
  isProjectTitlePinnedToNav: boolean;
  onBackToProjects: () => void;
};

export const WorkspaceBackNav = ({
  navRef,
  project,
  isProjectTitlePinnedToNav,
  onBackToProjects,
}: WorkspaceBackNavProps): ReactElement => {
  return (
    <nav
      ref={navRef}
      className="flex min-w-0 shrink-0 items-center gap-2 border-b border-neutral-200/70 bg-[#fbfbfa] px-6 py-2.5 dark:border-white/[0.06] dark:bg-[#191919] sm:gap-3"
      aria-label="Back to projects"
    >
      <button
        type="button"
        className="shrink-0 text-[15px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
        onClick={onBackToProjects}
      >
        ‹ Projects
      </button>
      {project !== null && isProjectTitlePinnedToNav ? (
        <>
          <span className="shrink-0 text-[15px] text-neutral-300 dark:text-neutral-600" aria-hidden>
            /
          </span>
          <span
            className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
            title={project.name}
          >
            {project.name}
          </span>
        </>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center">
        {project !== null ? (
          <Link
            to={`/projects/${project.id}/settings`}
            className="text-[15px] font-medium text-[#0071e3] outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-[#0a84ff] dark:focus-visible:ring-[#0a84ff]"
          >
            Settings
          </Link>
        ) : null}
      </div>
    </nav>
  );
};
