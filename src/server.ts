import { createServer } from 'node:net'

import AWS from 'aws-sdk'
import dotenv from 'dotenv'

import { operations } from './types'
import { createResponse } from './utils'
dotenv.config()

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'eu-central-1',
})

const dataMap = new Map<string, Array<string> | string>()

const dataMapSet = new Map<string, Set<string>>()

const s3 = new AWS.S3()
const bucketName = 'redis-from-scratch'
const mapFileName = 'map.json'
const mapSetFileName = 'mapSet.json'

async function saveDataToS3() {
  const mapToSave = Object.fromEntries(dataMap.entries())
  const mapSetToSave = Object.fromEntries(
    [...dataMapSet].map(([key, val]) => [key, [...val]])
  )

  await Promise.all([
    s3
      .putObject({
        Bucket: bucketName,
        Key: mapFileName,
        Body: JSON.stringify(mapToSave),
      })
      .promise(),
    s3
      .putObject({
        Bucket: bucketName,
        Key: mapSetFileName,
        Body: JSON.stringify(mapSetToSave),
      })
      .promise(),
  ])
}

async function loadDataFromS3() {
  try {
    const [mapObject, mapSetObject] = await Promise.all([
      s3.getObject({ Bucket: bucketName, Key: mapFileName }).promise(),
      s3.getObject({ Bucket: bucketName, Key: mapSetFileName }).promise(),
    ])

    const mapJsonData = JSON.parse(mapObject.Body?.toString() || '{}')
    const mapSetJsonData = JSON.parse(mapSetObject.Body?.toString() || '{}')

    for (const [key, value] of Object.entries(mapJsonData)) {
      dataMap.set(key, value as string)
    }

    for (const [key, value] of Object.entries(mapSetJsonData)) {
      dataMapSet.set(key, new Set(value as Array<string>))
    }
  } catch (err) {
    // Handle errors, such as file not found
    console.log('Starting with empty data structures.')
    dataMap.clear()
    dataMapSet.clear()
  }
}

const server = createServer((socket) => {
  console.log('client connected')

  socket.on('data', (data) => {
    const stringifiedData = data.toString()
    const partsOfOperation = stringifiedData.split(' ')
    const operation = partsOfOperation[0].toLowerCase()

    if (operation === operations.quit) {
      saveDataToS3()
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

      case operations.sadd: {
        const key = partsOfOperation[1]
        const value = partsOfOperation[2]
        const currentValue = dataMapSet.get(key) || new Set<string>()

        if (key && value) {
          currentValue.add(value)
          dataMapSet.set(key, currentValue)

          socket.write(
            createResponse({
              status: 'OK',
              type: 'sadd',
              data: `Set item added. Length of set is now ${currentValue.size}.`,
            })
          )
        } else {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key or value is not provided.',
            })
          )
        }

        break
      }

      case operations.srem: {
        const key = partsOfOperation[1]
        const value = partsOfOperation[2]

        if (!key || !value) {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key or value is not provided.',
            })
          )

          return
        }

        const isKeyInSet = dataMapSet.has(key)

        if (!isKeyInSet) {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key does not exist on Set.',
            })
          )

          return
        }

        dataMapSet.delete(key)

        socket.write(
          createResponse({
            status: 'OK',
            type: 'srem',
            data: `Key "${key}" deleted.`,
          })
        )

        break
      }

      case operations.smembers: {
        const key = partsOfOperation[1]
        const value = partsOfOperation[2]
        const currentValue = dataMapSet.get(key)
        if (!currentValue) {
          socket.write(
            createResponse({
              status: 'ERROR',
              data: 'Key does not exist on Set.',
            })
          )

          return
        }

        if (value) {
          const isValueInSet = currentValue.has(value)
          socket.write(
            createResponse({
              status: 'OK',
              type: 'smembers',
              data: JSON.stringify(isValueInSet),
            })
          )

          return
        }

        const values = Array.from(currentValue).reduce((acc, curr) => {
          return acc + `${curr}\n`
        }, '')

        socket.write(
          createResponse({
            status: 'OK',
            type: 'smembers',
            data: values,
          })
        )

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

loadDataFromS3()
  .then(() => {
    server.listen(8080, () => {
      console.log('Server listening on port 8080')
    })
  })
  .catch((error) => {
    console.error('Error loading data:', error)
  })
