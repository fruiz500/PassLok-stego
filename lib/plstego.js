/*
		@source: https://github.com/fruiz500/passlok-stego

        @licstart  The following is the entire license notice for the
        JavaScript code in this page.

        Copyright (C) 2017  Francisco Ruiz

        The JavaScript code in this page is free software: you can
        redistribute it and/or modify it under the terms of the GNU
        General Public License (GNU GPL) as published by the Free Software
        Foundation, either version 3 of the License, or (at your option)
        any later version.  The code is distributed WITHOUT ANY WARRANTY;
        without even the implied warranty of MERCHANTABILITY or FITNESS
        FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

        As additional permission under GNU GPL version 3 section 7, you
        may distribute non-source (e.g., minimized or compacted) forms of
        that code without the copy of the GNU GPL normally required by
        section 4, provided you include this license notice and a URL
        through which recipients can access the Corresponding Source.


        @licend  The above is the entire license notice
        for the JavaScript code in this page.
        */
		
//PassLok-stego image encoding, based on F5 by A. Westfeld
/*	Usage:
	To encode a binary item into an image loaded in the DOM, use either of the following statements:

	encodePNG(image element (object), item to be encoded (binary array), password (string), callback function(error message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[item2 (binary array), password2 (string), iter2 (number)])
	encodeJPG(image element (object), item to be encoded (binary array), password (string), callback function(error message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[item2 (binary array), password2 (string), iter2 (number)])
	
	The first function converts the image into a PNG image, the second into a JPG image. The original image can be any type recognized by the browser. The first argument is 		the image element present in the DOM, which will contain the image data encoded as base64. The item to be encoded is an array containing only 1's and 0's. The callback function is used to display a string error message elsewhere in the DOM. For instance: function(msg){imageMsg.textContent = msg}. The optional variable encryptToggle is a Boolean (default: false) that instructs the program to skip the step where noise is added or subtracted, in case the embedded data already has sufficient randomness. Optional variable iter is a number that, if larger than 0, will consume an extra amount of time proportional to 2^iter, useful as a sort of key-derivation function.
	
	The rest of the parameters are to embed a second message: item2 as binary array, password2 as string, iter2 as number. This message is encoded after the first one, taking advantage of whatever space is left. As a minimum there should be space for 144 bits, or 18 uncompressed characters, but typically there is substantially more.
	
	To decode a hidden item out of an image, use either of these statements, depending on the type of image loaded:
	
	decodePNG(image element (object), password (string), callback function(item extracted (binary array)), message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[password2 (string), callback2 (function), iter2 (number)])
	decodeJPG(image element (object), password (string), callback function(item extracted (binary array)), message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[password2 (string), callback2 (function), iter2 (number)])
	
	Here the callback function should have two arguments: the first is the item extracted from the image as an array containing only 1's and 0's, the second a string message indicating whether or not the operation has been successful. There is also a function that determines automatically the type of image file (PNG or JPG) and calls the appropriate decoding function:
	
	decodeImage(image element (object), password (string), callback function(item extracted (binary array)), message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[password2 (string), callback2 (function), iter2 (number)])
	
	iOS users beware: as of version 10.2 of iOS, the jsstegdecoder library crashes at line 541. This means that you will be able to do encode/decode for PNG, and encode for JPG, but not decode for JGP.
*/

var imgEOF = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];			//end of encoded message marker

// Add this helper function at the top of plstego.js, by Claude AI
function createOptimizedCanvas(width, height) {
    // Use OffscreenCanvas if available (better performance)
    if (typeof OffscreenCanvas !== 'undefined') {
        return new OffscreenCanvas(width, height);
    }
    // Fallback to regular canvas
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

//this function does the PNG encoding as LSB in all channels except alpha, which is kept with original values
function encodePNG(imageElement, msgBin, password, callback, encryptToggle, iter, msgBin2, password2, iter2) {
    try {
        // Validate inputs
		if (!imageElement || !imageElement.naturalWidth) {
            throw new Error('Invalid image element provided');
        }
        
        var shadowCanvas = document.createElement('canvas'),
            shadowCtx = shadowCanvas.getContext('2d', {
                willReadFrequently: true
            });
        
        if (!shadowCtx) {
            throw new Error('Failed to get canvas context');
        }
        
        shadowCanvas.style.display = 'none';
        shadowCanvas.width = imageElement.naturalWidth;
        shadowCanvas.height = imageElement.naturalHeight;
        shadowCtx.drawImage(imageElement, 0, 0, shadowCanvas.width, shadowCanvas.height);
		
		var imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height),			//get the image data
			indexBin = 0,
			length = imageData.data.length,
			alphaData = new Array(length / 4);

		allCoefficients = new Array(length / 4 * 3);				//global variable, initialized below
		
		//separate alpha channel
		var k = 0;														//counter for actual data used
		for(var i = 3; i < length; i += 4){
			alphaData[Math.floor(i / 4)] = imageData.data[i]				//contains the alpha channel data, which will be needed later
			if(imageData.data[i] == 255){
				for(var j = 0; j < 3; j++){
					allCoefficients[k] = imageData.data[i - 3 + j];		//use data for opaque pixels only
					k++
				}
			}
		}
		allCoefficients = allCoefficients.slice(0,k);			//cut off the space that wasn't used
		
		msgBin = msgBin.concat(imgEOF);							//now add the marker to the input message
		
		var seed = password + length.toString() + 'png';
		
		seedPRNG(seed,iter);									//seed the PRNG and add spurious computations
			
		shuffleCoefficients();								//scramble image data to unpredictable locations, based on the password
		
		if(encryptToggle){skipEncrypt = encryptToggle}else{skipEncrypt = false};

		if(!skipEncrypt) msgBin = addNoise(msgBin);								//add noise so it looks statistically random if it doesn't already. This function also subtracts the noise. Not done in PassLok

		var lastIndex = encodeToCoefficients('png', msgBin, 0, function(msg){				//call to unified encoding function (does matrix encoding for both jpg and png) starting from 0
			if(msg) callback(msg);
			throw('insufficient cover image capacity')
		});
		
		if(msgBin2){													//this is done only if there is a second message, to be added immediately after the main message
			msgBin2 = msgBin2.concat(imgEOF);
		
			var seed2 = password2 + lastIndex.toString() + 'png';
		
			seedPRNG(seed2,iter2);
			
			shuffleCoefficients(lastIndex + 1);							//shuffle only beyond the last index used

			if(!skipEncrypt) msgBin2 = addNoise(msgBin2);

			encodeToCoefficients('png', msgBin2, lastIndex + 1, function(msg){		//encoding starts where the previous encoding ended
				if(msg) callback(msg);
				throw('insufficient cover image capacity')
			});
			
			unShuffleCoefficients(lastIndex + 1);
			lastIndex = 0
		}

		unShuffleCoefficients();										//return image data to their right places

		//put result back into image
		k = 0;															//already defined as local
		for(var i = 3; i < length; i += 4){
			var alphaIndex = Math.floor(i / 4);
			if(alphaData[alphaIndex] == 255){
				for(var j = 0; j < 3; j++){
					imageData.data[i - 3 + j] = allCoefficients[k];					//RGB data
					k++
				}
			}
		}
		permutation = [];				//reset global variables
		permutation2 = [];
		allCoefficients = [];

		shadowCtx.putImageData(imageData, 0, 0);								//put in canvas so the dataURL can be produced
		imageElement.src = shadowCanvas.toDataURL()							//send to image element
	} catch(error) {
        callback('Error encoding PNG: ' + error.message);
        console.error('encodePNG error:', error);
        return;
    }
}

//decodes data stored in PNG image
function decodePNG(imageElement,password,callback,encryptToggle,iter,password2,callback2,iter2){
	try {
        // Validate inputs
		if (!imageElement || !imageElement.naturalWidth) {
            throw new Error('Invalid image element provided');
        }
        
        var shadowCanvas = document.createElement('canvas'),
            shadowCtx = shadowCanvas.getContext('2d', {
                willReadFrequently: true
            });
        
        if (!shadowCtx) {
            throw new Error('Failed to get canvas context');
        }
        
        shadowCanvas.style.display = 'none';
        shadowCanvas.width = imageElement.naturalWidth;
        shadowCanvas.height = imageElement.naturalHeight;
        shadowCtx.drawImage(imageElement, 0, 0, shadowCanvas.width, shadowCanvas.height);

		var imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height),
			length = imageData.data.length;

		allCoefficients = new Array(length / 4 * 3);				//global variable
		
		//separate RGB data from alpha channel
		var k = 0;
		for(var i = 3; i < length; i += 4){
			if(imageData.data[i] == 255){										//use opaque pixels only
				for(var j = 0; j < 3; j++){
					allCoefficients[k] = imageData.data[i - 3 + j];
					k++
				}
			}
		}
		allCoefficients = allCoefficients.slice(0,k);

		var seed = password + length.toString() + 'png';						//seed for shuffling process

		seedPRNG(seed,iter);									//seed the PRNG and add spurious computations

		shuffleCoefficients();												//scramble image data to unpredictable locations
			
		if(encryptToggle){skipEncrypt = encryptToggle}else{skipEncrypt = false};		//global variable to decide whether or not to subtract noise

		var result = decodeFromCoefficients('png',0);					//this extracts the data

		callback(result[0],result[1]);

		if(password2){													//extract hidden message if a second password is supplied
			var seed2 = password2 + result[2].toString() + 'png';
			seedPRNG(seed2,iter2);
			shuffleCoefficients(result[2] + 1);
			var result2 = decodeFromCoefficients('png',result[2] + 1);
			callback2(result2[0],result2[1])
		}
		permutation = [];
		permutation2 = [];
		allCoefficients = [];
	} catch(error) {
        callback('Error decoding PNG: ' + error.message);
        console.error('decodePNG error:', error);
        return;
    }
}

var globalBin, jpgPassword, jpgIter, showError, skipEncrypt, globalBin2, jpgPassword2, jpgIter2;				//global variables needed by the way js-steg does things

//function to encode the text as coefficients in a jpeg image. Most of the work is done by modifyCoefficients
var encodeJPG = function(imageElement,msgBin,password,callback,encryptToggle,iter,msgBin2,password2,iter2){
	globalBin = msgBin;
	globalBin2 = msgBin2;
	jpgPassword = password;
	jpgPassword2 = password2;
	jpgIter = iter;
	jpgIter2 = iter2;
	showError = callback;
	if(encryptToggle){skipEncrypt = encryptToggle}else{skipEncrypt = false};

	setTimeout(function(){														//the rest after a 30 ms delay
		try{
			// Basic validation only
			if (!imageElement) throw new Error('No image provided');
			if (!msgBin || !msgBin.length) throw new Error('Message is empty');
			if(imageElement.src.slice(11,15).match(/gif;|png;/)) transparent2white(imageElement);		//first remove transparency

			jsSteg.reEncodeWithModifications(imageElement.src, modifyCoefficients, function (resultURI) {
				imageElement.src = resultURI;
				jpgPassword = '';
				jpgPassword2 = '';
				jpgIter = '';
				jpgIter2 = '';
				globalBin = [];
				globalBin2 = []
			})
		}catch(error){
			console.error('encodeJPG error:', error);
		}
	},30)	
}

//this function gets the jpeg coefficients (first luma, then chroma) and extracts the hidden material. Stops when the 48-bit endText code is found
var allCoefficients, permutation, permutation2;

var decodeJPG = function(imageElement,password,callback,encryptToggle,iter,password2,callback2,iter2){
	try{
		jsSteg.getCoefficients(imageElement.src, function(coefficients){
			var length = coefficients[1].length;
			if(coefficients[2].length != length){							//there's chrome subsampling, therefore it was not made by this process
				callback('','This image does not contain anything, or perhaps the password is wrong');		//actually, just the former
				throw('image is chroma subsampled')
			}

			var	rawLength = 3*length*64,
				rawCoefficients = new Array(rawLength);

			for(var index = 1; index <= 3; index++){									//linearize the coefficients matrix into rawCoefficients
				for (var i = 0; i < length; i++) {
					for (var j = 0; j < 64; j++) {
						rawCoefficients[index*length*64 + i*64 + j] = coefficients[index][i][j]
					}
				}
			}	
			allCoefficients = removeZeros(rawCoefficients);						//get rid of zeros

			var seed = password + allCoefficients.length.toString() + 'jpeg';		//seed for shuffling process

			seedPRNG(seed,iter);									//seed the PRNG and add spurious computations

			shuffleCoefficients();															//scramble image data to unpredictable locations

			if(encryptToggle){skipEncrypt = encryptToggle}else{skipEncrypt = false};		//global variable to decide whether or not to subtract noise

			var result = decodeFromCoefficients('jpeg',0);					//this extracts the data

			callback(result[0],result[1]);
			
			if(password2){													//extract hidden message if a second password is supplied
				var seed2 = password2 + result[2].toString() + 'jpeg';
				seedPRNG(seed2,iter2);
				shuffleCoefficients(result[2] + 1);
				var result2 = decodeFromCoefficients('jpeg',result[2] + 1);
				callback2(result2[0],result2[1])
			}
			permutation = [];
			permutation2 = [];
			allCoefficients = [];		
		})
	}catch(error){
		console.error('decodeJPG error:', error);
	}
	
}

/**
 * Called when encoding a JPEG
 * - coefficients: coefficients[0] is an array of luminosity blocks, coefficients[1] and
 *   coefficients[2] are arrays of chrominance blocks. Each block has 64 "modes"
 */
var modifyCoefficients = function(coefficients) {
	var msgBin = globalBin.concat(imgEOF),							//add 48-bit end marker. Passing data through global variable because of the way js-steg is built
		length = coefficients[0].length,
		rawLength = 3*length*64,
		rawCoefficients = new Array(rawLength);

	for(var index = 0; index < 3; index++){									//linearize the coefficients matrix into rawCoefficients
		for (var i = 0; i < length; i++) {
			for (var j = 0; j < 64; j++) {
				rawCoefficients[index*length*64 + i*64 + j] = coefficients[index][i][j]
			}
		}
	}
	allCoefficients = removeZeros(rawCoefficients);						//remove zeros and store in global variable

	var seed = jpgPassword + allCoefficients.length.toString() + 'jpeg';		//seed for shuffling process

	seedPRNG(seed,jpgIter);									//seed the PRNG and add spurious computations
	
	shuffleCoefficients();										//scramble image data to unpredictable locations
	
	if(!skipEncrypt) msgBin = addNoise(msgBin);							//add noise so it looks statistically random if it doesn't already. This function also subtracts the noise. Not done in PassLok
	
	var lastIndex = encodeToCoefficients('jpeg', msgBin,0, function(msg){				//call to unified encoding function (does matrix encoding for both jpg and png)
		showError(msg);
		throw('insufficient cover image capacity')
	});
	
	if(globalBin2){													//this is done only if there is a second message, to be added immediately after the main message
		var msgBin2 = globalBin2.concat(imgEOF);
	
		var seed2 = jpgPassword2 + lastIndex.toString() + 'jpeg';
	
		seedPRNG(seed2,jpgIter2);
		
		shuffleCoefficients(lastIndex + 1);							//shuffle only beyond the last index used

		if(!skipEncrypt) msgBin2 = addNoise(msgBin2);

		encodeToCoefficients('jpeg', msgBin2, lastIndex + 1, function(msg){		//encoding starts where the previous encoding ended
			showError(msg);
			throw('insufficient cover image capacity')
		});
		
		unShuffleCoefficients(lastIndex + 1);
		lastIndex = 0
	}

	unShuffleCoefficients();							//get the coefficients back to their original places
	
	var j = 0;													//put the zeros back in their places
	for(var i = 0; i < rawLength; i++){
		if(rawCoefficients[i]){									//only non-zeros
			rawCoefficients[i] = allCoefficients[j];
			j++
		}
	}

	for(var index = 0; index < 3; index++){					//reshape coefficient array back to original form
		for (var i = 0; i < length; i++) {
			for (var j = 0; j < 64; j++) {
				coefficients[index][i][j] = rawCoefficients[index*length*64 + i*64 + j]
			}
		}
	}
	permutation = [];
	permutation2 = [];
	allCoefficients = [];
	jpgPassword = '';
	jpgPassword2 = ''
}

//seeds the PRNG and adds spurious computations according to Password weakness
function seedPRNG(seed,iter){
	SeededPRNG.seed(seed);										//re-seed the PRNG
	if(iter) SeededPRNG.prng(Math.pow(2,iter) - 1)					//spurious computations, the more the worse the password
}

//calculates a random-walk permutation, as seeded by "seed" and shuffles the global array "allCoefficients" accordingly. "permutation" and "permutation2" are also global
function shuffleCoefficients(startIndex){
	var	length = allCoefficients.length,
		permutedCoeffs = new Array(length);

	if(!startIndex){
		permutation = randPerm(length)		//pseudo-random but repeatable array containing values 0 to length-1
	}else{
		permutation2 = randPerm(length - startIndex)		//the PRNG should be re-initialized before this operation
	}

	if(!startIndex){
		for(var i = 0; i < length; i++){
			permutedCoeffs[i] = allCoefficients[permutation[i]]
		}
		for(var i = 0; i < length; i++){
			allCoefficients[i] = permutedCoeffs[i]
		}
	}else{
		for(var i = 0; i < length - startIndex; i++){
			permutedCoeffs[i] = allCoefficients[startIndex + permutation2[i]]
		}
		for(var i = 0; i < length - startIndex; i++){
			allCoefficients[startIndex + i] = permutedCoeffs[i]
		}
	}
}

//inverse of the previous function, assumes the data and permutation arrays are stored in global variables allCoefficients, permutation, and permutation2
function unShuffleCoefficients(startIndex){
	var	length = allCoefficients.length,
		permutedCoeffs = new Array(length),
		index;
	if(!startIndex){var inversePermutation = new Array(length)}else{var inversePermutation2 = new Array(length - startIndex)};

	if(!startIndex){
		for(var i = 0; i < length; i++){		//first make the inverse permutation array
			index = permutation[i];
			inversePermutation[index] = i
		}
	}else{
		for(var i = 0; i < length - startIndex; i++){	
			index = permutation2[i];
			inversePermutation2[index] = i
		}		
	}
	if(!startIndex){
		for(var i = 0; i < length; i++){
			permutedCoeffs[i] = allCoefficients[inversePermutation[i]]
		}
		for(var i = 0; i < length; i++){
			allCoefficients[i] = permutedCoeffs[i]
		}
	}else{
		for(var i = 0; i < length - startIndex; i++){
			permutedCoeffs[i] = allCoefficients[startIndex + inversePermutation2[i]]
		}
		for(var i = 0; i < length - startIndex; i++){
			allCoefficients[startIndex + i] = permutedCoeffs[i]
		}
	}
}

//obtain a random permutation using isaac re-seedable PRNG, for use in image steganography
function randPerm(n) {
  var result = new Array(n);
  result[0] = 0;

  for(var i = 1; i < n; ++i) {
    var idx = (SeededPRNG.random() * (i + 1)) | 0;			//here is the call to the isaac PRNG library, floating point version
    if(idx < i) {
      result[i] = result[idx]
    }
    result[idx] = i
  }
  return result
}

//XORs binary data with pseudorandom noise so it is statistically random. Used to add noise and also to subtract it. Input is a binary array
function addNoise(array){
	var length = array.length;
	for(var i = 0; i < length; i++){
		array[i] = array[i] ^ (SeededPRNG.rand() >= 0);			//here are the call to the integer version of the isaac PRNG, and the XOR operation
	}
	return array
}

//convert binary array to decimal number
function binArray2dec(array){
	var length = array.length,
		output = 0,
		mult = 1;
	
	for(var i = 0; i < length; i++){
		output += array[length-1-i]*mult;
		mult = mult*2
	}
	return output
}

//to get the parity of a number. Positive: 0 if even, 1 if odd. Negative: 0 if odd, 1 if even. 0 is even
function stegParity(number){
	if(number >= 0){
		return number % 2
	}else{
		return -(number - 1) % 2
	}
}

//faster Boolean filter for array
function removeZeros(array){
	var length = array.length,
		nonZeros = 0;
	for(var i = 0; i < length; i++) if(array[i]) nonZeros++;
	
	var outArray = new Array(nonZeros),
		j = 0;
	
	for(var i = 0; i < length; i++){
		if(array[i]){
			outArray[j] = array[i];
			j++
		}		
	}
	return outArray
}

//gets counts in the DCT AC histogram: 2's plus -2, 3's plus -3, outputs array containing the counts
function partialHistogram(array){
	var output = [0,0],
		length = array.length;
	
	for(var j = 0; j < length; j++){
		for(var i = 2; i <= 3; i++){
			if(array[j] == i || array[j] == -i) output[i-2]++
		}
	}
	return output
}

//matrix encoding of allCoefficients with variable k, which is prepended to the message. Selectable for png or jpeg encoding.
function encodeToCoefficients(type,inputBin,startIndex,callback){
	//first decide what value to use for k
	var length = (startIndex == 0) ? allCoefficients.length - 222 : allCoefficients.length - startIndex - 4,		//extra slack the first time, to have room for a hidden message
		rate = inputBin.length / length,				//necessary embedding rate
		k = 2;
	if(inputBin.length > length){
		allCoefficients = [];
		permutation = [];
		if(startIndex == 0){
			callback('This image can hide ' + length.toString() + ' bits. But the box contains ' + inputBin.length.toString() + ' bits')
		}else{
			callback('This image can add a hidden message ' + length.toString() + ' bits long. But the hidden message in the box has ' + inputBin.length.toString() + ' bits')
		}
		return
	}
	while( k / (Math.pow(2,k) - 1) > rate) k++;
	k--;
	if(k > 16) k = 16;											//so it fits in 4 bits at the start
	var kCode = new Array(4);									//k in 4-bit binary form
	for(var j = 0; j < 4; j++) kCode[3-j] = (k-1 >> j) & 1;	//actually, encode k-1 (0 to 15)
	if(type == 'jpeg'){
		var count2to3 = partialHistogram(allCoefficients.slice(startIndex + 4)),		//calculate histogram-adjusting frequencies
			y = count2to3[1]/(count2to3[0] + count2to3[1]),
			ones = 0,													//surplus 1's and -1's
			minusones = 0;
	}

	//now encode k into allCoefficients
	if(type == 'jpeg'){												//jpeg embedding
		for(var i = 0; i < 4; i++){
			if(allCoefficients[startIndex + i] > 0){									//positive same as for png
				if(kCode[i] == 1 && stegParity(allCoefficients[startIndex + i]) == 0){			//even made odd by going down one
					allCoefficients[startIndex + i]--
				}else if(kCode[i] == 0 && stegParity(allCoefficients[startIndex + i]) != 0){		//odd made even by going down one, except if the value was 1, which is taken to -1
					if(allCoefficients[startIndex + i] != 1){ allCoefficients[startIndex + i]-- }else{ allCoefficients[startIndex + i] = -1}
				}
			}else{														//negative coefficients are encoded in reverse
				if(kCode[i] == 0 && stegParity(allCoefficients[startIndex + i]) != 0){		//"odd" made even by going up one
					allCoefficients[startIndex + i]++
				}else if(kCode[i] == 1 && stegParity(allCoefficients[startIndex + i]) == 0){			//"even" made odd by going up one, except if the value was -1, which is taken to 1
					if(allCoefficients[startIndex + i] != -1){ allCoefficients[startIndex + i]++ }else{ allCoefficients[startIndex + i] = 1}
				}
			}
		}
	}else{																//png embedding
		for(var i = 0; i < 4; i++){
			if(kCode[i] == 1 && stegParity(allCoefficients[startIndex + i]) == 0){					//even made odd by going up one
				allCoefficients[startIndex + i]++
			}else if(kCode[i] == 0 && stegParity(allCoefficients[startIndex + i]) != 0){				//odd made even by going down one
				allCoefficients[startIndex + i]--
			}
		}
	}	
	
	//encode the actual data
	var n = Math.pow(2,k) - 1,
		blocks = Math.ceil(inputBin.length / k);		//number of blocks that will be used
	
	var parityBlock = new Array(n),
		inputBlock = new Array(k),
		coverBlock = new Array(n),
		hash, inputNumber, outputNumber;						//decimal numbers
	while(inputBin.length % k) inputBin.push(0);				//pad msg with zeros so its length is a multiple of k

	for(var i = 0; i < blocks; i++){
		inputBlock = inputBin.slice(i*k, (i*k)+k);
		inputNumber = binArray2dec(inputBlock);						//convert the binary block to decimal
		coverBlock = allCoefficients.slice(startIndex + 4+i*n, startIndex + 4+(i*n)+n);		//first 4 were for encoding k
		for(var j = 0; j < n; j++) parityBlock[j] = stegParity(coverBlock[j]);		//get parity digit for each number
		
		hash = 0;
		for(var j = 1; j <= n; j++) hash = hash ^ (parityBlock[j-1]*j);		//hash-making step, as in F5, notice the xor operation
		outputNumber = inputNumber ^ hash;							//position in the cover block that needs to be flipped, if the position is 0 change none
		
		if(outputNumber){												//no change if the result is zero, but increment the counter anyway
			if(type == 'jpeg'){										//jpeg embedding
				if(coverBlock[outputNumber-1] > 0){			//positive, so change by going down (normally); if 1 or -1, switch to the other
					if(coverBlock[outputNumber-1] == 1){		//whether to go up or down determined by whether there are too few or too many 1's and -1's
						if(minusones <= 0){allCoefficients[startIndex + 3+i*n+outputNumber] = -1; ones--; minusones++}else{allCoefficients[startIndex + 3+i*n+outputNumber] = 2; ones--}
					}else if(coverBlock[outputNumber-1] == 2){
						if(ones <= 0){allCoefficients[startIndex + 3+i*n+outputNumber]--; ones++}else{allCoefficients[startIndex + 3+i*n+outputNumber]++}
					}else{
						if(Math.random() > y){allCoefficients[startIndex + 3+i*n+outputNumber]--}else{allCoefficients[startIndex + 3+i*n+outputNumber]++}
					}
				}else if(coverBlock[outputNumber-1] < 0){	//negative, so change by going up
					if(coverBlock[outputNumber-1] == -1){
						if(ones <= 0){allCoefficients[startIndex + 3+i*n+outputNumber] = 1; minusones--; ones++}else{allCoefficients[startIndex + 3+i*n+outputNumber] = -2; minusones--}
					}else if(coverBlock[outputNumber-1] == -2){
						if(minusones <= 0){allCoefficients[startIndex + 3+i*n+outputNumber]++; minusones++}else{allCoefficients[startIndex + 3+i*n+outputNumber]--}
					}else{
						if(Math.random() > y){allCoefficients[startIndex + 3+i*n+outputNumber]++}else{allCoefficients[startIndex + 3+i*n+outputNumber]--}
					}
				}													//if the coefficient was a zero, there is no change and the counter does not advance, so we repeat			
			}else{														//png embedding
				if(coverBlock[outputNumber-1] % 2){					//odd made even by going down one
					allCoefficients[startIndex + 3+i*n+outputNumber]--
				}else{													//even made odd by going up one
					allCoefficients[startIndex + 3+i*n+outputNumber]++
				}
			}
		}
	}
	return startIndex + blocks * n + 3						//last index involved in the encoding
}

//matrix decode of allCoefficients, where k is extracted from the start of the message. Selectable for png or jpeg encoding.
function decodeFromCoefficients(type,startIndex){
	//first extract k
	var	length = (startIndex == 0) ? allCoefficients.length - 222 : allCoefficients.length - startIndex - 4,		//extra slack the first time
		kCode = new Array(4);																		//contains k in 4-bit format
	for(var i = 0; i < 4; i++) kCode[i] = stegParity(allCoefficients[startIndex + i]);			//output is 1's and 0's
	var k = binArray2dec(kCode) + 1;
	
	//now decode the data
	var n = Math.pow(2,k) - 1,
		blocks = Math.floor(length / n);					//how many blocks are available. Will not necessarily be used
	if(blocks == 0){										//cover does not contain even one block
		allCoefficients = [];
		permutation = [];
		permutation2 = [];
		return ['','This image does not contain anything, or perhaps the password is wrong',0]
	}
	
	var parityBlock = new Array(n),
		coverBlock = new Array(n),
		outputBin = new Array(k*blocks),
		hash;

	for(var i = 0; i < blocks; i++){
		coverBlock = allCoefficients.slice(startIndex + 4+i*n, startIndex + 4+(i*n)+n);
		for(var j = 0; j < n; j++) parityBlock[j] = stegParity(coverBlock[j]);		//0 if even, 1 if odd (reverse if negative, as in F5)
		
		hash = 0;
		for(var j = 1; j <= n; j++) hash = hash ^ (parityBlock[j-1]*j);		//hash-making step, as in F5, notice the xor operation
		for(var j = 0; j < k; j++) outputBin[i*k + k-1-j] = (hash >> j) & 1		//converts number to binary array and adds to output
	}
	
	if(!skipEncrypt) outputBin = addNoise(outputBin);					//subtract the noise added when encoding. Not done in PassLok

	var found = false,									//find the end marker after all the embedded bits are extracted, rather than after every block. This ends up being faster
		outLength = outputBin.length;
	for(var j = 0; j < outLength - 47; j++){
		found = true
		for(var l = 0; l < 48; l++){
			found = found && (imgEOF[47-l] == outputBin[outLength-l-j])
		}
		if(found){var fromEnd = j+47; break}
	}		
	if(!found){
		return['','This image does not contain anything, or perhaps the password is wrong',0]
	}
	outputBin = outputBin.slice(0,-fromEnd);
	var blocksUsed = Math.ceil((outputBin.length + 48) / k);
	return [outputBin,'Reveal successful',startIndex + blocksUsed * n + 3]								//clean up the end
}

//extract text from either tye of image
function decodeImage(imageElement,password,callback,skipEncrypt,iter,password2,callback2,iter2){
	if(imageElement.src.slice(11,15) == 'png;'){							//two cases: png and jpeg
		decodePNG(imageElement,password,callback,skipEncrypt,iter,password2,callback2,iter2)
	}else if(imageElement.src.slice(11,15) == 'jpeg'){
		decodeJPG(imageElement,password,callback,skipEncrypt,iter,password2,callback2,iter2)
	}
}

//remove transparency and turn background white
function transparent2white(imageElement){
	var shadowCanvas = document.createElement('canvas'),
		shadowCtx = shadowCanvas.getContext('2d');
	shadowCanvas.style.display = 'none';

	shadowCanvas.width = imageElement.naturalWidth;
	shadowCanvas.height = imageElement.naturalHeight;
	shadowCtx.drawImage(imageElement, 0, 0, shadowCanvas.width, shadowCanvas.height);
	
	var imageData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height),
		opaquePixels = 0;
	for(var i = 3; i < imageData.data.length; i += 4){				//look at alpha channel values
		if(imageData.data[i] == 0){
			for(var j = 0; j < 4; j++) imageData.data[i-j] = 255		//turn pure transparent to white
		}else{
			imageData.data[i] = 255									//if not pure transparent, turn opaque without changing color
		}
	}
	shadowCtx.putImageData(imageData, 0, 0);								//put in canvas so the dataURL can be produced
	imageElement.src = shadowCanvas.toDataURL()							//send to image element	
}
