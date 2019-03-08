const {app, dialog, BrowserWindow} = require('electron');
const path = require('path');

var fs = require('fs')

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

function processJSON(inFiles) {
  if((inFiles) && (inFiles.length > 0)) {
    var isWin = process.platform === "win32";
    directory = isWin ? inFiles[0].substring(0, inFiles[0].lastIndexOf("\\")) : inFiles[0].substring(0, inFiles[0].lastIndexOf("\/"));

    var jsonString = fs.readFileSync(inFiles[0], 'utf8');
    jsonString = jsonString.trim();
    var jsonContent = JSON.parse(jsonString);
    console.log(jsonContent.meta.image);

  	// var baseName = scriptFile.name;
  	// baseName = baseName.lastIndexOf(".") > 0 ? baseName.substring(0,baseName.lastIndexOf(".")) : baseName;
    //
  	// scriptFile.open('r');
  	// var content = scriptFile.read();
  	// scriptFile.close();
    //
  	// var obj = JSON.parse(content);
    //
  	// // get number of properties
  	// var numProps = 0;
  	// var testObj = obj.frames;
  	// var frameArray = [];
  	// var frameRectArray = [];
  	// for (var key in testObj) {
  	// 	if (testObj.hasOwnProperty(key)) {
  	// 		var stopIndex = key.indexOf(".");
  	// 		var nameOfBitmap = (removeSpaces((stopIndex >= 0) ? key.substring(0,stopIndex) : key));
    //
  	// 		frameArray.push(nameOfBitmap);
  	// 		frameRectArray.push([testObj[key].frame.x, testObj[key].frame.y, testObj[key].frame.w, testObj[key].frame.h]);
  	// 		++numProps;
  	// 	}
  	// }
    //
  	// var outSSMetaData = "{name:\"" + baseName + "\", frames: [";
  	// for(var i = 0; i < frameRectArray.length; i++)
  	// 	outSSMetaData += "[" + frameRectArray[i][0] + "," + frameRectArray[i][1] + "," + frameRectArray[i][2] + "," + frameRectArray[i][3] + "]" + (i < frameRectArray.length-1 ? "," : "");
  	// outSSMetaData += "]}";
  	// print(outSSMetaData + "\n\n");
    //
  	// var outSymbolDefs = "";
  	// for(var i = 0; i < frameArray.length; i++)
  	// 	outSymbolDefs += "(lib." + frameArray[i] + " = function() {\nthis.spriteSheet = ss[\"" + baseName + "\"];\nthis.gotoAndStop(" + i + ");\n}).prototype = p = new cjs.Sprite();\n\n";
  	// print(outSymbolDefs + "\n\n");
  }
  else {
    return false;
  }

  return true;
}

function main() {
  var jsonFile = dialog.showOpenDialog( {filters: [ {name: 'JSON', extensions: ['json']}, {name: 'All Files', extensions: ['*']} ] } );
  var indexFile = dialog.showOpenDialog( {filters: [ {name: 'html', extensions: ['html, htm']}, {name: 'All Files', extensions: ['*']} ] } );
  if(processJSON(jsonFile)) {
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
