const Controller = function (yelp, createBaseController) {
  const controller = createBaseController()
  // respond to the root route
  controller.index = function (req, res) {
    res.send('Hello Yelp')
  }

  // use the shared code in the BaseController to create a feature service
  controller.featureServer = function (req, res) {
    // need to always respond with a count greater than the max count of 1000
    // that way the JS API will have to ask for bounding boxes
    if (req.query.returnCountOnly === 'true') return res.send({count: 1001})
		// Fetch data from Yelp's API and translate it into geojson
    yelp.search(req.query, function (err, geojson) {
      if (err) return res.status(500).send(err)
      // we want to handle filtered and ordering on our own, so we tell Koop to skip these steps
      req.query.skipFilter = true
      req.query.skipOrder = true
      // hand things off to Koop's Feature Server controller
      controller.processFeatureServer(req, res, geojson)
    })
  }

  // return the controller so it can be used by koop
  return controller
}

module.exports = Controller
