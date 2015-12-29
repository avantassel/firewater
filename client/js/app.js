/*
  firewater
  App
*/

var firewaterApp = angular.module('firewater'
  , ['lbServices'
  ,'ui.router'
  ,'leaflet-directive'
  ,'duScroll'
  ,'nvd3'
  ,'nvd3ChartDirectives'
  ,'ui.bootstrap'
  ,'ngGeolocation'])
.config(function($stateProvider, $urlRouterProvider, $locationProvider, $logProvider, $httpProvider) {

  $httpProvider.defaults.useXDomain = true;
  $httpProvider.defaults.headers.common = 'Content-Type: application/xml';
  delete $httpProvider.defaults.headers.common['X-Requested-With'];

  $locationProvider.html5Mode(true);

  $stateProvider
    .state('home', {
      url: '/',
      controller: 'homeCtrl',
      templateUrl: 'views/home.html'
    })
    .state('state', {
      url: '/state/:state',
      controller: 'stateCtrl',
      templateUrl: 'views/state.html'
    })
    .state('location', {
      url: '/state/:state/:lat,:lng',
      controller: 'stateCtrl',
      templateUrl: 'views/state.html'
    })
    .state('otherwise', {
      url: '*path',
      templateUrl: 'views/not-found.html'
    });

    $logProvider.debugEnabled(false);

});