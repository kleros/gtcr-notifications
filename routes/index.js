const express = require('express')
const router = express.Router()

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('<h1>GTCR Notifications</h1> <p>All systems go.</p>')
})

module.exports = router
