const express = require('express')

module.exports = provider => {
  const router = express.Router()

  /* GET home page. */
  router.get('/', function(_, res) {
    const network = provider.getNetwork()
    res.send(
      `<h1>Curate Notifications</h1> <p>All systems go.</p> <p>${JSON.stringify(
        network
      )}</p>`
    )
  })

  return router
}
