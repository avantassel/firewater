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
      Location.getForecast({lat:position.latitude,lng:position.longitude,endPoint:'/api/weather/v2/forecast/hourly/24hour'}, function(data){
        if(data.response){
          q.resolve(data.response);
        }
      });
      return q.promise;
    },

    address: function(address){
      var q = $q.defer();
      autocomplete.getPlacePredictions({input: address}, function(response){
        q.resolve(response);
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
          for(var a in addr){
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

    mapCenter: function(){
      return {lat: 39.9950, lng: -105.1006, zoom: 4};
    },

    mapIcons: function(){
      return { type: 'div'
              ,iconSize: [230, 0]
              ,popupAnchor:  [0, 0]
              ,html: '<div class="pin"></div><div class="pulse"></div>'
              };
    },

    mapOptions: function(scope){
      return {
          center: this.mapCenter(),
          icons: this.mapIcons(),
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
                    name: 'OpenStreetMap',
                    type: 'xyz',
                    url: 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
                    layerOptions: {
                        subdomains: ['a', 'b', 'c'],
                        continuousWorld: true,
                        showOnSelector: false
                    }
                }
              }
            }
        };
    },
    mapFillColor: function(name){
      switch(name){
        case 'Flood':
          return "#c6d8ef";
        case 'Fire':
          return "#ffa556";
        case 'Winter':
          return "#777777";
        case 'Other':
          return "#222222";
      }
    },
    mapBorderColor: function(name){
      switch(name){
        case 'Flood':
          return "#62a0ca";
        case 'Fire':
          return "#b64c28";
        case 'Winter':
          return "#999999";
        case 'Other':
          return "#CCCCCC";
      }
    },
    mapGeoJson: function(coordinates, name){
      return {
        style: {
             fillColor: this.mapFillColor(name),
             weight: 1,
             opacity: 1,
             color: this.mapBorderColor(name),
             dashArray: '3',
             fillOpacity: 0.7
        },
        resetStyleOnMouseout: true,
        onEachFeature: function (feature, layer) {
            layer.bindPopup(feature.properties.name);
        },
        data: {
          type: "FeatureCollection"
          ,features: [{
              type: "Feature",
              id: name,
              properties: { name: name+" Alert" },
              geometry: {
                type: "MultiPolygon",
                coordinates: [ coordinates ]
              }
          }]
        }
      };
    },
    mapAlerts: function(alerts,scope){
      if(!alerts)
        return;

      var centered = false;
      var geoAlerts = {floods:[],fires:[],winter:[],other:[]};
      //push all the coordinates in a geojson formatted array
      for(var a in alerts){
        if(!!alerts[a]['cap:polygon'] && alerts[a]['cap:polygon'][0] != ""){

          if(alerts[a]['cap:event'][0].indexOf('Flood') !== -1){
            geoAlerts.floods.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else if(alerts[a]['cap:event'][0].indexOf('Fire') !== -1){
            geoAlerts.fires.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else if(alerts[a]['cap:event'][0].indexOf('Winter') !== -1){
            geoAlerts.winter.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else {
            //TODO determine what other events there are
            geoAlerts.other.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          }
        }
      }
      scope.geoAlerts = geoAlerts;

      if(geoAlerts.floods.length){
         scope.geojson.floods = this.mapGeoJson(geoAlerts.floods,'Flood');
         //center the map
         scope.centerJSON("floods");
         centered=true;
         //check if user location is inside flood polygons
         if(scope.position && this.pip([scope.position.longitude,scope.position.latitude],geoAlerts.floods))
          scope.inAlertArea.push({type:'floods'});
      }

      if(geoAlerts.fires.length){
        scope.geojson.fires = this.mapGeoJson(geoAlerts.fires,'Fire');
        //center the map
        if(!centered)
          scope.centerJSON("fires");
        centered=true;
        //check if user location is inside fire polygons
        if(scope.position && this.pip([scope.position.longitude,scope.position.latitude],geoAlerts.fires))
         scope.inAlertArea.push({type:'fires'});
      }

      if(geoAlerts.winter.length){
        scope.geojson.winter = this.mapGeoJson(geoAlerts.winter,'Winter');
        //center the map
        if(!centered)
          scope.centerJSON("winter");
        centered=true;
        //check if user location is inside winter polygons
        if(scope.position && this.pip([scope.position.longitude,scope.position.latitude],geoAlerts.winter))
         scope.inAlertArea.push({type:'winter'});
      }

      if(geoAlerts.other.length){
        scope.geojson.other = this.mapGeoJson(geoAlerts.other,'Other');
        //center the map
        if(!centered)
          scope.centerJSON("other");
        //check if user location is inside other polygons
        if(scope.position && this.pip([scope.position.longitude,scope.position.latitude],geoAlerts.other))
         scope.inAlertArea.push({type:'other'});
      }
    },

    //https://github.com/substack/point-in-polygon
    pip: function(point,polygon){
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

      var x = point[0], y = point[1];

      var inside = false;
      for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          var xi = polygon[i][0], yi = polygon[i][1];
          var xj = polygon[j][0], yj = polygon[j][1];

          var intersect = ((yi > y) != (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
      }

      return inside;
    }
  }
});
