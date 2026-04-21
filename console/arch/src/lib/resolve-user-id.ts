import type { GetUserResponse } from "../types/user";

export const findUserIdByPrincipal = (principal: string, users: GetUserResponse[]): string | null => {
  const normalized: string = principal.trim().toLowerCase();
  const match: GetUserResponse | undefined = users.find((user: GetUserResponse) => {
    return user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized;
  });
  return match?.id ?? null;
};
