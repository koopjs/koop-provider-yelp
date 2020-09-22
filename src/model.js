const yelp = require("yelp-fusion");
const proj4 = require("proj4");
const _ = require("lodash");

const {
  koopProviderYelp: { api_key },
} = require("config");

if (!api_key || api_key === "") {
  console.error(
    "Warning: No Yelp API Key. Please see the README for information on how to generate and set the API Key."
  );
}
const client = yelp.client(api_key);
const YELP_API_MAX_RADIUS = 40000;

const proj = proj4("GOOGLE", "WGS84");

function Model() {}

// each model should have a getData() function to fetch the geo data
// and format it into a geojson
Model.prototype.getData = function (req, callback) {
  const query = buildQuery(req.query);

  if (!query) {
    // invalid inputs - return 400
    const error = new Error("Bad Request");
    error.status = 400;
    callback(error);
  }

  search(query).then(
    (features) => {
      const featureCollection = {
        type: "FeatureCollection",
        metadata: {
          name: "Yelp",
          description: `Generated from the Yelp API.`,
        },
        // filtersApplied tells koop if our provider has already filtered (and thus koop does not have to filter again)
        // technically the Yelp API is returning features that are nearly filtered, but because of the nature of the
        // Yelp API there may be features outside a bounding box, so we do want to ask Koop to filter "in addition"
        // to the Yelp filter.
        filtersApplied: {
          geometry: false,
          where: true,
          offset: false,
          limit: false,
        },
        features,
      };
      callback(null, featureCollection);
    },
    (err) => {
      callback(err);
    }
  );
};

function search(query) {
  return new Promise((resolve, reject) => {
    // If this service is added to an ArcGIS Online Map, usually it makes multiple
    // calls (4 quadrants). When you make 4 calls to the Yelp API at the same
    // time, you get a Yelp error, so for now set a random pause 0.5-2 seconds.
    // TODO: Remove this random pause code, and change it so that if we get a
    // "TOO_MANY_REQUESTS_PER_SECOND" error, retry after a random pause.

    const randomPauseTime = Math.random() * (2500 - 500) + 500;

    setTimeout(() => {
      searchYelp(query).then(
        (features) => {
          resolve(features);
        },
        (err) => {
          reject(err);
        }
      );
    }, randomPauseTime);
  });
}

// Wrap the call to Yelp, this will make testing easier and decouple us from the specific client lib
function searchYelp(query) {
  return new Promise((resolve, reject) => {
    client.search(query).then(
      (rawResponse) => {
        const features = translate(rawResponse.jsonBody, query.term);
        resolve(features);
      },
      (err) => {
        reject(err);
      }
    );
  });
}

// Translate a request from the GeoServices API into something Yelp will understand
function buildQuery(options) {
  // we don't want to modify the passed in options object because Koop will use that later
  // also for some reason the Yelp lib chokes when there is a passed in callback so omit it
  const query = _.omit(_.cloneDeep(options), "callback");
  if (
    options.geometryType &&
    options.geometry &&
    options.geometryType === "esriGeometryEnvelope"
  ) {
    const bbox = getBBox(options.geometry);
    if (bbox) {
      [query.longitude, query.latitude] = getCenter(bbox);
      query.radius = getRadius(bbox);
    } else {
      // invalid geometry - return false;
      return false;
    }
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
 * Input bbox may be in full JSON or shortened version. This function
 * normalizes to give same results for both formats. Returns 0,0 if bad format.
 * @param {string | object} bbox
 */
function getBBox(bbox) {
  let xmin, ymin, xmax, ymax;

  if (typeof bbox === "string") {
    const parts = bbox.split(",");
    if (parts.length === 4) {
      [xmin, ymin, xmax, ymax] = parts.map((x) => parseFloat(x));
    } else {
      // invalid format
      console.error("Invalid format");
      return false;
    }
  } else if (bbox && bbox.xmax && bbox.xmin && bbox.ymax && bbox.ymin) {
    ({ xmin, ymin, xmax, ymax } = bbox);
  } else {
    // invalid format
    console.error("Invalid format");
    return false;
  }

  return { xmin, ymin, xmax, ymax };
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
    }

    // assume "DESC" sort, but remove it from the string:
    orderByFields = orderByFields.split(" DESC")[0];
    if (orderByFields === "best_match") {
      return "best_match";
    }
    if (orderByFields === "rating") {
      return "rating";
    }
    if (orderByFields === "review_count") {
      return "review_count";
    }
    if (orderByFields === "distance") {
      return "distance";
    }
    return false;
  }
  return false;
}

// Map across all elements from a Yelp response and translate it into a feature collection
function translate(data, term) {
  // protect ourself in case the request did not return any features
  if (data.businesses) {
    return data.businesses.map((business) => {
      return formatFeature(business, term);
    });
  }
  // else:
  return [];
}

// This function takes a single element from the yelp response and translates it to GeoJSON
function formatFeature(business, term) {
  const {
    location,
    coordinates: { latitude, longitude },
  } = business;

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    properties: {
      yelpId: business.id,
      alias: business.alias,
      name: business.name,
      image_url: business.image_url,
      is_closed: business.is_closed,
      url: business.url,
      review_count: business.review_count,
      categories_title: business.categories.map((x) => x.title).join(", "),
      categories_alias: business.categories.map((x) => x.alias).join(", "),
      rating: business.rating,
      transactions: business.transactions,
      phone: business.phone,
      display_phone: business.display_phone,
      distance: business.distance,

      address1: location.address1,
      address2: location.address2,
      address3: location.address3,
      city: location.city,
      zip_code: location.zip_code,
      country: location.country,
      state: location.state,
      display_address: location.display_address.join(", "),

      term: term ? term : "", // We put a dummy term in here so ArcGIS knows this is a string field. It will allow us to filter
    },
  };
}

module.exports = Model;
