/* eslint-disable valid-jsdoc */
/* eslint-disable require-jsdoc */
const http = require('http')
const appBuilder = require('./app-builder')

async function main() {
  /**
   * Event listener for HTTP server "error" event.
   */
  function onError(error) {
    if (error.syscall !== 'listen') throw error

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`)
        throw new Error(`${bind} requires elevated privileges`)
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`)
        throw new Error(`${bind} is already in use`)
      default:
        throw error
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */
  function onListening() {
    const addr = server.address()
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`
    console.info('Listening on', bind)
  }
  const app = await appBuilder()
  const port = process.env.PORT || '3000'
  app.set('port', port)

  const server = http.createServer(app)
  server.listen(port)
  server.on('error', onError)
  server.on('listening', onListening)
}

main()
