const Ajv = require('ajv')

const ajv = Ajv({ allErrors: true, removeAdditional: 'all' })
const subscriptionSchema = require('./subscription.json')
const emailSettingsSchema = require('./email-settings.json')

ajv.addSchema(subscriptionSchema, 'subscription')
ajv.addSchema(emailSettingsSchema, 'email-settings')

/**
 * Format error responses
 * @param  {object} schemaErrors - array of json-schema errors, describing each validation failure
 * @returns {string} formatted api response
 */
function errorResponse(schemaErrors) {
  const errors = schemaErrors.map(error => ({
    path: error.dataPath,
    message: error.message
  }))
  return {
    status: 'failed',
    errors: errors
  }
}

/**
 * Validates incoming request bodies against the given schema,
 * providing an error response when validation fails
 * @param  {string} schemaName - name of the schema to validate
 * @returns {object} response
 */
function validateSchema(schemaName) {
  return (req, res, next) => {
    if (!ajv.validate(schemaName, req.body))
      return res.send(errorResponse(ajv.errors))

    next()
  }
}

module.exports = validateSchema
