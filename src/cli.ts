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
})

client.connect(options, () => {
  console.log('Connected to server!')

  rl.setPrompt('Enter command: ')
  rl.prompt()

  rl.on('line', (line) => {
    if (line === 'quit') {
      client.end()
      rl.close()
    } else {
      client.write(line)
    }
  })
})

client.on('data', (data) => {
  const stringifiedData = data.toString()

  switch (stringifiedData) {
    case 'OK':
      console.log('OK')
  }

  rl.prompt()
})

client.on('close', () => {
  console.log('Connection closed')
  process.exit(0)
})

client.on('error', (err) => {
  console.error('An error occurred:', err)
  process.exit(1)
})
