firewaterApp.controller('mainCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $q, leafletData, FWService) {

  $scope.geocode = {state: ($stateParams.state || 'US')
    , formatted_address: 'Locating...'
    , geometry: { location: {lat:($stateParams.lat || 0),lng:($stateParams.lng || 0)}}
  };
  $scope.currentName = $state.current.name;
  $scope.position = null;
  $scope.forecast = null;
  $scope.alerts = null;
  $scope.areaPolygonAlerts = null;
  $scope.geoAlerts = {};
  $scope.markers = [];
  $scope.geojson = {floods:{},fires:{},winter:{},other:{}};
  $scope.nearest = {
    alert: {miles:0,type:'',icon:'circle-o-notch fa-spin',lat:0,lng:0,message:'Searching for alerts nearby'}
    ,historical: {miles:0,type:'',lat:0,lng:0,message:'Searching for past events nearby'}
  };
  $scope.searchAddress = '';
  $scope.historical = {count: 0};
  $scope.prediction = {floods:''
                      ,fires:''
                      ,summary:''
                      ,forecast: {
                        fires: {high_winds:false,in_alert:false}
                        ,floods: {high_qpf:false,in_alert:false}
                        ,winter: {in_alert:false}
                        ,other: {in_alert:false}
                      }
                      ,counts:{
                        alerts: {floods:0,flash:0,fires:0}
                        ,historical: {floods:0,flash:0,fires:0}
                      }
                    };

  if($stateParams.lat && $stateParams.lng){
    $scope.position = {coords: {latitude: parseFloat($stateParams.lat), longitude: parseFloat($stateParams.lng)}};
  }

  angular.extend($scope, FWService.mapOptions($scope));

  $scope.forecastOptions = FWService.chartOptions('forecast');

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

  $scope.zoomToAddress = function(){
    leafletData.getMap().then(function(map) {
      map.setView(L.latLng($scope.position.coords.latitude,$scope.position.coords.longitude),12, {animate: true});
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

  // $scope.addEsriLayers = function(){
  //   leafletData.getMap().then(function(map) {
  //     var fires = L.esri.featureLayer({
  //        url: "http://landscape3.arcgis.com/arcgis/rest/services/USA_Fire_Potential/ImageServer",
  //        style: function () {
  //          return { color: "#70ca49", weight: 2 };
  //        }
  //      }).addTo(map);
  //    });
  // };

  if(!$scope.position){
    //get user geo location
    FWService.getLocation().then(function(position) {

          //set user current location lat/lng
          $scope.position = position;

          //get state for user location
          FWService.geocode(position.coords).then(function(response){

            //add user pin
            $scope.markers.push({
              icon: FWService.mapIcons('locations'),
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

            return $scope.getHistorical();

          }).then(function(){

            return $scope.getAlerts();

          }).then(function(){

            return $scope.calcPrediction();

          });

       },function(err){

         $scope.getAlerts();

       });
  } else {

    //get state for user location
    FWService.geocode($scope.position.coords).then(function(response){

      //add user pin
      $scope.markers.push({
        icon: FWService.mapIcons('locations'),
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

      return $scope.getHistorical();

    }).then(function(){

      return $scope.getAlerts();

    }).then(function(){

      return $scope.calcPrediction();

    });

  }

  // $scope.addEsriLayers();

  $scope.getHistorical = function(){
    var q = $q.defer();
    var message = '';
    $scope.nearest.historical.message = 'Searching for past events nearby';
    FWService.historical($scope.position.coords).then(function(response){
      if(response && response.rows){
        $scope.historical.count = response.rows.length;

        for(r in response.rows){

          message = '<strong>'+response.rows[r].doc.EVENT_TYPE+'</strong>';
          if(response.rows[r].doc.BEGIN_DATE_TIME != '')
            message += '<br/>'+$filter('moment')(response.rows[r].doc.BEGIN_DATE_TIME);
          if(response.rows[r].doc.EVENT_NARRATIVE != '')
            message += '<br/>'+response.rows[r].doc.EVENT_NARRATIVE;
          else if(response.rows[r].doc.EPISODE_NARRATIVE != '')
            message += '<br/>'+response.rows[r].doc.EPISODE_NARRATIVE;

          $scope.markers.push({
            icon: FWService.mapIcons('historical'),
            lat: response.rows[r].geometry.coordinates[1],
            lng: response.rows[r].geometry.coordinates[0],
            message: message
          });

          FWService.calcNearestHistorical($scope
            ,response.rows[r].doc.EVENT_TYPE
            ,response.rows[r].geometry.coordinates[1]
            ,response.rows[r].geometry.coordinates[0]
          );
        }
        $scope.nearest.historical.message = 'The nearest historical event ('+$scope.nearest.historical.type+') is '+$filter('number')($scope.nearest.historical.miles,2)+' miles away';
      } else {
        $scope.nearest.historical.message = 'There are no past events nearby';
      }
      q.resolve(true);
    });
    return q.promise;
  };

  $scope.getAlerts = function(){
   var q = $q.defer();
   $scope.nearest.alert.message = 'Searching for alerts nearby';
   FWService.alerts($scope.geocode.state.toLowerCase()).then(function(alerts){
     $scope.alerts = alerts;
      //parse alerts and add geojson alerts to the map
      FWService.mapParseAlerts(alerts,$scope);
      //draw polyline to nearestAlert
      if(!!$scope.nearest.alert.lat && !!$scope.nearest.alert.lng){
        leafletData.getMap().then(function(map) {
          var polylineLayer = L.geodesicPolyline([
            L.latLng($scope.position.coords.latitude,$scope.position.coords.longitude)
            ,L.latLng($scope.nearest.alert.lat,$scope.nearest.alert.lng)
          ],{color: '#428bca'});
          polylineLayer.addTo(map);
        });
      }

      if(!!alerts.length && alerts[0]['title'][0] != 'There are no active watches, warnings or advisories'){
        $scope.nearest.alert.message = 'The nearest alert ('+$scope.nearest.alert.type+') is '+$filter('number')($scope.nearest.alert.miles,2)+' miles away';
      } else {
        $scope.nearest.alert.icon = 'exclamation';
        $scope.nearest.alert.message = 'There are no alerts nearby';
      }
      q.resolve(true);
    });
    return q.promise;
  };

 $scope.getForecast = function(){
   var q = $q.defer();
   var dew = [], mslp = [], wspd = [], qpf = [], snow_qpf = [], temp = [], qpfAmount = 0;
   //get 24hr forecast for user location
   FWService.forecast($scope.position.coords,'24').then(function(forecast){

     for(var f in forecast.forecasts){

       //  https://en.wikipedia.org/wiki/Gale_warning
       if(forecast.forecasts[f].wspd >= 40){
         $scope.prediction.forecast.fires.high_winds=true;
       }

       qpfAmount += forecast.forecasts[f].qpf;
       qpfAmount += forecast.forecasts[f].snow_qpf;

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

     if(qpfAmount >= 4){
       $scope.prediction.forecast.floods.high_qpf=true;
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
     $scope.forecast = forecast;
     q.resolve(true);
   });
   return q.promise;
 };

 // https://www.researchgate.net/publication/233775970_Quantitative_Precipitation_Forecasts_and_Early_Flood_Warning_the_Hunter_Valley_Flood_of_June_2007
 // http://www.erh.noaa.gov/nerfc/qpfpaper.htm

 $scope.calcPrediction = function(){
   
   //TODO add rain+drought history and tree coverage?
   if($scope.prediction.counts.alerts.fires
     && $scope.prediction.historical.alerts.fires
     && $scope.prediction.forecast.fires.high_winds){
       $scope.prediction.fires = 'Fire risk is high';
   } else if($scope.prediction.counts.alerts.fires
     && $scope.prediction.historical.alerts.fires){
       $scope.prediction.fires = 'Fire risk is medium';
   } else if($scope.prediction.counts.alerts.fires){
       $scope.prediction.fires = 'Fire risk is low';
   } else {
      $scope.prediction.fires = 'There is no risk of fires';
   }

   //TODO add rain+drought history
   if($scope.prediction.counts.alerts.flash
     && $scope.prediction.counts.historical.flash
     && $scope.prediction.counts.alerts.floods
     && $scope.prediction.counts.historical.floods
     && $scope.prediction.forecast.floods.high_qpf){
       $scope.prediction.floods = 'Flood risk is high';
   } else if($scope.prediction.counts.alerts.floods
     && $scope.prediction.counts.historical.floods){
       $scope.prediction.floods = 'Flood risk is medium';
   } else if($scope.prediction.counts.alerts.flash
     && $scope.prediction.counts.historical.flash){
       $scope.prediction.floods = 'Flood risk is medium';
   } else if($scope.prediction.counts.alerts.floods){
       $scope.prediction.floods = 'Flood risk is low';
   } else {
     $scope.prediction.floods = 'There is no risk of flooding';
   }

   if($scope.prediction.forecast.floods.in_alert){
     $scope.prediction.summary = 'Be aware you are in a NOAA flood alert area';
   } else if($scope.prediction.forecast.floods.in_alert){
     $scope.prediction.summary = 'Be aware you are in a NOAA fire alert area';
   }

 };

});
