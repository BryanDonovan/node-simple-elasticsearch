// Separating the http client from the main client so we can swap it out easily in the future.
// The request library pulls in a lot of dependencies that aren't needed for Elasticsearch.

module.exports = require('request');
