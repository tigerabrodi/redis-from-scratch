import type { ServerResponse } from './types'

import { Socket } from 'node:net'
import * as readline from 'readline'

const options = {
  port: 8080,
  host: 'localhost',
}

const client = new Socket()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false, // Disable automatic line output by readline to prevent echo
})

client.connect(options, () => {
  console.log('Connected to server!')
  promptUser()
})

const promptUser = () => {
  process.stdout.write('Enter command: ')
}

rl.on('line', (line) => {
  if (line === 'quit') {
    client.end()
    rl.close()
  } else {
    client.write(line)
  }
})

client.on('data', (data) => {
  const stringifiedData = JSON.parse(data.toString()) as ServerResponse

  if (stringifiedData.status === 'OK') {
    switch (stringifiedData.type) {
      case 'set':
      case 'flushall': {
        console.log('OK')
        break
      }
      case 'get': {
        console.log(stringifiedData.data)
        break
      }
    }
  }

  promptUser()
})

client.on('close', () => {
  console.log('Connection closed')
  process.exit(0)
})

client.on('error', (err) => {
  console.error('An error occurred:', err)
  process.exit(1)
})
