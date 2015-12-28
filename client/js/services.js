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

    geocode: function(position){
      var q = $q.defer();

      var response = {formatted_address:'', state:'', geometry:{}};

      var args = {sensor:false,latlng:position.latitude+','+position.longitude};
      $http.get('http://maps.googleapis.com/maps/api/geocode/json',{params:args}).then(function(response){
        if(response.data){
          var addr = response.data.results[0].address_components;
          //set response fields needed
          response.formatted_address = response.data.results[0].formatted_address;
          response.geometry = response.data.results[0].geometry;
          //parse address_components to get state
          for(a in addr){
            if(addr[a].types.indexOf("administrative_area_level_1")!==-1){
              response.state = addr[a].short_name;
            }
            //unset state if not US
            if(addr[a].types.indexOf("country")!==-1 && addr[a].short_name != "US"){
              response.state = '';
              break;
            }
          }
        }
        q.resolve(response);
      },function(err){
        q.reject(err);
      });
      return q.promise;
    },

    center: function(){
      return {lat: 39.9950, lng: -105.1006, zoom: 4};
    },

    mapOptions: function(scope){
      return {
          center: this.center(),
          geojson: scope.geojson,
          defaults: {
              maxZoom: 16,
              minZoom: 3,
              doubleClickZoom: true,
              scrollWheelZoom: false,
              tileLayerOptions: {
                opacity: 0.9,
                detectRetina: true,
                reuseTiles: true,
              },
            },
            path: {
                weight: 10,
                opacity: 1,
                color: '#0000ff'
            },
            layers:{
              baselayers: {
                arc: {
                    name: 'ArcGIS',
                    type: 'xyz',
                    url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                    layerOptions: {
                        subdomains: ['a', 'b', 'c'],
                        continuousWorld: true,
                        showOnSelector: false
                    }
                }
              }              
            }
        };
    }
  }
});
