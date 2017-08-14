# Koop Provider Yelp

[![Greenkeeper badge](https://badges.greenkeeper.io/koopjs/koop-provider-yelp.svg)](https://greenkeeper.io/)

This is a pass-through type provider for [Koop](https://koopjs.github.io). It proxies the Yelp API up to 40 places at a time and translates the response to GeoJSON.

## API

Example Feature Server: http://adapters.koopernetes.com/yelp/FeatureServer/0

There are no extra url parameters for this provider. The Route above will handle all requests

The data will default to Washington DC, but if you move the map it will reload.
The field `term` is special, if you use it in a `where` query it will send a search to yelp.

## How to use

You can use this as a plugin to an existing Koop server or use the default server or docker implementations

### Configuration

1. Go to https://www.yelp.com/developers and get your API keys.
2. Set up your configuration
Environment style
```bash
export YELP_CONSUMER_KEY=[REDACTED]
export YELP_TOKEN_SECRET=[REDACTED]
export YELP_CONSUMER_SECRET=[REDACTED]
export YELP_TOKEN=[REDACTED]
```
Or in server/config/default.json
```json

{
  "yelp": {
    "YELP_CONSUMER_KEY": "[REDACTED]",
    "YELP_TOKEN_SECRET": "[REDACTED]",
    "YELP_CONSUMER_SECRET": "[REDACTED]",
    "YELP_TOKEN": "[REDACTED]"
  }
}
```

### Server
1. Go into /server and run `npm install`
2. Run `npm start`

### Docker
1. From the project root
1. `npm run docker-build` or `docker build -t koop-provider-yelp .`
1. `npm run docker-start` or `docker run -it -p 8080:8080 koop-provider-yelp`

### In an existing Koop Server
```js
//clean shutdown
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

// Initialize Koop
const Koop = require('koop')
const koop = new Koop()

// Install the Yelp Provider
const yelp = require('koop-yelp')
koop.register(yelp)

// Start listening for http traffic
const config = require('config')
const port = config.port || 8080
koop.server.listen(port)
console.log(`Koop Yelp listening on ${port}`)
```
