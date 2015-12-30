firewaterApp.controller('mainCtrl', function($rootScope, $scope, $stateParams, $state, $filter, leafletData, FWService) {

  $scope.geocode = {state: ($stateParams.state || 'us')
    , formatted_address: ''
    , geometry: { location: {lat:($stateParams.lat || 0),lng:($stateParams.lng || 0)}}
  };
  $scope.currentName = $state.current.name;
  $scope.position = null;
  $scope.alerts = null;
  $scope.inAlertArea = [];
  $scope.forecast = null;
  $scope.areaPolygonAlerts = null;
  $scope.geoAlerts = {};
  $scope.markers = [];
  $scope.geojson = {floods:{},fires:{},winter:{},other:{}};
  $scope.nearestAlert = {miles:0,type:'circle-o-notch fa-spin',lat:0,lng:0};
  $scope.searchAddress = '';

  if($stateParams.lat && $stateParams.lng){
    $scope.position = {coords: {latitude: parseFloat($stateParams.lat), longitude: parseFloat($stateParams.lng)}};
  }

  $scope.ShowAbout = function(){
    return Custombox.open({
        target: '#about-modal',
        effect: 'blur',
        width: 800
    });
  };

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
      FWService.geocodeAddress(this.searchAddress).then(function(response){
        // $scope.geocode.formatted_address = response.formatted_address;
        // $scope.geocode.geometry = response.geometry;
        // $scope.geocode.found_state = response.state;
        //redirect to location
        $state.go('location',{state:response.state,lat:response.geometry.location.lat,lng:response.geometry.location.lng})
      });
    }
  };

  $scope.forecastOptions = {
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

  angular.extend($scope, FWService.mapOptions($scope));

  if(!$scope.position){
    //get user geo location
    FWService.getLocation().then(function(position) {

          //set user current location lat/lng
          $scope.position = position;

          //get state for user location
          FWService.geocode(position.coords).then(function(response){

            //add user pin
            $scope.markers.push({
              icon: FWService.mapIcons(),
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              message: response.formatted_address
            });

            $scope.geocode.formatted_address = response.formatted_address;
            $scope.geocode.geometry = response.geometry;
            $scope.geocode.found_state = response.state;

            return true;

          }).then(function(){

            return $scope.getForecast();

          }).then(function(){

            return $scope.getAlerts();

          });
       },function(err){

         $scope.getAlerts();

       });
  } else {

    //get state for user location
    FWService.geocode($scope.position.coords).then(function(response){

      //add user pin
      $scope.markers.push({
        icon: FWService.mapIcons(),
        lat: $scope.position.coords.latitude,
        lng: $scope.position.coords.longitude,
        message: response.formatted_address
      });

      $scope.geocode.formatted_address = response.formatted_address;
      $scope.geocode.geometry = response.geometry;
      $scope.geocode.found_state = response.state;

      //update the state param if coming from a location lat/lng
      if($scope.currentName=='location')
        $scope.geocode.state = response.state;

      return true;

    }).then(function(){

      return $scope.getForecast();

    }).then(function(){

      return $scope.getAlerts();

    });
  }


     $scope.getForecast = function(){
       var dew = [], mslp = [], wspd = [], qpf = [], snow_qpf = [], temp = [];
       //get 24hr forecast for user location
       FWService.forecast($scope.position.coords,'24').then(function(forecast){

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
           qpf.push(
             [d.getTime(), forecast.forecasts[f].qpf]
           );
           snow_qpf.push(
             [d.getTime(), forecast.forecasts[f].snow_qpf]
           );
           temp.push(
             [d.getTime(), forecast.forecasts[f].temp]
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
           },
           {
             "key": "Quantitative Precipitation Forecast",
             "values": qpf
           },
           {
             "key": "Snow Quantitative Precipitation Forecast",
             "values": snow_qpf
           },
           {
             "key": "Temperature F",
             "values": temp
           }
         ];

         //set forecast
         return $scope.forecast = forecast;
       });
     };

     $scope.centerJSON = function(name) {
           leafletData.getMap().then(function(map) {
             var latlngs = [];
             //add user location
             if($scope.position)
              latlngs.push(L.GeoJSON.coordsToLatLng([$scope.position.coords.longitude,$scope.position.coords.latitude]));

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
      FWService.alerts($scope.geocode.state).then(function(alerts){
         //set alerts
         $scope.alerts = alerts;
         //parse alerts and add geojson alerts to the map
         FWService.mapAlerts(alerts,$scope);
         //draw polyline to nearestAlert
         if($scope.nearestAlert.lat && $scope.nearestAlert.lng){
           leafletData.getMap().then(function(map) {
             var polylineLayer = L.geodesicPolyline([
               L.latLng($scope.position.coords.latitude,$scope.position.coords.longitude)
               ,L.latLng($scope.nearestAlert.lat,$scope.nearestAlert.lng)
             ],{color: '#428bca'});
             polylineLayer.addTo(map);
           });
         }
         if($scope.nearestAlert.type.indexOf('spin')!==-1)
          $scope.nearestAlert.type = 'exclamation';
       });
     };

});
