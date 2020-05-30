const express = require('express')
const ethers = require('ethers')
const cors = require('cors')
const { bufferToHex } = require('ethereumjs-util')
const { recoverPersonalSignature } = require('eth-sig-util')
const {
  abi: _GTCR
} = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')
const {
  abi: _IArbitrator
} = require('@kleros/tcr/build/contracts/IArbitrator.json')

const validateSchema = require('../schemas/validation')
const { TCRS, ARBITRATORS, EMAIL_SETTINGS } = require('../utils/db-keys')

const router = express.Router()
const disputeCallback = require('../events/dispute')
const evidenceCallback = require('../events/evidence')
const resolvedCallback = require('../events/resolved')
const appealableRulingCallback = require('../events/appeal-possible')
const appealCallback = require('../events/appeal-decision')

const gtcrInterface = new ethers.utils.Interface(_GTCR)
const arbitratorInterface = new ethers.utils.Interface(_IArbitrator)
const tcrEventToCallback = {
  Evidence: evidenceCallback,
  Dispute: disputeCallback,
  ItemStatusChange: resolvedCallback
}
const arbitratorEventToCallback = {
  AppealPossible: appealableRulingCallback,
  AppealDecision: appealCallback
}

const buildRouter = (
  db,
  gtcrView,
  provider,
  tcrInstances,
  arbitratorInstances
) => {
  // Subscribe for in-app notifications.
  router.all('*', cors())
  router.post(
    '/subscribe',
    cors(),
    validateSchema('subscription'),
    async (req, res) => {
      try {
        let { subscriberAddr, tcrAddr, itemID } = req.body

        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr)
        tcrAddr = ethers.utils.getAddress(tcrAddr)

        // Initialize TCR watch list for the item it hasn't been already.
        let tcrs = {}
        try {
          tcrs = await db.get(TCRS)
          tcrs = JSON.parse(tcrs)
        } catch (err) {
          if (err.type !== 'NotFoundError') throw new Error(err)
        }
        if (!tcrs[tcrAddr]) tcrs[tcrAddr] = {}
        if (!tcrs[tcrAddr][subscriberAddr]) tcrs[tcrAddr][subscriberAddr] = {}

        tcrs[tcrAddr][subscriberAddr][itemID] = true
        await db.put(TCRS, JSON.stringify(tcrs))

        // Instantiate tcr and add listeners if needed.
        const fromBlock = await provider.getBlock()
        if (!tcrInstances[tcrAddr])
          tcrInstances[tcrAddr] = new ethers.Contract(tcrAddr, _GTCR, provider)

        Object.keys(tcrEventToCallback).map(eventName => {
          if (
            provider.listeners({
              topics: [gtcrInterface.events[eventName].topic],
              address: tcrAddr
            }).length === 0
          )
            tcrInstances[tcrAddr].on(
              { ...tcrInstances[tcrAddr].filters[eventName](), fromBlock },
              tcrEventToCallback[eventName]({
                tcrInstance: tcrInstances[tcrAddr],
                gtcrView,
                db
              })
            )
        })

        // Also watch for events from the arbitrator set to that request.
        const item = await gtcrView.getItem(tcrAddr, itemID)
        let { arbitrator: arbitratorAddr } = item
        arbitratorAddr = ethers.utils.getAddress(arbitratorAddr) // Convert to checksummed address.

        let arbitrators = {}
        try {
          arbitrators = await db.get(ARBITRATORS)
          arbitrators = JSON.parse(arbitrators)
        } catch (err) {
          if (err.type !== 'NotFoundError') throw new Error(err)
        }

        if (!arbitrators) arbitrators = {}
        if (!arbitrators[arbitratorAddr]) arbitrators[arbitratorAddr] = {}
        if (!arbitrators[arbitratorAddr][subscriberAddr])
          arbitrators[arbitratorAddr][subscriberAddr] = {}

        arbitrators[arbitratorAddr][subscriberAddr][itemID] = true

        await db.put(ARBITRATORS, JSON.stringify(arbitrators))

        // Add listeners for the arbitrator as well if they are not already there.
        if (!arbitratorInstances[arbitratorAddr])
          arbitratorInstances[arbitratorAddr] = new ethers.Contract(
            arbitratorAddr,
            _IArbitrator,
            provider
          )

        Object.keys(arbitratorEventToCallback).map(eventName => {
          if (
            provider.listeners({
              topics: [arbitratorInterface.events[eventName].topic],
              address: arbitratorAddr
            }).length === 0
          )
            arbitratorInstances[arbitratorAddr].on(
              {
                ...arbitratorInstances[arbitratorAddr].filters[eventName](),
                fromBlock
              },
              arbitratorEventToCallback[eventName]({
                arbitratorInstance: arbitratorInstances[arbitratorAddr],
                db,
                provider
              })
            )
        })

        res.send({
          message: `Now notifying ${subscriberAddr} of events related to ${itemID} of TCR at ${tcrAddr} and arbitrator ${arbitratorAddr}`,
          status: 'success'
        })
      } catch (err) {
        console.error(err)
        res.send({
          message: 'Internal error, please contact administrators',
          error: err.message,
          status: 'failed'
        })
      }
    }
  )

  router.post(
    '/email-settings',
    cors(),
    validateSchema('email-settings'),
    async (req, res) => {
      try {
        const { data, signature } = req.body
        const {
          message: { email }
        } = data

        // Recover checksummed address.
        const hexMsg = bufferToHex(Buffer.from(JSON.stringify(data), 'utf8'))
        const subscriberAddr = ethers.utils.getAddress(
          recoverPersonalSignature({ data: hexMsg, sig: signature })
        )

        let emailSettings = {}
        try {
          emailSettings = JSON.parse(await db.get(EMAIL_SETTINGS))
        } catch (err) {
          if (err.type !== 'NotFoundError') throw new Error(err)
        }
        emailSettings[subscriberAddr] = { email }
        await db.put(EMAIL_SETTINGS, JSON.stringify(emailSettings))

        res.send({
          message: 'Settings saved successfully.',
          status: 'success'
        })
      } catch (err) {
        console.error(err)
        res.send({
          message: 'Internal error, please contact administrators',
          error: err.message,
          status: 'failed'
        })
      }
    }
  )

  // Get notifications for an account.
  router.get('/notifications/:subscriberAddr', async (req, res) => {
    let { subscriberAddr } = req.params
    let notifications = { notifications: [] }
    try {
      subscriberAddr = ethers.utils.getAddress(subscriberAddr) // Convert to checksummed address.
      notifications = JSON.parse(await db.get(subscriberAddr))
      res.send(notifications)
    } catch (err) {
      if (err.type === 'NotFoundError') res.send(notifications)
      else {
        console.error(err)
        res.send({
          message: 'Internal error, please contact administrators',
          error: err.message,
          status: 'failed'
        })
      }
    }
  })

  // Mark a notification with clicked.
  router.put(
    '/notification/:subscriberAddr/:notificationID',
    cors(),
    async (req, res) => {
      try {
        let { subscriberAddr, notificationID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr)

        let subscriberNotifications = {}
        try {
          subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        } catch (err) {
          if (err.type !== 'NotFoundError') throw new Error(err)
        }

        if (!subscriberNotifications) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        const notificationIndex = subscriberNotifications.notifications.findIndex(
          notification => notification.notificationID === notificationID
        )
        if (notificationIndex === -1) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        subscriberNotifications.notifications[notificationIndex].clicked = true
        await db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
        res.send({ status: 200 })
      } catch (err) {
        console.error(err)
        res.send({
          message: 'Internal error, please contact administrators',
          error: err.message,
          status: 'failed'
        })
      }
    }
  )

  // Delete a notification.
  router.delete(
    '/notification/:subscriberAddr/:notificationID',
    cors(),
    async (req, res) => {
      try {
        let { subscriberAddr, notificationID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr)

        let subscriberNotifications = {}
        try {
          subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        } catch (err) {
          if (err.type !== 'NotFoundError') throw new Error(err)
        }

        if (!subscriberNotifications) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        const notificationIndex = subscriberNotifications.notifications.findIndex(
          notification => notification.notificationID === notificationID
        )
        if (notificationIndex === -1) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        subscriberNotifications.notifications.splice(notificationIndex, 1)
        await db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
        res.send({ status: 200 })
      } catch (err) {
        if (err.type === 'NotFoundError') res.send({ status: 200 })
        else {
          console.error(err)
          res.send({
            message: 'Internal error, please contact administrators',
            error: err.message,
            status: 'failed'
          })
        }
      }
    }
  )

  // Delete all notifications for a user.
  router.delete('/notifications/:subscriberAddr', cors(), async (req, res) => {
    try {
      let { subscriberAddr } = req.params
      // Convert to checksummed address
      subscriberAddr = ethers.utils.getAddress(subscriberAddr)

      let subscriberNotifications = {}
      try {
        subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
      } catch (err) {
        if (err.type !== 'NotFoundError') throw new Error(err)
      }

      subscriberNotifications = {
        ...subscriberNotifications,
        notifications: []
      }
      await db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
      res.send({ status: 200 })
    } catch (err) {
      if (err.type === 'NotFoundError') res.send({ status: 200 })
      else
        res.send({
          message: 'Internal error, please contact administrators',
          error: err.message,
          status: 'failed'
        })
    }
  })

  return router
}

module.exports = buildRouter
