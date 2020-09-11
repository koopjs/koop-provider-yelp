# Koop Provider Yelp

This is a Yelp provider for [Koop](https://koopjs.github.io).

## Configure

Koop plugins use the [node-config module](https://www.npmjs.com/package/config) for setting configuration settings. See the node-config documentation for usage details. The Koop Yelp provider currently has the following configuration settings:

```json
{
  "koopProviderYelp": {
    "api_key": "your_api_key"
  }
}
```

Get your API Key from the [Yelp API Management Console](https://www.yelp.com/developers/v3/manage_app).

## Options

- `term` - the search term that goes to the Yelp API. Set this in the `where` parameter (ex: `where: term = 'Hamburgers'`)
- `orderByFields` is passed to the `sort_by` property of the Yelp API. [See the documentation](https://www.yelp.com/developers/documentation/v3/business_search) for more info on how the sort_by attribute is handled by the Yelp API.

## Dev Server

For development, this project uses the [Koop CLI](https://github.com/koopjs/koop-cli) to set up a dev server. It can be started via the terminal:

```bash
npm start
```

The server will be running at `http://localhost:8080` or at the port specified at the configuration.

Check your instance with this test endpoint:
[http://localhost:8080/koop-provider-yelp/rest/services/0/FeatureServer/0/query](http://localhost:8080/koop-provider-yelp/rest/services/0/FeatureServer/0/query) (and [add it to a map](http://www.arcgis.com/home/webmap/viewer.html?url=http://localhost:8080/koop-provider-yelp/rest/services/0/FeatureServer/0))

## Limitations

This provider uses the "Yelp Fusion" (v3) API. See [that documentation](https://www.yelp.com/developers/documentation/v3/get_started) for full limitations. Specifically, note that:

- Yelp API Keys have [daily](https://www.yelp.com/developers/documentation/v3/rate_limiting) and [per-minute](https://www.yelp.com/developers/documentation/v3/qps_rate_limiting) request limits
- Search results are limited to 50 results. This provider does not currently do paging to get all results.
- Not all Feature Service options are available through the API. For example, bounding box searches are approximated to point and radius in the Yelp API. This, combined with the above limitations, may provide unexpected display when searching for lots of points across a large area in a map. For best results, use the `term` attribute to search on a specific term and limit searches to a small area.
