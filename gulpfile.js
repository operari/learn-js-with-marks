var gulp = require('gulp');
var zip = require('gulp-zip');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');
var concat = require('gulp-concat');
var concatCss = require('gulp-concat-css');
var csscomb = require('gulp-csscomb');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var sass = require('gulp-sass');
var mainNodeFiles = require('gulp-main-node-files');
var content_scripts = true;

/* Main files */

gulp.task('main-files', function() {
	return gulp.src(mainNodeFiles({
			"overrides": {
				"material-design-lite": [
					"src/ripple/ripple.js",
					"src/textfield/textfield.js",
					"src/radio/radio.js"
				],
				"mdl-selectfield": [
					"src/selectfield/selectfield.js"
				]
			}
		}))
		.pipe(gulp.dest('dist/js'));
});

/* Mdl scss */

gulp.task('mdl-copy', function() {
	var mdlpath = 'node_modules/material-design-lite/src/',
			mdlFolders = [
				'snackbar'
			],
			mdl = [],
			i;

	for (i = 0; i < mdlFolders.length; i++) {
			mdl.push(mdlpath+mdlFolders[i]+'/*.scss');

			gulp.src(mdl[i])
			.pipe(gulp.dest('blocks/'+mdlFolders[i]));
	}
});

gulp.task('mdl-copy-scss', function() {
	 var mdlpath = 'node_modules/material-design-lite/src/',
			 blocksPath = 'blocks/_*.scss',
			 mdlFiles = [
				'_color-definitions.scss',
				'_functions.scss',
				'_mixins.scss',
				'_variables.scss',
				'mdlcomponentHandler.js'
			 ];

		mdlFiles.forEach(function(name, i) {
			gulp.src(mdlpath+name)
				.pipe(gulp.dest(blocksPath.replace(/_.*/, '')));
		});

});

gulp.task('mdl-copy-js', function() {
	 var mdlpath = 'node_modules/material-design-lite/src/',
			 distPath = 'dist/js/',
			 mdlFiles = [
				'snackbar/snackbar.js'
			 ];

		mdlFiles.forEach(function(name, i) {
			gulp.src(mdlpath+name)
				.pipe(gulp.dest(distPath));
		});

});


/* Build css and js */

gulp.task('css', function() {
	var prefix = content_scripts ? '.content' : '';
	var files = content_scripts ? ['dist/css/*.css', '!dist/css/style.css'] : ['dist/css/*.css', '!dist/css/style-content.css'];
	return gulp.src(files)
		.pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
		.pipe(concatCss('bundle' + prefix + '.css'))
		.pipe(autoprefixer({
			browsers: ['last 4 versions'],
			cascade: false
		 }))
		.pipe(csscomb())
		.pipe(gulp.dest('bundle'))
		.pipe(cleanCSS({compatibility: 'ie8'}))
		.pipe(rename('bundle' + prefix + '.min.css'))
		.pipe(gulp.dest('bundle'))
		.pipe(notify('Zrobleno! Task css!'));
});

gulp.task('js', function() {
	var prefix = content_scripts ? '.content' : '';
	var files = content_scripts ?
	[
	'dist/js/0mdlcomponentHandler.js',
	'dist/js/selectfield.js',
	'dist/js/tooltip.js',
	'dist/js/app.js'
	] :
	[
	'dist/js/*.js',
	'!dist/js/app.js'
	];
	return gulp.src(files)
		.pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
		.pipe(concat('bundle' + prefix + '.js'))
		.pipe(gulp.dest('bundle'))
		.pipe(uglify())
		.pipe(rename('bundle' + prefix + '.min.js'))
		.pipe(gulp.dest('bundle'))
		.pipe(notify('Zrobleno! Task js!'));
});

/* Sass */

gulp.task('sass', function () {
	var files = content_scripts ? ['blocks/**/*.scss', '!blocks/style.scss'] : ['blocks/**/*.scss', '!blocks/style-content.scss'];
	return gulp.src(files)
		.pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
		.pipe(sass({
			 outputStyle: 'expanded',
		 }).on('error', sass.logError))
		.pipe(gulp.dest('dist/css'))
		.pipe(notify('Zrobleno! Task sass!'));
});

/* Serve */

gulp.task('default', ['sass'], function() {
		gulp.watch("blocks/**/*.scss", ['sass']);
		gulp.watch('dist/css/*.css', ['css']);
		gulp.watch('dist/js/*.js', ['js']);
});

/* Archive */

gulp.task('zip', function () {
	return gulp.src([
		'**',
		'!node_modules', '!node_modules/**',
		'!dist', '!dist/**',
		'!blocks', '!blocks/**',
		'!.gitignore',
		'!gulpfile.js',
		'!package.json',
		'!todo.todo'
	], {base: '.'})
		.pipe(zip('learnjavascriptmarks.zip'))
		.pipe(gulp.dest('.'))
		.pipe(notify('Zrobleno! Task zip!'));
});