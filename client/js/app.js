var firewaterApp = angular.module('firewater'
  , ['lbServices'
  ,'ui.router'
  ,'leaflet-directive'
  ,'duScroll'
  ,'nvd3'
  ,'ui.bootstrap'
  ,'ngGeolocation'
])
.config(function($stateProvider, $urlRouterProvider, $locationProvider, $logProvider, $httpProvider, $urlMatcherFactoryProvider) {

  $httpProvider.defaults.useXDomain = true;
  $httpProvider.defaults.headers.common = 'Content-Type: application/xml';
  delete $httpProvider.defaults.headers.common['X-Requested-With'];

  // $locationProvider.html5Mode(true);

  $urlMatcherFactoryProvider.strictMode(false);

  $stateProvider
    .state('home', {
      url: '',
      controller: 'mainCtrl',
      templateUrl: 'views/home.html'
    })
    .state('state', {
      url: '/state/:state',
      controller: 'mainCtrl',
      templateUrl: 'views/home.html'
    })
    .state('location', {
      url: '/location/:lat,:lng',
      controller: 'mainCtrl',
      templateUrl: 'views/home.html'
    })
    .state('otherwise', {
      url: '*path',
      templateUrl: 'views/not-found.html'
    });

    $logProvider.debugEnabled(false);

});
