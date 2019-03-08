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

    var jsonString = fs.readFileSync(inFiles[0], 'utf8');
    jsonString = jsonString.trim();
    var obj = JSON.parse(jsonString);

  	var baseName = obj.meta.image;
  	baseName = baseName.lastIndexOf(".") > 0 ? baseName.substring(0,baseName.lastIndexOf(".")) : baseName;

  	// scriptFile.open('r');
  	// var content = scriptFile.read();
  	// scriptFile.close();
  	// var obj = JSON.parse(content);

  	// get number of properties
  	var numProps = 0;
  	var testObj = obj.frames;
  	var frameArray = [];
  	var frameRectArray = [];
  	for (var key in testObj) {
  		if (testObj.hasOwnProperty(key)) {
  			var stopIndex = key.indexOf(".");
  			var nameOfBitmap = (removeSpaces((stopIndex >= 0) ? key.substring(0,stopIndex) : key));

  			frameArray.push(nameOfBitmap);
  			frameRectArray.push([testObj[key].frame.x, testObj[key].frame.y, testObj[key].frame.w, testObj[key].frame.h]);
  			++numProps;
  		}
  	}

    var outSSMetaDataObj = { name: baseName, frames: new Array() }
  	for(var i = 0; i < frameRectArray.length; i++) {
        outSSMetaDataObj.frames.push([frameRectArray[i][0], frameRectArray[i][1], frameRectArray[i][2], frameRectArray[i][3]]);
    }

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
      var startOfLibMeta = scriptInputs[libMetadataIndex].text.search(/\blib.ssMetadata =/);
      var endOfLibMeta = scriptInputs[libMetadataIndex].text.indexOf(";", startOfLibMeta) + 1;
      var statement = scriptInputs[libMetadataIndex].text.substring(startOfLibMeta, endOfLibMeta);
      // find the right hand side Array
      var openBrackIndex = statement.indexOf('[');
      var arrayString = statement.substring(openBrackIndex, endOfLibMeta-1);
      var libssMetadataArray = eval(arrayString);
      libssMetadataArray.push(outSSMetaDataObj);
    }

  	var outSymbolDefs = "";
  	for(var i = 0; i < frameArray.length; i++)
  		outSymbolDefs += "(lib." + frameArray[i] + " = function() {\nthis.spriteSheet = ss[\"" + baseName + "\"];\nthis.gotoAndStop(" + i + ");\n}).prototype = p = new cjs.Sprite();\n\n";
  	// console.log(outSymbolDefs + "\n\n");
  }
  else {
    return false;
  }

  return true;
}

function main() {
  var jsonFile = dialog.showOpenDialog( {filters: [ {name: 'JSON', extensions: ['json']}, {name: 'All Files', extensions: ['*']} ] } );
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
