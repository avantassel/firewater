firewaterApp.filter('parseState', function() {
  return function(geocode) {
        return geocode[0]['value'][1].split(' ')[0].substring(0,2);
    }
});
