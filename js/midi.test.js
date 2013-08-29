MIDI()
.then(function(midi) {
	console.log(midi);

	midi
	.on({
		port: 'Port 1',
		channel: 1,
		message: 'noteon',
		data1: function(n) {
			return n > 59 && n < 64;
		}
	}, function(e) {
		console.log('noteon', e.note(), e.message);

		e.noteoff(function() {
			console.log('noteoff', e.note());
		});
	})
	.on({
		message: 'cc'
	}, function(e) {
		console.log(e.message, e);
	});

})
.catch(function(error) {
	console.log('ERROR', error.message);
});


//function greater79(n) {
//	return n > 79; 
//}
//
//function returnTrue() {
//	return true;
//}
//
//console.log(MIDI);
//
//MIDI.on(function(t,c,n,v){
//	console.log('HANDLER 1');
//	console.log('message:',t,c,n,v);
//});
//
//MIDI.on('noteon', 1, 60, function(t,c,n,v){
//	console.log('HANDLER 2');
//	console.log('message:',t,c,n,v);
//});
//
//MIDI.on('noteon', 1, 60, greater79, function(t,c,n,v){
//	console.log('HANDLER 3');
//	console.log('message:',t,c,n,v);
//});
//
//MIDI.on('cc', returnTrue, 7, function(t,c,n,v){
//	console.log('HANDLER 4');
//	console.log('message:',t,c,n,v);
//});

//console.log('noteon ------');
//
//MIDI.trigger('noteon', 1, 60, 79);
//
//console.log('cc ----------');
//
//MIDI.trigger('cc', 1, 7, 64);


