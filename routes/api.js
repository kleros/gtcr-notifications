const express = require('express')
const ethers = require('ethers')
const cors = require('cors')
const {
  abi: _GTCR
} = require('@kleros/tcr/build/contracts/GeneralizedTCR.json')
const {
  abi: _IArbitrator
} = require('@kleros/tcr/build/contracts/IArbitrator.json')

const validateSchema = require('../schemas/validation')
const { TCRS, ARBITRATORS } = require('../utils/db-keys')

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
        let { subscriberAddr, tcrAddr, itemID, networkID } = req.body

        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr)
        tcrAddr = ethers.utils.getAddress(tcrAddr)

        // Check if user has notifications object initialized
        // and if not, initialize it.
        try {
          await db.get(subscriberAddr)
        } catch (err) {
          if (!err.type === 'NotFoundError') throw new Error(err)
          await db.put(subscriberAddr, JSON.stringify({ notifications: [] }))
        }

        // Initialize TCR watch list for the item it hasn't been already.
        const tcrs = JSON.parse(await db.get(TCRS))
        if (!tcrs[networkID]) tcrs[networkID] = {}
        if (!tcrs[networkID][tcrAddr]) tcrs[networkID][tcrAddr] = {}
        if (!tcrs[networkID][tcrAddr][subscriberAddr])
          tcrs[networkID][tcrAddr][subscriberAddr] = {}

        tcrs[networkID][tcrAddr][subscriberAddr][itemID] = true
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
                db,
                networkID
              })
            )
        })

        // Also watch for events from the arbitrator set to that request.
        const item = await gtcrView.getItem(tcrAddr, itemID)
        let { arbitrator: arbitratorAddr } = item
        arbitratorAddr = ethers.utils.getAddress(arbitratorAddr) // Convert to checksummed address.

        const arbitrators = JSON.parse(await db.get(ARBITRATORS))
        if (!arbitrators[[networkID]]) arbitrators[networkID] = {}
        if (!arbitrators[networkID][arbitratorAddr])
          arbitrators[networkID][arbitratorAddr] = {}
        if (!arbitrators[networkID][arbitratorAddr][subscriberAddr])
          arbitrators[networkID][arbitratorAddr][subscriberAddr] = {}

        arbitrators[networkID][arbitratorAddr][subscriberAddr][itemID] = true

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
                networkID,
                provider
              })
            )
        })

        res.send({
          message: `Now notifying ${subscriberAddr} of events related to ${itemID} of TCR at ${tcrAddr} and arbitrator ${arbitratorAddr}`,
          status: 'success'
        })
      } catch (err) {
        res.send({
          message: 'Internal error, please contact administrators',
          error: err.message,
          status: 'failed'
        })
      }
    }
  )

  // Get notifications for an account.
  router.get('/notifications/:subscriberAddr/:networkID', async (req, res) => {
    let { subscriberAddr, networkID } = req.params
    let notifications = {
      [networkID]: { notifications: [] }
    }
    try {
      subscriberAddr = ethers.utils.getAddress(subscriberAddr) // Convert to checksummed address.
      if (JSON.parse(await db.get(subscriberAddr))[networkID])
        notifications = JSON.parse(await db.get(subscriberAddr))
      res.send(notifications[networkID])
    } catch (err) {
      if (err.type === 'NotFoundError') res.send(notifications[networkID])
      else
        res.send({
          message: 'Internal error, please contact administrators',
          error: err.message,
          status: 'failed'
        })
    }
  })

  // Mark a notification with clicked.
  router.put(
    '/notification/:subscriberAddr/:networkID/:notificationID',
    cors(),
    async (req, res) => {
      try {
        let { subscriberAddr, networkID, notificationID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr)

        const subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        if (!subscriberNotifications[networkID]) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        const notificationIndex = subscriberNotifications[
          networkID
        ].notifications.findIndex(
          notification => notification.notificationID === notificationID
        )
        if (notificationIndex === -1) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        subscriberNotifications[networkID].notifications[
          notificationIndex
        ].clicked = true
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
    }
  )

  // Delete a notification.
  router.delete(
    '/notification/:subscriberAddr/:networkID/:notificationID',
    cors(),
    async (req, res) => {
      try {
        let { subscriberAddr, networkID, notificationID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr)

        const subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        if (!subscriberNotifications[networkID]) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        const notificationIndex = subscriberNotifications[
          networkID
        ].notifications.findIndex(
          notification => notification.notificationID === notificationID
        )
        if (notificationIndex === -1) {
          res.send({ status: 404, message: 'Notification not found.' })
          return
        }

        subscriberNotifications[networkID].notifications.splice(
          notificationIndex,
          1
        )
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
    }
  )

  // Delete all notifications for a user and networkID.
  router.delete(
    '/notifications/:subscriberAddr/:networkID',
    cors(),
    async (req, res) => {
      try {
        let { subscriberAddr, networkID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr)

        const subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        subscriberNotifications[networkID] = { notifications: [] }
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
    }
  )

  return router
}

module.exports = buildRouter
