import { createServer } from 'node:net'

import { operations } from './types'
import { createResponse } from './utils'

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

          socket.write(
            createResponse({
              status: 'OK',
              type: 'set',
              data: value,
            })
          )
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
            socket.write(
              createResponse({
                status: 'OK',
                type: 'get',
                data: value,
              })
            )
          } else {
            socket.write(
              createResponse({
                status: 'OK',
                type: 'get',
                data: null,
              })
            )
          }
        }

        break
      }

      case operations.del: {
        const key = partsOfOperation[1]
        if (key) {
          const value = dataMap.get(key)
          if (value) {
            dataMap.delete(key)
            socket.write(
              createResponse({
                status: 'OK',
                type: 'del',
                data: `Deleted key "${key}"`,
              })
            )
          } else {
            socket.write(
              createResponse({
                status: 'OK',
                type: 'del',
                data: `Key ${key} not found`,
              })
            )
          }
        } else {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key is not provided',
            })
          )
        }

        break
      }

      case operations.flushall: {
        dataMap.clear()
        socket.write(
          createResponse({
            status: 'OK',
            type: 'flushall',
            data: null,
          })
        )

        break
      }

      default: {
        socket.write(
          createResponse({
            data: 'Unknown command',
            status: 'ERROR',
          })
        )
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
