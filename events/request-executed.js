const { TCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { SUBMISSION_ACCEPTED, REMOVAL_ACCEPTED },
  ITEM_STATUS: { REGISTERED }
} = require('../utils/types')

module.exports = ({ tcrInstance, gtcrView, db, networkID }) => async (
  _itemID,
  _requestIndex,
  _roundIndex,
  _disputed,
  _resolved
) => {
  // Ignore if status change event is not due to the execution of an unchallenged request.
  if (!resolved || _disputed) return

  const { address: tcrAddr } = tcrInstance
  const { status } = await gtcrView.getItem(tcrAddr, itemID)

  const latestTcrObj = JSON.parse(await db.get(TCRS))[networkID]
  Object.keys(latestTcrObj[tcrAddr])
    .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
    .forEach(async subscriberAddr =>
      addNotification(
        {
          type: status === REGISTERED ? SUBMISSION_ACCEPTED : REMOVAL_ACCEPTED,
          itemID,
          tcrAddr,
          clicked: false,
          notificationID: uuidv4().slice(0, 6) // Slice because we don't need so much entropy.
        },
        db,
        subscriberAddr
      )
    )
}
