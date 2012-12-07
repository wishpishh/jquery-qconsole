(function($) {
	"use strict";
	
	var settings = {
		serviceUrl: '',
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
	
	var commandList = {}
	, commandNames = []
	, activeKeys = []
	, autocompleteState = {
		cursor: 0,
		matches: [],
		update: function (feed, pattern) {
			for (var entry in feed) {
				if(feed[entry].match(new RegExp('^' + pattern, 'i'))) {
					this.matches.push(feed[entry]);
				}
			}
		},
		reset: function () {
			this.matches = [];
			this.cursor = 0;
			this.updateWholeLine = false;
		},
		updateWholeLine: false
	}
	, hist
	, histCursor = 0
	, $input, $wrapper, $console, $textarea
	, service;
	
	var nativeCommands = {
		help: {
			helptext: 'Print list of commands and their help texts<span class="qc-output qc-tab-2">Options: [command-name]</span>',
			command: function(arg) {
				if (arg) {
					if (commandList[arg]) {
						return {
							success: true,
							result: commandList[arg].helptext
						};
					} else {
						return { success: false, result: 'no such command: ' + arg };
					}
				}
				
				var retVal = 'Available commands:';
			
				for (var c in commandList) {
					retVal += '<span class="qc-output qc-tab-2">' + c + '</span>';
				}
			
				return { success: true, result: retVal };
			},
			autocomplete: commandNames,
			type: 'client'
		},
		clear: {
			helptext: 'Clear the display or input history<span class="qc-output qc-tab-2">Options: disp, hist</span>',
			command: function(arg) {
				if (!arguments.length) {
					$textarea.empty();
					return { success: true, result: '' };
				}
				
				switch (arg) {
					case 'disp':
						$textarea.empty();
						return { success: true, result: '' };
					case 'hist':
						hist = [];
						storeHistory();
						return { success: true, result: "cleared input history" };
					default:
						return { success: false, result: "invalid argument: " + arg };
				}
			},
			autocomplete: ['disp', 'hist'],
			type: 'client'
		},
		echo: {
			helptext: 'Echo the entered text',
			command: function(val) {
				return { success: true, result: val };
			},
			autocomplete: [],
			type: 'client'
		},
		set: {
			helptext: 'set an option for qconsole<span class="qc-output qc-tab-2">Options: height</span>',
			command: function(opt, arg) {
				if (!arguments.length) {
					return { success: false, result: 'invalid input, must provide an argument, see "help set"' };
				}
				
				switch (opt) {
					case 'height':
						var parsedHeight = parseInt(arg, 10);
						if (!parsedHeight || parsedHeight < 0) {
							return { success: false, result: 'invalid argument, must be a number > 0' };
						}
						
						settings.height = parsedHeight;
						updateLayout();
						return { success: true, result: '' };
					default:
						return { success: false, result: 'invalid argument: ' + opt };
				}
			},
			autocomplete: ['height'],
			type: 'client'
		}
	};
	
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

		$input.focusin(function() {
			$(this).fadeTo(settings.dropdownDuration, 0.3);
		}).focusout(function() {
			$(this).fadeTo(settings.dropdownDuration, 0.2);
		}).keyup(handleInputKeyUp);
		
		initHistory();
	
		// init commands list and names
		$.extend(commandList, nativeCommands);
		parseCommandNames();
		
		if (settings.serviceUrl) {
		    $.ajax({
		        url: settings.serviceUrl,
		        success: function(data) {
		            if (!data.commands) {
		                return;
		            }

		            $.extend(commandList, data.commands);
		            parseCommandNames();

		            service = data;
		        }
		    });
		}
	};
	
	function handleInputKeyUp (e) {
		var activeCommand
		, tokensToSliceOffset = 0
		, activeArg
		, currentValParsed
	    , inputElem = this
		, currentVal = $(inputElem).val().trim();
		
		if (e.which !== keymap.TAB) {
			autocompleteState.reset();
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
				currentValParsed = currentVal.split(' ');
				
				// we're currently toggling between matching autocomplete results
				if (autocompleteState.matches.length > 1) {
					autocompleteState.cursor = (autocompleteState.cursor + 1) % autocompleteState.matches.length;
				} 
				// there is only one autocomplete result and it is a valid command
				// so we try to autocomplete on the command's parameters
				else if (autocompleteState.matches.length === 1 && commandList[currentValParsed[0]]
					&& commandList[currentValParsed[0]].autocomplete) {
					autocompleteState.reset();
					autocompleteState.update(commandList[currentValParsed[0]].autocomplete, '.*');
					tokensToSliceOffset++;
				} 
				// we're not currently toggling autocomplete results so we want to see if there are any
				// new autocomplete result for the most recent input token
				else {
					// is the most recent token the first? then it should be a command
					if (currentValParsed.length === 1) {
						autocompleteState.update(commandNames, currentVal);
					}
					// otherwise we try to autocomplete on the entered command's parameters
					else if (currentValParsed.length > 1) {
					    activeCommand = currentValParsed[0];
					    activeArg = currentValParsed[currentValParsed.length - 1];
						
						if (!commandList[activeCommand]) {
							return;
						}
						
						if (commandList[activeCommand].type !== 'client' && service && service.autocomplete) {
							$.ajax({
							    url: service.autocomplete,
								data: { command: currentVal },
								success: function(data) {
									if (!data.length) {
										return;
									}

									autocompleteState.update(data, activeArg);
									renderAutocompletion.call(inputElem, currentValParsed, tokensToSliceOffset);
								}
							});
							
							return;
						}
						
						if (!commandList[activeCommand].autocomplete) {
							break;
						}
						
						autocompleteState.update(commandList[activeCommand].autocomplete, activeArg);
					}
				}
				
				if (autocompleteState.matches.length) {
				    renderAutocompletion.call(inputElem, currentValParsed, tokensToSliceOffset);
				}
				break;
		}
	};
    
	function renderAutocompletion(currentValParsed, tokensToSliceOffset) {
	    // make sure to append the last autocomplete result to the input instead of replacing the whole input,
	    // but in the case there's valid command entered it should not be sliced off the input
        $(this).val($.trim(currentValParsed.slice(0, currentValParsed.length + tokensToSliceOffset - 1).join(' ') +
							' ' + autocompleteState.matches[autocompleteState.cursor]) + ' ');
    }
	
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

			if (triggerDropdown)
				break;
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
		, result;
		
		if (commandList[command]) {
			if (commandList[command].type === 'client') {
				result = commandList[command].command.apply(this, args);
				renderResponse(input, result);
			} else if (service.execute) {
			    $.ajax({
			        url: service.execute,
			        data: { command: input },
			        success: function(data) {
			            if (data.callback != null) {
			                eval(data.callback);
			            }

			            renderResponse(input, data);
			        }
			    });
			}
		} else {
			result = { success: false, result: 'unknown command: ' + command };
			renderResponse(input, result);
		}
		
		updateHistory(input);
	};
	
	function renderResponse(input, result) {
		var $outputWrapper = $('<span class="qc-output"></span>')
		, $inputEcho = $('<span class="qc-output qc-italic">' + input + '</span><span class="qc-output-cur">-></span>')
		, $retValWrapper = $('<span></span>')
		, retVal = result.result || '';
		
		$outputWrapper.append($inputEcho).append($retValWrapper);
		
		if (!result.success) {
			$retValWrapper.addClass('qc-unknown-command').addClass('qc-italic');
		}
		
		if (!retVal.length) {
			$inputEcho.hide();
		}
		
		$retValWrapper.html(retVal);
		$outputWrapper.appendTo($textarea);
		
		updateTextarea();
	}
	
	function initHistory() {
		if (supportsLocalStorage()) {
			if (window.localStorage['qc-hist'] && window.localStorage['qc-hist-cur']) {
				hist = JSON.parse(window.localStorage['qc-hist']);
				histCursor = JSON.parse(window.localStorage['qc-hist-cur']);
			} else {
				hist = [];
			}
		}
	};
	
	function storeHistory() {
		if (supportsLocalStorage()) {
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
	
	function parseCommandNames() {
		for (var c in commandList) {
			commandNames.push(c);
		}
	};
	
	$.qconsole.settings = settings;
}(citybreakjq));

citybreakjq(function() {
    citybreakjq.qconsole({ serviceUrl: '/QConsole.axd?action=commands', triggerKeyCombos: [[17, 188]] });
});