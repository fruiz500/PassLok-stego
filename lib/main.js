//to load a file into the main box
function loadFileAsURL(){
	var fileToLoad = mainFile.files[0],
		fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent){
		var fileName = fileToLoad.name,
			URLFromFileLoaded = fileLoadedEvent.target.result;

		if(fileToLoad.type.slice(0,4) == "text"){
			if(URLFromFileLoaded.slice(0,2) == '==' && URLFromFileLoaded.slice(-2) == '=='){
				mainBox.innerHTML += safeHTML('<a download="' + fileName + '" href="data:,' + URLFromFileLoaded + '">' + fileName + '</a>')	//filter before adding to the DOM
			}else{
				mainBox.innerHTML += DOMPurify.sanitize('<br>' + URLFromFileLoaded.replace(/  /g,' &nbsp;'))
			}
		}else{
			mainBox.innerHTML += safeHTML('<a download="' + fileName + '" href="' + URLFromFileLoaded.replace(/=+$/,'') + '">' + fileName + '</a>')
		}
		mainFile.type = '';
        mainFile.type = 'file'            //reset file input
	}
	if(fileToLoad.type.slice(0,4) == "text"){
		fileReader.readAsText(fileToLoad, "UTF-8");
		imageMsg.textContent = 'This is the content of file: ' + fileToLoad.name
	}else{
		fileReader.readAsDataURL(fileToLoad, "UTF-8");
		imageMsg.textContent = 'File ' + fileToLoad.name + ' has been loaded in encoded form'
	}
}

//to load an image into the main box
function loadImage(){
	var fileToLoad = imgFile.files[0],
		fileReader = new FileReader();

	fileReader.onload = function(fileLoadedEvent){
		var URLFromFileLoaded = fileLoadedEvent.target.result;
		if(URLFromFileLoaded.slice(0,10) != 'data:image'){
			imageMsg.textContent = 'This file is not a recognized image type';
			return
		}
		mainBox.innerHTML += DOMPurify.sanitize('<img src="' + URLFromFileLoaded.replace(/=+$/,'') + '">');
		imgFile.type = '';
        imgFile.type = 'file'            //reset file input
	}
	fileReader.readAsDataURL(fileToLoad, "UTF-8");
}

// load image for hiding text
var importImage = function(e) {
    var reader = new FileReader();
    reader.onload = function(event) {
        // set the preview
        preview.style.display = 'block';
        document.getElementById('preview').src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
	preview.onload = function(){updateCapacity()}
}

//show how much text can be hidden in the image
function updateCapacity(){
	var	textSize = b64EncodeUnicode(mainBox.innerHTML.trim()).replace(/=+$/,'').length * 6;							//text size in bits

	imageMsg.innerHTML = '<span class="blink">PROCESSING</span>';				//Get blinking message started
	setTimeout(function(){																				//give it 2 seconds to complete
		if(imageMsg.textContent == 'PROCESSING') imageMsg.textContent = 'There was an error calculating the capacity, but the image is still usable'
	},2000)	

setTimeout(function(){
	//start measuring png capacity. Subtract 4 bits used to encode k, 48 for the end marker
	var shadowCanvas = document.createElement('canvas'),
		shadowCtx = shadowCanvas.getContext('2d');
	shadowCanvas.style.display = 'none';

	shadowCanvas.width = preview.naturalWidth;
	shadowCanvas.height = preview.naturalHeight;
	shadowCtx.drawImage(preview, 0, 0, shadowCanvas.width, shadowCanvas.height);
	
	var imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height),
		opaquePixels = 0;
	for(var i = 3; i < imageData.data.length; i += 4){				//look at alpha channel values
		if(imageData.data[i] == 255) opaquePixels++					//use pixels with full opacity only
	}
	var pngBits = opaquePixels * 3 - 270;								//4 bits used to encode k, 48 for the end marker, 218 buffer for second message

	//now measure jpeg capacity
	if(document.getElementById('preview').src.slice(11,15) == 'jpeg'){					//true jpeg capacity calculation
		var lumaCoefficients = [],
			count = 0;
		jsSteg.getCoefficients(document.getElementById('preview').src, function(coefficients){
			var subSampling = 1;
			for(var index = 1; index <= 3; index++){						//first luma, then chroma channels, index 0 is always empty
				lumaCoefficients = coefficients[index];
				if(lumaCoefficients){
					if(index != 1) subSampling = Math.floor(coefficients[1].length / lumaCoefficients.length);
	 	 			for (var i = 0; i < lumaCoefficients.length; i++) {
						for (var j = 0; j < 64; j++) {
							if(lumaCoefficients[i][j] != 0) count += subSampling		//if subsampled, multiply the count since it won't be upon re-encoding
   	 					}
					}
					if(index == 1) var firstCount = count
				}else{
					count += firstCount													//repeat count if the channel appears not to exist (bug in js-steg)
				}
			}
			var jpgBits = Math.floor(count - 270);

			imageMsg.textContent = 'This image can hide ' + pngBits + ' bits as PNG, ' + jpgBits + ' as JPG. The box contains ' + textSize + ' bits before compression'
		})
	}else{															//no jpeg, so estimate capacity for a normal image
		var jpgBits = Math.floor(pngBits / 20);

		imageMsg.textContent = 'This image can hide ' + pngBits + ' bits as PNG, at least ' + jpgBits + ' as JPG. The box contains ' + textSize + ' bits before compression'
	}
},30)					//end of timeout
}

var base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

//UTF8 to base64 and back, from Mozilla Foundation
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

//retrieves base64 string from binary array. No error checking
function fromBin(input){
	var length = input.length - (input.length % 6),
		output = new Array(length / 6),
		index = 0;
	
	for(var i = 0; i < length; i = i+6) {
		index = 0;
		for(var j = 0; j < 6; j++){
			index = 2 * index + input[i+j]
		}
		output[i / 6] = base64.charAt(index)
    }
	return output.join('')
}

//makes the binary equivalent (array) of a base64 string. No error checking
function toBin(input){
	var output = new Array(input.length * 6),
		code = 0,
		digit = 0,
		divider = 32;
	
    for(var i = 0; i < input.length; i++) {
		code = base64.indexOf(input.charAt(i));
		divider = 32;
		for(var j = 0; j < 5; j++){
			digit = code >= divider ? 1 : 0;
			code -= digit * divider;
			divider = divider / 2;
			output[6 * i + j] = digit
		}
		output[6 * i + 5] = code;
    }
	return output
}

//function to encode mainBox into the image
function encode(){
	var text = mainBox.innerHTML.trim();

	if(!text){
		imageMsg.textContent = 'There is nothing to hide';
		throw("box empty of content")
	}
	if(preview.src.length < 100){																			//no image loaded
		imageMsg.textContent = 'Please load an image before clicking this button';
		throw("no image loaded")
	}
	imageMsg.innerHTML = '<span class="blink">PROCESSING</span>';				//Get blinking message started
	
	if(compressedMode.checked){
		var array2embed = toBin(LZString.compressToBase64(text).replace(/=+$/,''))
	}else{
		var array2embed = toBin(b64EncodeUnicode(text).replace(/=+$/,''))
	}
	
	var pwdArray = imagePwd.value.split('|'); 														//in case there is a hidden message and password
	
	var iter = smartPwdMode.checked && pwdArray[0] ? keyStrength(pwdArray[0],false) : 0;
	
	if(pwdArray[1]) var iter2 = smartPwdMode.checked ? keyStrength(pwdArray[1],false) : 0;		//for hidden message
	if(pwdArray[2]){
		if(compressedMode.checked){
			var array2embed2 = toBin(LZString.compressToBase64(pwdArray[2]).replace(/=+$/,''))
		}else{
			var array2embed2 = toBin(b64EncodeUnicode(pwdArray[2]).replace(/=+$/,''))
		}
	}
	
	if(this.id == 'encodePNGBtn'){
		setTimeout(function(){
			encodePNG(preview,array2embed,pwdArray[0],function(msg){		//text is made base64 first, then a binary array
				imagePwd.value = '';
				if(msg) imageMsg.textContent = msg
			},
			false,iter,															//iter: add extra computations for weak Passwords; false: add extra noise even if compressed
			array2embed2,pwdArray[1],iter2										//for hidden message, if any
			);
			imagePwd.value = ''
		},10)
	}else{
		setTimeout(function(){
			encodeJPG(preview,array2embed,pwdArray[0],function(msg){
				imagePwd.value = '';
				if(msg) imageMsg.textContent = msg
			},
			false,iter,
			array2embed2,pwdArray[1],iter2
			);
			imagePwd.value = ''
		},10)
	}
	
	document.getElementById('preview').onload = function(){
			imageMsg.textContent = 'Data hidden in the image. Right-click to save it.'
	}
}

//extract text from the image
function decode(){	
	imageMsg.innerHTML = '<span class="blink">PROCESSING</span>';				//Get blinking message started

	var pwdArray = imagePwd.value.split('|'); 														//in case there is a hidden message and password
	
	var iter = smartPwdMode.checked && pwdArray[0] ? keyStrength(pwdArray[0],false) : 0;
	
	if(pwdArray[1]) var iter2 = smartPwdMode.checked ? keyStrength(pwdArray[1],false) : 0;		//for hidden message
	
setTimeout(function(){
	decodeImage(preview,pwdArray[0],function(textBin,msg){
		if(compressedMode.checked){
			mainBox.innerHTML = decryptSanitizer(LZString.decompressFromBase64(fromBin(textBin)))
		}else{
			mainBox.innerHTML = decryptSanitizer(b64DecodeUnicode(fromBin(textBin)))											//binary output turned to base64 first, then into UTF8 text
		}
		if(msg.slice(0,6) == 'Reveal'){
			msg = 'Reveal successful';
			mainBox.focus()
		}else{
			imagePwd.focus()
		}
		imagePwd.value = '';
		imageMsg.textContent = msg
		},
		false,iter,
		
		pwdArray[1],function(textBin,msg){																			//for hidden message
		if(compressedMode.checked){
			imageMsg.innerHTML = decryptSanitizer(LZString.decompressFromBase64(fromBin(textBin)))
		}else{
			imageMsg.innerHTML = decryptSanitizer(b64DecodeUnicode(fromBin(textBin)))	//binary output turned to base64 first, then into UTF8 text
		}
		},
		iter2);
},10)
}

//gets the histogram of an array, in this format: 0, 1, -1, 2, -2, ..., n, -n. Inputs are the array and n, output is the histogram. For testing purposes.
function getHistogram(array, n){
	var output = new Array(2*n + 2),
		length = array.length,
		counter1 = 0,
		counter2 = 0;
	
	for(var i = 0; i <= n; i++){
		counter1 = counter2 = 0;
		for(var j = 0; j < length; j++){
			if(array[j] == i) counter1++;
			if(array[j] == -i) counter2++
		}
		output[2*i] = counter1;
		output[2*i+1] = counter2
	}
	return output.slice(1)
}

//this is for showing and hiding text in the Password box
function showPwd(){
	if(showPwdMode.checked){
		imagePwd.type = "text"
	}else{
		imagePwd.type = "password"
	}
}

//for opening the help screen and back
function main2help(){
	if(mainScr.style.display != 'none'){
		mainScr.style.display = 'none';
		helpScr.style.display = 'block'
	}else{
		mainScr.style.display = 'block';
		helpScr.style.display = 'none'
	}
}

//for opening one item at a time in the Help screen
function openHelp(theID){
	var helpItems = document.getElementsByClassName('helptext');
	for(var i=0; i < helpItems.length; i++){
		helpItems[i].style.display = 'none'
	}
	document.getElementById(theID).style.display = "block";

	if(typeof window.orientation != 'undefined'){					//scroll to the item on Mobile
		location.href = '#';
		location.href = '#a' + theID;
	}
}

//for rich text editing
function formatDoc(sCmd, sValue){
	  document.execCommand(sCmd, false, sValue); mainBox.focus()
}

//this one escapes dangerous characters, preserving non-breaking spaces
function escapeHTML(str){
	escapeHTML.replacements = { "&": "&amp;", '"': "&quot;", "'": "&#039;", "<": "&lt;", ">": "&gt;" };
	str = str.replace(/&nbsp;/gi,'non-breaking-space')
	str = str.replace(/[&"'<>]/g, function (m){
		return escapeHTML.replacements[m];
	});
	return str.replace(/non-breaking-space/g,'&nbsp;')
}

//remove XSS vectors using DOMPurify
function decryptSanitizer(string){
	return DOMPurify.sanitize(string, {ADD_DATA_URI_TAGS: ['a']})
}

//The rest is modified from WiseHash. https://github.com/fruiz500/whisehash
//function to test key strength and come up with appropriate key stretching. Based on WiseHash
function keyStrength(pwd,display) {
	var entropy = entropycalc(pwd);
	
  if(display){
	if(entropy == 0){
		var msg = 'This is a known bad Key!';
		var colorName = 'magenta'
	}else if(entropy < 20){
		var msg = 'Terrible!';
		var colorName = 'magenta'
	}else if(entropy < 40){
		var msg = 'Weak!';
		var colorName = 'red'
	}else if(entropy < 60){
		var msg = 'Medium';
		var colorName = 'orange'
	}else if(entropy < 90){
		var msg = 'Good!';
		var colorName = 'green'
	}else if(entropy < 120){
		var msg = 'Great!';
		var colorName = 'blue'
	}else{
		var msg = 'Overkill  !';
		var colorName = 'cyan'
	}
  }

	var iter = Math.max(1,Math.min(20,Math.ceil(24 - entropy/5)));			//set the scrypt iteration exponent based on entropy: 1 for entropy >= 120, 20(max) for entropy <= 20
		
	msg = 'Password entropy: ' + Math.round(entropy*100)/100 + ' bits. ' + msg;
	
	if(display){
		document.getElementById('imageMsg').innerHTML = "<span id='pwdMsg'>" + msg + "</span>";
		document.getElementById('pwdMsg').style.color = colorName;
	}
	return iter
};

//takes a string and calculates its entropy in bits, taking into account the kinds of characters used and parts that may be in the general wordlist (reduced credit) or the blacklist (no credit)
function entropycalc(pwd){

//find the raw Keyspace
	var numberRegex = new RegExp("^(?=.*[0-9]).*$", "g");
	var smallRegex = new RegExp("^(?=.*[a-z]).*$", "g");
	var capRegex = new RegExp("^(?=.*[A-Z]).*$", "g");
	var base64Regex = new RegExp("^(?=.*[/+]).*$", "g");
	var otherRegex = new RegExp("^(?=.*[^a-zA-Z0-9/+]).*$", "g");

	pwd = pwd.replace(/\s/g,'');										//no credit for spaces

	var Ncount = 0;
	if(numberRegex.test(pwd)){
		Ncount = Ncount + 10;
	}
	if(smallRegex.test(pwd)){
		Ncount = Ncount + 26;
	}
	if(capRegex.test(pwd)){
		Ncount = Ncount + 26;
	}
	if(base64Regex.test(pwd)){
		Ncount = Ncount + 2;
	}
	if(otherRegex.test(pwd)){
		Ncount = Ncount + 31;											//assume only printable characters
	}

//start by finding words that might be on the blacklist (no credit)
	var pwd = reduceVariants(pwd);
	var wordsFound = pwd.match(blackListExp);							//array containing words found on the blacklist
	if(wordsFound){
		for(var i = 0; i < wordsFound.length;i++){
			pwd = pwd.replace(wordsFound[i],'');						//remove them from the string
		}
	}

//now look for regular words on the wordlist
	wordsFound = pwd.match(wordListExp);									//array containing words found on the regular wordlist
	if(wordsFound){
		wordsFound = wordsFound.filter(function(elem, pos, self) {return self.indexOf(elem) == pos;});	//remove duplicates from the list
		var foundLength = wordsFound.length;							//to give credit for words found we need to count how many
		for(var i = 0; i < wordsFound.length;i++){
			pwd = pwd.replace(new RegExp(wordsFound[i], "g"),'');									//remove all instances
		}
	}else{
		var foundLength = 0;
	}

	pwd = pwd.replace(/(.+?)\1+/g,'$1');								//no credit for repeated consecutive character groups

	if(pwd != ''){
		return (pwd.length*Math.log(Ncount) + foundLength*Math.log(wordLength + blackLength))/Math.LN2
	}else{
		return (foundLength*Math.log(wordLength + blackLength))/Math.LN2
	}
}

//take into account common substitutions, ignore spaces and case
function reduceVariants(string){
	return string.toLowerCase().replace(/[óòöôõo]/g,'0').replace(/[!íìïîi]/g,'1').replace(/[z]/g,'2').replace(/[éèëêe]/g,'3').replace(/[@áàäâãa]/g,'4').replace(/[$s]/g,'5').replace(/[t]/g,'7').replace(/[b]/g,'8').replace(/[g]/g,'9').replace(/[úùüû]/g,'u');
}