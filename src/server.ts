import { createServer } from 'node:net'

import { createResponse } from './utils'

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
