# PassLok-stego
Just the part of PassLok that does image steganography
You can find the rest of PassLok at https://github.com/fruiz500/passlok

PassLok stego is based on the F5 algorithm by Andreas Westfeld (2001), which is described at https://www2.htw-dresden.de/~westfeld/publikationen/21370289.pdf, which is extended to PNG images as well. In addition, PassLok does some simple tricks to preserve the DCT AC coefficient histogram almost perfectly, making it even harder to detect than F5.

A Password is optional, but if you don't enter one anybody who has the program will be able to detect and extract the data. If you do use a Password, on the othe hand, you have the power of the RC4 symmetric cipher, on which the optional encryption is ultimately based, protecting your data.

The algorithm presented here is slightly different from that used in PassLok Privacy and PassLok for Email, in that those take only a base64 input which, presumably, is the result of encryption and therefore has good statistical randomness, whereas the algorithm here adds some extra randomness and accepts generic text input. Consequently, images containing a payload encoded in PassLok Privacy or PassLok for Email _won't be successfully decoded_ by this program, nor vice-versa.

### Usage
The program is designed to be self-explanatory, but here are some instructions just in case.

To encode a hidden message into an image:

1. Write a text in the big box and, optionaly, a Password in the little box (can be more than one word).
2. Load a cover image by clicking the "Load image" button. It can be any type of image recognized by browsers.
3. Click either "PNG hide" to make a PNG image containing the text, or "JPG hide" to obtain a JPG image.
4. If the encoding is successful, save the image locally by right-clicking on it.

To decode a hidden message out of an image:

1. Load the image by clicking the "Load image" button.
2. If a Password was used for encoding, the same Password must be written in the small box. It does not matter whether or not there is anything in the big box.
3. Click the "Reveal" button. If the process is successful, the hidden text will appear in the big box.

### Error messages
The process may sometimes fail due to image corruption or a bug in the jssteg libraries. Usually there will be a message explaining what happened. If you get "The image does not contain anything, or perhaps the password is wrong", it could be either reason because the program is designed to make the encoding undetectable unless the correct Password is supplied.

### Credits
Jpeg encoding and decoding are done thanks to the js-steg JavaScript libraries by Owen Campbell-Moore and others, with some little edits mostly for error handling. Source: https://github.com/owencm/js-steg
