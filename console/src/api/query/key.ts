export const QUERY_KEY = Object.freeze({
  AUTH: {
    VERIFY: ['auth', 'verify'] as const,
    ME: ['auth', 'me'] as const,
  },
  USER: {
    GET: (id: string) => ['user', 'get', id] as const,
    GETS: ['user', 'gets'] as const,
  },
} as const)
