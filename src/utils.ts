import type { ErrorResponse, SuccessResponse } from './types'

export function createResponse(response: SuccessResponse | ErrorResponse) {
  return JSON.stringify(response)
}
