const {app, dialog, BrowserWindow} = require('electron');
const path = require('path');

var fs = require('fs')
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

var directory;

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

function processJSON(inFiles, inIndexFiles) {
  if( ((inFiles) && (inFiles.length > 0)) && ((inIndexFiles) && (inIndexFiles.length > 0)) ) {
    var isWin = process.platform === "win32";
    directory = isWin ? inFiles[0].substring(0, inFiles[0].lastIndexOf("\\")) : inFiles[0].substring(0, inFiles[0].lastIndexOf("\/"));

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
	  	var frameIndex = 0;
	  	var testObj = obj.frames;
	  	var frameRectArray = [];
			var frameObjArray = [];
			var tempObj = { name: baseName, frames: new Array() }
	  	for (var key in testObj) {
	  		if (testObj.hasOwnProperty(key)) {
					tempObj.frames.push([testObj[key].frame.x, testObj[key].frame.y, testObj[key].frame.w, testObj[key].frame.h]);
					var symbolDef = "(lib." + key + " = function() {\nthis.spriteSheet = ss[\"" + baseName + "\"];\nthis.gotoAndStop(" + frameIndex + ");\n}).prototype = p = new cjs.Sprite();\n\n";

					frameObjArray.push({ name: key, symbolDef: symbolDef });
					frameIndex++;
	  		}
	  	}
			outSSMetaDataObjArray.push(tempObj);
			inSSMetaDataObjArray.push(frameObjArray);
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
			// var arrayString = statement.substring(openBrackIndex, endOfLibMeta - 1);
			var closeBrackIndex = findEndingBrace(libsmetaDataStatement, 0, "[]");
			var arrayString = libsmetaDataStatement.substring(openBrackIndex, closeBrackIndex+1);

			// console.log("arrayString: " + arrayString);

      var libssMetadataArray = eval(arrayString);
      libssMetadataArray.push(...outSSMetaDataObjArray);

			// for each new symbolDef find the old and replace it
			for(var i=0; i<outSSMetaDataObjArray.length; i++) {
				for(var j=0; j<outSSMetaDataObjArray[i].frames.length; j++) {
					var name = inSSMetaDataObjArray[i][j].name;
					// search for corresponding old symbolDef
					var regexString = "\\(lib." + name + " = function\\(\\) {";
					// console.log(regexString);
					var startSymStatementIndex = scriptText.search(new RegExp(regexString));
					if(startSymStatementIndex > -1) {
						var symbolCloseIndex = findEndingBrace(scriptText, startSymStatementIndex, "()");
						if(symbolCloseIndex > -1) {
							// found the closing parens now find the end of the statement
							var endSymStatementIndex = scriptText.indexOf(";", symbolCloseIndex);
							scriptText = scriptText.substring(0,startSymStatementIndex) + inSSMetaDataObjArray[i][j].symbolDef + scriptText.substring(endSymStatementIndex+1);
						}
					}
				}
			}

			console.log(scriptText);

			// console.log("new libssMetaData: \n" + libssMetadataArray + "\n");
			// console.log("symbol defs: \n" + outSymbolDefs + "\n");
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
