export const SESSION_EXPIRED_REDIRECT_STORAGE_KEY = "chatppt-session-expired" as const;

export const consumeSessionExpiredRedirect = (): boolean => {
  if (sessionStorage.getItem(SESSION_EXPIRED_REDIRECT_STORAGE_KEY) === "1") {
    sessionStorage.removeItem(SESSION_EXPIRED_REDIRECT_STORAGE_KEY);
    return true;
  }
  return false;
};

export const setSessionExpiredRedirect = (): void => {
  sessionStorage.setItem(SESSION_EXPIRED_REDIRECT_STORAGE_KEY, "1");
};
