firewaterApp.factory('FWService', function($http, $q, $filter, $location, $geolocation, Location){

  var autocomplete = new google.maps.places.AutocompleteService();
  //TODO setup caching on all requests and geolocation

  return {

    getLocation: function(){
      var q = $q.defer();
        $geolocation.getCurrentPosition({timeout: 60000}).then(function(position){
          q.resolve(position);
        });
      return q.promise;
    },

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

    forecast: function(position,endPoint){
      var q = $q.defer();
      if(!endPoint || endPoint == '24')
        endPoint='/api/weather/v2/forecast/hourly/24hour';
      else if(endPoint == '10')
        endPoint='/api/weather/v2/forecast/daily/10day';
      Location.getForecast({'lat':position.latitude
                            ,'lng':position.longitude
                            ,'endPoint':endPoint}, function(data){
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
    calcNearestAlert: function(scope,type,lng,lat){
      if(!scope.position)
        return;
      var distance = this.distance(
        {'lat':scope.position.coords.latitude,'lng':scope.position.coords.longitude}
        ,{'lat':lat,'lng':lng}
      );
      //update scope distance
      if(scope.nearestAlert.miles == 0 || distance < scope.nearestAlert.miles){
        scope.nearestAlert.type = type;
        scope.nearestAlert.miles = distance;
        scope.nearestAlert.lat = lat;
        scope.nearestAlert.lng = lng;
      }
    },
    mapAlerts: function(alerts,scope){
      if(!alerts)
        return;

      var centered = false;
      var self = this;
      var geoAlerts = {floods:[],fires:[],winter:[],other:[]};
      //push all the coordinates in a geojson formatted array
      for(var a in alerts){
        if(!!alerts[a]['cap:polygon'] && alerts[a]['cap:polygon'][0] != ""){

          if(alerts[a]['cap:event'][0].indexOf('Flood') !== -1){
            geoAlerts.floods.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              self.calcNearestAlert(scope,'tint',parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0]));
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else if(alerts[a]['cap:event'][0].indexOf('Fire') !== -1){
            geoAlerts.fires.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              self.calcNearestAlert(scope,'fire',parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0]));
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else if(alerts[a]['cap:event'][0].indexOf('Winter') !== -1
            || alerts[a]['cap:event'][0].indexOf('Frost') !== -1
            || alerts[a]['cap:event'][0].indexOf('Freez') !== -1
            || alerts[a]['cap:event'][0].indexOf('Blizzard') !== -1){
            geoAlerts.winter.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              self.calcNearestAlert(scope,'asterisk',parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0]));
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else {
            //TODO determine what other events there are
            geoAlerts.other.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              self.calcNearestAlert(scope,'bell',parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0]));
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
         if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.floods))
          scope.inAlertArea.push({type:'floods'});
      }

      if(geoAlerts.fires.length){
        scope.geojson.fires = this.mapGeoJson(geoAlerts.fires,'Fire');
        //center the map
        if(!centered)
          scope.centerJSON("fires");
        centered=true;
        //check if user location is inside fire polygons
        if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.fires))
         scope.inAlertArea.push({type:'fires'});
      }

      if(geoAlerts.winter.length){
        scope.geojson.winter = this.mapGeoJson(geoAlerts.winter,'Winter');
        //center the map
        if(!centered)
          scope.centerJSON("winter");
        centered=true;
        //check if user location is inside winter polygons
        if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.winter))
         scope.inAlertArea.push({type:'winter'});
      }

      if(geoAlerts.other.length){
        scope.geojson.other = this.mapGeoJson(geoAlerts.other,'Other');
        //center the map
        if(!centered)
          scope.centerJSON("other");
        //check if user location is inside other polygons
        if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.other))
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
    },

    distance: function(from, to, unit) {
        if(!from || !to || !from['lat'] || !to['lat'])
          return 0;

    		lat = parseFloat(from['lat']);
    		lon1 = parseFloat(from['lng']);
    		lat2 = parseFloat(to['lat']);
    		lon2 = parseFloat(to['lng']);
        unit = unit || 'mi';//mi or km

    		lat *= (Math.PI/180);
    		lon1 *= (Math.PI/180);
    		lat2 *= (Math.PI/180);
    		lon2 *= (Math.PI/180);

    		dist = 2*Math.asin(Math.sqrt( Math.pow((Math.sin((lat-lat2)/2)),2) + Math.cos(lat)*Math.cos(lat2)*Math.pow((Math.sin((lon1-lon2)/2)),2))) * 6378.137;

    		if (unit == 'mi') {
    			dist = (dist / 1.609344);
    		}
    		return dist;
    }
  }
});
