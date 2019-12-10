const express = require('express')
const validateSchema = require('../schemas/validation')
const ethers = require('ethers')

const router = express.Router()
const { TCRS, ARBITRATORS } = require('../utils/db-keys')

const buildRouter = (db, gtcrView) => {
  router.post(
    '/subscribe',
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
          await db.put(
            subscriberAddr,
            JSON.stringify({
              unread: false,
              notifications: []
            })
          )
        }

        // Initialize TCR watch list for the item it hasn't been already.
        const tcrs = JSON.parse(await db.get(TCRS))
        if(!tcrs[networkID]) tcrs[networkID] = {}
        if (!tcrs[networkID][tcrAddr]) tcrs[networkID][tcrAddr] = {}
        if (!tcrs[networkID][tcrAddr][subscriberAddr]) tcrs[networkID][tcrAddr][subscriberAddr] = {}

        tcrs[networkID][tcrAddr][subscriberAddr][itemID] = true

        await db.put(TCRS, JSON.stringify(tcrs))

        // Also watche for events from the arbitrator set to that request.
        const item = await gtcrView.getItem(tcrAddr, itemID)
        let { arbitrator: arbitratorAddr } = item

        arbitratorAddr = ethers.utils.getAddress(arbitratorAddr) // Convert to checksummed address.
        const arbitrators = JSON.parse(await db.get(ARBITRATORS))
        if(!arbitrators[[networkID]]) arbitrators[networkID] = {}
        if (!arbitrators[networkID][arbitratorAddr]) arbitrators[networkID][arbitratorAddr] = {}
        if (!arbitrators[networkID][arbitratorAddr][subscriberAddr])
          arbitrators[networkID][arbitratorAddr][subscriberAddr] = {}

        arbitrators[networkID][arbitratorAddr][subscriberAddr][itemID] = true

        await db.put(ARBITRATORS, JSON.stringify(arbitrators))

        res.send({
          message: `Now notifying ${subscriberAddr} of events related to ${itemID} of TCR at ${tcrAddr}`,
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

  router.get('/notifications/:subscriberAddr/:networkID/', async (req, res) => {
    let { subscriberAddr, networkID } = req.params
    let notifications = {
      [networkID]: {
        unread: false,
        notifications: []
      }
    }
    try {      
      subscriberAddr = ethers.utils.getAddress(subscriberAddr) // Convert to checksummed address.
      if ((JSON.parse(await db.get(subscriberAddr)))[networkID]) notifications = JSON.parse(await db.get(subscriberAddr))
      res.send(notifications[networkID])
    } catch (err) {
      if (err.type === 'NotFoundError')
        res.send(notifications[networkID])
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
