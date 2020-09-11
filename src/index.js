/*
  index.js
  This file is required. Its role is to specify configuration settings.
  Documentation: https://koopjs.github.io/docs/usage/provider
*/

const packageInfo = require("../package.json");

// Define the provider path
// /:name/:hosts?/:id?/FeatureServer/:layer/:method
// e.g. /sample/FeatureServer/0/query
const provider = {
  type: "provider",
  name: "koop-provider-yelp",
  version: packageInfo.version,
  hosts: false, // if true, also adds disableIdParam
  disableIdParam: false, // if true, adds to path and req.params
  Model: require("./model"),
};

module.exports = provider;
