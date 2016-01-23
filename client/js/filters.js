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

        if(alert['cap:event']&& alert['cap:event'][0].indexOf('Flood') !== -1){
          return 'tint';
        }
        else if(alert['cap:event'] && alert['cap:event'][0].indexOf('Fire') !== -1){
          return 'fire';
        }
        else if(alert['cap:event'] && (
            alert['cap:event'][0].indexOf('Winter') !== -1
              || alert['cap:event'][0].indexOf('Frost') !== -1
              || alert['cap:event'][0].indexOf('Freez') !== -1
              || alert['cap:event'][0].indexOf('Blizzard') !== -1
            ) ||
            alert['summary'] && (
              alert['summary'][0].indexOf('HEAVY SNOW') !== -1
              || alert['summary'][0].indexOf('HEAVY BANDS OF SNOW') !== -1
            )){
          return 'asterisk';
        }
        else {
          return 'bell';
        }
    }
}).filter('highlight', function($sce) {
    return function(text, phrase) {
      if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'),
        '<span class="highlighted">$1</span>')

      return $sce.trustAsHtml(text)
    }
}).directive('incCounter', function(){
  // https://github.com/Kop4lyf/angular-animation-counter
	//a function to convert the value to locale
	function generateLocale(value, locale){

		if(locale && Number.toLocaleString){
			return (+value).toLocaleString(locale);
		} else {
			return value;
		}
	}

	return {
		restrict : 'A',
		scope : {
			value : "@",
			interval : "@",
			locale : "@"
		},
		link: function($scope, element, attrs){

			element.html($scope.value);
			$scope.$watch('value', function(newVal, oldVal) {

        newVal = (newVal || 0);
				oldVal = (oldVal || 0);

        newVal = newVal.replace(/,/g,'');
        oldVal = oldVal.replace(/,/g,'');

				if(+newVal !== +oldVal){
					setCounter(parseInt(oldVal,10), parseInt(newVal,10));
				}
			});

			//function to run counter from start to end
			function setCounter(start, end){
				if(start == end){
					return;
				}
				//get steps for interval and the divisions so that we can complete the animations in that interval
				var steps = 20; //get steps or defaults to 20
				var divisions = (($scope.interval || 1)*1000)/steps; //divide the number to get divisions for change interval
				var locale = $scope.locale;

				//SETTING the values of counter to run between difference
				var diff = end - start, counter = start, incr = (end-start>0);
				var interval = $scope.interval;//diff/divisions;

				//this is so that form minor differences, the counter should not run unnecessarily
				// interval = Math.abs(interval)>1 ? interval : (interval>0 ? 1 : -1);

				var intFunc = setInterval(function(){

					//when the counter goes beyond range, clearing the interval
					if((incr && counter >= end) || (!incr && counter <= end)){
						element.html(generateLocale(end, locale));
						clearInterval(intFunc);
						return;
					}
					element.html(generateLocale(Math.round(+counter), locale)); //showing the round off value in the interim
					counter = ((+counter) + (+interval)); //adding + before variable converts it to number
				}, steps);
			}
		}
	};
});
