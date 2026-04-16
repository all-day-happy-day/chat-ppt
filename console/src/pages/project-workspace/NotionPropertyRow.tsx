import type { ReactElement, ReactNode } from "react";
import { NOTION_ICON_CLASS } from "./icons";

export type NotionPropertyRowProps = {
  icon: ReactNode;
  label: string;
  children: ReactNode;
};

export const NotionPropertyRow = ({ icon, label, children }: NotionPropertyRowProps): ReactElement => {
  return (
    <div className="group -mx-1 flex flex-col gap-0.5 rounded-md px-1 py-2 transition-colors hover:bg-black/[0.035] sm:flex-row sm:items-start sm:gap-3 dark:hover:bg-white/[0.05]">
      <div className="flex min-h-[1.375rem] w-full shrink-0 items-center gap-2 sm:w-44">
        <span className={NOTION_ICON_CLASS} aria-hidden>
          {icon}
        </span>
        <span className="select-none text-[14px] text-neutral-500 dark:text-neutral-400">{label}</span>
      </div>
      <div className="min-w-0 flex-1 pl-7 text-[14px] leading-snug text-neutral-800 sm:pl-0 dark:text-neutral-100">
        {children}
      </div>
    </div>
  );
};
