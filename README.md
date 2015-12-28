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

# import storm data
python csv-import.py -f ~/Downloads/stormdata_2011.csv -d stormdata -u 5a96fba5-a18f-4c28-b935-06dc8f5832cf-bluemix -a
```

## Strongloop Notes

```
  # if you add models you will need to run this
  lb-ng server/server.js client/js/lb-services.js
```

## Bluemix Notes

```
  cf push
  cf logs firewater --recent
```
