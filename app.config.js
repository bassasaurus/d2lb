const { version } = require('./package.json');

// Keep the existing app.json settings; releases update the version in one place.
module.exports = ({ config }) => ({ ...config, version });
