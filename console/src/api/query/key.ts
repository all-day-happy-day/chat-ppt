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
    LIST_ALL: ['powerpoint', 'list', 'all'] as const,
    LIST_LAYOUTS: (templateId: string) => ['powerpoint', 'list', 'layouts', templateId] as const,
  },
} as const)
