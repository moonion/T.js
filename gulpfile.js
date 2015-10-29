/**
 * Created by denis on 29.10.15.
 */
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('compress', function() {
    return gulp.src('js/T.js')
        .pipe(uglify({
            mangle: true,
            compress: {
                sequences: true,
                dead_code: true,
                conditionals: true,
                booleans: true,
                unused: true,
                if_return: true,
                join_vars: true,
                drop_console: true
            }}))
        .pipe(rename({
            extname: '.min.js'
        }))
        .pipe(gulp.dest('./'));
});