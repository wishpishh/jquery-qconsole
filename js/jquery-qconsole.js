(function($) {
	"use strict";
	
	var settings = {
		height: 250,
		dropdownDuration: 150,
		historySize: 50,
		triggerKeyCombos: [[17, 188]] // ctrl + ,
	};	
	
	var nativeCommands = {
		help: {
			helptext: 'Print list of commands and their help texts',
			command: function() {
				var retVal = '<span class="qc-output">Available commands:</span>';
			
				for (var c in commandList) {
					retVal += '<span class="qc-output qc-tab">' + c + ':';
					if (commandList[c].helptext) {
						retVal += '<span class="qc-output qc-tab">' + commandList[c].helptext + '</span>';
					}
					retVal += '</span>';
				}
			
				return retVal;
			}
		},
		clear: {
			helptext: 'Clear the display',
			command: function(arg) {
				if (!arguments.length) {
					$textarea.empty();
					return '';
				}
				
				switch (arg) {
					case 'disp':
						$textarea.empty();
						break;
					case 'hist':
						hist = [];
						storeHistory();
						return "cleared input history";
					default:
						return "invalid argument: " + arg;
				}
			}
		},
		echo: {
			helptext: 'Echo the entered text',
			command: function(val) {
				return val;
			}
		}
	};
	
	var commandList = {}	
	, supportsLocalStorage
	, activeKeys = []
	, hist
	, histCursor = 0
	, $input, $wrapper, $console, $textarea;
	
	$.qconsole = function(options) {
		$.extend(settings, options);
		
		// Init qconsole markup
		$wrapper = $('<div class="qc-wrapper"><div class="qc-console"><div class="qc-textarea"></div><input class="qc-input" type="text"></input></div></div>');
		$wrapper.css('height', settings.height + 'px');
		$console = $wrapper.find('.qc-console');
		$input = $wrapper.find('.qc-input').css('font-size', '16px');
		$textarea = $wrapper.find('.qc-textarea').css('height', settings.height - 60 + 'px');
		$('body').append($wrapper);
		
		// Init event handlers
		$(document).keydown(handleGlobalKeydown).keyup(handleGlobalKeyup);

		$input.focusin(function(e) {
			$(this).fadeTo(settings.dropdownDuration, 0.3);
		}).focusout(function(e) {
			$(this).fadeTo(settings.dropdownDuration, 0.2);
		}).keyup(function(e) {
			if(e.which === 13) {
				handleInput.call(this);
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
	
		// init commands list
		$.extend(commandList, nativeCommands);
	};
	
	function handleGlobalKeydown(e) {
		activeKeys[e.which] = true;
	};
	
	function handleGlobalKeyup(e) {
		var triggerDropdown = true;
		var triggerKeyCombo;
		
		for (var i in settings.triggerKeyCombos) {
			triggerKeyCombo = settings.triggerKeyCombos[i];
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
	
	function handleInput() {
		var input = $(this).val();
		
		if (!input) return;
		
		var parsedInput = input.split(' ')
			, command = parsedInput[0]
			, args = parsedInput.slice(1, parsedInput.length)
			, retVal = '<span class="qc-output">' + input + '</span><span class="qc-output-cur">-></span>'
			, $retValWrapper = $('<span class="qc-output"></span>');
		
		$(this).val('');
		
		if (commandList[command]) {
			retVal += commandList[command].command.apply(this, args);
		} else {
			retVal += 'unknown command: ' + command;
			$retValWrapper.addClass('qc-unknown-command');
		}
		
		$retValWrapper.html(retVal).appendTo($textarea);
		
		updateHistory(input);
		updateDisplay();
	};
	
	function initHistory() {
		if (supportsLocalStorage) {
			if (window.localStorage['qc-hist'] && window.localStorage['qc-hist-cur']) {
				hist = JSON.parse(window.localStorage['qc-hist']);
				histCursor = JSON.parse(window.localStorage['qc-hist-cur']);
			} else {
				hist = [];
			}
		}
	};
	
	function storeHistory() {
		if (supportsLocalStorage) {
			window.localStorage['qc-hist'] = JSON.stringify(hist);
			window.localStorage['qc-hist-cur'] = histCursor;
		}
	};
	
	function updateHistory(input) {
		if (hist.length >= settings.historySize) {
			hist.splice(0, 1);
		}

		if (histCursor !== hist.length && input === hist[histCursor]) {
			hist.splice(histCursor, 1);
		}
		
		hist.push(input);
		histCursor = hist.length;
		
		storeHistory();
	};
	
	function updateDisplay() {
		$textarea.stop().animate({ scrollTop: $textarea[0].scrollHeight }, 150);
	};
	
	function supportsLocalStorage() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} catch (e) {
			return false;
		}
	};
	
	function parseParamNames(fn) {
		var fnStr = commandList[c].toString();
		return fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
	};
	
	$.qconsole.settings = settings;
}(jQuery));