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

Import storm data and ugc areas to cloudant

[http://www1.ncdc.noaa.gov/pub/data/swdi/stormevents/csvfiles/legacy](http://www1.ncdc.noaa.gov/pub/data/swdi/stormevents/csvfiles/legacy)

[https://github.com/claudiusli/csv-import](https://github.com/claudiusli/csv-import)

```
pip install requests

# import UGC areas
python csv-import.py -f ~/Downloads/ugc_areas.csv -d stormdata_ugc_areas -u 5a96fba5-a18f-4c28-b935-06dc8f5832cf-bluemix -a

# import storm data stormdata_1996.csv - stormdata_2013.csv
python csv-import.py -f ~/Downloads/stormdata_2013.csv -d stormdata -u 5a96fba5-a18f-4c28-b935-06dc8f5832cf-bluemix -a
```

Create a geo index to query by lat/lng
```json
{
  "_id": "_design/geodd",
  "views": {},
  "language": "javascript",
  "st_indexes": {
    "geoidx": {
      "index": "function(doc) {if (doc.BEGIN_LON && doc.BEGIN_LAT) {st_index({\"geometry\":{\"type\":\"Point\",\"coordinates\":[doc.BEGIN_LON,doc.BEGIN_LAT]}});}}"
    }
  }
}
```

## Strongloop Notes

```
  # if you add models you will need to run this
  lb-ng server/server.js client/js/lb-services.js
```

## Bluemix Notes

```
  cf push firewater
  cf logs firewater --recent
```
