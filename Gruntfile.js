module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n'
            },
            prod: {
                files: {
                    "<%= pkg.name %>.min.js": "<%= pkg.name %>.js"
                }
            }
        },
        concat: {
            options: {
                separator: ';',
            },
            dist: {
                src: ['cally.min.js', 'ajaxAntiForgery.min.js'],
                dest: 'cally-dist.min.js',
            },
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['uglify', 'concat']);
};