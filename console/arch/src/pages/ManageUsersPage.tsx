import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import { verifySession } from "../api/auth";
import { listUsers, patchUserRoleById } from "../api/user";
import { ThemeToggle } from "../components/ThemeToggle";
import { APP_DISPLAY_NAME } from "../lib/app-display-name";
import { isSignInRequiredError } from "../lib/auth-errors";
import { AUTH_FIELD_CLASS } from "../lib/auth-screen-classes";
import { readAppliedThemeFromDocument } from "../lib/read-applied-theme";
import { readableClientFetchFailureMessage } from "../lib/read-fetch-error";
import { findUserIdByPrincipal } from "../lib/resolve-user-id";
import { setSessionExpiredRedirect } from "../lib/session-expired-redirect";
import type { ThemePreference } from "../lib/theme";
import { toggleStoredTheme } from "../lib/theme";
import type { GetUserResponse, UserRole } from "../types/user";
import { USER_ROLES } from "../types/user";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  USER: "Standard user",
};

const USER_RESOLVE_ERROR: string = "We could not match your signed-in user to an account in this workspace.";

const WORKSPACE_LOAD_NETWORK_FALLBACK: string =
  "Could not reach the server. Check your connection and that the API is running, then refresh this page.";

const USER_TABLE_DATE_FORMATTER: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const ROLE_MENU_OPTION_CLASS: string =
  "flex w-full flex-col rounded-md px-3 py-2 text-left text-[14px] leading-snug text-neutral-900 outline-none transition hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 dark:focus-visible:ring-[#0a84ff]";

const ROLE_MENU_OPTION_SELECTED_CLASS: string = "bg-neutral-100 dark:bg-white/10";

const ROLE_CONFIRM_CODE_LENGTH: number = 6;

const ROLE_CONFIRM_CODE_ALPHABET: string = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const SIGNED_IN_ROLE_HINT_MESSAGE: string =
  "You cannot change your own role here. Ask another administrator if you need it changed.";

const formatUserInstant = (iso: string | null): string => {
  if (iso === null) {
    return "—";
  }
  const parsed: Date = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return USER_TABLE_DATE_FORMATTER.format(parsed);
};

const generateRoleConfirmCode = (): string => {
  let result: string = "";
  for (let i: number = 0; i < ROLE_CONFIRM_CODE_LENGTH; i += 1) {
    const index: number = Math.floor(Math.random() * ROLE_CONFIRM_CODE_ALPHABET.length);
    result += ROLE_CONFIRM_CODE_ALPHABET.charAt(index);
  }
  return result;
};

type PendingRoleChange = {
  userId: string;
  username: string;
  currentRole: UserRole;
  nextRole: UserRole;
  confirmCode: string;
};

type UserRolePickerProps = {
  user: GetUserResponse;
  listboxId: string;
  triggerId: string;
  isMenuOpen: boolean;
  disabled: boolean;
  isSignedInUser: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onPickRole: (nextRole: UserRole) => void;
};

const UserRolePicker = ({
  user,
  listboxId,
  triggerId,
  isMenuOpen,
  disabled,
  isSignedInUser,
  onMenuOpen,
  onMenuClose,
  onPickRole,
}: UserRolePickerProps) => {
  const rootRef: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null);
  const selfHintId: string = useId();
  const [isSelfHintOpen, setIsSelfHintOpen] = useState<boolean>(false);

  useEffect(() => {
    if (disabled) {
      setIsSelfHintOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (isMenuOpen) {
      setIsSelfHintOpen(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      const root: HTMLDivElement | null = rootRef.current;
      if (root === null || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        onMenuClose();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isMenuOpen, onMenuClose]);

  useEffect(() => {
    if (!isSelfHintOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      const root: HTMLDivElement | null = rootRef.current;
      if (root === null || !(event.target instanceof Node)) {
        return;
      }
      if (!root.contains(event.target)) {
        setIsSelfHintOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isSelfHintOpen]);

  useEffect(() => {
    if (!isMenuOpen && !isSelfHintOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isMenuOpen) {
          onMenuClose();
        }
        if (isSelfHintOpen) {
          setIsSelfHintOpen(false);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, isSelfHintOpen, onMenuClose]);

  const handleTriggerClick = useCallback((): void => {
    if (disabled) {
      return;
    }
    if (isSignedInUser) {
      setIsSelfHintOpen((open: boolean) => !open);
      return;
    }
    onMenuOpen();
  }, [disabled, isSignedInUser, onMenuOpen]);

  const handleOptionClick = useCallback(
    (nextRole: UserRole): void => {
      onMenuClose();
      if (nextRole === user.role) {
        return;
      }
      onPickRole(nextRole);
    },
    [onMenuClose, onPickRole, user.role]
  );

  const isTriggerExpanded: boolean = isSignedInUser ? isSelfHintOpen : isMenuOpen;

  return (
    <div ref={rootRef} className="relative z-20 min-w-0">
      <button
        id={triggerId}
        type="button"
        className={`manage-users-role-trigger flex min-h-0 w-full min-w-[10rem] max-w-full items-center justify-between gap-1.5 text-left ${isSignedInUser && !disabled ? "cursor-default text-neutral-600 dark:text-neutral-400" : ""}`}
        aria-haspopup={isSignedInUser ? "true" : "listbox"}
        aria-expanded={isTriggerExpanded}
        aria-controls={isSignedInUser ? (isSelfHintOpen ? selfHintId : undefined) : listboxId}
        disabled={disabled}
        onClick={handleTriggerClick}
      >
        <span className="min-w-0 flex-1 truncate">{ROLE_LABELS[user.role]}</span>
      </button>
      {isSignedInUser && isSelfHintOpen ? (
        <div
          id={selfHintId}
          role="status"
          className="absolute bottom-full left-0 z-[60] mb-2 w-max max-w-[min(17.5rem,calc(100vw-3rem))]"
        >
          <div className="relative rounded-2xl border border-black/[0.1] bg-white px-4 py-3 text-left text-[13px] font-medium leading-snug text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            {SIGNED_IN_ROLE_HINT_MESSAGE}
            <span
              className="absolute -bottom-1.5 left-5 block size-2.5 rotate-45 border-b border-r border-black/[0.1] bg-white dark:border-white/[0.12] dark:bg-[#2c2c2e]"
              aria-hidden
            />
          </div>
        </div>
      ) : null}
      {isMenuOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-[60] mt-1 w-full min-w-0 list-none rounded-lg border border-neutral-300 bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-[#2c2c2e]"
        >
          {USER_ROLES.map((roleValue: UserRole) => {
            const isSelected: boolean = user.role === roleValue;
            return (
              <li key={roleValue} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${ROLE_MENU_OPTION_CLASS} ${isSelected ? ROLE_MENU_OPTION_SELECTED_CLASS : ""}`}
                  onClick={() => {
                    handleOptionClick(roleValue);
                  }}
                >
                  {ROLE_LABELS[roleValue]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export const ManageUsersPage = () => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const reactId: string = useId();
  const [theme, setTheme] = useState<ThemePreference>(() => readAppliedThemeFromDocument());
  const [users, setUsers] = useState<GetUserResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [openRoleUserId, setOpenRoleUserId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [typedConfirmCode, setTypedConfirmCode] = useState<string>("");
  const [roleDialogError, setRoleDialogError] = useState<string | null>(null);
  const [savingRoleUserId, setSavingRoleUserId] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const confirmDialogRef: RefObject<HTMLDialogElement | null> = useRef<HTMLDialogElement | null>(null);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev: ThemePreference) => toggleStoredTheme(prev));
  }, []);

  const handleSessionExpiredNavigation = useCallback((): void => {
    setSessionExpiredRedirect();
    navigate("/", { replace: true });
  }, [navigate]);

  const handleGoHome = useCallback((): void => {
    void (async (): Promise<void> => {
      try {
        await verifySession();
        navigate("/", { replace: true });
      } catch {
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  useEffect(() => {
    let cancelled: boolean = false;
    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      setUsers([]);
      setIsAdmin(false);
      setSessionUserId(null);
      setOpenRoleUserId(null);
      try {
        const session = await verifySession();
        const userRows: GetUserResponse[] = await listUsers();
        const userId: string | null = findUserIdByPrincipal(session.principal, userRows);
        if (userId === null) {
          if (!cancelled) {
            setLoadError(USER_RESOLVE_ERROR);
          }
          return;
        }
        const self: GetUserResponse | undefined = userRows.find((row: GetUserResponse) => row.id === userId);
        if (self === undefined) {
          if (!cancelled) {
            setLoadError(USER_RESOLVE_ERROR);
          }
          return;
        }
        if (self.role !== "ADMIN") {
          if (!cancelled) {
            setIsAdmin(false);
            setUsers([]);
          }
          return;
        }
        if (!cancelled) {
          setIsAdmin(true);
          setSessionUserId(userId);
          setUsers(userRows);
        }
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }
        if (isSignInRequiredError(error)) {
          handleSessionExpiredNavigation();
          return;
        }
        const message: string = readableClientFetchFailureMessage(error, WORKSPACE_LOAD_NETWORK_FALLBACK);
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [handleSessionExpiredNavigation]);

  useLayoutEffect(() => {
    const dialog: HTMLDialogElement | null = confirmDialogRef.current;
    if (pendingRoleChange === null) {
      dialog?.close();
      return;
    }
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
    }
    setTypedConfirmCode("");
    setRoleDialogError(null);
    return () => {
      dialog?.close();
    };
  }, [pendingRoleChange]);

  const handleRequestRoleChange = useCallback((user: GetUserResponse, nextRole: UserRole): void => {
    setPendingRoleChange({
      userId: user.id,
      username: user.username,
      currentRole: user.role,
      nextRole,
      confirmCode: generateRoleConfirmCode(),
    });
  }, []);

  const handleCloseRoleDialog = useCallback((): void => {
    setPendingRoleChange(null);
    setTypedConfirmCode("");
    setRoleDialogError(null);
    confirmDialogRef.current?.close();
  }, []);

  const handleTypedConfirmChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setTypedConfirmCode(event.target.value);
    setRoleDialogError(null);
  }, []);

  const handleConfirmRoleChange = useCallback(async (): Promise<void> => {
    if (pendingRoleChange === null) {
      return;
    }
    if (typedConfirmCode !== pendingRoleChange.confirmCode) {
      setRoleDialogError("The code does not match. Try again.");
      return;
    }
    setSavingRoleUserId(pendingRoleChange.userId);
    setRoleDialogError(null);
    try {
      const updated: GetUserResponse = await patchUserRoleById(pendingRoleChange.userId, pendingRoleChange.nextRole);
      setUsers((prev: GetUserResponse[]) =>
        prev.map((row: GetUserResponse) => (row.id === updated.id ? updated : row))
      );
      handleCloseRoleDialog();
    } catch (error: unknown) {
      if (isSignInRequiredError(error)) {
        handleSessionExpiredNavigation();
        return;
      }
      const message: string = error instanceof Error ? error.message : "Something went wrong.";
      setRoleDialogError(message);
    } finally {
      setSavingRoleUserId(null);
    }
  }, [pendingRoleChange, typedConfirmCode, handleCloseRoleDialog, handleSessionExpiredNavigation]);

  const canShowUserTable: boolean = !isLoading && loadError === null && isAdmin;
  const isConfirmDisabled: boolean =
    pendingRoleChange === null || typedConfirmCode !== pendingRoleChange.confirmCode || savingRoleUserId !== null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-visible">
      <header className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <button
            type="button"
            className="min-w-0 truncate text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
            aria-label={`${APP_DISPLAY_NAME} home`}
            onClick={handleGoHome}
          >
            {APP_DISPLAY_NAME}
          </button>
          <span className="shrink-0 text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Manage users</span>
        </div>
        <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
      </header>

      <main className="mx-auto w-full max-w-[min(90rem,calc(100vw-2rem))] flex-1 overflow-x-visible px-6 py-8 sm:py-10">
        <h1 className="text-[28px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Manage users</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Workspace accounts and roles.
        </p>

        {isLoading ? <p className="mt-10 text-[15px] text-neutral-500 dark:text-neutral-400">Loading…</p> : null}

        {loadError !== null ? (
          <p
            className="mt-8 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {!isLoading && loadError === null && !isAdmin ? (
          <p
            className="mt-8 rounded-xl border border-black/[0.06] bg-white px-4 py-4 text-[15px] leading-relaxed text-neutral-700 dark:border-white/[0.08] dark:bg-[#1c1c1e] dark:text-neutral-300"
            role="status"
          >
            Only administrators can open this page.
          </p>
        ) : null}

        {canShowUserTable ? (
          <div className="mt-8 overflow-visible rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.08] dark:bg-[#1c1c1e]">
            <table className="w-full table-fixed border-collapse overflow-visible text-left text-[14px] text-neutral-900 dark:text-neutral-50">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[22%]" />
                <col className="w-[17%]" />
                <col className="w-[23%]" />
                <col className="w-[23%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-black/[0.06] dark:border-white/[0.08]">
                  <th className="px-2.5 py-3 font-semibold text-neutral-700 dark:text-neutral-300" scope="col">
                    Username
                  </th>
                  <th className="px-2.5 py-3 pr-1 font-semibold text-neutral-700 dark:text-neutral-300" scope="col">
                    Email
                  </th>
                  <th className="px-2.5 py-3 pl-1 font-semibold text-neutral-700 dark:text-neutral-300" scope="col">
                    Role
                  </th>
                  <th className="px-2.5 py-3 font-semibold text-neutral-700 dark:text-neutral-300" scope="col">
                    Created at
                  </th>
                  <th className="px-2.5 py-3 font-semibold text-neutral-700 dark:text-neutral-300" scope="col">
                    Last signed in
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: GetUserResponse) => {
                  const listboxId: string = `${reactId}-role-list-${user.id}`;
                  const triggerId: string = `${reactId}-role-trigger-${user.id}`;
                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-black/[0.04] last:border-b-0 dark:border-white/[0.06] [&>td]:overflow-visible ${openRoleUserId === user.id ? "relative z-30" : "relative"}`}
                    >
                      <td className="px-2.5 py-3 font-medium">
                        <span className="block truncate" title={user.username}>
                          {user.username}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 pr-1 text-neutral-600 dark:text-neutral-400">
                        <span className="block truncate" title={user.email}>
                          {user.email}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 pl-1 align-top text-neutral-600 dark:text-neutral-400">
                        <UserRolePicker
                          user={user}
                          listboxId={listboxId}
                          triggerId={triggerId}
                          isMenuOpen={openRoleUserId === user.id}
                          disabled={pendingRoleChange !== null || savingRoleUserId !== null}
                          isSignedInUser={sessionUserId !== null && user.id === sessionUserId}
                          onMenuOpen={() => {
                            setOpenRoleUserId(user.id);
                          }}
                          onMenuClose={() => {
                            setOpenRoleUserId((current: string | null) => (current === user.id ? null : current));
                          }}
                          onPickRole={(nextRole: UserRole) => {
                            handleRequestRoleChange(user, nextRole);
                          }}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-3 text-neutral-600 dark:text-neutral-400">
                        {formatUserInstant(user.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-3 text-neutral-600 dark:text-neutral-400">
                        {formatUserInstant(user.last_sign_in)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>

      <dialog
        ref={confirmDialogRef}
        className="fixed left-1/2 top-1/2 z-[100] w-[min(100vw-2rem,26rem)] max-h-[min(90dvh,calc(100vh-2rem))] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-black/[0.1] bg-white p-6 text-neutral-900 shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:border-white/[0.12] dark:bg-[#2c2c2e] dark:text-neutral-50 dark:shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
        onClose={handleCloseRoleDialog}
      >
        {pendingRoleChange !== null ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-[18px] font-semibold tracking-tight">Confirm role change</h2>
            <p className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              {`Change role for `}
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{pendingRoleChange.username}</span>
              {` from ${ROLE_LABELS[pendingRoleChange.currentRole]} to ${ROLE_LABELS[pendingRoleChange.nextRole]}.`}
            </p>
            <p className="text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              Type the following code to confirm:
            </p>
            <p
              className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-center font-mono text-[20px] font-semibold tracking-widest text-neutral-900 dark:border-white/20 dark:bg-white/[0.06] dark:text-neutral-50"
              aria-live="polite"
            >
              {pendingRoleChange.confirmCode}
            </p>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300"
                htmlFor="role-confirm-code-input"
              >
                Confirmation code
              </label>
              <input
                id="role-confirm-code-input"
                name="role_confirm_code"
                type="text"
                autoComplete="off"
                spellCheck={false}
                className={AUTH_FIELD_CLASS}
                value={typedConfirmCode}
                onChange={handleTypedConfirmChange}
                disabled={savingRoleUserId !== null}
                aria-invalid={roleDialogError !== null}
              />
            </div>
            {roleDialogError !== null ? (
              <p
                className="rounded-xl bg-red-500/10 px-4 py-3 text-left text-[13px] leading-relaxed text-red-700 dark:bg-red-500/15 dark:text-red-300"
                role="alert"
              >
                {roleDialogError}
              </p>
            ) : null}
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="flex h-9 items-center justify-center rounded-lg border border-neutral-300 bg-transparent px-3.5 text-[13px] font-medium text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-white/10"
                onClick={handleCloseRoleDialog}
                disabled={savingRoleUserId !== null}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex h-9 items-center justify-center rounded-lg bg-[#0071e3] px-3.5 text-[13px] font-medium text-white transition hover:bg-[#0077ed] active:bg-[#006edb] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0a84ff] dark:hover:bg-[#409cff] dark:active:bg-[#0077e6]"
                disabled={isConfirmDisabled}
                onClick={() => {
                  void handleConfirmRoleChange();
                }}
              >
                {savingRoleUserId !== null ? "Saving…" : "Confirm change"}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
};
