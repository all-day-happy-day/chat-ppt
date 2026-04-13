export const SIGN_IN_REQUIRED_MESSAGE = "__CHATPPT_SIGN_IN_REQUIRED__" as const;

export const isSignInRequiredError = (error: unknown): boolean => {
  return error instanceof Error && error.message === SIGN_IN_REQUIRED_MESSAGE;
};
