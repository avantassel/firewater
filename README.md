# FireWater

<img src="client/images/icon.png?raw=true" alt="FireWater logo" title="FireWater" align="right" />

FireWater is a perfect storm weather prediction application.

FireWater uses historical weather disaster data from NOAA and weather forecast to predict locations susceptible to flooding and wild fires.

FireWater was developed for the IBM [Sparkathon](http://sparkathon.devpost.com/)

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy)

## Config environment variables

Running locally add values to .env file.
Look at [env-sample.yml](env-sample.yml)
```
  cp env-sample.json env.json
```


## Strongloop Notes

```
  # if you add models you will need to run this
  lb-ng server/server.js client/js/services/lb-services.js
```

## Bluemix Notes

```
  cf push
  cf logs mobilize --recent
```
