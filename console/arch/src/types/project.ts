export type GetProjectResponse = {
  id: string;
  template_id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  parts: unknown[];
};

export type CreateProjectRequest = {
  template_id: string;
  user_id: string;
  name: string;
};

export type CreateProjectResponse = {
  id: string;
  template_id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  parts: unknown[];
};
