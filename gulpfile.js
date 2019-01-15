var gulp = require('gulp');
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var pug = require('gulp-pug');
var del = require('del');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var autoprefixer    = require('gulp-autoprefixer');
var browserSync = require('browser-sync').create(); 

// Browserify + Watchify
var browserify = require('browserify');
var watchify = require('watchify');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var assign = require('lodash.assign');

var paths = {
	dest    : {
        html: './dist/',
        css: './dist/assets/styles/',
        js: './dist/assets/scripts/',
        imgs: './dist/assets/images/'
    },
	src : {
        scripts : './src/assets/scripts/app.js',
        styles  : './src/assets/styles/**/*.sass',
        html    : './src/template/**/*.pug',
        images  : ['./src/assets/favicon.ico', './client/assets/images/**/*.*']
    }
};

/*
 * Cleans the dist directory
 */
gulp.task('clean:styles', function (cb) {
  del(paths.dest.css, cb);
});

gulp.task('clean:images', function (cb) {
  del(paths.dest.imgs, cb);
});

gulp.task('clean:html', function (cb) {
  del(paths.dest.html, cb);
});

/*
 * Checks the validity of JS code
 */
gulp.task('lint', function () {
	return gulp.src(paths.src.scripts)
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

/*
 * Compiles CJS modules into an all-in-one bundle
 */

// Options browserify
var customOpts = {
    entries: [paths.src.scripts],
    debug: true
};

// Utilisation du module lowdash.assign pour fusionner
// les options browserify et watchify dans un même objet
var opts = assign({}, watchify.args, customOpts);

// Initialisation de Watchify
var bundler = watchify(browserify(opts));

// Il est possible d'ajouter des transformations ici, par exemple :
// bundler.transform(coffeeify);

bundler.on('update', bundle); // listener sur l'évènement 'update' pour mettre à jour pour le bundle
bundler.on('log', gutil.log); // log les sorties du bundler sur le terminal
gulp.task('scripts', bundle); // ajout de la tâche `gulp scripts` pour assembler le bundle

function bundle() {
    return bundler.bundle()
        // log les errors quand elles surviennent
        .on('error', gutil.log.bind(gutil, 'Browserify Error'))
        .pipe(source('bundle.js'))
        // optionnel, permet de bufferiser le contenu des fichiers pour améliorer les performances du build
        .pipe(buffer())
        // optionnel, permet d'ajouter les sourcemaps pour le debug
        .pipe(sourcemaps.init({loadMaps: true}))
        // Ecrit les fichiers .map
        .pipe(sourcemaps.write('./maps/'))
        // Copie le tout dans le répertoire final
        .pipe(gulp.dest(paths.dest.js))
        // stream le résultat à BrowserSync pour qu'il recharge automatiquement la page
        .pipe(browserSync.stream());
}


/*
 * Compiles less files into css
 */
gulp.task('styles', ['clean:styles'], function () {
    return gulp.src(paths.src.styles)
        .pipe(plumber())
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(sourcemaps.write({includeContent: false}))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(sourcemaps.write('./maps'))
        .pipe(gulp.dest(paths.dest.css))
        .pipe(browserSync.stream());
});

/*
 * Copies html files to dist directory
 */
gulp.task('html', ['clean:html'], function () {
    return gulp.src(paths.src.html)
        .pipe(plumber())
        .pipe(pug({pretty: true}))
		.pipe(gulp.dest(paths.dest.html))
        .pipe(browserSync.stream());
});

/*
 * Copies images files to dist directory
 */
gulp.task('images', ['clean:images'], function () {
	return gulp.src(paths.src.images)
		.pipe(gulp.dest(paths.dist + '/img'))
        .pipe(browserSync.stream());
});

/*
 * Macro task to re-build the whole dist directory
 */
gulp.task('build', [
	'lint',
    'scripts',
	'html', 
	'images',
	'styles'
]);

/*
 * Synchronizes the browser with the 'dist' directory
 */
gulp.task('serve', ['build'], function () {
    browserSync.init({
        notify: true,
        port: 9000,
        server: {
            baseDir: ['dist']
        }
    });
    
    gulp.watch(paths.src.scripts, ['lint', 'scripts']);
    gulp.watch(paths.src.styles, ['styles']);
    gulp.watch(paths.src.html, ['html']);
    gulp.watch(paths.src.images, ['images']);

});

/*
 * Default task, builds everything and watches for changes
 */
gulp.task('default', ['serve']);
