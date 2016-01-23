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

        if(alert['cap:event'][0].indexOf('Flood') !== -1){
          return 'tint';
        }
        else if(alert['cap:event'][0].indexOf('Fire') !== -1){
          return 'fire';
        }
        else if(alert['cap:event'][0].indexOf('Winter') !== -1
            || alert['cap:event'][0].indexOf('Frost') !== -1
            || alert['cap:event'][0].indexOf('Freez') !== -1
            || alert['cap:event'][0].indexOf('Blizzard') !== -1
            || alert['summary'][0].indexOf('HEAVY SNOW') !== -1
            || alert['summary'][0].indexOf('HEAVY BANDS OF SNOW') !== -1){
          return 'asterisk';
        }
        else {
          return 'bell';
        }
    }
});
