import { Socket } from 'node:net'

const options = {
  port: 8080,
  host: 'localhost',
}

// Create a client socket
const client = new Socket()

client.connect(options, () => {
  console.log('Connected to server!')

  client.write('Hello, server! Love, Client.')
})

client.on('data', (data) => {
  console.log('Received: ' + data)
  client.end()
})

// Handle connection closure
client.on('close', () => {
  console.log('Connection closed')
})

// Handle errors
client.on('error', (err) => {
  console.error('An error occurred:', err)
})
