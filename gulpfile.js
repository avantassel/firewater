var gulp = require('gulp')
  , pipe = require('gulp-pipe')
  , debug = require('gulp-debug')
  , filter = require('gulp-filter')
  , concat = require('gulp-concat')
  , minifyCss = require('gulp-minify-css')
  , uglify = require('gulp-uglify')
  , mainBowerFiles = require('main-bower-files');

gulp.task('css', function () {
  return pipe([gulp.src(mainBowerFiles())
                ,filter('*.css')
                ,debug()
                ,concat('plugins.min.css')
                ,minifyCss({keepSpecialComments: 0})
                ,gulp.dest('./client/css')
              ])
              .on('error', function(e) { console.log(e); });
});

gulp.task('appcss', function () {
  return pipe([gulp.src(['./client/css/app.css'])
              ,debug()
              ,concat('app.min.css')
              ,minifyCss({keepSpecialComments: 0})
              ,gulp.dest('./client/css/')
            ])
            .on('error', function(e) { console.log(e); });
});

gulp.task('images', function () {
  var src = mainBowerFiles();
  src.push('client/vendor/Leaflet.extra-markers/src/images/*.png');

  return pipe([gulp.src(src)
                ,filter('*.png')
                ,debug()
                ,gulp.dest('./client/css/images')
              ])
              .on('error', function(e) { console.log(e); });
});

gulp.task('scripts', function(){

  var src = mainBowerFiles(['**/*.js']);
  src.push('client/vendor/Leaflet.Geodesic/src/L.Geodesic.js');
  src.push('client/vendor/moment-transform/dist/moment-transform.min.js');  

  return pipe([gulp.src(src)
                ,filter('*.js')
                ,debug()
                ,concat('plugins.min.js')
                ,uglify({preserveComments:'some'})
                ,gulp.dest('./client/js')
              ])
              .on('error', function(e) { console.log(e); });
});

gulp.task('appscripts', function(){
    return pipe([gulp.src(['./client/js/app.js','./client/js/controllers.js'])
              ,debug()
              ,concat('app.min.js')
              ,uglify({preserveComments:'some'})
              ,gulp.dest('./client/js')
            ])
            .on('error', function(e) { console.log(e); });
});

gulp.task('default', ['css', 'appcss', 'images', 'scripts', 'appscripts']);
