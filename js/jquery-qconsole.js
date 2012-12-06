(function($) {
	"use strict";
	
	var settings = {
		height: 250,
		dropdownDuration: 150,
		historySize: 50,
		triggerKeyCombos: [[17, 188]] // ctrl + ,
	};
	
	var keymap = {
		TAB: 9,
		ENTER: 13,
		UPARROW: 38,
		DOWNARROW: 40
	};
	
	var commandNames = [];
	
	var nativeCommands = {
		help: {
			helptext: 'Print list of commands and their help texts<span class="qc-output qc-tab-2">Options: [command-name]</span>',
			command: function(arg) {
				if (arg) {
					if (commandList[arg]) {
						return {
							success: true,
							message: commandList[arg].helptext
						};
					} else {
						return { success: false, message: 'no such command: ' + arg };
					}
				}
				
				var retVal = 'Available commands:';
			
				for (var c in commandList) {
					retVal += '<span class="qc-output qc-tab-2">' + c + '</span>';
				}
			
				return { success: true, message: retVal };
			}
		},
		clear: {
			helptext: 'Clear the display or input history<span class="qc-output qc-tab-2">Options: disp, hist</span>',
			command: function(arg) {
				if (!arguments.length) {
					$textarea.empty();
					return { success: true, message: '' };
				}
				
				switch (arg) {
					case 'disp':
						$textarea.empty();
						return { success: true, message: '' };
					case 'hist':
						hist = [];
						storeHistory();
						return { success: true, message: "cleared input history" };
					default:
						return { success: false, message: "invalid argument: " + arg };
				}
			}
		},
		echo: {
			helptext: 'Echo the entered text',
			command: function(val) {
				return { success: true, message: val };
			}
		},
		set: {
			helptext: 'set an option for qconsole<span class="qc-output qc-tab-2">Options: height</span>',
			command: function(opt, arg) {
				if (!arguments.length) {
					return { success: false, message: 'invalid input, must provide an argument, see "help set"' };
				}
				
				switch (opt) {
					case 'height':
						var parsedHeight = parseInt(arg, 10);
						if (!parsedHeight || parsedHeight < 0) {
							return { success: false, message: 'invalid argument, must be a number > 0' };
						}
						
						settings.height = parsedHeight;
						updateLayout();
						return { success: true, message: '' };
					default:
						return { success: false, message: 'invalid argument: ' + opt };
				}
				
			}
		}
	};
	
	var commandList = {}
	, supportsLocalStorage
	, activeKeys = []
	, autocompleteState = {
		cursor: 0,
		matches: []
	}
	, hist
	, histCursor = 0
	, $input, $wrapper, $console, $textarea;
	
	$.qconsole = function(options) {
		$.extend(settings, options);
		
		// Init qconsole markup
		$wrapper = $('<div class="qc-wrapper"><div class="qc-console"><div class="qc-textarea"></div><input class="qc-input" type="text"></input></div></div>');
		$console = $wrapper.find('.qc-console');
		$input = $wrapper.find('.qc-input');
		$textarea = $wrapper.find('.qc-textarea');
		
		updateLayout();
		
		$('body').append($wrapper);
		
		// Init event handlers
		$(document).keydown(handleGlobalKeydown).keyup(handleGlobalKeyup);

		$input.focusin(function(e) {
			$(this).fadeTo(settings.dropdownDuration, 0.3);
		}).focusout(function(e) {
			$(this).fadeTo(settings.dropdownDuration, 0.2);
		}).keyup(handleInputKeyUp);
		
		supportsLocalStorage = supportsLocalStorage();
		initHistory();
	
		// init commands list and names
		$.extend(commandList, nativeCommands);
		parseCommandNames();
	};
	
	function handleInputKeyUp (e) {		
		if (e.which !== keymap.TAB) {
			autocompleteState.matches = [];
			autocompleteState.cursor = 0;
		}
		
		switch(e.which) {
			case keymap.ENTER:
				handleInput.call(this);
				break;
			case keymap.UPARROW:
				if (histCursor > 0) {
					histCursor--;
				}			
				$(this).val(hist[histCursor]);
				break;
			case keymap.DOWNARROW:
				if(histCursor < hist.length) {
					histCursor++;
					$(this).val(hist[histCursor]);
				} else {
					$(this).val('');
				}
				break;
			case keymap.TAB:
				if (autocompleteState.matches.length) {
					autocompleteState.cursor = (autocompleteState.cursor + 1) % autocompleteState.matches.length;
				} else {
					for (var c in commandNames) {
						if(commandNames[c].match(new RegExp($(this).val(), 'i'))) {
							autocompleteState.matches.push(commandNames[c]);
						}
					}
				}
				
				if (autocompleteState.matches.length) {
					$(this).val(autocompleteState.matches[autocompleteState.cursor] + ' ');
				}
				break;
		}
	};
	
	function handleGlobalKeydown (e) {
		if (e.which === keymap.TAB) {
			e.preventDefault();
		}
		
		activeKeys[e.which] = true;
	};
	
	function handleGlobalKeyup (e) {
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
		
		$(this).val('');
		
		var parsedInput = input.split(' ')
		, command = parsedInput[0]
		, args = parsedInput.slice(1, parsedInput.length)
		, $outputWrapper = $('<span class="qc-output"></span>')
		, $inputEcho = $('<span class="qc-output qc-italic">' + input + '</span><span class="qc-output-cur">-></span>')
		, $retValWrapper = $('<span></span>')
		, retVal = ''
		, result;
		
		$outputWrapper.append($inputEcho).append($retValWrapper);
				
		if (commandList[command]) {
			result = commandList[command].command.apply(this, args);
			retVal = result.message || '';
		} else {
			result = { success: false, message: 'unknown command: ' + command };
			retVal += result.message;
		}
		
		if (!result.success) {
			$retValWrapper.addClass('qc-unknown-command').addClass('qc-italic');
		}
		
		if (!retVal.length) {
			$inputEcho.hide();
		}
		
		$retValWrapper.html(retVal);
		$outputWrapper.appendTo($textarea);
		
		updateHistory(input);
		updateTextarea();
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
	
	function updateTextarea() {
		$textarea.stop().animate({ scrollTop: $textarea[0].scrollHeight }, 150);
	};
	
	function updateLayout() {
		$wrapper.css('height', settings.height + 'px');
		$input.css('font-size', '16px');
		$textarea.css('height', settings.height - 60 + 'px');
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
	
	function parseCommandNames() {
		for (var c in commandList) {
			commandNames.push(c);
		}
	};
	
	$.qconsole.settings = settings;
}(jQuery));