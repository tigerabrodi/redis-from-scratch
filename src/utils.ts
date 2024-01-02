import type { ServerResponse } from './types'

export function createResponse(response: ServerResponse) {
  return JSON.stringify(response)
}
