firewaterApp.controller('searchCtrl', function($scope, $state, FWService) {
  $scope.searchByCity = false;

  $scope.getLocation = function(val) {
    if(val.length<3)
      return '';
    return FWService.address(val).then(function(response){
      return response.map(function(item){
        return item.description;
      });
    });
  };

  $scope.Search = function(e){
    if((e.type && e.type == 'submit') || (e && e.which === 13)){

    }
  };
})
.controller('homeCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $geolocation, leafletData, FWService) {

  $scope.geocode = {state:'us', formatted_address:'', geometry:{}};
  $scope.position = null;
  $scope.alerts = null;
  $scope.forecast = null;
  $scope.areaPolygonAlerts = null;
  $scope.geoAlerts = {};
  $scope.markers = [];
  $scope.geojson = {floods:{},fires:{},winter:{},other:{}};

  $scope.forecastOptions = {
            title: {
                enable: true,
                text: '24 Hr Forecast'
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
                duration: 100,
                useInteractiveGuideline: true,
                xAxis: {
                    showMaxMin: false,
                    tickFormat: function(d) {
                        return d3.time.format('%X')(new Date(d))
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

  angular.extend($scope, FWService.mapOptions($scope));

  //get user geo location
  $geolocation.getCurrentPosition({
        timeout: 60000
     }).then(function(position) {

        //set user current location lat/lng
        $scope.position = position;

        //add user pin
        $scope.markers.push({
          icon: FWService.mapIcons(),
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          message: "Your Location"
        });

        //get state for user location
        FWService.geocode(position.coords).then(function(response){
          //set state
          return $scope.geocode = response;

        }).then(function(){
          var dew = [], mslp = [], wspd = [];
          //get forecast for user location
          FWService.forecast(position.coords).then(function(forecast){
            for(var f in forecast.forecasts){
              var d = new Date(forecast.forecasts[f].fcst_valid_local);
              dew.push(
                [d.getTime(), forecast.forecasts[f].dewpt]
              );
              mslp.push(
                [d.getTime(), forecast.forecasts[f].mslp]
              );
              wspd.push(
                [d.getTime(), forecast.forecasts[f].wspd]
              );
            }

            $scope.forecastData = [
              {
                "key": "Dew Point",
                "values": dew
              },
              {
                "key": "Mean Sea Level Pressure",
                "values": mslp
              },
              {
                "key": "Wind Speed",
                "values": wspd
              }
            ];

            //set forecast
            return $scope.forecast = forecast;
          });
        }).then(function(){

          return $scope.getAlerts();

        });
     },function(err){

       $scope.getAlerts();

     });

     $scope.centerJSON = function(name) {
           leafletData.getMap().then(function(map) {
             var latlngs = [];
             for (var i in $scope.geojson[name].data.features[0].geometry.coordinates) {
                 var coord = $scope.geojson[name].data.features[0].geometry.coordinates[i];
                 for (var j in coord) {
                     var points = coord[j];
                     for (var k in points) {
                         latlngs.push(L.GeoJSON.coordsToLatLng(points[k]));
                     }
                 }
             }
             return map.fitBounds(latlngs);
           });
       };

     $scope.getAlerts = function(){
      //  FWService.alerts($scope.geocode.state).then(function(alerts){
      FWService.alerts('us').then(function(alerts){
         //set alerts
         $scope.alerts = alerts;
         //parse alerts and add geojson alerts to the map
         FWService.mapAlerts(alerts,$scope);
       });
     };

}).controller('stateCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $geolocation, leafletData, FWService) {

  $scope.state = $stateParams.state;
  $scope.alerts = null;
  $scope.areaPolygonAlerts = null;
  $scope.geoAlerts = {};
  $scope.geojson = {floods:{},fires:{},winter:{},other:{}};

  angular.extend($scope, FWService.mapOptions($scope));

  $scope.centerJSON = function(name) {
        leafletData.getMap().then(function(map) {
          var latlngs = [];
          for (var i in $scope.geojson[name].data.features[0].geometry.coordinates) {
              var coord = $scope.geojson[name].data.features[0].geometry.coordinates[i];
              for (var j in coord) {
                  var points = coord[j];
                  for (var k in points) {
                      latlngs.push(L.GeoJSON.coordsToLatLng(points[k]));
                  }
              }
          }
          return map.fitBounds(latlngs);
        });
    };

  $scope.getAlerts = function(){
  FWService.alerts($scope.state).then(function(alerts){
      //set alerts
      $scope.alerts = alerts;
      console.log(alerts)
      //parse alerts and add geojson alerts to the map
      FWService.mapAlerts(alerts,$scope);
    });
  };

  $scope.getAlerts();

});
