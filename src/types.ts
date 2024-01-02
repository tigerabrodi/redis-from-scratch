export type SuccessResponse = {
  status: 'OK'
  type: keyof typeof operations
  data: string | null
}

export type ErrorResponse = {
  status: 'ERROR'
  data: string
}

export const operations = {
  set: 'set',
  get: 'get',
  flushall: 'flushall',
  del: 'del',
  keys: 'keys',
  exists: 'exists',
  quit: 'quit',
  lpush: 'lpush',
  rpush: 'rpush',
  lpop: 'lpop',
  rpop: 'rpop',
  lrange: 'lrange',
} as const
