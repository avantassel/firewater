var vow 		  = require('vow')
	, _         = require('lodash')
	, async     = require('async')
	, fs		    = require('fs')
  , request   = require('request')
  , xml2js    = require('xml2js')
	, inside 		= require('point-in-polygon')
	, dotenv		= null
	, env 			= null
	, vcap 			= null;

	//setup environment vars
	fs.access(__dirname+'/../../env.json', fs.R_OK, function (err) {
		if(!err)
			dotenv = require(__dirname+'/../../env.json');

			env = (dotenv) ? dotenv : process.env;
			vcap = (dotenv && dotenv.VCAP_SERVICES) ? dotenv.VCAP_SERVICES : null;

			if(!vcap){
				try{
					vcap = (process.env.VCAP_SERVICES) ? JSON.parse(process.env.VCAP_SERVICES) : null;
				} catch(e){
					console.log('Error parsing VCAP_SERVICES',e);
				}
			}
	});

module.exports = function(Location) {

  Location.getAlerts = function(state,cb){
    if(!state)
      return cb('Missing State',null);

    request({url: 'http://alerts.weather.gov/cap/'+state.toLowerCase()+'.atom', method: 'GET'}, function(err, response, body) {
      if(body){
        var parser = new xml2js.Parser();
        parser.parseString(body, function (err, result) {
          return cb(null,result);
        });
      } else if(err){
        return cb(err,null);
      } else {
				return cb('Missing Response',null);
			}
    });
  };

	/*
	endPoint options
	/api/weather/v2/observations/current
	/api/weather/v2/forecast/daily/10day
	/api/weather/v2/forecast/hourly/24hour
	/api/weather/v2/observations/timeseries/24hour
	*/
	Location.getForecast = function(lat,lng,endPoint,cb){

			if(vcap && env
				&& vcap['weatherinsights']){

				if(!endPoint)
					endPoint = '/api/weather/v2/observations/current';

				var callURL = vcap['weatherinsights'][0]['credentials']['url'] + endPoint +
		      "?geocode=" + encodeURIComponent(lat + "," + lng) +
		      "&language=en-US" +
		      "&units=e";

				request({url: callURL, method: 'GET'}, function(err, response, body) {
					if(body){
						try{
							return cb(null,JSON.parse(body));
						} catch(e){
							return cb(e,null);
						}
					} else if(err){
		        return cb(err,null);
		      } else {
						return cb('Missing Response',null);
					}
				});
			} else {
				return cb('Missing Weather Insights credential variables',null);
			}
	};

	Location.getHistorical = function(lat,lng,radius,cb){
		if(vcap && env
			&& vcap['cloudantNoSQLDB']){

			if(!radius)
				radius=3218; //2 miles in meters

			var callURL = vcap['cloudantNoSQLDB'][0]['credentials']['url']+'/stormdata_geo/_design/geodd/_geo/geoidx?include_docs=true&lat='+lat+'&lon='+lng+'&radius='+radius;

			request({url: callURL, method: 'GET'}, function(err, response, body) {
				if(body){
					try{
						return cb(null,JSON.parse(body));
					} catch(e){
						return cb(e,null);
					}
				} else if(err){
					return cb(err,null);
				} else {
					return cb('Missing Response',null);
				}
			});
		} else {
			return cb('Missing Cloudant credential variables',null);
		}
	};

	Location.getScene = function(geometry_intersects,cb){
		if(env
			&& env.URTHECAST
			&& env.URTHECAST.api_key
			&& env.URTHECAST.api_secret){

			var callURL = 'https://api.urthecast.com/v1/archive/scenes?api_key='+env.URTHECAST.api_key
				+'&api_secret='+env.URTHECAST.api_secret
				+'&geometry_intersects='+geometry_intersects;

			request({url: callURL, method: 'GET'}, function(err, response, body) {
				if(body){
					try{
						return cb(null,JSON.parse(body));
					} catch(e){
						return cb(e,null);
					}
				} else if(err){
					return cb(err,null);
				} else {
					return cb('Missing Response',null);
				}
			});
		} else {
			return cb('Missing Urthecast credential variable',null);
		}
	};

  Location.remoteMethod(
        'getAlerts',
        {
          accepts: [
            { arg: 'state', type: 'string', requried: true }
          ],
          returns: {arg: 'response', type: 'object'},
          http: {path: '/getAlerts', verb: 'get'},
          description: "Get NOAA alerts by state"
        }
    );

	Location.remoteMethod(
        'getForecast',
        {
          accepts: [
            { arg: 'lat', type: 'string', requried: true }
						,{ arg: 'lng', type: 'string', requried: true }
						,{ arg: 'endPoint', type: 'string' }
          ],
          returns: {arg: 'response', type: 'object'},
          http: {path: '/getForecast', verb: 'get'},
          description: "Get weather insights forecast by lat,lng"
        }
    );

	Location.remoteMethod(
				'getHistorical',
				{
					accepts: [
						{ arg: 'lat', type: 'string', requried: true }
						,{ arg: 'lng', type: 'string', requried: true }
						,{ arg: 'radius', type: 'string', requried: true }
					],
					returns: {arg: 'response', type: 'object'},
					http: {path: '/getHistorical', verb: 'get'},
					description: "Get historical weather events by lat,lng"
				}
		);

		Location.remoteMethod(
	        'getScene',
	        {
	          accepts: [
	            { arg: 'geometry_intersects', type: 'string', requried: true }
	          ],
	          returns: {arg: 'response', type: 'object'},
	          http: {path: '/getScene', verb: 'get'},
	          description: "Get Urthecast scene"
	        }
	    );
};
