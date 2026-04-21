import { useCallback, useEffect, useState } from "react";

import { verifySession } from "./api/auth";
import { consumeSessionExpiredRedirect } from "./lib/session-expired-redirect";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SignUpPage } from "./pages/SignUpPage";

export type AppScreen = "home" | "signin" | "signup" | "projects";

export const AppRoot = () => {
  const [screen, setScreen] = useState<AppScreen | null>(() => {
    if (consumeSessionExpiredRedirect()) {
      return "signin";
    }
    return null;
  });

  useEffect(() => {
    if (screen !== null) {
      return;
    }
    let cancelled: boolean = false;
    const run = async (): Promise<void> => {
      try {
        await verifySession();
        if (!cancelled) {
          setScreen("projects");
        }
      } catch {
        if (!cancelled) {
          setScreen("home");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [screen]);

  const handleGoHome = useCallback((): void => {
    void (async (): Promise<void> => {
      try {
        await verifySession();
        setScreen("projects");
      } catch {
        setScreen("home");
      }
    })();
  }, []);

  const handleGoSignIn = useCallback(() => {
    setScreen("signin");
  }, []);

  const handleGoSignUp = useCallback(() => {
    setScreen("signup");
  }, []);

  const handleSignedIn = useCallback(() => {
    setScreen("projects");
  }, []);

  const handleSessionExpired = useCallback(() => {
    setScreen("signin");
  }, []);

  const handleSignOut = useCallback(() => {
    setScreen("home");
  }, []);

  if (screen === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f7] text-[15px] text-neutral-500 dark:bg-black dark:text-neutral-400">
        Loading…
      </div>
    );
  }

  if (screen === "home") {
    return <HomePage onGoHome={handleGoHome} onSignIn={handleGoSignIn} onSignUp={handleGoSignUp} />;
  }

  if (screen === "signin") {
    return <LoginPage onSuccess={handleSignedIn} onGoHome={handleGoHome} onGoSignUp={handleGoSignUp} />;
  }

  if (screen === "signup") {
    return <SignUpPage onSuccess={handleSignedIn} onGoHome={handleGoHome} onGoSignIn={handleGoSignIn} />;
  }

  return <ProjectsPage onGoHome={handleGoHome} onSessionExpired={handleSessionExpired} onSignOut={handleSignOut} />;
};
