import { writeFile, readFile } from 'node:fs/promises'
import { createServer } from 'node:net'

import { operations } from './types'
import { createResponse } from './utils'

// 1. TODO: Handle lpush, rpush, lpop, rpop, lrange

// 2. TODO: Handle Sets: sadd, srem, scard, smembers, sismember

// 3. TODO: Handle TTL: expire, ttl

const dataMap = new Map<string, string>()

async function saveDataToFile() {
  const dataToSave = Object.fromEntries(dataMap.entries())
  await writeFile('./data.json', JSON.stringify(dataToSave, null, 2))
}

async function loadDataFromFile() {
  try {
    const fileContent = await readFile('./data.json', 'utf8')
    const jsonData = JSON.parse(fileContent)
    for (const [key, value] of Object.entries(jsonData)) {
      dataMap.set(key, value as string)
    }
  } catch (err) {
    // File problems, start off with clean Map
    dataMap.clear()
  }
}

const server = createServer((socket) => {
  console.log('client connected')

  socket.on('data', (data) => {
    const stringifiedData = data.toString()
    const partsOfOperation = stringifiedData.split(' ')
    const operation = partsOfOperation[0].toLowerCase()

    if (operation === operations.quit) {
      saveDataToFile()
        .then(() => {
          console.log('Data saved to file.')

          socket.write(
            createResponse({
              status: 'OK',
              type: 'quit',
              data: 'Data saved and server shutting down.\n',
            }),
            () => {
              socket.end()
            }
          )
        })
        .catch((error) => {
          console.error('Error saving data:', error)
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Error saving data',
            }),
            () => {
              socket.end()
            }
          )
        })

      return
    }

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

      case operations.keys: {
        const keys = Array.from(dataMap.keys())
        const asterisk = partsOfOperation[1]

        if (asterisk === '*') {
          socket.write(
            createResponse({
              status: 'OK',
              type: 'keys',
              data: keys.join(', '),
            })
          )
        } else {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Unknown command',
            })
          )
        }

        break
      }

      case operations.exists: {
        const key = partsOfOperation[1]
        if (key) {
          const value = dataMap.get(key)
          if (value) {
            socket.write(
              createResponse({
                status: 'OK',
                type: 'exists',
                data: JSON.stringify(true),
              })
            )
          } else {
            socket.write(
              createResponse({
                status: 'OK',
                type: 'exists',
                data: JSON.stringify(false),
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

loadDataFromFile()
  .then(() => {
    server.listen(8080, () => {
      console.log('Server listening on port 8080')
    })
  })
  .catch((error) => {
    console.error('Error loading data:', error)
  })
