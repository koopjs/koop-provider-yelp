const routes = {
  'get /yelp': 'index',
	'get /yelp/FeatureServer': 'featureServer',
  'get /yelp/FeatureServer/0': 'featureServer',
  'get /yelp/FeatureServer/0/:method': 'featureServer',
  'post /yelp/FeatureServer/0/:method': 'featureServer'
}

module.exports = routes
