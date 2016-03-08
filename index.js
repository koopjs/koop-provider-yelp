// the name of provider is used by koop to help build default routes for FeatureService and a preview
const pkg = require('./package.json')
const provider = {
  plugin_name: 'yelp',
  hosts: false,
  controller: require('./controller'),
  model: require('./models/yelp'),
  routes: require('./routes'),
  status: {
    version: pkg.version
  },
  type: 'provider'
}

module.exports = provider
