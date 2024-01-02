import { writeFile, readFile } from 'node:fs/promises'
import { createServer } from 'node:net'

import { operations } from './types'
import { createResponse } from './utils'

// 2. TODO: Handle Sets: sadd, srem, scard, smembers, sismember

const dataMap = new Map<string, Array<string> | string>()

async function saveDataToFile() {
  const mapToSave = Object.fromEntries(dataMap.entries())
  await writeFile('./map.json', JSON.stringify(mapToSave, null, 2))
}

async function loadDataFromFile() {
  try {
    const mapFileContent = await readFile('./map.json', 'utf8')
    const mapJsonData = JSON.parse(mapFileContent)
    for (const [key, value] of Object.entries(mapJsonData)) {
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
          if (value && typeof value === 'string') {
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

      case operations.lpop:
      case operations.rpop: {
        const key = partsOfOperation[1]
        const currentValue = dataMap.get(key)
        if (
          key &&
          currentValue &&
          Array.isArray(currentValue) &&
          currentValue.length > 0
        ) {
          const poppedValue =
            operation === operations.lpop
              ? currentValue.shift()
              : currentValue.pop()

          const isCurrentValueEmpty = currentValue.length === 0

          if (isCurrentValueEmpty) {
            dataMap.delete(key)
          } else {
            dataMap.set(key, currentValue)
          }

          socket.write(
            createResponse({
              status: 'OK',
              type: 'lpop',
              data: JSON.stringify(poppedValue),
            })
          )
        } else {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key is not provided or is not a list or list is empty.',
            })
          )
        }

        break
      }

      case operations.lrange: {
        const key = partsOfOperation[1]
        const startIndex = Number(partsOfOperation[2])
        const endIndex = Number(partsOfOperation[3])
        const ALL_TO_END_INDEX = -1

        const currentValue = dataMap.get(key)

        const shouldExtractRange =
          key &&
          currentValue &&
          Array.isArray(currentValue) &&
          currentValue.length > 0 &&
          !Number.isNaN(startIndex) &&
          !Number.isNaN(endIndex)

        if (shouldExtractRange) {
          const isStartIndexNegative = startIndex < 0
          const isEndIndexNegative =
            endIndex < 0 && endIndex !== ALL_TO_END_INDEX
          if (isStartIndexNegative && isEndIndexNegative) {
            socket.write(
              createResponse({
                status: 'ERROR',
                data: 'Start and end index cannot be negative. -1 for end index however means all the way to end of list.',
              })
            )

            return
          }

          const isStartIndexGreaterThanEndIndex =
            startIndex > endIndex && endIndex !== ALL_TO_END_INDEX
          if (isStartIndexGreaterThanEndIndex) {
            socket.write(
              createResponse({
                status: 'ERROR',
                data: 'Start index cannot be greater than end index.',
              })
            )

            return
          }

          const isStartIndexGreaterThanLength =
            startIndex > currentValue.length - 1
          const isEndIndexGreaterThanLength = endIndex > currentValue.length - 1

          if (isStartIndexGreaterThanLength || isEndIndexGreaterThanLength) {
            socket.write(
              createResponse({
                status: 'ERROR',
                data: 'Start or end index cannot be greater than length of list.',
              })
            )

            return
          }

          const shouldGetTillEnd = endIndex === ALL_TO_END_INDEX
          const shouldGetAll = startIndex === 0 && shouldGetTillEnd

          const extractedRange = shouldGetAll
            ? currentValue
            : shouldGetTillEnd
            ? currentValue.slice(startIndex)
            : currentValue.slice(startIndex, endIndex + 1)

          socket.write(
            createResponse({
              status: 'OK',
              type: 'lrange',
              data: JSON.stringify(extractedRange),
            })
          )
        } else {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key is not provided or is not a list or list is empty.',
            })
          )
        }

        break
      }

      case operations.lpush:
      case operations.rpush: {
        const key = partsOfOperation[1]
        const value = partsOfOperation[2]
        const currentValue = dataMap.get(key) || []

        if (key && value && Array.isArray(currentValue)) {
          const newValue =
            operation === operations.lpush
              ? [value, ...currentValue]
              : [...currentValue, value]
          dataMap.set(key, newValue)

          socket.write(
            createResponse({
              status: 'OK',
              type: 'lpush',
              data: `List item added. Length of list is now ${newValue.length}.`,
            })
          )
        } else {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key or value is not provided. Or key is not a list.',
            })
          )
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
