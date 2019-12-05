const Ajv = require('ajv')
const ajv = Ajv({ allErrors: true, removeAdditional: 'all' })
const subscriptionSchema = require('./subscription.json')

ajv.addSchema(subscriptionSchema, 'subscription')

/**
 * Format error responses
 * @param  {Object} schemaErrors - array of json-schema errors, describing each validation failure
 * @return {String} formatted api response
 */
function errorResponse(schemaErrors) {
  let errors = schemaErrors.map(error => {
    return {
      path: error.dataPath,
      message: error.message
    }
  })
  return {
    status: 'failed',
    errors: errors
  }
}

/**
 * Validates incoming request bodies against the given schema,
 * providing an error response when validation fails
 * @param  {String} schemaName - name of the schema to validate
 * @return {Object} response
 */
function validateSchema(schemaName) {
  return (req, res, next) => {
    if (!ajv.validate(schemaName, req.body)) {
      return res.send(errorResponse(ajv.errors))
    }

    next()
  }
}

module.exports = validateSchema
