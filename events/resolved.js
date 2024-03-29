const { TCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { SUBMISSION_ACCEPTED, REMOVAL_ACCEPTED, FINAL_RULING },
  ITEM_STATUS: { REGISTERED }
} = require('../utils/types')
const { SUBJECTS, MESSAGES } = require('../utils/messages')

module.exports = ({ tcrInstance, gtcrView, db, chainId }) => async (
  itemID,
  _requestIndex,
  _roundIndex,
  disputed,
  _resolved
) => {
  try {
    // Ignore status change events of unresolved requests.
    if (!_resolved) return

    const { address: tcrAddr } = tcrInstance
    const { status } = await gtcrView.getItem(tcrAddr, itemID)

    let latestTcrObj = {}
    try {
      latestTcrObj = JSON.parse(await db.get(TCRS))
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .forEach(async subscriberAddr => {
        const type = disputed
          ? FINAL_RULING
          : status === REGISTERED
          ? SUBMISSION_ACCEPTED
          : REMOVAL_ACCEPTED
        addNotification(
          {
            type,
            itemID: itemID,
            tcrAddr,
            subject: SUBJECTS[type],
            message: MESSAGES[type],
            chainId
          },
          db,
          subscriberAddr
        )
      })
  } catch (err) {
    console.error('Error saving resolved notification', err)
  }
}
