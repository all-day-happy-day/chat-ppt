export const USER_ROLES = ["ADMIN", "USER"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type GetUserResponse = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
};

export type PatchUserRequest = {
  email?: string;
  username?: string;
  password?: string;
};
