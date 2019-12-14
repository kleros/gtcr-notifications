module.exports = async (notification, db, subscriberAddr) => {
  notification = {
    clicked: false,
    notificationID: uuidv4().slice(0, 6), // Slice because we don't need so much entropy.
    ...notification
  }
  let subscriberNotifications = {}
  try {
    subscriberNotifications = JSON.parse(await db.get(subscriberAddr))
  } catch (err) {
    if (!err.type === 'NotFoundError') throw new Error(err)
  }
  if (!subscriberNotifications[networkID])
    subscriberNotifications[networkID] = {
      unread: false,
      notifications: []
    }

  subscriberNotifications[networkID].unread = true
  subscriberNotifications[networkID].notifications.push(notification)

  await db.put(subscriberAddr, JSON.stringify(subscriberNotifications))
}
