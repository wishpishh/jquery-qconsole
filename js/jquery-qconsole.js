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
		source: {},
		update: function (pattern) {
		    this.reset();
			if (!this.source) return;
		    
			for (var entry in this.source) {
				if(entry.match(new RegExp('^' + pattern, 'i'))) {
					this.matches.push(entry);
				}
			}
		},
		reset: function () {
			this.matches = [];
			this.cursor = 0;
		}
	}
	, hist
	, histCursor = 0
	, $input, $wrapper, $console, $textarea
	, svcDesc;
	
	var nativeCommands = {
		help: {
			helptext: 'Print list of commands and their help texts\n  Options: [command-name]',
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
				
				var retVal = 'Available commands:\n';
			
				for (var c in commandList) {
					retVal += '  ' + c + '\n';
				}
			
				return { success: true, result: retVal };
			},
			autocomplete: commandList,
			type: 'client'
		},
		clear: {
			helptext: 'Clear the display or input history\n  Options: disp, hist',
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
			autocomplete: {disp: {}, hist: {}},
			type: 'client'
		},
		service: {
			helptext: 'print out the service description object',
			command: function() {
				if (!svcDesc) {
					return { success: false, result: 'no service description has been acquired'};
				}
				
				return { success: true, result: svcDesc };
			},
			type: 'client'
		}
	};
	
	$.qconsole = function(options) {
		$.extend(settings, options);
		
		// Init qconsole markup
		$wrapper = $('<div class="qc-wrapper"><div class="qc-console"><div class="qc-textarea"></div><input type="text"></input></div></div>');
		$console = $wrapper.find('.qc-console');
		$input = $wrapper.find('input');
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
	};
	
	function handleInputKeyUp (e) {
		var activeCommand
		, currentValParsed
	    , inputElem = this
		, currentVal = $(inputElem).val()
		, lastToken;
		
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
				
				// there was actually nothing entered so don't do anything
				if (!currentValParsed.length) break;
				
				activeCommand = commandList[currentValParsed[0]];
				
				// this means we've probably edited the command after typing in several tokens
				if (!activeCommand && currentValParsed.length > 1) break;
				
				lastToken = currentValParsed[currentValParsed.length - 1];
				
				// we're currently toggling between matching autocomplete results
				if (autocompleteState.matches.length > 1) {
					autocompleteState.cursor = (autocompleteState.cursor + 1) % autocompleteState.matches.length;
				}
				// we're not currently toggling previous autocomplete results so we want to see if there are any
				// new autocomplete result for the most recent input token
				else if (!activeCommand || activeCommand.type === 'client') {
					autocompleteState.source = commandList;
					
					for (var key in currentValParsed) {
						if (autocompleteState.source[currentValParsed[key]]) {
							autocompleteState.source = autocompleteState.source[currentValParsed[key]].autocomplete || {};
						}
					}
						
					autocompleteState.update(lastToken);
				} else if (svcDesc && svcDesc.autocomplete) {
					return $.ajax({
						url: svcDesc.autocomplete,
						data: { command: currentVal },
						success: function(data) {
							autocompleteState.reset();
							
							if (!(data instanceof Array)) { return; }
							
							autocompleteState.source = {};
							
							for (var i in data) {
								autocompleteState.source[data[i]] = {};
							}

							autocompleteState.update(lastToken);

							renderAutocompletion.call(inputElem, currentValParsed);
						}
					});
				}
				
				if (autocompleteState.matches.length) {
				    renderAutocompletion.call(inputElem, currentValParsed);
				}
				break;
		}
	};
    
	function renderAutocompletion(currentValParsed) {
		if (!autocompleteState.matches.length) return;
		
		// make sure to append the last autocomplete result to the input instead of replacing the whole input text,
		// but in the case there's complete valid command entered it should not be sliced off the input
		$(this).val($.trim(currentValParsed.slice(0, currentValParsed.length - 1).join(' ') +
							' ' + autocompleteState.matches[autocompleteState.cursor]));
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
			triggerDropdown = true;
			triggerKeyCombo = settings.triggerKeyCombos[i];
			for(var j in triggerKeyCombo) {
				if (!activeKeys[triggerKeyCombo[j]]) {
					triggerDropdown = false;
				}
			}

			if (triggerDropdown == true)
				break;
		}
		
		if (triggerDropdown) {
			if (!svcDesc && settings.serviceUrl) {
				$.ajax({
					url: settings.serviceUrl,
					success: function(data) {
						if (!data.commands) return;
						
						$.extend(commandList, data.commands);
						svcDesc = data;
					}
				});
			}
			
			$wrapper.slideToggle(function() {
				$input.focus();
			});
		}

		activeKeys[e.which] = null;
	};
	
	function handleInput() {
		var input = $(this).val().trim();
		
		if (!input) return;

		updateHistory(input);
		
		$(this).val('');
		
		var parsedInput = input.split(' ')
		, command = parsedInput[0]
		, args = parsedInput.slice(1, parsedInput.length)
		, result;
		
		if (commandList[command]) {
			if (commandList[command].type === 'client') {
				result = commandList[command].command.apply(this, args);
				renderResponse(input, result);
			} else if (svcDesc.execute) {
			    $.ajax({
			        url: svcDesc.execute,
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
	};
	
	function renderResponse(input, result) {
		if (!result.result) return;
	
		var $outputWrapper = $('<span class="qc-output"></span>')
		, $inputEcho = $('<span class="qc-output-cur"><</span><span class="qc-input">' + input + '</span><span class="qc-br"></span>')
		, $retValWrapper = $('<pre class="qc-result"></pre>')
		, retVal = '';
		
		if ((typeof result.result === "object") && !(result.result instanceof Array)) {
			retVal = '<code>' + JSON.stringify(result.result, null, 2) + '</code>';
		} else {
			retVal = result.result.toString(); // always call toString in case it's an array so we'll get a prettier printout
		}
		
		$outputWrapper
			.append($inputEcho)
			.append($('<span class="qc-output-cur">></span>'))
			.append($retValWrapper)
			.append($('<span class="qc-br"></span>'));
		
		if (!result.success) {
			$retValWrapper.addClass('qc-unknown-command').addClass('qc-i');
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
	
	$.qconsole.settings = settings;
}(jQuery));