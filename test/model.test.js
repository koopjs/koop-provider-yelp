/* eslint-env mocha */

/*
  model.test.js
  This file is optional, but is strongly recommended. It tests the `getData` function to ensure its translating
  correctly.
*/
const nock = require("nock");
const chai = require("chai");
const expect = chai.expect;

describe("Koop provider - model", function () {
  it("should get a geojson from the getData() function", (done) => {
    const Model = require("../src/model");
    const model = new Model();
    nock("https://api.yelp.com")
      .get("/v3/businesses/search?location=St.%20Louis%2C%20MO&term=&limit=50")
      .reply(
        200,
        JSON.stringify({
          businesses: [
            {
              id: "I_3LMZ_1m2mzR0oLIOePIg",
              alias: "pappys-smokehouse-saint-louis-3",
              name: "Pappy's Smokehouse",
              image_url:
                "https://s3-media3.fl.yelpcdn.com/bphoto/_U0uWokWTgt1CydnivE7ww/o.jpg",
              is_closed: false,
              url:
                "https://www.yelp.com/biz/pappys-smokehouse-saint-louis-3?adjust_creative=3jvS6x6b2ZaYX0GC0UieIQ&utm_campaign=yelp_api_v3&utm_medium=api_v3_business_search&utm_source=3jvS6x6b2ZaYX0GC0UieIQ",
              review_count: 3816,
              categories: [
                {
                  alias: "bbq",
                  title: "Barbeque",
                },
                {
                  alias: "smokehouse",
                  title: "Smokehouse",
                },
              ],
              rating: 4.5,
              coordinates: {
                latitude: 38.635146597249,
                longitude: -90.22400327229,
              },
              transactions: ["delivery"],
              price: "$$",
              location: {
                address1: "3106 Olive St",
                address2: "",
                address3: "",
                city: "Saint Louis",
                zip_code: "63103",
                country: "US",
                state: "MO",
                display_address: ["3106 Olive St", "Saint Louis, MO 63103"],
              },
              phone: "+13145354340",
              display_phone: "(314) 535-4340",
              distance: 8826.947371232967,
            },
          ],
          total: 1,
          region: {
            center: {
              longitude: -90.32135009765625,
              latitude: 38.61239775768799,
            },
          },
        })
      );

    model.getData({ query: {} }, (err, geojson) => {
      expect(err).to.equal(null);

      expect(geojson.type).to.equal("FeatureCollection");
      expect(geojson.features).to.be.an("array");
      done();
    });
  });

  it("should handle request error", (done) => {
    const Model = require("../src/model");
    const model = new Model();

    nock("https://api.yelp.com")
      .get("/v3/businesses/search?location=St.%20Louis%2C%20MO&term=&limit=50")
      .reply(500);

    model.getData({ query: {} }, (err, geojson) => {
      expect(err).to.be.an("Error");
      expect(geojson).to.equal(undefined);
      done();
    });
  });
});
