import { collectValidationRows, locNamesField, looksLikeMissingField } from "./fastapi-validation-rows";

const looksLikeEmailValueError = (msg: string): boolean => {
  const lower: string = msg.toLowerCase();
  return lower.includes("email") || lower.includes("not a valid") || lower.includes("invalid");
};

const validationHintForSignUp = (parsed: unknown): string | null => {
  const rows = collectValidationRows(parsed);
  if (rows.length === 0) {
    return null;
  }
  let emailMissing: boolean = false;
  let usernameMissing: boolean = false;
  let passwordMissing: boolean = false;
  let emailFormat: boolean = false;
  for (const row of rows) {
    const missing: boolean = looksLikeMissingField(row.msg);
    if (missing && locNamesField(row.loc, "email")) {
      emailMissing = true;
    }
    if (missing && locNamesField(row.loc, "username")) {
      usernameMissing = true;
    }
    if (missing && locNamesField(row.loc, "password")) {
      passwordMissing = true;
    }
    if (locNamesField(row.loc, "email") && !missing && looksLikeEmailValueError(row.msg)) {
      emailFormat = true;
    }
  }
  if (emailFormat) {
    return "Use a valid email address.";
  }
  if (emailMissing && usernameMissing && passwordMissing) {
    return "Enter your email, username, and password to create an account.";
  }
  if (emailMissing && usernameMissing) {
    return "Enter your email and a username.";
  }
  if (emailMissing && passwordMissing) {
    return "Enter your email and password.";
  }
  if (usernameMissing && passwordMissing) {
    return "Enter a username and password.";
  }
  if (emailMissing) {
    return "Enter your email address.";
  }
  if (usernameMissing) {
    return "Choose a username.";
  }
  if (passwordMissing) {
    return "Choose a password.";
  }
  return "Some of the information does not look valid. Please review it and try again.";
};

export const getSignUpUserMessage = (status: number, parsedBody: unknown): string => {
  if (status === 409) {
    return "An account already exists with that email or username. Try signing in, or use different details.";
  }
  if (status === 405) {
    return "Sign-up is not available right now. Please try again in a little while.";
  }
  if (status >= 500) {
    return "The service is having trouble right now. Please wait a moment and try again.";
  }
  if (status === 400 || status === 422) {
    const hint: string | null = validationHintForSignUp(parsedBody);
    if (hint !== null) {
      return hint;
    }
    return "We could not create your account. Please check the form and try again.";
  }
  return "Could not create your account. Please try again.";
};
