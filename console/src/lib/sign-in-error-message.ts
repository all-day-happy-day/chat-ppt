import { collectValidationRows, locNamesField, looksLikeMissingField } from "./fastapi-validation-rows";

const validationHintForSignIn = (parsed: unknown): string | null => {
  const rows = collectValidationRows(parsed);
  if (rows.length === 0) {
    return null;
  }
  let principalIssue: boolean = false;
  let secretIssue: boolean = false;
  for (const row of rows) {
    const missing: boolean = looksLikeMissingField(row.msg);
    if (missing && locNamesField(row.loc, "principal")) {
      principalIssue = true;
    }
    if (missing && locNamesField(row.loc, "secret")) {
      secretIssue = true;
    }
  }
  if (principalIssue && secretIssue) {
    return "Enter the account name and password for your account.";
  }
  if (principalIssue) {
    return "Enter the email or username for your account.";
  }
  if (secretIssue) {
    return "Enter your password.";
  }
  return "Some of the information does not look valid. Please review it and try again.";
};

export const getSignInUserMessage = (status: number, parsedBody: unknown): string => {
  if (status === 401) {
    return "That account name and password do not match. Try again, or reset your password if you forgot it.";
  }
  if (status === 404) {
    return "We could not find an account with that name. Check for typos, or sign up if you are new here.";
  }
  if (status === 405) {
    return "Sign-in is not available right now. Please try again in a little while.";
  }
  if (status >= 500) {
    return "The service is having trouble right now. Please wait a moment and try again.";
  }
  if (status === 400 || status === 422) {
    const hint: string | null = validationHintForSignIn(parsedBody);
    if (hint !== null) {
      return hint;
    }
    return "We could not process your sign-in. Please check your account and password, then try again.";
  }
  return "Could not sign in. Please check your details and try again.";
};
