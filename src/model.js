const yelp = require("yelp-fusion");
const proj4 = require("proj4");
const _ = require("lodash");
const async = require("async");

const {
  koopProviderYelp: { api_key },
} = require("config");
const client = yelp.client(api_key);
const YELP_API_MAX_RADIUS = 40000;

const proj = proj4("GOOGLE", "WGS84");

function Model() {}

// each model should have a getData() function to fetch the geo data
// and format it into a geojson
Model.prototype.getData = function (req, callback) {
  if (req.query && req.query.returnCountOnly) {
    return callback(null, {
      type: "FeatureCollection",
      count: 2001,
      features: [],
    });
  }
  const queries = buildQueries(req.query);
  const featureCollection = {
    type: "FeatureCollection",
    features: [],
  };

  async.each(queries, search, finish);

  function search(query, cb) {
    // If this service is added to an ArcGIS Online Map, usually it makes multiple
    // calls (4 quadrants). When you make 4 calls to the Yelp API at the same
    // time, you get a Yelp error, so for now set a random pause 0.5-2 seconds.
    // TODO: Remove this random pause code, and change it so that if we get a
    // "TOO_MANY_REQUESTS_PER_SECOND" error, retry after a random pause.

    const randomPauseTime = Math.random() * (2500 - 500) + 500;

    setTimeout(() => {
      searchYelp(query, function (err, features) {
        if (err) return cb(err);
        featureCollection.features = featureCollection.features.concat(
          features
        );
        cb();
      });
    }, randomPauseTime);
  }

  function finish(err) {
    // Service metadata
    featureCollection.metadata = {
      name: "Yelp",
      description: `Generated from the Yelp API.`,
    };

    if (err) {
      callback(err);
    } else {
      callback(null, featureCollection);
    }
  }
};

// Wrap the call to Yelp, this will make testing easier and decouple us from the specific client lib
function searchYelp(query, callback) {
  client.search(query).then(
    function (rawResponse) {
      // console.log("rawResponse", rawResponse);
      const features = translate(rawResponse.jsonBody, query);
      console.log("Search returned", features.length, "results");
      callback(null, features);
    },
    function (err) {
      // console.log("err", err);
      callback(err);
    }
  );
}

function buildQueries(options) {
  let queries;
  if (options.geometry) {
    queries = [buildQuery(options, options.geometry)];
  } else {
    queries = [buildQuery(options)];
  }
  return queries;
}

// Translate a request from the GeoServices API into something Yelp will understand
function buildQuery(options, geometry) {
  // we don't want to modify the passed in options object because Koop will use that later
  // also for some reason the Yelp lib chokes when there is a passed in callback so omit it
  const query = _.omit(_.cloneDeep(options), "callback");
  if (geometry || options.geometry) {
    const bbox = geometry || options.geometry;
    [query.longitude, query.latitude] = getCenter(bbox);
    query.radius = getRadius(bbox);
  } else if (!options.location) {
    query.location = "St. Louis, MO";
  }
  query.term = setTerm(options);
  const sort = setSort(options);
  if (sort) {
    query.sort_by = sort;
  }

  query.limit = 50;
  return query;
}

/**
 * Given a bounding box (assuming web mercator right now), finds the center
 * and returns [longitude, latitude]
 *
 * @param {object} bbox
 */
function getCenter(bbox) {
  const x = (bbox.xmax + bbox.xmin) / 2;
  const y = (bbox.ymax + bbox.ymin) / 2;

  return proj.forward([x, y]);
}

/**
 * Returns distance in meters from center to outside corner of bounding box.
 *
 * @param {object} bbox
 */
function getRadius(bbox) {
  const halfX = Math.abs(bbox.xmax - bbox.xmin);
  const halfY = Math.abs(bbox.ymax - bbox.ymin);

  const radius = Math.sqrt(Math.pow(halfX, 2) + Math.pow(halfY, 2));
  let roundedRadius = Math.round(radius);
  if (roundedRadius > YELP_API_MAX_RADIUS) {
    console.log(
      "Warning: Radius was larger than the allowed maximum from Yelp API."
    );
    roundedRadius = YELP_API_MAX_RADIUS;
  }
  return roundedRadius;
}

// This function parses the search term from a geoservices where clause
// 'where term = 'restaurants' => restaurants
function setTerm(options) {
  if (!options.where) return null;
  const match = options.where.match(/.+\s*=\s*'(.+)'/);
  return match ? match[1] : null;
}

// This function handles the sort part of yelps query. Depending on the type of search we are doing
// we may want to sort by distance, rating or best match
function setSort(options) {
  if (options.orderByFields) {
    // there may be multiple sorts - we only assume the first one since yelp can only do one at a time.
    let orderByFields = options.orderByFields.split(",")[0];

    if (orderByFields.indexOf(" ASC") > -1) {
      // Yelp API does not allow sorting by ascending order ("ASC").
      // If "ASC" order is passed, do nothing.
      return false;
    } else {
      // assume "DESC" sort, but remove it from the string:
      orderByFields = orderByFields.split(" DESC")[0];
      if (orderByFields === "best_match") {
        return "best_match";
      } else if (orderByFields === "rating") {
        return "rating";
      } else if (orderByFields === "review_count") {
        return "review_count";
      } else if (orderByFields === "distance") {
        return "distance";
      } else {
        // order by some other column, do nothing.
        return false;
      }
    }
  } else {
    return false;
  }
}

// Map across all elements from a Yelp response and translate it into a feature collection
function translate(data, query) {
  // protect ourself in case the request did not return any features
  if (data.businesses) {
    return data.businesses.map((business) => {
      return formatFeature(business, query);
    });
  } else {
    console.error("NO FEATURES");
  }
}

// This function takes a single element from the yelp response and translates it to GeoJSON
function formatFeature(biz, query) {
  const loc = biz.location;
  const coordinates = biz.coordinates;
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [coordinates.longitude, coordinates.latitude],
    },
    properties: {
      yelpId: biz.id,
      alias: biz.alias,
      name: biz.name,
      image_url: biz.image_url,
      is_closed: biz.is_closed,
      url: biz.url,
      review_count: biz.review_count,
      categories_title: biz.categories.map((x) => x.title).join(", "),
      categories_alias: biz.categories.map((x) => x.alias).join(", "),
      rating: biz.rating,
      transactions: biz.transactions,
      phone: biz.phone,
      display_phone: biz.display_phone,
      distance: biz.distance,

      address1: loc.address1,
      address2: loc.address2,
      address3: loc.address3,
      city: loc.city,
      zip_code: loc.zip_code,
      country: loc.country,
      state: loc.state,
      display_address: loc.display_address.join(", "),

      term: query.term ? query.term : "", // We put a dummy term in here so ArcGIS knows this is a string field. It will allow us to filter
    },
  };
}

module.exports = Model;
