(function($){"use strict";function handleInputKeyUp(e){var t,n=0,r,i=this,s=$(i).val(),o;e.which!==keymap.TAB&&autocompleteState.reset();switch(e.which){case keymap.ENTER:handleInput.call(this);break;case keymap.UPARROW:histCursor>0&&histCursor--,$(this).val(hist[histCursor]);break;case keymap.DOWNARROW:histCursor<hist.length?(histCursor++,$(this).val(hist[histCursor])):$(this).val("");break;case keymap.TAB:r=s.split(" ");if(!r.length)break;t=commandList[r[0]];if(!t&&r.length>1)break;autocompleteState.source=commandList,o=r[r.length-1];for(var u in r)autocompleteState.source&&autocompleteState.source[r[u]]&&(autocompleteState.source=autocompleteState.source[r[u]].autocomplete);autocompleteState.matches.length>1?autocompleteState.cursor=(autocompleteState.cursor+1)%autocompleteState.matches.length:autocompleteState.update(o),autocompleteState.matches.length&&renderAutocompletion.call(i,r,n)}}function renderAutocompletion(e,t){$(this).val($.trim(e.slice(0,e.length+t-1).join(" ")+" "+autocompleteState.matches[autocompleteState.cursor].name))}function handleGlobalKeydown(e){e.which===keymap.TAB&&e.preventDefault(),activeKeys[e.which]=!0}function handleGlobalKeyup(e){var t=!0,n;for(var r in settings.triggerKeyCombos){t=!0,n=settings.triggerKeyCombos[r];for(var i in n)activeKeys[n[i]]||(t=!1);if(t==1)break}t&&(!svcDesc&&settings.serviceUrl&&$.ajax({url:settings.serviceUrl,success:function(e){if(!e.commands)return;$.extend(commandList,e.commands),svcDesc=e}}),$wrapper.slideToggle(function(){$input.focus()})),activeKeys[e.which]=null}function handleInput(){var input=$(this).val().trim();if(!input)return;updateHistory(input),$(this).val("");var parsedInput=input.split(" "),command=parsedInput[0],args=parsedInput.slice(1,parsedInput.length),result;commandList[command]?commandList[command].type==="client"?(result=commandList[command].command.apply(this,args),renderResponse(input,result)):svcDesc.execute&&$.ajax({url:svcDesc.execute,data:{command:input},success:function(data){data.callback!=null&&eval(data.callback),renderResponse(input,data)}}):(result={success:!1,result:"unknown command: "+command},renderResponse(input,result))}function renderResponse(e,t){if(!t.result)return;var n=$('<span class="qc-output"></span>'),r=$('<span class="qc-output-cur"><</span><span class="qc-input">'+e+'</span><span class="qc-br"></span>'),i=$('<pre class="qc-result"></pre>'),s="";typeof t.result!="object"||t.result instanceof Array?s=t.result.toString():s="<code>"+JSON.stringify(t.result,null,2)+"</code>",n.append(r).append($('<span class="qc-output-cur">></span>')).append(i).append($('<span class="qc-br"></span>')),t.success||i.addClass("qc-unknown-command").addClass("qc-i"),s.length||r.hide(),i.html(s),n.appendTo($textarea),updateTextarea()}function initHistory(){supportsLocalStorage()&&(window.localStorage["qc-hist"]&&window.localStorage["qc-hist-cur"]?(hist=JSON.parse(window.localStorage["qc-hist"]),histCursor=JSON.parse(window.localStorage["qc-hist-cur"])):hist=[])}function storeHistory(){supportsLocalStorage()&&(window.localStorage["qc-hist"]=JSON.stringify(hist),window.localStorage["qc-hist-cur"]=histCursor)}function updateHistory(e){hist.length>=settings.historySize&&hist.splice(0,1),histCursor!==hist.length&&e===hist[histCursor]&&hist.splice(histCursor,1),hist.push(e),histCursor=hist.length,storeHistory()}function updateTextarea(){$textarea.stop().animate({scrollTop:$textarea[0].scrollHeight},150)}function updateLayout(){$wrapper.css("height",settings.height+"px"),$input.css("font-size","16px"),$textarea.css("height",settings.height-60+"px")}function supportsLocalStorage(){try{return"localStorage"in window&&window.localStorage!==null}catch(e){return!1}}var settings={serviceUrl:"",height:250,dropdownDuration:150,historySize:50,triggerKeyCombos:[[17,188]]},keymap={TAB:9,ENTER:13,UPARROW:38,DOWNARROW:40},commandList={},commandNames=[],activeKeys=[],autocompleteState={cursor:0,matches:[],source:{},update:function(e){this.reset();if(!this.source)return;for(var t in this.source)t.match(new RegExp("^"+e,"i"))&&this.matches.push({name:t,autocomplete:this.source[t].autocomplete})},reset:function(){this.matches=[],this.cursor=0}},hist,histCursor=0,$input,$wrapper,$console,$textarea,svcDesc,nativeCommands={help:{helptext:"Print list of commands and their help texts\n  Options: [command-name]",command:function(e){if(e)return commandList[e]?{success:!0,result:commandList[e].helptext}:{success:!1,result:"no such command: "+e};var t="Available commands:\n";for(var n in commandList)t+="  "+n+"\n";return{success:!0,result:t}},autocomplete:commandList,type:"client"},clear:{helptext:"Clear the display or input history\n  Options: disp, hist",command:function(e){if(!arguments.length)return $textarea.empty(),{success:!0,result:""};switch(e){case"disp":return $textarea.empty(),{success:!0,result:""};case"hist":return hist=[],storeHistory(),{success:!0,result:"cleared input history"};default:return{success:!1,result:"invalid argument: "+e}}},autocomplete:{disp:{},hist:{}},type:"client"},echo:{helptext:"Echo the entered text",command:function(e){return{success:!0,result:e}},type:"client"},set:{helptext:"set an option for qconsole\n  Options: height",command:function(e,t){if(!arguments.length)return{success:!1,result:'invalid input, must provide an argument, see "help set"'};switch(e){case"height":var n=parseInt(t,10);if(!n||n<0)return{success:!1,result:"invalid argument, must be a number > 0"};return settings.height=n,updateLayout(),{success:!0,result:""};default:return{success:!1,result:"invalid argument: "+e}}},autocomplete:{height:{autocomplete:{def:{},max:{},min:{}}},opacity:{}},type:"client"},servdesc:{helptext:"print out the service description object",command:function(){return svcDesc?{success:!0,result:svcDesc}:{success:!1,result:"no service description has been acquired"}},type:"client"}};$.qconsole=function(e){$.extend(settings,e),$wrapper=$('<div class="qc-wrapper"><div class="qc-console"><div class="qc-textarea"></div><input type="text"></input></div></div>'),$console=$wrapper.find(".qc-console"),$input=$wrapper.find("input"),$textarea=$wrapper.find(".qc-textarea"),updateLayout(),$("body").append($wrapper),$(document).keydown(handleGlobalKeydown).keyup(handleGlobalKeyup),$input.focusin(function(){$(this).fadeTo(settings.dropdownDuration,.3)}).focusout(function(){$(this).fadeTo(settings.dropdownDuration,.2)}).keyup(handleInputKeyUp),initHistory(),$.extend(commandList,nativeCommands)},$.qconsole.settings=settings})(jQuery);