firewaterApp.factory('FWService', function($http, $q, $filter, $location, ngXml2json){

  var autocomplete = new google.maps.places.AutocompleteService();

  return {

    alerts: function(state){
      var q = $q.defer();
      $http.get('http://alerts.weather.gov/cap/'+state.toLowerCase()+'.atom').then(function(response){
        if(response.data){
          var json_response = ngXml2json.parser(response.data);
          console.log(json_response);
        }
        // q.resolve(response);
      },function(err){
        q.reject(err);
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
