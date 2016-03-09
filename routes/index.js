const routes = {
  'get /yelp': 'index',
  'get /yelp/FeatureServer': 'featureServer',
  'get /yelp/FeatureServer/:layer': 'featureServer',
  'get /yelp/FeatureServer/:layer/:method': 'featureServer',
  'post /yelp/FeatureServer/:layer/:method': 'featureServer'
}

module.exports = routes
