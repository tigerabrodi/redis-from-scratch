import { createServer } from 'node:net'

const dataMap = new Map<string, string>()

const server = createServer((socket) => {
  console.log('client connected')

  socket.on('data', (data) => {
    const stringifiedData = data.toString()
    const operation = stringifiedData.split(' ')[0].toLowerCase()

    switch (operation) {
      case 'set':
        const key = stringifiedData.split(' ')[1]
        const value = stringifiedData.split(' ')[2]
        if (key && value) {
          dataMap.set(key, value)
          socket.write('OK')
        } else {
          socket.write('ERROR')
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
