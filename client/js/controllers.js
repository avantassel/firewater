firewaterApp.controller('mainCtrl', function($scope, $stateParams, $state, $filter, $timeout, $q, leafletData, FWService) {

  $scope.geocode = {state: ($stateParams.state || 'US')
    , formatted_address: 'Locating...'
    , elev: 0
    , geometry: { location: {lat:($stateParams.lat || 0),lng:($stateParams.lng || 0)}}
  };
  $scope.showTenForecast = false;
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
                      ,season:''
                      ,forecast: {
                        high_winds:false
                        ,high_pop:false
                        ,high_severity:false
                        ,fires: {risk:0,alerts:0,social:null,in_alert:false,message:'Analyzing...'}
                        ,floods: {risk:0,alerts:0,social:null,in_alert:false,message:'Analyzing...'}
                        ,winter: {risk:0,alerts:0,social:null,in_alert:false,message:'Analyzing...'}
                        ,other: {risk:0,alerts:0,in_alert:false}
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
  $scope.forecastTenOptions = FWService.chartOptions('forecastTen');

  var timeout=null, messages=[];

  $scope.shareUrl = function(){
      return document.location.href;
  };

  $scope.changeForecast = function(){
    $scope.showTenForecast = !$scope.showTenForecast;
    if($scope.showTenForecast)
      $scope.getForecast('10');
    else
      $scope.getForecast('24');
  };

  $scope.getNoaaAlertClass = function(severity){
     switch(severity){
      case 'Severe':
        return 'danger';
      case 'Moderate':
        return 'warning';
      case 'Minor':
        return 'info';
      default:
        return 'success';
    }
  };

  $scope.predictionClass = function(message){
     if(message.indexOf('high')!==-1)
        return 'bg-danger';
     else if(message.indexOf('medium')!==-1)
        return 'bg-warning';
     else if(message.indexOf('low')!==-1)
        return 'bg-info';
     else
        return 'bg-success';
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
      },function(err){
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
    },function(err){
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
    },function(err){
      q.resolve(true);
    });
    return q.promise;
  };

  $scope.getTweets = function(query){
    $scope.setProcessMessage('Analyzing nearby tweets for '+query.replace('%23','#')+'...');
    var q = $q.defer();
    FWService.tweets(query,$scope.position.coords).then(function(response){
      if(response && response.search && response.search.results){
        if(query.indexOf('flood')!==-1)
          $scope.prediction.forecast.floods.social = response.search.results;
        else if(query.indexOf('fire')!==-1)
          $scope.prediction.forecast.fires.social = response.search.results;
        else if(query.indexOf('blizzard')!==-1)
          $scope.prediction.forecast.winter.social = response.search.results;
        q.resolve(response.search.results);
      } else {
        q.resolve(0);
      }
    },function(err){
      q.resolve(true);
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
    },function(err){
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
               $scope.predictions.push({message:'Be aware you are below a flood alert area',type:'danger',icon:'ship fa-lg'});
             }
          });
        }
      }

      if(!!alerts.length
        && !!Object.keys($scope.geoAlerts).length
        && $scope.nearest.alert.miles != 0
        ){
        $scope.nearest.alert.message = 'The nearest alert ('+$scope.nearest.alert.type+')';
      } else {
        $scope.nearest.alert.icon = 'exclamation';
        if(alerts.length > 0)
          $scope.nearest.alert.message = 'Alerts are broad, view list';
        else
          $scope.nearest.alert.message = 'There are no alerts nearby';
      }
      q.resolve(true);
    },function(err){
      q.resolve(true);
    });
    return q.promise;
  };

  // https://twcservice.mybluemix.net/rest-api/#!/twc_forecast_hourly/v2fcsthourly24
 $scope.getForecast = function(type){

   if(type=='24' && $scope.forecastData){
     return true;
   } else if(type=='10' && $scope.forecastTenData){
     return true;
   }

   $scope.setProcessMessage('Analyzing weather foreast...');
   var q = $q.defer();
   var dewpt = [], mslp = [], wspd = [], gust = [], pop = [], rh = [], temp = [], popAmount = 0, severityAmount = 0;
   //get 24hr forecast for user location
   FWService.forecast($scope.position.coords,type).then(function(response){

     for(var f in response.forecasts){

       var d = new Date(response.forecasts[f].fcst_valid_local);

       if(type=='24'){
         popAmount += response.forecasts[f].pop;
         severityAmount += response.forecasts[f].severity;

         dewpt.push(
           [d.getTime(), response.forecasts[f].dewpt || 0]
         );
         rh.push(
           [d.getTime(), response.forecasts[f].rh || 0]
         );
         mslp.push(
           [d.getTime(), response.forecasts[f].mslp || 0]
         );
         wspd.push(
           [d.getTime(), response.forecasts[f].wspd || 0]
         );
         gust.push(
           [d.getTime(), response.forecasts[f].gust || 0]
         );
         pop.push(
           [d.getTime(), response.forecasts[f].pop || 0]
         );
         temp.push(
           [d.getTime(), response.forecasts[f].temp || 0]
         );

         //  https://en.wikipedia.org/wiki/Gale_warning
         if(response.forecasts[f].wspd >= 40 || response.forecasts[f].gust >= 40){
           $scope.prediction.forecast.high_winds=true;
         }
       } else {

         popAmount += response.forecasts[f].day.pop || 0;
         popAmount += response.forecasts[f].night.pop || 0;

         //bar structure
        //  rh.push(
        //    {x:d.getTime(), y:((response.forecasts[f].day.rh || 0)+(response.forecasts[f].night.rh || 0))/2}
        //  );
        //  wspd.push(
        //    {x:d.getTime(), y:((response.forecasts[f].day.wspd || 0)+(response.forecasts[f].night.wspd || 0))/2}
        //  );
        //  pop.push(
        //    {x:d.getTime(), y:((response.forecasts[f].day.pop || 0)+(response.forecasts[f].night.wspd || 0))/2}
        //  );
        //  temp.push(
        //    {x:d.getTime(), y:((response.forecasts[f].day.temp || 0)+(response.forecasts[f].night.wspd || 0))/2}
        //  );
        rh.push(
           [d.getTime(), ((response.forecasts[f].day.rh || 0)+(response.forecasts[f].night.rh || 0))/2]
         );
         wspd.push(
           [d.getTime(), ((response.forecasts[f].day.wspd || 0)+(response.forecasts[f].night.wspd || 0))/2]
         );
         pop.push(
           [d.getTime(), ((response.forecasts[f].day.pop || 0)+(response.forecasts[f].night.wspd || 0))/2]
         );
         temp.push(
           [d.getTime(), ((response.forecasts[f].day.temp || 0)+(response.forecasts[f].night.wspd || 0))/2]
         );
       }
     }

    if(type=='24'){

      if(popAmount/response.forecasts.length > 50)
       $scope.prediction.forecast.high_pop=true;

      if(severityAmount/response.forecasts.length > 3)
       $scope.prediction.forecast.high_severity=true;

      $scope.forecastData = [
        {
          "key": "Temperature F",
          "values": temp
        },
        {
          "key": "Probability of Precipitation",
          "values": pop
        },
        {
          "key": "Relative Humidity",
          "values": rh
        },
        {
          "key": "Wind Speed",
          "values": wspd
        },
        {
          "key": "Dew Point",
          "values": dewpt
        },
        {
          "key": "Mean Sea Level Pressure",
          "values": mslp
        },
        {
          "key": "Wind Gust",
          "values": gust
        }
      ];
    } else if(type=='10'){

      if(popAmount/response.forecasts.length*2 > 50)
       $scope.prediction.forecast.high_pop=true;

      $scope.forecastTenData = [
        {
          "key": "Temperature F",
          "values": temp
        },
        {
          "key": "Probability of Precipitation",
          "values": pop
        },
        {
          "key": "Relative Humidity",
          "values": rh
        },
        {
          "key": "Wind Speed",
          "values": wspd
        }
      ];
    }

     //set forecast
     if(type=='24')
      $scope.forecast = response;
     else
      $scope.setProcessMessage('');

     q.resolve(true);
   },function(err){
     q.resolve(true);
   });
   return q.promise;
 };

 // Good resources on data modeling for floods and wildfires
 // https://www.researchgate.net/publication/233775970_Quantitative_Precipitation_Forecasts_and_Early_Flood_Warning_the_Hunter_Valley_Flood_of_June_2007
 // http://www.erh.noaa.gov/nerfc/qpfpaper.htm
 // http://www.firelab.org/project/firesev
 // http://behaveplus.firemodels.org/sites/default/files/images/downloads/FY14_FMI_Annual_Report_final.pdf
 // https://www.esri.com/news/arcuser/0700/files/firemodel.pdf

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
     && $scope.prediction.forecast.high_winds){
       $scope.prediction.forecast.fires.message = 'risk is high';
       $scope.prediction.forecast.fires.risk++;
       if($scope.prediction=='summer')
        $scope.prediction.forecast.fires.risk++;
   } else if($scope.prediction.counts.alerts.fires
     && $scope.prediction.historical.alerts.fires){
       $scope.prediction.forecast.fires.message = 'risk is medium';
       $scope.prediction.forecast.fires.risk++;
       if($scope.prediction=='summer')
        $scope.prediction.forecast.fires.risk++;
   } else if($scope.prediction.counts.alerts.fires){
       $scope.prediction.forecast.fires.message = 'risk is low';
       $scope.prediction.forecast.fires.risk++;
       if($scope.prediction=='summer')
        $scope.prediction.forecast.fires.risk++;
   } else if(!$scope.prediction.forecast.fires.in_alert && $scope.prediction.forecast.fires.risk==0){
     $scope.prediction.forecast.fires.message = 'no risk';
   } else if($scope.prediction.forecast.fires.risk != 0){
     $scope.prediction.forecast.fires.message = 'risk is low';
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
       $scope.prediction.forecast.floods.message = 'Flash risk is high';
       $scope.prediction.forecast.floods.risk++;
   } else if($scope.prediction.counts.alerts.floods
     && $scope.prediction.counts.historical.floods){
       $scope.prediction.forecast.floods.message = 'risk is medium';
       $scope.prediction.forecast.floods.risk++;
   } else if($scope.prediction.counts.alerts.flash
     && $scope.prediction.counts.historical.flash){
       $scope.prediction.forecast.floods.message = 'Flash risk is medium';
       $scope.prediction.forecast.floods.risk++;
   } else if($scope.prediction.counts.alerts.floods){
       $scope.prediction.forecast.floods.message = 'risk is low';
       $scope.prediction.forecast.floods.risk++;
   } else if(!$scope.prediction.forecast.floods.in_alert && $scope.prediction.forecast.floods.risk == 0){
     $scope.prediction.forecast.floods.message = 'no risk';
   } else if($scope.prediction.forecast.floods.risk != 0){
     $scope.prediction.forecast.winter.message = 'risk is low';
   }

   //WINTER/BLIZZARD
   //of alerts if > 50% are Severe
   if($scope.nearest.alert.miles < 100){
     if($scope.prediction.forecast.high_pop
       && $scope.prediction.forecast.high_severity
       && $scope.prediction.forecast.winter.risk / $scope.prediction.forecast.winter.alerts * 100 > 20 ){
         $scope.prediction.forecast.winter.message = 'risk is high '+ Math.round($scope.prediction.forecast.winter.risk / $scope.prediction.forecast.winter.alerts * 100)+'% are severe';
       } else if($scope.prediction.forecast.winter.risk !== 0
         && $scope.prediction.forecast.winter.risk / $scope.prediction.forecast.winter.alerts * 100 > 50 ){
         $scope.prediction.forecast.winter.message = 'risk is high '+ Math.round($scope.prediction.forecast.winter.risk / $scope.prediction.forecast.winter.alerts * 100)+'% are severe';
       } else if($scope.prediction.forecast.winter.risk !== 0
         && $scope.prediction.forecast.winter.risk / $scope.prediction.forecast.winter.alerts * 100 > 20 ){
         $scope.prediction.forecast.winter.message = 'risk is medium '+ Math.round($scope.prediction.forecast.winter.risk / $scope.prediction.forecast.winter.alerts * 100)+'% are severe';
       } else if($scope.prediction.forecast.winter.risk !== 0){
         $scope.prediction.forecast.winter.message = 'risk is low '+ Math.round($scope.prediction.forecast.winter.risk / $scope.prediction.forecast.winter.alerts * 100)+'% are severe';
       } else {
         $scope.prediction.forecast.winter.message = 'no risk';
       }
   } else {
     $scope.prediction.forecast.winter.message = 'no risk';
   }

   //24HR FORECAST
   if($scope.prediction.forecast.high_winds){
     $scope.predictions.unshift({message:'High winds are forecasted',type:'warning'});
     $scope.prediction.forecast.fires.risk++;
   }
   if($scope.prediction.forecast.high_pop){
     $scope.predictions.unshift({message:'High Precipitation is forecasted',type:'danger'});
     $scope.prediction.forecast.floods.risk++;
   }
   if($scope.prediction.forecast.high_severity){
     $scope.predictions.unshift({message:'Weather Severity is high',type:'danger'});
   }

 };

 $scope.getGeo().then(function(){

   return $scope.getMarker();

 }).then(function(){

   $q.all([
     $scope.getForecast('24')
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
           $scope.prediction.forecast.floods.risk++;
         }
       }));
     }
     if($scope.prediction.forecast.fires.risk > 0){
       social.push($scope.getTweets('%23fire').then(function(count){
         if(!!count){
           $scope.prediction.forecast.fires.risk++;
         }
       }));
     }

     social.push($scope.getTweets('%23blizzard').then(function(count){
       if(!!count){
         $scope.prediction.forecast.fires.risk++;
       }
     }));

     return $q.all(social);
   }).then(function(){
     $scope.setProcessMessage('');
   });

 });

}).controller('pastCtrl', function($scope, $state, $http, FWService) {

  $scope.searchAddress = '';
  $scope.historicalOptions = FWService.chartOptions('historical');
  $scope.historicalData = [];

  $scope.ShowAbout = function(){
    return Custombox.open({
        target: '#about-modal',
        effect: 'blur',
        width: 800
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

  $scope.getLocation = function(val) {
    if(val.length<3)
      return '';
    return FWService.address(val).then(function(response){
      return response.map(function(item){
        return item.description;
      });
    });
  };

  $http.get('data/historical.json').success(function(data) {
    if(data && data.rows){
        $scope.historicalData = data.rows;
    }
  });

});
