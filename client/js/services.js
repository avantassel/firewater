firewaterApp.factory('FWService', function($http, $q, $filter, $location, $geolocation, Location){

  var autocomplete = new google.maps.places.AutocompleteService();
  //TODO setup caching on all requests and geolocation

  return {

    alertDistance: 2, //2 miles

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

    historical: function(position,radius){
      var q = $q.defer();
      if(!radius)
        radius=16093;//10 miles
      Location.getHistorical({'lat':position.latitude
                            ,'lng':position.longitude
                            ,'radius':radius}, function(data){
        if(data.response){
          q.resolve(data.response);
        }
      });
      return q.promise;
    },

    urthecast: function(position){
      var q = $q.defer();
      Location.getScene({'geometry_intersects':'POINT('+position.longitude+'+'+position.latitude+')'}, function(data){
        if(data.response){
          q.resolve(data.response);
        }
      });
      return q.promise;
    },

    tweets: function(query,position){
      var q = $q.defer();
      Location.getTweets({'q':query
                        ,'lat':position.latitude
                        ,'lng':position.longitude
                        ,'radius':'10mi'}, function(data){
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

    geocodeAddress: function(address){
      var q = $q.defer();

      var response = {formatted_address:'', state:'', geometry:{}};

      var args = {sensor:false,address:address};
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

    chartOptions: function(type){

      if(type=='risk'){
        return {
                chart: {
                  type: 'multiBarChart',
                  height: 200,
                  margin : {
                      top: 20,
                      right: 20,
                      bottom: 45,
                      left: 45
                  },
                  clipEdge: true,
                  duration: 500,
                  stacked: true,
                  xAxis: {
                      axisLabel: 'Time (ms)',
                      showMaxMin: false,
                      tickFormat: function(d){
                          return d3.format(',f')(d);
                      }
                  },
                  yAxis: {
                      axisLabel: 'Y Axis',
                      axisLabelDistance: -20,
                      tickFormat: function(d){
                          return d3.format(',.1f')(d);
                      }
                  }
              }
            };
      }
      else if(type=='prediction'){
        return {
              chart: {
                  type: 'pieChart',
                  height: 286,
                  donut: true,
                  x: function(d){return d.key;},
                  y: function(d){return d.y;},
                  showLabels: true,
                  showLegend: false,
                  duration: 500,
                  noData: 'Predicting risk',
                  pie: {
                      startAngle: function(d) { return d.startAngle/2 -Math.PI/2 },
                      endAngle: function(d) { return d.endAngle/2 -Math.PI/2 }
                  },
                  color: function(d,l){
                    if(d.key.indexOf('Positive') !== -1)
                      return '#31A354';
                    else if(d.key.indexOf('Neutral') !== -1)
                      return '#3182BD';
                    else if(d.key.indexOf('Negative') !== -1)
                      return '#E6550D';
                    else
                      return '#C6DBEF';
                  }
              }
          };
      }
      else if(type=='forecast'){

        return {
                title: {
                    enable: true,
                    text: '24 Hour Forecast'
                },
                chart: {
                    type: 'stackedAreaChart',
                    height: 450,
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 30,
                        left: 40
                    },
                    x: function(d){return d[0];},
                    y: function(d){return d[1];},
                    useVoronoi: false,
                    clipEdge: true,
                    duration: 200,
                    noData: 'The foreast is not available',
                    useInteractiveGuideline: true,
                    interactiveLayer: {
                      tooltip: {
                        headerFormatter: function (d) {
                          return d;
                        }
                      }
                    },
                    xAxis: {
                        showMaxMin: false,
                        tickFormat: function(d) {
                            return d3.time.format('%I:%M%p')(new Date(d))
                        }
                    },
                    yAxis: {
                        tickFormat: function(d){
                            return d3.format(',.2f')(d);
                        }
                    },
                    zoom: {
                        enabled: true,
                        scaleExtent: [1, 10],
                        useFixedDomain: false,
                        useNiceScale: false,
                        horizontalOff: false,
                        verticalOff: true,
                        unzoomEventType: 'dblclick.zoom'
                    }
                }
            };
        }
    },

    mapCenter: function(){
      return {lat: 39.9950, lng: -105.1006, zoom: 4};
    },

    mapIcons: function(type){
      var icons = [];

      icons['locations'] = { type: 'div'
                        ,iconSize: [230, 0]
                        ,popupAnchor:  [0, 0]
                        ,html: '<div class="pin"></div><div class="pulse"></div>'
                        };

      icons['historical'] = { type: 'div'
                        ,iconSize: [230, 0]
                        ,popupAnchor:  [0, 0]
                        ,html: '<div class="pin-historical"></div>'
                        };

      if(type)
        return icons[type];

      return icons;
    },

    mapOptions: function(scope){

      return {
          center: this.mapCenter(),
          markers: scope.markers,
          icons: this.mapIcons(),
          geojson: scope.geojson,
          defaults: {
              maxZoom: 16,
              minZoom: 4,
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
                blackwhite: {
                    name: 'OpenStreetMap',
                    type: 'xyz',
                    url: 'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
                    visible: true,
                    layerOptions: {
                        subdomains: ['a', 'b', 'c'],
                        continuousWorld: true,
                        showOnSelector: false
                    }
                }
              },
              overlays: {
                soil: {
                    name: "Soil Survey",
                    type: "agsTiled",
                    url: "http://server.arcgisonline.com/arcgis/rest/services/Specialty/Soil_Survey_Map/MapServer",
                    visible: false,
                    layerOptions: {
                        opacity: 0.4
                    }
                }
              }
            }
        };
    },
    mapFillColor: function(name){
      switch(name){
        case 'Flood':
          return "#62a0ca";
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
          return "#c6d8ef";
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
    calcNearestAlert: function(scope,icon,type,lat,lng){
      if(!scope.position)
        return;
      var distance = this.distance(
        {'lat':scope.position.coords.latitude,'lng':scope.position.coords.longitude}
        ,{'lat':lat,'lng':lng}
      );

      //counts current alerts within 2 miles
      if(distance <= this.alertDistance){
        if(type.toLowerCase().indexOf('fire')!==-1)
          scope.prediction.counts.alerts.fires++;
        if(type.toLowerCase().indexOf('flood')!==-1)
          scope.prediction.counts.alerts.floods++;
        if(type.toLowerCase().indexOf('flash')!==-1)
          scope.prediction.counts.alerts.flash++;
      }

      //update scope distance
      if(scope.nearest.alert.miles == 0 || distance < scope.nearest.alert.miles){
        scope.nearest.alert.icon = icon;
        scope.nearest.alert.type = type;
        scope.nearest.alert.miles = distance;
        scope.nearest.alert.lat = lat;
        scope.nearest.alert.lng = lng;
      }
      return distance;
    },
    calcNearestHistorical: function(scope,type,lat,lng){
      if(!scope.position)
        return;
      var distance = this.distance(
        {'lat':scope.position.coords.latitude,'lng':scope.position.coords.longitude}
        ,{'lat':lat,'lng':lng}
      );
      //counts for historical events within 2 miles
      if(distance <= this.alertDistance){
        if(type.toLowerCase().indexOf('fire')!==-1)
          scope.prediction.counts.historical.fires++;
        if(type.toLowerCase().indexOf('flood')!==-1)
          scope.prediction.counts.historical.floods++;
        if(type.toLowerCase().indexOf('flash')!==-1)
          scope.prediction.counts.historical.flash++;
      }
      //update scope distance
      if(scope.nearest.historical.miles == 0 || distance < scope.nearest.historical.miles){
        scope.nearest.historical.type = type;
        scope.nearest.historical.miles = distance;
        scope.nearest.historical.lat = lat;
        scope.nearest.historical.lng = lng;
      }
      return distance;
    },
    mapParseAlerts: function(alerts,scope){
      if(!alerts)
        return;

      var centered = false;
      var self = this;
      var geoAlerts = {};
      // push all the coordinates in a geojson formatted array
      // polygon is WKT format
      for(var a in alerts){
        if(!!alerts[a]['cap:polygon'] && alerts[a]['cap:polygon'][0] != ""){

          if(alerts[a]['cap:event'][0].indexOf('Flood') !== -1){
            if(!geoAlerts.floods)
              geoAlerts.floods = [];
            geoAlerts.floods.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              alerts[a]['distance'] = self.calcNearestAlert(scope
                ,'tint'
                ,alerts[a]['cap:event'][0]
                ,parseFloat(coord.split(',')[0])
                ,parseFloat(coord.split(',')[1])
              );
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else if(alerts[a]['cap:event'][0].indexOf('Fire') !== -1){
            if(!geoAlerts.fires)
              geoAlerts.fires = [];
            geoAlerts.fires.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              alerts[a]['distance'] = self.calcNearestAlert(scope
                ,'fire'
                ,alerts[a]['cap:event'][0]
                ,parseFloat(coord.split(',')[0])
                ,parseFloat(coord.split(',')[1])
              );
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else if(alerts[a]['cap:event'][0].indexOf('Winter') !== -1
            || alerts[a]['cap:event'][0].indexOf('Frost') !== -1
            || alerts[a]['cap:event'][0].indexOf('Freez') !== -1
            || alerts[a]['cap:event'][0].indexOf('Blizzard') !== -1){
              if(!geoAlerts.winter)
                geoAlerts.winter = [];
            geoAlerts.winter.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              alerts[a]['distance'] = self.calcNearestAlert(scope
                ,'asterisk'
                ,alerts[a]['cap:event'][0]
                ,parseFloat(coord.split(',')[0])
                ,parseFloat(coord.split(',')[1])
              );
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          } else {
            if(!geoAlerts.other)
              geoAlerts.other = [];
            //TODO determine what other events there are
            geoAlerts.other.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
              alerts[a]['distance'] = self.calcNearestAlert(scope
                ,'bell'
                ,alerts[a]['cap:event'][0]
                ,parseFloat(coord.split(',')[0])
                ,parseFloat(coord.split(',')[1])
              );
              return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
            }));
          }
        }
      }
      scope.geoAlerts = geoAlerts;

      if(geoAlerts.floods && geoAlerts.floods.length){
         scope.geojson.floods = this.mapGeoJson(geoAlerts.floods,'Flood');
         //center the map
         scope.centerJSON("floods");
         centered=true;
         //check if user location is inside flood polygons
         if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.floods))
          scope.prediction.forecast.floods.in_alert=true;
      }

      if(geoAlerts.fires && geoAlerts.fires.length){
        scope.geojson.fires = this.mapGeoJson(geoAlerts.fires,'Fire');
        //center the map
        if(!centered)
          scope.centerJSON("fires");
        centered=true;
        //check if user location is inside fire polygons
        if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.fires))
         scope.prediction.forecast.fires.in_alert=true;
      }

      if(geoAlerts.winter && geoAlerts.winter.length){
        scope.geojson.winter = this.mapGeoJson(geoAlerts.winter,'Winter');
        //center the map
        if(!centered)
          scope.centerJSON("winter");
        centered=true;
        //check if user location is inside winter polygons
        if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.winter))
         scope.prediction.forecast.winter.in_alert=true;
      }

      if(geoAlerts.other && geoAlerts.other.length){
        scope.geojson.other = this.mapGeoJson(geoAlerts.other,'Other');
        //center the map
        if(!centered)
          scope.centerJSON("other");
        //check if user location is inside other polygons
        if(scope.position && this.pip([scope.position.coords.longitude,scope.position.coords.latitude],geoAlerts.other))
         scope.prediction.forecast.other.in_alert=true;
      }
    },

    // https://github.com/substack/point-in-polygon
    pip: function(point,polygon){
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

      var x = point[0], y = point[1];

      var inside = false;
      for (p in polygon){
        for (var i = 0, j = polygon[p].length - 1; i < polygon[p].length; j = i++) {
            var xi = polygon[p][i][0], yi = polygon[p][i][1];
            var xj = polygon[p][j][0], yj = polygon[p][j][1];

            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
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
