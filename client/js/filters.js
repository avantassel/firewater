firewaterApp.filter('parseState', function() {
  return function(geocode) {
        return geocode[0]['value'][1].split(' ')[0].substring(0,2);
    }
}).filter('moment', function() {
  return function(date) {
        return moment(new Date(date)).fromNow();
    }
}).filter('eventIcon', function() {
  return function(event) {
        if(event.indexOf('Flood') !== -1){
          return 'tint';
        }
        else if(event.indexOf('Fire') !== -1){
          return 'fire';
        }
        else if(event.indexOf('Winter') !== -1
        || event.indexOf('Frost') !== -1
        || event.indexOf('Freez') !== -1
        || event.indexOf('Blizzard') !== -1){
          return 'asterisk';
        }
        else {
          return 'bell';
        }
    }
});
