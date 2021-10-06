const { TCRS } = require('../utils/db-keys')
const addNotification = require('../utils/add-notification')
const {
  NOTIFICATION_TYPES: { HAS_PAID_FEES }
} = require('../utils/types')
const { SUBJECTS } = require('../utils/messages')
const { PARTY } = require('../utils/types')

module.exports = ({ tcrInstance, db }) => async (
  itemID,
  _request,
  _round,
  side
) => {
  try {
    const { address: tcrAddr } = tcrInstance

    let latestTcrObj = {}
    try {
      latestTcrObj = await db.get(TCRS)
      latestTcrObj = JSON.parse(latestTcrObj)
    } catch (err) {
      if (err.type !== 'NotFoundError') throw new Error(err)
    }

    Object.keys(latestTcrObj[tcrAddr])
      .filter(subscriberAddr => latestTcrObj[tcrAddr][subscriberAddr][itemID])
      .forEach(async subscriberAddr =>
        addNotification(
          {
            type: HAS_PAID_FEES,
            itemID,
            tcrAddr,
            subject: SUBJECTS[HAS_PAID_FEES],
            message: `The ${
              side === PARTY.REQUESTER ? 'submitter' : 'challenger'
            } is fully funded. The ${
              side === PARTY.REQUESTER ? 'challenger' : 'submitter'
            } must fully fund before the deadline in order to not lose the case.`
          },
          db,
          subscriberAddr
        )
      )
  } catch (err) {
    console.error('Error saving evidence notification', err)
  }
}
