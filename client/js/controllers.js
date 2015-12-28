firewaterApp.controller('homeCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $geolocation, leafletData, FWService) {

  $scope.geocode = {state:'us', formatted_address:'', geometry:{}};
  $scope.position = null;
  $scope.alerts = null;
  $scope.forecast = null;
  $scope.areaPolygonAlerts = null;
  $scope.geojson = {floods:{},fires:{},other:{}};

  angular.extend($scope, FWService.mapOptions($scope));

  //get user geo location
  $geolocation.getCurrentPosition({
        timeout: 60000
     }).then(function(position) {

        //set user current location lat/lng
        $scope.position = position;

        //get state for user location
        FWService.geocode(position.coords).then(function(response){
          //set state
          return $scope.geocode = response;

        }).then(function(){
          //get forecast for user location
          FWService.forecast(position.coords).then(function(forecast){
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
      FWService.alerts('tx').then(function(alerts){
         //set alerts
         $scope.alerts = alerts;
         var allalerts = {floods:[],fires:[],other:[]};
         //push all the coordinates in a geojson formatted array
         for(a in alerts){
           if(!!alerts[a]['cap:polygon'] && alerts[a]['cap:polygon'][0] != ""){

             if(alerts[a]['cap:event'][0].indexOf('Flood') !== -1){
               allalerts.floods.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
                 return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
               }));
             } else if(alerts[a]['cap:event'][0].indexOf('Fire') !== -1){
               allalerts.fires.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
                 return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
               }));
             } else {
               //TODO determine what other events there are
               allalerts.other.push(alerts[a]['cap:polygon'][0].split(' ').map(function(coord){
                 return [parseFloat(coord.split(',')[1]),parseFloat(coord.split(',')[0])];//need lng,lat array
               }));
             }
           }
         }

         if(allalerts.floods.length){
             //set the geojson for alerts
             $scope.geojson.floods = {
               style: {
                    fillColor: "#6299c2",
                    weight: 2,
                    opacity: 1,
                    color: 'white',
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
                     id: "Floods",
                     properties: { name: "Flood Alert" },
                     geometry: {
                       type: "MultiPolygon",
                       coordinates: [ allalerts.floods ]
                     }
                 }]
               }
             };
             //center the map
            $scope.centerJSON("floods");
         }

         if(allalerts.fires.length){
             //set the geojson for alerts
             $scope.geojson.fires = {
               style: {
                    fillColor: "#e3980a",
                    weight: 2,
                    opacity: 1,
                    color: 'white',
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
                     id: "Fires",
                     properties: { name: "Fire Alert" },
                     geometry: {
                       type: "MultiPolygon",
                       coordinates: [ allalerts.fires ]
                     }
                 }]
               }
             };
             //center the map
            $scope.centerJSON("fires");
         }

         if(allalerts.other.length){
             //set the geojson for alerts
             $scope.geojson.other = {
               style: {
                    fillColor: "#222222",
                    weight: 2,
                    opacity: 1,
                    color: 'white',
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
                     id: "Other",
                     properties: { name: "Other Alert" },
                     geometry: {
                       type: "MultiPolygon",
                       coordinates: [ allalerts.other ]
                     }
                 }]
               }
             };
             //center the map
            $scope.centerJSON("other");
         }

       });
     };

     // Mouse over function, called from the Leaflet Map Events
    var alertMouseover = function (feature, leafletEvent) {
        var layer = leafletEvent.target;
        layer.setStyle({
            weight: 2,
            color: '#666',
            fillColor: 'white'
        });
        layer.bringToFront();
    };

    $scope.$on("leafletDirectiveGeoJson.mouseover", function(ev, leafletPayload) {
        alertMouseover(leafletPayload.leafletObject.feature, leafletPayload.leafletEvent);
    });

}).controller('stateCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $geolocation, leafletData, FWService) {

  $scope.state = $stateParams.state;
  $scope.alerts = null;
  $scope.areaPolygonAlerts = null;

  $scope.markers = {alerts:[]};

  angular.extend($scope, FWService.mapOptions($scope));

  FWService.alerts($scope.state).then(function(alerts){
    $scope.alerts = alerts;
    $scope.statePolygonAlerts = alerts.filter(function(a){
      return (!!a['cap:polygon'] && a['cap:polygon'][0] != "") ? a : null;
    });
    console.log($scope.areaPolygonAlerts);
  });

});
