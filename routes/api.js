const express = require('express')
const validateSchema = require('../schemas/validation')
const router = express.Router()
const ethers = require('ethers')
const { abi } = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')
const provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER_URL)

const gtcrInterface = new ethers.utils.Interface(abi)

router.post('/subscribe', validateSchema('subscription'), async (req, res) => {
  try {
    const { user, arbitratorAddr, gtcrAddr, itemID, requestID } = req.body
  } catch (err) {
    res.send({
      message: 'Internal error, please contact administrators',
      error: err.message,
      status: 'failed'
    })
  }
})

module.exports = router
