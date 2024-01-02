export type ServerResponse = {
  status: 'OK' | 'ERROR'
  type: 'set' | 'get'
  data: string
}
