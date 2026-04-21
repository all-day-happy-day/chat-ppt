import { useCallback, useEffect, useId, useRef, useState } from "react";

import { getPrincipalDisplayInitial } from "../lib/principal-display-initial";

const MENU_WIDTH_CLASS: string = "w-[min(100vw-2.5rem,248px)]";

const UsersIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GearIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PersonIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SignOutIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12H9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export type AccountMenuProps = {
  principal: string;
  isAdmin: boolean;
  isSigningOut: boolean;
  onUserSettings: () => void;
  onManageUsers: () => void;
  onSignOut: () => void;
};

export const AccountMenu = ({
  principal,
  isAdmin,
  isSigningOut,
  onUserSettings,
  onManageUsers,
  onSignOut,
}: AccountMenuProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId: string = useId();

  const closeMenu = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const handleToggleOpen = useCallback((): void => {
    setIsOpen((prev: boolean) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      const root: HTMLDivElement | null = rootRef.current;
      if (root === null) {
        return;
      }
      if (event.target instanceof Node && !root.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const displayInitial: string = getPrincipalDisplayInitial(principal);
  const atIndex: number = principal.indexOf("@");
  const headline: string = atIndex > 0 ? principal.slice(0, Math.max(0, atIndex)) : principal;
  const subline: string | null = atIndex > 0 ? principal : null;

  const handleUserSettingsClick = useCallback((): void => {
    closeMenu();
    onUserSettings();
  }, [closeMenu, onUserSettings]);

  const handleSignOutClick = useCallback((): void => {
    closeMenu();
    onSignOut();
  }, [closeMenu, onSignOut]);

  const handleManageUsersClick = useCallback((): void => {
    closeMenu();
    onManageUsers();
  }, [closeMenu, onManageUsers]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.12] bg-neutral-200/90 text-[12px] font-semibold text-neutral-800 outline-none transition hover:bg-neutral-300/90 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:border-white/[0.22] dark:bg-white/[0.12] dark:text-white dark:hover:bg-white/[0.18] dark:focus-visible:ring-[#0a84ff]"
        aria-label="Account menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={handleToggleOpen}
      >
        {displayInitial.length > 0 ? (
          <span aria-hidden="true">{displayInitial}</span>
        ) : (
          <span className="text-neutral-600 dark:text-neutral-200" aria-hidden="true">
            <PersonIcon />
          </span>
        )}
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className={`absolute right-0 z-50 mt-1.5 ${MENU_WIDTH_CLASS} overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.1)] dark:border-white/[0.1] dark:bg-[#2c2c2e] dark:shadow-[0_10px_36px_rgba(0,0,0,0.5)]`}
        >
          <div className="rounded-t-xl border-b border-black/[0.06] bg-neutral-100 px-3 py-2 dark:border-white/[0.08] dark:bg-[#3a3a3c]">
            <p className="truncate text-[14px] font-semibold text-neutral-900 dark:text-white">{headline}</p>
            {subline !== null ? (
              <p className="mt-0.5 truncate text-[12px] text-neutral-500 dark:text-neutral-400">{subline}</p>
            ) : (
              <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">Account</p>
            )}
          </div>

          <div className="py-0.5">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] font-normal text-[#0071e3] transition hover:bg-neutral-100 dark:text-[#0a84ff] dark:hover:bg-white/[0.06]"
              onClick={handleUserSettingsClick}
            >
              <span className="text-[#0071e3] dark:text-[#0a84ff]">
                <GearIcon />
              </span>
              User settings
            </button>
            {isAdmin ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] font-normal text-[#0071e3] transition hover:bg-neutral-100 dark:text-[#0a84ff] dark:hover:bg-white/[0.06]"
                onClick={handleManageUsersClick}
              >
                <span className="text-[#0071e3] dark:text-[#0a84ff]">
                  <UsersIcon />
                </span>
                Manage users
              </button>
            ) : null}
          </div>

          <div className="border-t border-black/[0.06] dark:border-white/[0.08]" />

          <div className="py-0.5">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] font-normal text-red-600 transition hover:bg-red-500/[0.08] disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
              onClick={handleSignOutClick}
              disabled={isSigningOut}
            >
              <span className="text-red-600 dark:text-red-400">
                <SignOutIcon />
              </span>
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
