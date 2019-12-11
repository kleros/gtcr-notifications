const express = require('express')
const validateSchema = require('../schemas/validation')
const ethers = require('ethers')

const router = express.Router()
const { TCRS, ARBITRATORS } = require('../utils/db-keys')

const buildRouter = (db, gtcrView) => {
  // Subscribe to request.
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

  // Get notifications for an account.
  router.get('/notifications/:subscriberAddr/:networkID', async (req, res) => {
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

  // Mark a notification with clicked.
  router.patch(
    '/notification/:subscriberAddr/:networkID/:notificationID',    
    async (req, res) => {
      try {
        let { subscriberAddr, networkID, notificationID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr) 
               
        const subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        if (!subscriberNotifications[networkID] ) {
          res.send({ status: 404, message: 'Notification not found.' })    
          return
        }

        const notificationIndex = subscriberNotifications[networkID].notifications
          .findIndex(notification => notification.notificationID === notificationID)
        if (notificationIndex === -1) {
          res.send({ status: 404, message: 'Notification not found.' })    
          return
        }

        subscriberNotifications[networkID].notifications[notificationIndex].clicked = true
        db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
        res.send({ status: 200 })    
      } catch (err) {
        if (err.type === 'NotFoundError')          
          res.send({ status: 200 })        
        else
          res.send({
            message: 'Internal error, please contact administrators',
            error: err.message,
            status: 'failed'
          })
      }
    }
  )

  // Mark notifications as read.
  router.patch(
    '/notifications/:subscriberAddr/:networkID',
    async (req, res) => {
      try {
        let { subscriberAddr, networkID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr) 
               
        const subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        if (!subscriberNotifications[networkID]) {
          res.send({ status: 200 })    
          return
        }

        subscriberNotifications[networkID].unread = false
        db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
        res.send({ status: 200 })    
      } catch (err) {
        if (err.type === 'NotFoundError')          
          res.send({ status: 200 })        
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
    async (req, res) => {
      try {
        let { subscriberAddr, networkID, notificationID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr) 
               
        const subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        if (!subscriberNotifications[networkID] ) {
          res.send({ status: 404, message: 'Notification not found.' })    
          return
        }

        const notificationIndex = subscriberNotifications[networkID].notifications
          .findIndex(notification => notification.notificationID === notificationID)
        if (notificationIndex === -1) {
          res.send({ status: 404, message: 'Notification not found.' })    
          return
        }

        subscriberNotifications[networkID].notifications.splice(notificationIndex, 1)
        db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
        res.send({ status: 200 })    
      } catch (err) {
        if (err.type === 'NotFoundError')          
          res.send({ status: 200 })        
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
    async (req, res) => {
      try {
        let { subscriberAddr, networkID } = req.params
        // Convert to checksummed address
        subscriberAddr = ethers.utils.getAddress(subscriberAddr) 
               
        const subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
        subscriberNotifications[networkID] = { unread: false, notifications: []}
        db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
        res.send({ status: 200 })    
      } catch (err) {
        if (err.type === 'NotFoundError')          
          res.send({ status: 200 })        
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
