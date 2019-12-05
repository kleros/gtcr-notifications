const express = require('express')
const validateSchema = require('../schemas/validation')

const router = express.Router()

const {
  REMOVAL_ACCEPTED,
  SUBMISSION_CHALLENGED,
  APPEALED
} = require('../notification/types')

router.post('/subscribe', validateSchema('subscription'), async (req, res) => {
  try {
    const { userAddr, arbitratorAddr, gtcrAddr, itemID, requestID } = req.body
    res.send({
      message: `Now saving events related to request ${requestID} of item
        ${itemID} of the GTCR at ${gtcrAddr} for user ${userAddr}. Events
        from arbitrator at ${arbitratorAddr} related to this request will
        also be saved.`,
      status: 'success'
    })
  } catch (err) {
    res.send({
      message: 'Internal error, please contact administrators',
      error: err.message,
      status: 'failed'
    })
  }
})

router.get('/notifications/:userAddr', async (req, res) => {
  try {
    const { userAddr } = req.params

    // Mocking notifications for now.
    const notifications = {
      userAddr,
      viewed: false,
      notifications: [
        {
          type: SUBMISSION_CHALLENGED,
          itemID:
            '0xd4d33ccd78728f3d7f8ea4ce26793d12efc45393a338b7f9f73e9f287017f9d4',
          gtcrAddr: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          arbitrator: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          requester: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          challenger: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          clicked: false
        },
        {
          type: REMOVAL_ACCEPTED,
          itemID:
            '0xd4d33ccd78728f3d7f8ea4ce26793d12efc45393a338b7f9f73e9f287017f9d4',
          gtcrAddr: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          arbitrator: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          requester: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          challenger: null,
          clicked: false
        },
        {
          type: APPEALED,
          itemID:
            '0xd4d33ccd78728f3d7f8ea4ce26793d12efc45393a338b7f9f73e9f287017f9d4',
          gtcrAddr: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          arbitrator: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          requester: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          challenger: '0x8b21581d19332aB6eC76CD682D623f21f6a298Ab',
          clicked: false
        }
      ]
    }
    console.info(notifications)
    res.send(notifications)
  } catch (err) {
    res.send({
      message: 'Internal error, please contact administrators',
      error: err.message,
      status: 'failed'
    })
  }
})

module.exports = router
