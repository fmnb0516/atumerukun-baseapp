var Toast = (function(){
	function Toast() {
		this.speed = 3000;
		this.container = $("<div>", {"class":"toast-container"});
		
		$('body').append(this.container);
	};
	
	Toast.prototype.show = function(message, speed) {
		var speed = speed === undefined ? this.speed : speed;
		var element = $("<div>", {"id":"", "class":"message-container"}).text(message);
		
		this.container.append(element);
		var leftpos = $('body').width()/2 - element.outerWidth()/2;
		element.hide().fadeIn('fast');

		this.timer = setTimeout(function() {
			element.fadeOut('slow',function(){
				$(this).remove();
			});
		}, speed);
    };
    
    return Toast;
})();