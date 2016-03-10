const Controller = function (yelp, createBaseController) {
  const controller = createBaseController()
  // respond to the root route
  controller.index = function (req, res) {
    res.send('This is the base route of ye Yelp provider')
  }

  // use the shared code in the BaseController to create a feature service
  controller.featureServer = function (req, res) {
    // need to always respond with a count greater than the max count of 1000
    // that way the JS API will have to ask for bounding boxes
    if (req.query.returnCountOnly === 'true') return res.send({count: 1001})
    yelp.search(req.query, function (err, geojson) {
      if (err) return res.status(500).send(err)
      controller.processFeatureServer(req, res, geojson)
    })
  }

  // render templates and views
  controller.preview = function (req, res) {
    res.render(__dirname + '/../views/demo', { locals: { id: req.params.id } })
  }

  // return the controller so it can be used by koop
  return controller
}

module.exports = Controller
