firewaterApp.filter('parseState', function() {
  return function(geocode) {
      if(geocode && geocode.length)
        return geocode[0]['value'][1].split(' ')[0].substring(0,2);
      return '';
    }
}).filter('moment', function() {
  return function(date) {
      if(!date)
        return '';
      return moment(new Date(date)).fromNow();
    }
}).filter('eventIcon', function() {
  return function(alert) {
        if(!alert)
          return 'bell';

        if(alert.indexOf('Flood') !== -1){
          return 'tint';
        }
        else if(alert.indexOf('Fire') !== -1){
          return 'fire';
        }
        else if(alert.indexOf('Winter') !== -1
        || alert.indexOf('Frost') !== -1
        || alert.indexOf('Freez') !== -1
        || alert.indexOf('Blizzard') !== -1){
          return 'asterisk';
        }
        else {
          return 'bell';
        }
    }
});
