export type SignInRequest = {
  principal: string;
  secret: string;
};

export type SignInResponse = {
  username: string;
};

export type SignUpRequest = {
  email: string;
  username: string;
  password: string;
};

export type SignUpResponse = {
  username: string;
};
