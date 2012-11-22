(function($) {
	"use strict";
	
	var defaults = {
		dropdownDuration: 150,
		historySize: 50,
		triggerKeys: [17, 188] // ctrl + ,
	};	
	
	var activeKeys = [];
	var hist = [];
	var histCursor = 0;
	var $input, $wrapper, $console, $textarea;
	
	$.qconsole = function(options) {
		var opts = $.extend({}, defaults, options);
		
		var $container = $('<div class="qc-wrapper"><div class="qc-console"><div class="qc-textarea"></div><input class="qc-input" type="text"></input></div></div>');
		
		$('body').append($container);

		$(document).keydown(function(e) {
			handleGlobalKeydown(opts, e);
		}).keyup(function(e) {
			handleGlobalKeyup(opts, e);
		});
		
		$input = $('.qc-input');
		$wrapper = $('.qc-wrapper');
		$console = $('.qc-console');
		$textarea = $('.qc-textarea');

		$input.focusin(function(e) {
			$(this).fadeTo(opts.dropdownDuration, 0.3);
		}).focusout(function(e) {
			$(this).fadeTo(opts.dropdownDuration, 0.2);
		}).keyup(function(e) {
			if(e.which === 13) {
				handleInput.call(this, opts);
			} else if (e.which === 38) {
				
				if (histCursor > 0) {
					histCursor--;
				}
					$(this).val(hist[histCursor]);
			} else if (e.which === 40) {

				if(histCursor < hist.length) {
					histCursor++;
					$(this).val(hist[histCursor]);
				} else {
					$(this).val('');
				}
			}
		});
	};
	
	function handleGlobalKeydown(opts, e) {
		activeKeys[e.which] = true;
	};
	
	function handleGlobalKeyup(opts, e) {
		var triggerDropdown = true;
		
		for (var i in opts.triggerKeys) {
			if (!activeKeys[opts.triggerKeys[i]]) {
				triggerDropdown = false;
			}
		}
		
		if (triggerDropdown) {
			$wrapper.slideToggle(function() {
				$input.focus();
			});
		}

		activeKeys[e.which] = null;
	};
	
	function handleInput(opts) {
		var val = $(this).val();
		
		if (!val) return;
		
		$(this).val('');
		
		$('<span>' + val + '</span><br/>').appendTo($textarea);
				
		if (hist.length >= opts.historySize) {
			hist.splice(0, 1);
		}

		if (histCursor !== hist.length && val === hist[histCursor]) {
			hist.splice(histCursor, 1);
		}
		
		hist.push(val);
		histCursor = hist.length;
	};
	
	$.qconsole.defaults = defaults;
}(jQuery));