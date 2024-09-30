const moment = require('moment');

// Generate the current timestamp in the desired format
const currentTimestamp = moment().utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');

// Set the generated timestamp as an environment variable
console.log(currentTimestamp)
