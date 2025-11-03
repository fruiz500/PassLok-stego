//stuff that loads after the DOM
window.onload = function() {

//resizes main box so it fits within the window
	function textHeight(){
		var	fullHeight = document.documentElement.clientHeight,
			offsetHeight = 350;
		mainBox.style.height = fullHeight - offsetHeight + 'px'
	}

	textHeight();

//fixes after inline styles were moved to css file
//	mainScr.style.display = 'block';
	showKey.src = eyeImg;

//event listeners for buttons etc.
	window.addEventListener('resize',textHeight);

	mainFile.addEventListener('change', loadFileAsURL);
	mainFile.addEventListener('click', function(){this.value = '';});

	imgFile.addEventListener('change', loadImage);
	imgFile.addEventListener('click', function(){this.value = '';});

	imageFile.addEventListener('change', importImage);
	imageFile.addEventListener('click', function(){this.value = '';});

	encodePNGBtn.addEventListener('click', encode);

	encodeJPGBtn.addEventListener('click', encode);

    decodeBtn.addEventListener('click', decode);

	clearBtn.addEventListener('click', function(){mainBox.innerHTML = '';});

	imagePwd.addEventListener('keyup', function(){if(smartPwdMode.checked) keyStrength(imagePwd.value,true)});

//	showPwdMode.addEventListener('click', showPwd);
	showKey.addEventListener('click', showPwd);

	smartPwdMode.addEventListener('click', function(){imageMsg.textContent = ''});

	helpBtn.addEventListener('click', main2help);

	help2mainBtnTop.addEventListener('click', main2help);

	help2mainBtnBottom.addEventListener('click', main2help);
	
	mainBox.addEventListener('paste', function(){if(preview.src.slice(0,4) == 'data') setTimeout(updateCapacity,0)});

	//for the rich text editor boxes and buttons
	formatBlock.addEventListener("change", function() {formatDoc('formatBlock',this[this.selectedIndex].value);this.selectedIndex=0;});
	fontName.addEventListener("change", function() {formatDoc('fontName',this[this.selectedIndex].value);this.selectedIndex=0;});
	fontSize.addEventListener("change", function() {formatDoc('fontSize',this[this.selectedIndex].value);this.selectedIndex=0;});
	foreColor.addEventListener("change", function() {formatDoc('foreColor',this[this.selectedIndex].value);this.selectedIndex=0;});
	backColor.addEventListener("change", function() {formatDoc('backColor',this[this.selectedIndex].value);this.selectedIndex=0;});

	document.images[0].addEventListener("click", function() {formatDoc('bold')});
	document.images[1].addEventListener("click", function() {formatDoc('italic')});
	document.images[2].addEventListener("click", function() {formatDoc('underline')});
	document.images[3].addEventListener("click", function() {formatDoc('strikethrough')});
	document.images[4].addEventListener("click", function() {formatDoc('subscript')});
	document.images[5].addEventListener("click", function() {formatDoc('superscript')});
	document.images[6].addEventListener("click", function() {formatDoc('justifyleft')});
	document.images[7].addEventListener("click", function() {formatDoc('justifycenter')});
	document.images[8].addEventListener("click", function() {ormatDoc('justifyright')});
	document.images[9].addEventListener("click", function() {formatDoc('justifyfull')});
	document.images[10].addEventListener("click", function() {formatDoc('insertorderedlist')});
	document.images[11].addEventListener("click", function() {formatDoc('insertunorderedlist')});
	document.images[12].addEventListener("click", function() {formatDoc('formatBlock','blockquote')});
	document.images[13].addEventListener("click", function() {formatDoc('outdent')});
	document.images[14].addEventListener("click", function() {formatDoc('indent')});
	document.images[15].addEventListener("click", function() {formatDoc('inserthorizontalrule')});
	document.images[16].addEventListener("click", function() {var sLnk=prompt('Write the URL here','http:\/\/');if(sLnk&&sLnk!=''&&sLnk!='http://'){formatDoc('createlink',sLnk)}});
	document.images[17].addEventListener("click", function() {formatDoc('unlink')});
	document.images[18].addEventListener("click", function() {formatDoc('removeFormat')});
	document.images[19].addEventListener("click", function() {formatDoc('undo')});
	document.images[20].addEventListener("click", function() {formatDoc('redo')});
	
	//for the help screen
	aa1.addEventListener('click', function() {openHelp('a1')});
	aa2.addEventListener('click', function() {openHelp('a2')});
	aa3.addEventListener('click', function() {openHelp('a3')});
	aa4.addEventListener('click', function() {openHelp('a4')});
	aa5.addEventListener('click', function() {openHelp('a5')});
}