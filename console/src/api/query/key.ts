export const QUERY_KEY = Object.freeze({
  AUTH: {
    VERIFY: ['auth', 'verify'] as const,
    ME: ['auth', 'me'] as const,
  },
  USER: {
    GET: (id: string) => ['user', 'get', id] as const,
    GETS: ['user', 'gets'] as const,
  },
  SONG: {
    LIST: (title: string) => ['song', 'list', 'title', title] as const,
    LIST_ALL: ['song', 'list', 'all'] as const,
    GET_LYRICS: (songId: string) => ['song', 'lyrics', 'get', songId] as const,
  },
  POWERPOINT: {
    LIST_ALL: (userId: string) => ['powerpoint', 'list', 'all', userId] as const,
    LIST_LAYOUTS: (templateId: string) => ['powerpoint', 'list', 'layouts', templateId] as const,
  },
  PROJECT: {
    GET_ALL: (userId: string) => ['project', 'get', 'all', userId] as const,
    GET_ALL_CONTAINERS: (projectId: string) => ['project', 'get', 'all', 'containers', projectId] as const,
  },
} as const)
