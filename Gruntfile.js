module.exports = function(grunt) {
	grunt.initConfig({
		concat: {
			'js/midi.js': [
				'src/midi.js',
				'src/midi.utils.js',
				'src/midi.input.js',
				'src/midi.output.js',
				'src/midi.filter.js',
				'src/midi.modify.js',
				'src/midi.continuous.js',
				'src/midi.graph.js',
				'src/midi.out-map.js',
				'src/midi.out-array.js',
				'src/midi.log.js'
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
