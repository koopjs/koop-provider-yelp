// used to send http requests
var request = require('request');
// used to manage control flow
var async = require('async');
// used to create hashes that fingerprint a given request
var hash = require('object-hash');
var _ = require('underscore');
var yelp_client = require('yelp');
var proj4 = require('proj4');
var config = require('config');
var Yelp = function(koop) {

  var yelp = {};
  yelp.__proto__ = koop.BaseModel(koop);
  var type = 'yelp';
  //aconsole.log(config.get("Yelp"));
  var client = yelp_client.createClient({
      consumer_key: koop.config.get('yelp.consumer_key'),
      consumer_secret: koop.config.get('yelp.consumer_secret'),
      token: koop.config.get('yelp.token'),
      token_secret: koop.config.get('yelp.token_secret')
  });

  yelp.find = function(params, options, cb) {
    // delete these two keys or else we get inconsistent hash keys depending on the request
    params.layer = 0;
    if (options.geometry){
      params.geometry = options.geometry;
    }
    var key = hash.MD5(_.omit(params,'method'));
    // check the cache for data with this type & id 
    // if no prior requests exist then trigger this waterfall
    koop.Cache.get(type, key, options, function(err, entry) {
      if (err) {
        async.waterfall([
          function(callback) {
            query = build_options(params, options);
            callback(null, query);
          },
          function(options, callback) {
            get_api(options, function(err, data) {
              callback(null, data);
            });
          },
          function(data, callback) {
            callback(null, translate(data));
          }
        ], function(err, geojson) {
          cache_insert(key, geojson, cb);
        });
      } else {
        cb(null, entry);
      }
    });
  };

  var cache_insert = function(key, geojson, callback) {
    // take translated geojson and huck it into Koop
    if (geojson.features.length > 0){
      koop.Cache.insert(type, key, geojson, 0, function(err, success) {
        if (success) {
          callback(null, geojson);
        }
      });
    } else {
      callback(null, null);
    }
  };

  var get_api = function(options, callback) {
    // simple wrapper around requests to the desired API
    client.search(options, function(err, data) {
      callback(err, data);
    });
  };

  var build_options = function(params, options) {
    // create a a default set of parameters for the API call
    // fill in passed in parameters where available
    var query = _.clone(params);
    if(options.geometry){
      delete query.location;
      var bbox = JSON.parse(options.geometry);
      console.log(bbox);
      console.log(typeof bbox);
      proj = proj4('GOOGLE','WGS84');
      query.bounds = proj.forward([bbox.xmin,bbox.ymin]).reverse().toString() + '|' +
                     proj.forward([bbox.xmax,bbox.ymax]).reverse().toString();
    } else if(!query.location){
      query.location = 'Washington, DC';
    }
    if(!query.sort){options.sort=1;}
    console.log(query.bounds);
    return query;
  };

  var translate = function(data) {
    // translate the Yelp API response into geojson
    // create the shell that will hold all the properties
    var geojson = {
      type: 'FeatureCollection',
      features: []
    };
    data.businesses.forEach(function(biz) {
    // loop through each business returned from the API call and push it into the geojson shell
      loc = biz.location;
      geojson.features.push({
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
      });
    });
    return geojson;
  };

  yelp.drop = function(key, options, callback) {
  // drops the item from the cache
    var dir = ['Yelp', key, 0].join(':');
    koop.Cache.remove('yelp', key, options, function(err, res) {
      koop.files.removeDir('files/' + dir, function(err, res) {
        koop.files.removeDir('tiles/' + dir, function(err, res) {
          koop.files.removeDir('thumbs/' + dir, function(err, res) {
            callback(err, true);
          });
        });
      });
    });
  };

  return yelp;

};

module.exports = Yelp;