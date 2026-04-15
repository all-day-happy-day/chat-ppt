import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountMenu } from '../../components/AccountMenu';
import { ThemeToggle } from '../../components/ThemeToggle';
import { APP_DISPLAY_NAME } from '../../lib/app-display-name';
import type { ThemePreference } from '../../lib/theme';

export type WorkspaceHeaderProps = {
  principal: string | null;
  isSessionAdmin: boolean;
  isSigningOut: boolean;
  theme: ThemePreference;
  onGoHome: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
};

export const WorkspaceHeader = ({
  principal,
  isSessionAdmin,
  isSigningOut,
  theme,
  onGoHome,
  onToggleTheme,
  onSignOut,
}: WorkspaceHeaderProps): ReactElement => {
  const navigate = useNavigate();
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-6 py-4 dark:border-white/[0.08]">
      <div className="flex min-w-0 flex-1 items-center gap-5">
        <button
          type="button"
          className="min-w-0 truncate text-left text-[17px] font-semibold tracking-tight text-neutral-900 outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#0071e3] dark:text-neutral-50 dark:focus-visible:ring-[#0a84ff]"
          aria-label={`${APP_DISPLAY_NAME} home`}
          onClick={onGoHome}
        >
          {APP_DISPLAY_NAME}
        </button>
        <span className="shrink-0 text-[15px] font-medium text-neutral-500 dark:text-neutral-400">Project</span>
      </div>
      <div className="flex items-center gap-3">
        {principal !== null ? (
          <AccountMenu
            principal={principal}
            isAdmin={isSessionAdmin}
            isSigningOut={isSigningOut}
            onUserSettings={() => {
              navigate('/settings');
            }}
            onManageUsers={() => {
              navigate('/users');
            }}
            onSignOut={onSignOut}
          />
        ) : null}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
};
