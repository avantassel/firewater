firewaterApp.controller('mainCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $timeout, $q, leafletData, FWService) {

  $scope.geocode = {state: ($stateParams.state || 'US')
    , formatted_address: 'Locating...'
    , elev: 0
    , geometry: { location: {lat:($stateParams.lat || 0),lng:($stateParams.lng || 0)}}
  };
  $scope.currentName = $state.current.name;
  $scope.position = null;
  $scope.forecast = null;
  $scope.alerts = null;
  $scope.searching = 'Analyzing weather events past and present...';
  $scope.areaPolygonAlerts = null;
  $scope.geoAlerts = {};
  $scope.markers = [];
  $scope.geojson = {floods:{},fires:{},winter:{},other:{}};
  $scope.nearest = {
    alert: {miles:0,elev:0,type:'',icon:'circle-o-notch fa-spin',lat:0,lng:0,message:'Searching for alerts nearby'}
    ,historical: {miles:0,type:'',lat:0,lng:0,message:'Searching for past events nearby'}
  };
  $scope.searchAddress = '';
  $scope.historical = [];
  $scope.predictions = [];

  $scope.prediction = {summary:'There is no current risk at your location'
                      ,alert:'success'
                      ,high_winds:false
                      ,high_pop:false
                      ,high_severity:false
                      ,season:''
                      ,forecast: {
                        fires: {risk:0,social:null,in_alert:false}
                        ,floods: {risk:0,social:null,in_alert:false}
                        ,winter: {risk:0,in_alert:false}
                        ,other: {risk:0,in_alert:false}
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

  var timeout=null, messages=[];

  $scope.getNoaaAlertClass = function(severity){
     switch(severity){
      case 'Severe':
        return 'label-danger';
      case 'Moderate':
        return 'label-warning';
      case 'Minor':
        return 'label-info';
      default:
        return 'label-success';
    }
  };
  
  $scope.setProcessMessage = function(message){
    if(!timeout){
      timeout = $timeout(function(){
        $scope.searching = message;
        timeout=null;
        if(messages.length){
          $scope.setProcessMessage(messages.shift());
        }
      },500);
    } else {
      messages.push(message);
    }
  };

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

  $scope.getGeo = function(){
    $scope.setProcessMessage('Getting geo location...');
    var q = $q.defer();
    if(!!$scope.position){
      q.resolve(true);
    } else {
      FWService.getLocation().then(function(position) {
          //set user current location lat/lng
          $scope.position = position;
          q.resolve(true);
      });
    }
    return q.promise;
  };

  $scope.getMarker = function(){
    var q = $q.defer();
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

      if($scope.currentName=='location')
        $scope.geocode.state = response.state;

      q.resolve(true);
    });
    return q.promise;
  };

  $scope.getUrtheCast = function(){
    $scope.setProcessMessage('Analyzing UrtheCast satellite data...');
    var q = $q.defer();
    FWService.urthecast($scope.position.coords).then(function(response){
      if(response.payload && response.payload.length)
        $scope.prediction.season = response.payload[0].season;
      q.resolve(true);
    });
    return q.promise;
  };

  $scope.getTweets = function(query){
    $scope.setProcessMessage('Analyzing tweets for '+query.replace('%23','#')+'...');
    var q = $q.defer();
    FWService.tweets(query,$scope.position.coords).then(function(response){
      if(response && response.search && response.search.results){
        $scope.prediction.forecast.floods.social = response.search.results;
        q.resolve(response.search.results);
      } else {
        q.resolve(0);
      }
    });
    return q.promise;
  };

  $scope.getHistorical = function(){
    $scope.setProcessMessage('Analyzing historical storm events...');
    var q = $q.defer();
    var message = '';
    $scope.nearest.historical.message = 'Searching for past events nearby';
    FWService.historical($scope.position.coords).then(function(response){
      if(response && response.rows){
        $scope.historical = response.rows;

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

          response.rows[r].distance = FWService.calcNearestHistorical($scope
            ,response.rows[r].doc.EVENT_TYPE
            ,response.rows[r].geometry.coordinates[1]
            ,response.rows[r].geometry.coordinates[0]
          );
        }
        $scope.nearest.historical.message = 'The nearest historical event ('+$scope.nearest.historical.type+')';
      } else {
        $scope.nearest.historical.message = 'There are no past events nearby';
      }
      q.resolve(true);
    });
    return q.promise;
  };

  $scope.getAlerts = function(){
    $scope.setProcessMessage('Analyzing nearby NOAA alerts...');
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

        // elevation
        if($scope.position){
          geolib.getElevation([
            {'lat':$scope.position.coords.latitude,'lng':$scope.position.coords.longitude}
            ,{'lat':$scope.nearest.alert.lat,'lng':$scope.nearest.alert.lng}
          ],function(err,result){
            $scope.geocode.elev = result[0].elev * 3.28084;//elevation in feet
            $scope.nearest.alert.elev = result[1].elev * 3.28084;//elevation in feet

            //are we below the flooded alert elevation?
            if($scope.nearest.alert.type.toLowerCase().indexOf('flood') !== -1
             && $scope.nearest.alert.miles < 10
             && $scope.geocode.elev < $scope.nearest.alert.elev){
               $scope.predictions.push({message:'Be aware you are below a flood alert area',type:'danger',icon:'ship'});
             }
          });
        }
      }

      if(!!alerts.length && alerts[0]['title'][0] != 'There are no active watches, warnings or advisories'){
        $scope.nearest.alert.message = 'The nearest alert ('+$scope.nearest.alert.type+')';
      } else {
        $scope.nearest.alert.icon = 'exclamation';
        $scope.nearest.alert.message = 'There are no alerts nearby';
      }
      q.resolve(true);
    });
    return q.promise;
  };

  // https://twcservice.mybluemix.net/rest-api/#!/twc_forecast_hourly/v2fcsthourly24
 $scope.getForecast = function(){
   $scope.setProcessMessage('Analyzing weather foreast...');
   var q = $q.defer();
   var dewpt = [], mslp = [], wspd = [], gust = [], pop = [], temp = [], popAmount = 0, severityAmount = 0;
   //get 24hr forecast for user location
   FWService.forecast($scope.position.coords,'24').then(function(forecast){

     for(var f in forecast.forecasts){

       popAmount += forecast.forecasts[f].pop;
       severityAmount += forecast.forecasts[f].severity;

       var d = new Date(forecast.forecasts[f].fcst_valid_local);
       dewpt.push(
         [d.getTime(), forecast.forecasts[f].dewpt]
       );
       mslp.push(
         [d.getTime(), forecast.forecasts[f].mslp]
       );
       wspd.push(
         [d.getTime(), forecast.forecasts[f].wspd]
       );
       gust.push(
         [d.getTime(), forecast.forecasts[f].gust]
       );
       pop.push(
         [d.getTime(), forecast.forecasts[f].pop]
       );
       temp.push(
         [d.getTime(), forecast.forecasts[f].temp]
       );

       //  https://en.wikipedia.org/wiki/Gale_warning
       if(forecast.forecasts[f].wspd >= 40){
         $scope.prediction.forecast.high_winds=true;
       }
     }

     if(popAmount/forecast.forecasts.length > 50)
      $scope.prediction.forecast.high_pop=true;

     if(severityAmount/forecast.forecasts.length > 3)
      $scope.prediction.forecast.high_severity=true;

     $scope.forecastData = [
       {
         "key": "Dew Point",
         "values": dewpt
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
         "key": "Wind Gust",
         "values": gust
       },
       {
         "key": "Probability of Precipitation",
         "values": pop
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
 // http://www.firelab.org/project/firesev
 // http://behaveplus.firemodels.org/sites/default/files/images/downloads/FY14_FMI_Annual_Report_final.pdf

 $scope.calcPrediction = function(){

   $scope.setProcessMessage('Calculating prediction...');
   //FIRES
   //TODO add rain+drought history and tree shrub coverage (ie. fuel potential and spread threat)?
   if($scope.prediction.forecast.fires.in_alert){
     $scope.predictions.push({message:'Be aware you are in a NOAA fire alert area',type:'danger',icon:'fire-extinguisher fa-lg'});
     $scope.prediction.forecast.fires.risk++;
   }

   if($scope.prediction.counts.alerts.fires
     && $scope.prediction.historical.alerts.fires
     && $scope.prediction.forecast.fires.high_winds){
       $scope.predictions.push({message:'Fire risk is high',type:'danger',icon:'fire-extinguisher fa-lg'});
       $scope.prediction.forecast.fires.risk++;
       if($scope.prediction=='summer')
        $scope.prediction.forecast.fires.risk++;
   } else if($scope.prediction.counts.alerts.fires
     && $scope.prediction.historical.alerts.fires){
       $scope.predictions.push({message:'Fire risk is medium',type:'warning',icon:'fire-extinguisher fa-lg'});
       $scope.prediction.forecast.fires.risk++;
       if($scope.prediction=='summer')
        $scope.prediction.forecast.fires.risk++;
   } else if($scope.prediction.counts.alerts.fires){
       $scope.predictions.push({message:'Fire risk is low',type:'info',icon:'fire-extinguisher fa-lg'});
       $scope.prediction.forecast.fires.risk++;
       if($scope.prediction=='summer')
        $scope.prediction.forecast.fires.risk++;
   } else if(!$scope.prediction.forecast.fires.in_alert){
     $scope.predictions.push({message:'There is no risk of fires',type:'success'});
   }

   //FLOODS
   //TODO add rain+drought history
   if($scope.prediction.forecast.floods.in_alert){
     $scope.predictions.push({message:'Be aware you are in a NOAA flood alert area',type:'danger',icon:'ship fa-lg'});
     $scope.prediction.forecast.floods.risk++;
   }

   if($scope.prediction.counts.alerts.flash
     && $scope.prediction.counts.historical.flash
     && $scope.prediction.counts.alerts.floods
     && $scope.prediction.counts.historical.floods
     && $scope.prediction.forecast.floods.high_pop){
       $scope.predictions.push({message:'Flash flood risk is high',type:'danger',icon:'ship fa-lg'});
       $scope.prediction.forecast.floods.risk++;
   } else if($scope.prediction.counts.alerts.floods
     && $scope.prediction.counts.historical.floods){
       $scope.predictions.push({message:'Flood risk is medium',type:'warning',icon:'ship fa-lg'});
       $scope.prediction.forecast.floods.risk++;
   } else if($scope.prediction.counts.alerts.flash
     && $scope.prediction.counts.historical.flash){
       $scope.predictions.push({message:'Flash flood risk is medium',type:'warning',icon:'ship fa-lg'});
       $scope.prediction.forecast.floods.risk++;
   } else if($scope.prediction.counts.alerts.floods){
       $scope.predictions.push({message:'Flood risk is low',type:'info',icon:'ship fa-lg'});
       $scope.prediction.forecast.floods.risk++;
   } else if(!$scope.prediction.forecast.floods.in_alert){
     $scope.predictions.push({message:'There is no risk of flooding',type:'success'});
   }

   //24HR FORECAST
   if($scope.prediction.forecast.high_winds){
     $scope.predictions.push({message:'High winds are forecasted',type:'warning'});
     $scope.prediction.forecast.fires.risk++;
   }
   if($scope.prediction.forecast.high_pop){
     $scope.predictions.push({message:'High Precipitation is forecasted',type:'warning'});
     $scope.prediction.forecast.floods.risk++;
   }
   if($scope.prediction.forecast.high_severity){
     $scope.predictions.push({message:'Weather Severity is high',type:'warning'});
   }

 };

 $scope.getGeo().then(function(){

   return $scope.getMarker();

 }).then(function(){

   $q.all([
     $scope.getForecast()
     ,$scope.getHistorical()
     ,$scope.getAlerts()
     ,$scope.getUrtheCast()
   ]).then(function() {
     return $scope.calcPrediction();
   },function(err){
     $scope.predictions.push({message:err,type:'danger'});
   }).then(function(){
     var social = [];
     //SOCIAL SIGNALS
     //tweets take a while so move down here
     if($scope.prediction.forecast.floods.risk > 0){
       social.push($scope.getTweets('%23flood').then(function(count){
         if(!!count){
           $scope.predictions.push({message:'People are talking about #Flood',type:'info',icon:'ship fa-lg'});
           $scope.prediction.forecast.floods.risk++;
         }
       }));
     }
     if($scope.prediction.forecast.fires.risk > 0){
       social.push($scope.getTweets('%23fire').then(function(count){
         if(!!count){
           $scope.predictions.push({message:'People are talking about #Fire',type:'info',icon:'fire-extinguisher fa-lg'});
           $scope.prediction.forecast.fires.risk++;
         }
       }));
     }
     return $q.all(social);
   }).then(function(){
     $scope.setProcessMessage('');
   });

 });

});
