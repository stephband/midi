module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			'js/midi.js': [
				'src/midi.js',
				'src/midi.utils.js'
			]
		},

		uglify: {
			'js/midi.min.js': ['js/midi.js']
		}
	});

	// Load Our Plugins
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Register Default Task
	grunt.registerTask('default', ['concat', 'uglify']);
};
