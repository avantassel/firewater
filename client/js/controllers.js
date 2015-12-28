firewaterApp.controller('homeCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $geolocation, leafletData, FWService) {

  $scope.geocode = {state:'us', formatted_address:'', geometry:{}};
  $scope.position = null;
  $scope.alerts = null;
  $scope.forecast = null;
  $scope.areaPolygonAlerts = null;

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

     $scope.getAlerts = function(){
      //  FWService.alerts($scope.geocode.state).then(function(alerts){
      FWService.alerts('us').then(function(alerts){
         //set alerts
         $scope.alerts = alerts;
         //only get alerts with polygon for mapping
         $scope.statePolygonAlerts = alerts.filter(function(a){
           return (!!a['cap:polygon'] && a['cap:polygon'][0] != "") ? a : null;
         });
         console.log('areaPolygonAlerts',$scope.areaPolygonAlerts);
       });
     };

}).controller('stateCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $geolocation, leafletData, FWService) {

  $scope.state = $stateParams.state;
  $scope.alerts = null;
  $scope.areaPolygonAlerts = null;

  FWService.alerts($scope.state).then(function(alerts){
    $scope.alerts = alerts;
    $scope.statePolygonAlerts = alerts.filter(function(a){
      return (a['cap:polygon'][0] != "") ? a : null;
    });
    console.log($scope.areaPolygonAlerts);
  });

});
