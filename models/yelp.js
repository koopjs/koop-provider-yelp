// used to send http requests
// used to manage control flow
// used to create hashes that fingerprint a given request
const YelpClient = require('yelp')
const proj4 = require('proj4')
const proj = proj4('GOOGLE', 'WGS84')
const config = require('config')
const _ = require('lodash')
const Yelp = function (koop) {
  var yelp = {}
  const client = new YelpClient(config.yelp)
  yelp.search = function (query, callback) {
    getFromYelp(query, function (err, rawResponse) {
      if (err) return callback(err)
      const featureCollection = translate(rawResponse)
      callback(null, featureCollection)
    })
  }

  function getFromYelp (options, callback) {
    // simple wrapper around requests to the desired API
    const query = buildQuery(options)
    console.log(query)
    client.search(query, function (err, data) {
      console.log(data)
      callback(err, data)
    })
  }

  function buildQuery (options) {
    // create a a default set of parameters for the API call
    // fill in passed in parameters where available
    const query = _.cloneDeep(options)
    if (options.geometry) {
      const bbox = JSON.parse(options.geometry)
      query.bounds = proj.forward([bbox.xmin, bbox.ymin]).reverse().toString() + '|' + proj.forward([bbox.xmax, bbox.ymax]).reverse().toString()
    } else if (!options.location) {
      query.location = 'Washington, DC'
    }
    if (!query.sort) options.sort = 1
    return query
  }

  function translate (data) {
    if (!data.businesses) return []
    const features = data.businesses.map(formatFeature)
    return {
      type: 'FeatureCollection',
      features: features
    }
  }

  function formatFeature (biz) {
    const loc = biz.location
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [loc.coordinate.longitude, loc.coordinate.latitude]
      },
      properties: {
        name: biz.name,
        phone: biz.display_phone,
        rating: biz.rating,
        review_count: biz.review_count,
        snippet_text: biz.snippet_text,
        snippet_image_url: biz.snippet_url,
        image: biz.image_url,
        display_address: loc.display_address.join(', '),
        city: loc.city,
        state: loc.state_code,
        zip: loc.postal_code,
        yelp_page: biz.url,
        rating_img: biz.rating_img_url_small,
        yelp_id: biz.id,
        is_closed: biz.is_closed
      }
    }
  }
  return yelp
}

module.exports = Yelp
