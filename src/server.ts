import { createServer } from 'node:net'

const server = createServer((socket) => {
  console.log('client connected')

  socket.on('data', (data) => {
    console.log('data received: ' + data)
    socket.write('Echo: ' + data)
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
