firewaterApp.factory('FWService', function($http, $q, $filter, $location, Location){

  var autocomplete = new google.maps.places.AutocompleteService();

  return {

    alerts: function(state){
      var q = $q.defer();
      if(!state)
        state='us';//get all alerts
      Location.getAlerts({state:state}, function(data){
        if(data.response){
          q.resolve(data.response.feed.entry);
        }
      });
      return q.promise;
    },

    forecast: function(position){
      var q = $q.defer();
      Location.getForecast({lat:position.latitude,lng:position.longitude}, function(data){
        if(data.response){
          q.resolve(data.response);
        }
      });
      return q.promise;
    },

    city: function(city){
      var q = $q.defer();
      autocomplete.getPlacePredictions({types:['(cities)'],input: city}, function(cities){
        q.resolve(cities);
      });
      return q.promise;
    },

    state: function(position){
      var q = $q.defer();
      var state = '';
      var args = {sensor:false,latlng:position.latitude+','+position.longitude};
      $http.get('http://maps.googleapis.com/maps/api/geocode/json',{params:args}).then(function(response){
        if(response.data){
          var addr = response.data.results[0].address_components;
          for(a in addr){
            if(addr[a].types.indexOf("administrative_area_level_1")!==-1){
              state = addr[a].short_name;
            }
            //unset state if
            if(addr[a].types.indexOf("country")!==-1 && addr[a].short_name != "US"){
              state = '';
              break;
            }
          }
        }
        q.resolve(state);
      },function(err){
        q.reject(err);
      });
      return q.promise;
    }
  }
});
