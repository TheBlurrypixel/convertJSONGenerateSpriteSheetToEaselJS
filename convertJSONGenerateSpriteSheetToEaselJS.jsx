// (c) 2018 Michael Gochoco
// This program will take the JSON file output from Adobe Animate CC Generate SpriteSheet panel command
// And convert to text that you can use to replace the ssMetaData and symbol definitions in the HTML5 output of an Animate CC project
// It is used in case you want to create and define your own SpriteSheets using the Generate SpriteSheet command
// which oddly enough cannot be used to generate spritesheets for Animate CC HTML5 publishings

// Usage: Run command in ExtendScript and Choose JSON file whose name should match the spriteSheet name
// Output will be in the JavaScript Console
// Copy and Paste thie output to replace appropriate lines in HTML5 document

// This uses ExtendScript to include JSON code
// and open a JSON file but can be converted for plain JavaScript

// This is minified json2.js
"object"!=typeof JSON&&(JSON={}),function(){"use strict";var rx_one=/^[\],:{}\s]*$/,rx_two=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,rx_three=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,rx_four=/(?:^|:|,)(?:\s*\[)+/g,rx_escapable=/[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,rx_dangerous=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta,rep;function f(t){return t<10?"0"+t:t}function this_value(){return this.valueOf()}function quote(t){return rx_escapable.lastIndex=0,rx_escapable.test(t)?'"'+t.replace(rx_escapable,function(t){var e=meta[t];return"string"==typeof e?e:"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+t+'"'}function str(t,e){var r,n,o,u,f,a=gap,i=e[t];switch(i&&"object"==typeof i&&"function"==typeof i.toJSON&&(i=i.toJSON(t)),"function"==typeof rep&&(i=rep.call(e,t,i)),typeof i){case"string":return quote(i);case"number":return isFinite(i)?String(i):"null";case"boolean":case"null":return String(i);case"object":if(!i)return"null";if(gap+=indent,f=[],"[object Array]"===Object.prototype.toString.apply(i)){for(u=i.length,r=0;r<u;r+=1)f[r]=str(r,i)||"null";return o=0===f.length?"[]":gap?"[\n"+gap+f.join(",\n"+gap)+"\n"+a+"]":"["+f.join(",")+"]",gap=a,o}if(rep&&"object"==typeof rep)for(u=rep.length,r=0;r<u;r+=1)"string"==typeof rep[r]&&(o=str(n=rep[r],i))&&f.push(quote(n)+(gap?": ":":")+o);else for(n in i)Object.prototype.hasOwnProperty.call(i,n)&&(o=str(n,i))&&f.push(quote(n)+(gap?": ":":")+o);return o=0===f.length?"{}":gap?"{\n"+gap+f.join(",\n"+gap)+"\n"+a+"}":"{"+f.join(",")+"}",gap=a,o}}"function"!=typeof Date.prototype.toJSON&&(Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},Boolean.prototype.toJSON=this_value,Number.prototype.toJSON=this_value,String.prototype.toJSON=this_value),"function"!=typeof JSON.stringify&&(meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},JSON.stringify=function(t,e,r){var n;if(gap="",indent="","number"==typeof r)for(n=0;n<r;n+=1)indent+=" ";else"string"==typeof r&&(indent=r);if(rep=e,e&&"function"!=typeof e&&("object"!=typeof e||"number"!=typeof e.length))throw new Error("JSON.stringify");return str("",{"":t})}),"function"!=typeof JSON.parse&&(JSON.parse=function(text,reviver){var j;function walk(t,e){var r,n,o=t[e];if(o&&"object"==typeof o)for(r in o)Object.prototype.hasOwnProperty.call(o,r)&&(void 0!==(n=walk(o,r))?o[r]=n:delete o[r]);return reviver.call(t,e,o)}if(text=String(text),rx_dangerous.lastIndex=0,rx_dangerous.test(text)&&(text=text.replace(rx_dangerous,function(t){return"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})),rx_one.test(text.replace(rx_two,"@").replace(rx_three,"]").replace(rx_four,"")))return j=eval("("+text+")"),"function"==typeof reviver?walk({"":j},""):j;throw new SyntaxError("JSON.parse")})}();

function myTrim(x) { return x.replace(/^\s+|\s+$/gm,''); }

function searchStringInArray (str, strArray)
{
	for (var j=0; j<strArray.length; j++)
	{
		if (strArray[j].match(str)) return j;
	}

	return -1;
}

function removeSpaces(inString)
{
	var result = myTrim(inString);
	var index = result.indexOf(" ");
	while(index >= 0)
	{
		result = result.substring(0,index) + result.substring(index+1, result.length);
		index = result.indexOf(" ");
	}

	return result;
}

function main()
{
	var scriptFile = File.openDialog("Selection prompt");
	if(!scriptFile) return "aborted";

	var baseName = scriptFile.name;
	baseName = baseName.lastIndexOf(".") > 0 ? baseName.substring(0,baseName.lastIndexOf(".")) : baseName;

	scriptFile.open('r');
	var content = scriptFile.read();
	scriptFile.close();

	var obj = JSON.parse(content);

	// get number of properties
	var numProps = 0;
	var testObj = obj.frames;
	var frameArray = [];
	var frameRectArray = [];
	for (var key in testObj)
	{
		if (testObj.hasOwnProperty(key))
		{
			var stopIndex = key.indexOf(".");
			var nameOfBitmap = (removeSpaces((stopIndex >= 0) ? key.substring(0,stopIndex) : key));

			frameArray.push(nameOfBitmap);
			frameRectArray.push([testObj[key].frame.x, testObj[key].frame.y, testObj[key].frame.w, testObj[key].frame.h]);
			++numProps;
		}
	}

	var outSSMetaData = "{name:\"" + baseName + "\", frames: [";
	for(var i = 0; i < frameRectArray.length; i++)
		outSSMetaData += "[" + frameRectArray[i][0] + "," + frameRectArray[i][1] + "," + frameRectArray[i][2] + "," + frameRectArray[i][3] + "]" + (i < frameRectArray.length-1 ? "," : "");
	outSSMetaData += "]}";
	print(outSSMetaData + "\n\n");

	var outSymbolDefs = "";
	for(var i = 0; i < frameArray.length; i++)
		outSymbolDefs += "(lib." + frameArray[i] + " = function() {\nthis.spriteSheet = ss[\"" + baseName + "\"];\nthis.gotoAndStop(" + i + ");\n}).prototype = p = new cjs.Sprite();\n\n";
	print(outSymbolDefs + "\n\n");

	return "Success!";
}

main();
