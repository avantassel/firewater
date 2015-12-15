/*
  firewater
  App
*/

var firewaterApp = angular.module('firewater', ['lbServices','ui.router','leaflet-directive','duScroll','nvd3','ui.bootstrap']);

firewaterApp.config(function($stateProvider, $urlRouterProvider, $locationProvider, $logProvider) {

  $locationProvider.html5Mode(true);

  $stateProvider
    .state('home', {
      url: '/',
      controller: 'homeCtrl',
      templateUrl: 'views/home.html'
    })
    .state('otherwise', {
      url: '*path',
      templateUrl: 'views/not-found.html'
    });

    $logProvider.debugEnabled(false);

});
