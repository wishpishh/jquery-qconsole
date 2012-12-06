(function($) {
	"use strict";
	
	var defaults = {
		dropdownDuration: 150,
		historySize: 50,
		triggerKeyCombos: [[17, 188]] // ctrl + ,
	};	
	
	var supportsLocalStorage;
	var activeKeys = [];
	var hist;
	var histCursor = 0;
	var $input, $wrapper, $console, $textarea;
	
	$.qconsole = function(options) {
		var opts = $.extend({}, defaults, options);
		
		// Init qconsole markup
		var $container = $('<div class="qc-wrapper"><div class="qc-console"><div class="qc-textarea"></div><input class="qc-input" type="text"></input></div></div>');
		
		$('body').append($container);
		$input = $('.qc-input');
		$wrapper = $('.qc-wrapper');
		$console = $('.qc-console');
		$textarea = $('.qc-textarea');
		
		// Init event handlers
		$(document).keydown(function(e) {
			handleGlobalKeydown(opts, e);
		}).keyup(function(e) {
			handleGlobalKeyup(opts, e);
		});		

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
		
		supportsLocalStorage = supportsLocalStorage();
		initHistory();
	
	};
	
	function handleGlobalKeydown(opts, e) {
		activeKeys[e.which] = true;
	};
	
	function handleGlobalKeyup(opts, e) {
		var triggerDropdown = true;
		var triggerKeyCombo;
		
		for (var i in opts.triggerKeyCombos) {
			triggerKeyCombo = opts.triggerKeyCombos[i];
			for(var j in triggerKeyCombo) {
				if (!activeKeys[triggerKeyCombo[j]]) {
					triggerDropdown = false;
				}
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
		
		storeHistory();
	};
	
	function initHistory() {
		if (supportsLocalStorage) {
			if (window.localStorage['qc-hist']) {
				hist = JSON.parse(window.localStorage['qc-hist']);
			} else {
				hist = [];
			}
		}
	};
	
	function storeHistory() {
		if (supportsLocalStorage) {
			window.localStorage['qc-hist'] = JSON.stringify(hist);
		}
	};
	
	function supportsLocalStorage() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	}
	
	$.qconsole.defaults = defaults;
}(jQuery));