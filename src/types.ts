export type ServerResponse = {
  status: 'OK' | 'ERROR'
  type: keyof typeof operations
  data: string | null
}

export const operations = {
  set: 'set',
  get: 'get',
  flushall: 'flushall',
} as const
