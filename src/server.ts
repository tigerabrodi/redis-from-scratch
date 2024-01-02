import type { ServerResponse } from './types'

import { createServer } from 'node:net'

const operations = {
  set: 'set',
  get: 'get',
} as const

const dataMap = new Map<string, string>()

const server = createServer((socket) => {
  console.log('client connected')

  socket.on('data', (data) => {
    const stringifiedData = data.toString()
    const partsOfOperation = stringifiedData.split(' ')
    const operation = partsOfOperation[0].toLowerCase()

    switch (operation) {
      case operations.set: {
        const key = partsOfOperation[1]
        const value = partsOfOperation[2]
        if (key && value) {
          dataMap.set(key, value)

          const response: ServerResponse = {
            status: 'OK',
            type: 'set',
            data: value,
          }

          socket.write(JSON.stringify(response))
        } else {
          socket.write('ERROR')
        }

        break
      }

      case operations.get: {
        const key = partsOfOperation[1]
        if (key) {
          const value = dataMap.get(key)
          if (value) {
            const response: ServerResponse = {
              status: 'OK',
              type: 'get',
              data: value,
            }

            socket.write(JSON.stringify(response))
          } else {
            socket.write('ERROR')
          }
        }

        break
      }
    }
  })

  socket.on('end', () => {
    console.log('client disconnected')
  })

  socket.on('error', (err) => {
    console.error('An error occurred:', err)
  })
})

server.listen(8080, () => {
  console.log('Server listening on port 8080')
})
