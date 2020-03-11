const uuidv4 = require('../utils/uuid')
const { EMAIL_SETTINGS } = require('./db-keys')
const sgMail = require('@sendgrid/mail')

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  sgMail.setSubstitutionWrappers('{{', '}}')
}

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
  if (!subscriberNotifications) subscriberNotifications = { notifications: [] }

  subscriberNotifications.notifications.push(notification)

  await db.put(subscriberAddr, JSON.stringify(subscriberNotifications))

  // Send email if SendGrid key was provided and user has settings set.
  let emailSettings = {}
  try {
    emailSettings = JSON.parse(await db.get(EMAIL_SETTINGS))
  } catch (err) {
    if (!err.type === 'NotFoundError') throw new Error(err)
  }

  if (emailSettings[subscriberAddr]) {
    const { email, nickname } = emailSettings[subscriberAddr]
    const { tcrAddr, itemID, subject, message } = notification
    sgMail.send({
      to: email,
      from: {
        email: process.env.FROM_ADDRESS,
        name: process.env.FROM_NAME
      },
      templateId: process.env.TEMPLATE_ID,
      dynamic_template_data: {
        nickname,
        tcrAddr,
        itemID,
        subject,
        message: message.replace('{{nickname}}', nickname),
        uiPath: process.env.UI_PATH
      }
    })
  }
}
