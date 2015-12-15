var vow 		  = require('vow')
	, _         = require('lodash')
	, async     = require('async')
	, fs		    = require('fs')
  , request   = require('request')
  , xml2js    = require('xml2js');

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
      } else {
        return cb('Missing Response',null);
      }
    });

  };

  Location.remoteMethod(
        'getAlerts',
        {
          accepts: [
            { arg: 'state', type: 'string', requried: true }
          ],
          returns: {arg: 'response', type: 'object'},
          http: {path: '/getAlerts', verb: 'get'},
          description: "Get NOAA Alerts by state"
        }
    );
};
