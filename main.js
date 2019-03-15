const {app, dialog, BrowserWindow} = require('electron');
const path = require('path');

var fs = require('fs')
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

function myTrim(x) { return x.replace(/^\s+|\s+$/gm,''); }

function searchStringInArray (str, strArray) {
	for (var j=0; j<strArray.length; j++) {
		if (strArray[j].match(str)) return j;
	}

	return -1;
}

function findEndingBrace(inString, startIndex, braceStrings)
{
	if(braceStrings.length != 2) return -1;

	var leftCurlyBraceIndex = inString.indexOf(braceStrings[0], startIndex);
	var rightCurlyBracesTobeIgnored = 0;
	var rightCurlyBraceIndex = -1;

	for (var i = leftCurlyBraceIndex + 1, len = inString.length; i < len; i++)
	{
		if(inString[i] == braceStrings[1])
		{
			if (rightCurlyBracesTobeIgnored == 0)
			{
				rightCurlyBraceIndex = i;
				break;
			}
			else
			{
				rightCurlyBracesTobeIgnored -= 1;
			}
		}
		else if(inString[i] == braceStrings[0])
		{
			rightCurlyBracesTobeIgnored += 1;
		}
	}

	return rightCurlyBraceIndex;
}

function removeSpaces(inString) {
	var result = myTrim(inString);
	var index = result.indexOf(" ");
	while(index >= 0) {
		result = result.substring(0,index) + result.substring(index+1, result.length);
		index = result.indexOf(" ");
	}

	return result;
}

function processDefsText(inText) {
	var defsObj = {};

	var openBracketIndex = 0;
	var closeBracketIndex = -1;
	while(openBracketIndex < inText.length) {
		closeBracketIndex = findEndingBrace(inText, openBracketIndex, "()");

		if(closeBracketIndex > -1) {
			// find the end of the definition
			// find the following ;newline
			var newlineIndex = inText.indexOf('\n', closeBracketIndex);

			if(newlineIndex > -1) {
				// determine if we have a Bitmap or a Sprite
				// previouse newline
				var previousNewLineIndex = inText.substring(openBracketIndex, newlineIndex).lastIndexOf('\n') + openBracketIndex;
				var bitmapOrSpriteSnippet = inText.substring(previousNewLineIndex, newlineIndex);

				// search for Bitmap or Sprite
				if(bitmapOrSpriteSnippet.search(/\bnew cjs\.Bitmap\b/) > -1) {
					// we have a bitmap get the end of the def
					var nextNewLineIndex = inText.indexOf('\n', newlineIndex+1);
					if(nextNewLineIndex > -1) {
						if(inText.substring(newlineIndex+1, nextNewLineIndex).search('p\.nominalBounds') > -1) {
							var resObj = { type: "Bitmap", def: inText.substring(openBracketIndex, nextNewLineIndex) };
							defsObj[resObj.def.match(/(?:\(lib\.)(\w+)\b/)[1]] = resObj;
							openBracketIndex = inText.indexOf('(', nextNewLineIndex+1);
						}
					}
				}
				else if(bitmapOrSpriteSnippet.search(/\bnew cjs\.Sprite\b/) > -1) {
					// we have a sprite. find the next newlineIndex
					// console.log("We have a sprite");
					var resObj = { type: "Sprite", def: inText.substring(openBracketIndex, newlineIndex) };
					resObj.spriteSheet = resObj.def.match(/(?:initialize\(ss\[\")(.+)(\"\])/)[1];

					var stopFrameIndex = resObj.def.search(/\bthis\.gotoAndStop\b/);
					if(stopFrameIndex > -1) {
						var stopFrameStartIndex = resObj.def.indexOf('(', stopFrameIndex);
						var stopFrameEndIndex = findEndingBrace(resObj.def, stopFrameStartIndex, "()");
						if(stopFrameEndIndex > -1) {
							var frame = parseInt(resObj.def.substring(stopFrameStartIndex+1, stopFrameEndIndex));
							resObj.frame = frame;
							defsObj[resObj.def.match(/(?:\(lib\.)(\w+)\b/)[1]] = resObj;
							// defsArray.push(resObj);
							openBracketIndex = inText.indexOf('(', newlineIndex+1);
						}
					}
				}
				else {
					openBracketIndex = inText.indexOf('(', newlineIndex+1);
				}
			}
			else {
				break;
			}
		}
		else {
			break;
		}

		if(openBracketIndex < 0)
			break;
	}

	return defsObj;
}

function processJSON(inFiles, inIndexFiles) {
  if( ((inFiles) && (inFiles.length > 0)) && ((inIndexFiles) && (inIndexFiles.length > 0)) ) {
    var isWin = process.platform === "win32";
		var jsonDirectory = isWin ? inFiles[0].substring(0, inFiles[0].lastIndexOf("\\")) : inFiles[0].substring(0, inFiles[0].lastIndexOf("\/"));
		var indexDirectory = isWin ? inIndexFiles[0].substring(0, inIndexFiles[0].lastIndexOf("\\")) : inIndexFiles[0].substring(0, inIndexFiles[0].lastIndexOf("\/"));

		var relativeJsonDir = path.relative(indexDirectory, jsonDirectory);

    var html_string = fs.readFileSync(inIndexFiles[0], 'utf8');
    var found = html_string.match(/<html>/g);
    var fileContent = html_string.replace(/^\uFEFF/, '');

		const dom = new JSDOM(fileContent);
    var scriptInputs = dom.window.document.getElementsByTagName('script');

		// process each JSON
		var outSSMetaDataObjArray = new Array();
		var inSSMetaDataObjArray = new Array();
		var outSymbolDefs = "";
		inFiles.forEach( (item) => {
			var jsonString = fs.readFileSync(item, 'utf8');
	    jsonString = jsonString.trim();
	    var obj = JSON.parse(jsonString);

	  	var baseName = obj.meta.image;
	  	baseName = baseName.lastIndexOf(".") > 0 ? baseName.substring(0,baseName.lastIndexOf(".")) : baseName;

			// get number of properties
	  	var testObj = obj.frames;
	  	var frameRectArray = [];
			var newSymbolsArray = [];
			var tempObj = { name: baseName, frames: new Array() }
			var frameIndex = 0;
	  	for (var key in testObj) {
	  		if (testObj.hasOwnProperty(key)) {
					// find if key has period in it
					var keyName = key;
					var periodIndex = keyName.indexOf('.');
					if(periodIndex > -1)
						keyName = (key.substring(periodIndex+1, key.length).length == 3) ? key.substring(0, periodIndex) : key.replace(/([^\w-]+)/g, '');

					tempObj.frames.push([testObj[key].frame.x, testObj[key].frame.y, testObj[key].frame.w, testObj[key].frame.h]);
					var symbolDef = "(lib." + keyName + " = function() {\n\tthis.initialize(ss[\"" + baseName + "\"]);\n\tthis.gotoAndStop(" + frameIndex + ");\n}).prototype = p = new cjs.Sprite();";

					newSymbolsArray.push({ name: keyName, symbolDef: symbolDef });
					frameIndex++;
	  		}
	  	}
			outSSMetaDataObjArray.push(tempObj);
			inSSMetaDataObjArray.push({imagePath: obj.meta.image, newSymbols: newSymbolsArray});
		});

    // find script that hold lib.ssMetaData
    var scriptIndex = 0;
		var libMetadataIndex = -1;
		while(scriptIndex < scriptInputs.length) {
			if(scriptInputs[scriptIndex].text.search(/\blib.ssMetadata =/) > -1) {
				libMetadataIndex = scriptIndex;
				break;
			}
			scriptIndex++;
		}

    // if libMetadataIndex exists then get the line as an Array
    if(libMetadataIndex > -1) {
			var scriptText = scriptInputs[libMetadataIndex].text;

      var startOfLibMeta = scriptText.search(/\blib.ssMetadata =/);
      var endOfLibMeta = scriptText.indexOf(";", startOfLibMeta);
      var libsmetaDataStatement = scriptText.substring(startOfLibMeta, endOfLibMeta+1);

      // find the right hand side Array
      var openBrackIndex = libsmetaDataStatement.indexOf('[');

			var closeBrackIndex = findEndingBrace(libsmetaDataStatement, openBrackIndex, "[]");
			if(closeBrackIndex > -1) {
				var arrayString = libsmetaDataStatement.substring(openBrackIndex, closeBrackIndex+1);

	      var libssMetadataArray = eval(arrayString);
	      libssMetadataArray.push(...outSSMetaDataObjArray);
			}

			// find the beginning of symbol outSymbolDefs
			var beginIndex = scriptText.indexOf('(', closeBrackIndex+1);
			var endIndex = scriptText.indexOf('function mc_symbol_clone()');
			var symDefsText = scriptText.substring(beginIndex, endIndex);
			// console.log(symDefsText);

			// defs is an object where each property is one of the lib clip names
			var defs = processDefsText(symDefsText);

			// now we have an array of the original definitions
			// we can search it
			// find all the spritesheets used and count how many times each is used
			var usedSSObj = {};
			var defsKeys = Object.keys(defs);
			defsKeys.forEach( (ky) =>{
				if(usedSSObj.hasOwnProperty( defs[ky].spriteSheet )) {
					usedSSObj[defs[ky].spriteSheet]++;
				}
				else {
					usedSSObj[defs[ky].spriteSheet] = 1;
				}
			});

			var removeFromManifestArray = new Array();
			// for each new symbolDef find the old and replace it
			for(var i=0; i<outSSMetaDataObjArray.length; i++) {
				for(var j=0; j<outSSMetaDataObjArray[i].frames.length; j++) {
					var name = inSSMetaDataObjArray[i].newSymbols[j].name;

					// find this name in the defs Obj
					if(defs.hasOwnProperty(name)) {
						var usedSS = defs[name].spriteSheet;
						defs[name].def = inSSMetaDataObjArray[i].newSymbols[j].symbolDef;
						defs[name].spriteSheet = outSSMetaDataObjArray[i].name;

						if(usedSSObj.hasOwnProperty(usedSS)) {
							usedSSObj[usedSS]--;
							if(usedSSObj[usedSS] < 1)
								removeFromManifestArray.push(usedSS);
						}
					}
				}
			}
			// Now we should had updated the defs array to be up to date
			// And we have an array of items to remove from the manifest
			// get the lib.properties statement
			var manifestFound = false;
			var newManifest;
			var libPropertiesStartIndex = scriptText.indexOf("lib.properties =");
			var libPropertiesEndIndex = -1;
			var libsPropsObj;
			if(libPropertiesStartIndex > -1) {
				// find the beginBrace
				libPropertiesEndIndex = scriptText.indexOf(';', libPropertiesStartIndex);
				var libPropOpenBraceIndex = scriptText.indexOf('{', libPropertiesStartIndex);
				if(libPropOpenBraceIndex > -1) {
					// find the closing brace
					var libPropCloseBraceIndex = findEndingBrace(scriptText, libPropOpenBraceIndex, "{}");
					if(libPropCloseBraceIndex > -1) {
						libsPropsObj = eval("(" + scriptText.substring(libPropOpenBraceIndex, libPropCloseBraceIndex+1) + ")");

						if(libsPropsObj && libsPropsObj.manifest) {
							// go through manifest and remove unused SpriteSheets
							newManifest = libsPropsObj.manifest.filter( (item) => !removeFromManifestArray.includes(item.id) );

							// now add the new spriteSheets from the JSON
							for(var i=0; i<outSSMetaDataObjArray.length; i++) {
								newManifest.push({ src: relativeJsonDir + "/" + inSSMetaDataObjArray[i].imagePath, id: outSSMetaDataObjArray[i].name });
							}
							manifestFound = true;
						}
					}
				}
			}

			// now get the full libProps string
			var libPropsString = scriptText.substring(libPropertiesStartIndex, libPropertiesEndIndex+1);

			function manItemToString(inObj) {
				var inObjKeys = Object.keys(inObj);
				return "{" + inObjKeys.reduce( (tot, cur, curInd) => {
					var isString = typeof(inObj[cur]) == "string";
					return ((curInd > 0) ? tot + ", " : "") + cur + ":" + (isString ? "\"" : "") + inObj[cur] + (isString ? "\"" : "");
				}, "") + "}";
			}

			var newManifestString = newManifest.reduce( (newManTotal, newManCurrent, newManCurInd) => {
				return ( (newManCurInd > 0) ? newManTotal + ",\n" : "" ) + "\t\t" + manItemToString(newManCurrent);
			}, "");

			// replace the manigest with our new one
			var newLibPropsString = libPropsString.replace(/(manifest\: \[)([\s.\S][^\]]*)(\])/, "$1\n" + newManifestString + "\n\t$3");

			// go through removeFromManifestArray and remove unused spritesheets from libssMetadataArray
			libssMetadataArray = libssMetadataArray.filter( (item) => !removeFromManifestArray.includes(item.name) );

			// write out a new ssMetaData and new symbol defs
			var accumString = libssMetadataArray.reduce( (total, current, currentIndex) => {
				return ( ((currentIndex > 0) ? total + ",\n" : "") + "\t{ name:\"" + current.name + "\", frames: [" + current.frames.reduce( (framesTotal, framesCurrent, framesCurrentIndex) => {
					return ( ((framesCurrentIndex > 0) ? framesTotal + "," : "") + "[" + framesCurrent[0] + "," + framesCurrent[1] + "," + framesCurrent[2] + "," + framesCurrent[3] + "]" );
				}, "") + "]}" );
			}, "");
			var newLibSSMetadataString = "lib.ssMetadata = [\n" + accumString + "\n];\n"

			var newSymbolDefsString = defsKeys.reduce( (defTotal, defCurrent, defCurrentIndex) => {
				return ( (defCurrentIndex > 0) ? defTotal + "\n" : "" ) + defs[defCurrent].def;
			}, "");

			var newScriptText = (scriptText.substring(0, startOfLibMeta)
				+ newLibSSMetadataString
				+ "\/\/ symbols:\n"
				+ newSymbolDefsString
				+ "\/\/ helper functions:\n"
				+ scriptText.substring(endIndex, libPropertiesStartIndex)
				+ newLibPropsString
				+ scriptText.substring(libPropertiesEndIndex+1)
			);

			var par = scriptInputs[libMetadataIndex].parentNode;
			var elmnt = dom.window.document.createElement("script");
			var textnode = dom.window.document.createTextNode(newScriptText);
			elmnt.appendChild(textnode);
			par.replaceChild(elmnt, scriptInputs[libMetadataIndex]);

			var outputHtml;
			if(found) {
				outputHtml = "<!DOCTYPE html>\n" + dom.window.document.getElementsByTagName('html')[0].outerHTML;
			}
			else {
				outputHtml = dom.window.document.getElementsByTagName('head')[0].innerHTML + dom.window.document.getElementsByTagName('body')[0].innerHTML;
			}
			fs.writeFileSync(inIndexFiles[0], outputHtml);
    }
  }
  else {
    return false;
  }

  return true;
}

function main() {
  var jsonFile = dialog.showOpenDialog( {filters: [ {name: 'JSON', extensions: ['json']}, {name: 'All Files', extensions: ['*']} ], properties: ['multiSelections'] } );
  var indexFile = dialog.showOpenDialog( {filters: [ {name: 'html', extensions: ['html', 'htm']}, {name: 'All Files', extensions: ['*']} ] } );

  if(processJSON(jsonFile, indexFile)) {
    dialog.showMessageBox(null, {
      type: 'info', buttons: ['Dismiss'],
      title: 'Success',
      message: 'Converted html to match,\nJSON data provided'
    }, app.quit);
  }
}

app.on('window-all-closed', e => e.preventDefault() );
app.on('ready', main);
//app.on('window-all-closed', app.quit);
