firewaterApp.controller('homeCtrl', function($rootScope, $scope, $stateParams, $state, $filter, $geolocation, leafletData, FWService) {

  $scope.position = null;

  $geolocation.getCurrentPosition({
        timeout: 60000
     }).then(function(position) {
        $scope.position = position;
        console.log(position)
        FWService.state(position.coords).then(function(state){
          console.log(state)
          if(state){
            FWService.alerts(state).then(function(alerts){
              console.log(alerts)
            });
          }
        });
     });
});
