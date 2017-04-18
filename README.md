# PassLok-stego
Just the part of PassLok that does image steganography
You can find the rest of PassLok at https://github.com/fruiz500/passlok

Live demo at https://passlok.com/stego

PassLok stego is based on the F5 algorithm by Andreas Westfeld (2001), which is described at https://www2.htw-dresden.de/~westfeld/publikationen/21370289.pdf, which is extended to PNG images as well. In addition, PassLok does some simple tricks to preserve the DCT AC coefficient histogram almost perfectly, making it even harder to detect than F5.

A Password is optional, but if you don't enter one anybody who has the program will be able to detect and extract the data. If you do use a Password, on the othe hand, you have the power of the RC4 symmetric cipher, on which the optional encryption is ultimately based, protecting your data.

The algorithm presented here is slightly different from that used in PassLok Privacy and PassLok for Email, in that those take only a base64 input which, presumably, is the result of encryption and therefore has good statistical randomness, whereas the algorithm here adds some extra randomness and accepts generic binary input. Consequently, images containing a payload encoded in PassLok Privacy or PassLok for Email _won't be successfully decoded_ by this program, nor vice-versa.

### Usage
The necessary functions are loaded when all the libraries in the /lib folder are loaded (only plstego.js, if you are going to encode and decode only in PNG format). No initialization is necessary, but an element containing an image (it does not matter what type, so long as the browser can display it) must be already loaded on the DOM before the functions below are called.

To encode a binary item into an image loaded in the DOM, use either of the following statements:

	encodePNG(image element (object), item to be encoded (binary array), password (string), callback function(error message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[item2 (binary array), password2 (string), iter2 (number)])
	encodeJPG(image element (object), item to be encoded (binary array), password (string), callback function(error message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[item2 (binary array), password2 (string), iter2 (number)])
	
The first function converts the image into a PNG image, the second into a JPG image. The original image can be any type recognized by the browser. The first argument is the image element present in the DOM, which will contain the image data encoded as base64. The item to be encoded is an array containing only 1's and 0's. The callback function is used to display a string error message elsewhere in the DOM. For instance: function(msg){imageMsg.textContent = msg}. The optional variable encryptToggle is a Boolean (default: false) that instructs the program to skip the step where noise is added or subtracted, in case the embedded data already has sufficient randomness. Optional variable iter is a number that, if larger than 0, will consume an extra amount of time proportional to 2^iter, useful as a sort of key-derivation function.
	
The rest of the parameters are to embed a second message: item2 as binary array, password2 as string, iter2 as number. This message is encoded after the first one, taking advantage of whatever space is left. As a minimum there should be space for 144 bits, or 18 uncompressed characters, but typically there is substantially more.
	
To decode a hidden item out of an image, use either of these statements, depending on the type of image loaded:
	
	decodePNG(image element (object), password (string), callback function(item extracted (binary array)), message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[password2 (string), callback2 (function), iter2 (number)])
	decodeJPG(image element (object), password (string), callback function(item extracted (binary array)), message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[password2 (string), callback2 (function), iter2 (number)])
	
Here the callback function should have two arguments: the first is the item extracted from the image as an array containing only 1's and 0's, the second a string message indicating whether or not the operation has been successful. There is also a function that determines automatically the type of image file (PNG or JPG) and calls the appropriate decoding function:
	
	decodeImage(image element (object), password (string), callback function(item extracted (binary array)), message to be displayed (string)), [encryptToggle (Boolean), iter (number)],[password2 (string), callback2 (function), iter2 (number)])
	
iOS users beware: as of version 10.2 of iOS, the jsstegdecoder library crashes at line 541. This means that you will be able to do encode/decode for PNG, and encode for JPG, but not decode for JGP.
	
The sample program index.html, which hides UTF8 text placed in a textarea element, is designed to be self-explanatory, but here are some instructions just in case.

To encode a hidden message into an image:

1. Write the text in the big box (you can also insert images and files) and, optionaly, a Password in the little box (can be more than one word). If you want to compress the text before encoding, keep the Compr. box checked.
2. Load a cover image by clicking the "Load image" button. It can be any type of image recognized by browsers.
3. Click either "PNG hide" to make a PNG image containing the text, or "JPG hide" to obtain a JPG image.
4. If the encoding is successful, save the image locally by right-clicking on it.

To decode a hidden message out of an image:

1. Load the image by clicking the "Load image" button.
2. If a Password was used for encoding, the same Password must be written in the small box. The Compr. checkbox must also set the same way as for encoding. It does not matter whether or not there is anything in the big box.
3. Click the "Reveal" button. If the process is successful, the hidden text will appear in the big box.

### Error messages
The process may sometimes fail due to image corruption or a bug in the js-steg libraries. For instance, JPG decoding fails on iOS because of a crash of jsstegdecoder.js at line 541. Usually there will be a message explaining what happened. If you get "The image does not contain anything, or perhaps the password is wrong", it could be either reason because the program is designed to make the encoding undetectable unless the correct Password is supplied.

### Credits
* Jpeg encoding and decoding are done thanks to the js-steg JavaScript libraries by Owen Campbell-Moore and others, with some little edits mostly for error handling. Source: https://github.com/owencm/js-steg
* The PRNG used here is isaac, based on RC4, in its JavaScript implementation by Yves-Marie Rinquin. Source: https://github.com/rubycon/isaac.js/blob/master/isaac.js
* Compression used in the demo program is lz-string.js by Pieroxy. Source: https://github.com/pieroxy/lz-string
* Special thanks to Jean-Claude Rock for explaining to me how F5 works and what its flaws are
