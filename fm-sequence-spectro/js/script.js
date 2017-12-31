//initiate audio and set canvas attributes
window.onload = function () {
	addUtilities();
	maxiAudio.init();//initialize audio
	setCavasAttributes();
}

//-------------------------------------
//====CANVAS - initialized after window is loaded
var canvas, width, height, context, spacing;

//====AUDIO
// var maximJs;
var maxiAudio = new maximJs.maxiAudio();
var output;
var drawOutput = new Array(1024);
var counter = 0;

var counterDraw = 0;
//-------------------------------------
//====SEQUENCER
// myClock: generate a clock signal and do things at specific times
var myClock = new maximJs.maxiClock();
var myFilter = new maximJs.maxiFilter();
var myFilter2 = new maximJs.maxiFilter();
var myPhaser = new maximJs.maxiOsc();

// start with a random number from 100 - 900
// var myArray = [200,300,400,300,120,540,300,270];
var myArray = [Math.floor((Math.random() * 800)) + 100];

//number of ticks per beat / overriden in audio function
myClock.setTicksPerBeat(2);
myClock.setTempo(50);//tempo in Beats Per Minute

var myLFO;
var phaserF;//store the phaser float  

var printCounter = 0;// used to print to console only

//-------------------------------------
//====FM
var centerFreq = 400; // centerFreq, used to calculate the frequency of the carrier and the modulator
var ratio = 2.2; //index and ratio may be specified heer or with the oscillator below
var index = 2.3;
var index;

var out; // this goes to the ouput
//centerFreq +modulator = carFreq

var indexOsc = new maximJs.maxiOsc();
var ratioOsc = new maximJs.maxiOsc();
var carrier = new maximJs.maxiOsc();

// frequnecy of modulator = ratio * centerFreq
//  amp of modulator = ratio * center freq * index
var modulator = new maximJs.maxiOsc();
var mod;
var modAmp;// centerFreq * ratio * index;

//-------------------------------------
//  Creat audtio context to get sample rate, this to ensure a minute long if sample rate would be changed
var audioCtx = new AudioContext();
var mySampleRate = audioCtx.sampleRate;
var fadeOut = mySampleRate * 15;    //  time in seconds to fade out
var countSamples = 0;
var scaleOut = 1;   // used to fade out to 0 by multiplying by 0.9999 after a certin time (turnOff)
var selIndex, selRatio;//select index and ratio?
var randomCutoff = 0.01;// this var changes value each new array is selected. assigns new value to lowpass' cutoff

//====AUDIO LOOP
maxiAudio.play = function () {

	counterDraw++;
	counterDraw = counterDraw % 2048;

	myClock.ticker(); // This makes the clock object count at the current samplerate

	//  index and ratio change constantly, oscillate between the desired output (scale and offset)
	//scale and offset to 0..1, curve, then map 0..1 to desired output 
	// selIndex = (indexOsc.sinewave(0.1)*0.5)+0.5; 
	//selIndex = Math.pow(selIndex, 4); selIndex = selIndex.map(0, 1, 1.2, 5);
	selIndex = Math.pow((indexOsc.sinewave(0.5) * 0.5) + 0.5, 4).map(0, 1, 1.2, 5);
	selRatio = Math.pow((ratioOsc.sinewave(0.3) * 0.5) + 0.5, 2).map(0, 1, 1.05, 4);

	//This is a 'conditional'. It does a test and then does something if the test is true 
	//   console.log(myClock.isTick());
	if (myClock.tick) { // If there is an actual tick at this time, this will be true.
		counter++;

		// by assigning the value here it becomes fixed for each frequency selected
		index = selIndex;
		ratio = selRatio;

		//passed to modAmp, mod, and carrier
		centerFreq = myArray[counter % myArray.length];

		if ((counter % myArray.length) === (myArray.length - 1)) {

			var chooseArray = Math.floor((Math.random() * 6));


			switch (chooseArray) {     //switch arrays
				case 0:
					myArray = [200, 300, 400, 300, 120, 540, 300, 270];
					break;
				case 1:
					myArray = [200, 300, 400, 300, 500, 540, 800, 270, 1200];
					break;
				case 2:
					myArray = [randNum(100, 1000), 300, 150, 1000, 500, 900, 800, 270];
					break;
				case 3:
					myArray = [randNum(100, 1000), 115, randNum(100, 1000), 1000, 750];
					break;
				case 4:
					myArray = [250, 300, 400, 1000, 500, 900, 800, 270, 900, 800, 600, 400];
					break;
				case 5:
					myArray = [randNum(100, 1000), randNum(100, 1000),
					randNum(100, 1000), randNum(100, 1000), 900, 800, 600, 400];
					break;
			}//end switch

			//  index and ratio change every time a new array is chosen 
			//  index = (Math.random() * 4) + 2;//index and ratio could be set this way also
			//  ratio = (Math.random() * 4) + 2;

			//  sets tick to the lenght of array so all frequencies are played
			myClock.setTicksPerBeat(myArray.length);
			randomCutoff = randNum2(0.0005, 0.1);// random cutoff for lopass on line 160

		}   // end if

	}   // end if

	//  amp of modulator = ratio * center freq * index
	modAmp = centerFreq * ratio * index;
	// frequnecy of modulator = ratio * centerFreq
	mod = modulator.sinewave(centerFreq * ratio) * modAmp;

	//freq of carrier = centerFreq + mod
	//  lopass(freq, cutoff)// cutoff is some sort of gliss
	out = carrier.sinewave(myFilter.lopass(centerFreq + mod, randomCutoff)) * 1;

	//Alter the curve of the sinewave. if the second argument of the Math.pow() 
	//is <1 it will spend more time on the higher register; if >1 it will spend 
	//more time on the lower register. The idea is to alter the curve, it is 
	//done through the last argument
	phaserF = Math.pow((myPhaser.sinewave(0.1) * 0.5) + 0.5, 0.4);
	myLFO = 500 + ((phaserF)) * 4500;


	this.output = myFilter2.lores(  // lores(input, cutoff1, resonance);
		out,    //  input
		myLFO,  //  cutoff1
		10      //  resonance
	) * scaleOut * 0.5;
	drawOutput[counterDraw % 2048] = this.output * 3;

	countSamples++;

	if (countSamples >= fadeOut) {
		scaleOut *= 0.9999; //fades output to 0 by scaling it
	}
};

//====DRAW CANVAS
function draw() {

	//This is basically the same as any other 2D processing draw routine.

	//clear the screen
	context.clearRect(0, 0, width, height);
	//draw a square	

	for (var i = 0; i < 1024; i++) {
		context.beginPath();
		context.moveTo(i * spacing, height / 2);
		context.lineTo(i * spacing, height / 2 + (drawOutput[i] * height / 4));
		context.stroke();
		context.closePath();
	}
}
//-------------------------------------
function setCavasAttributes() {
	canvas = document.querySelector("canvas");
	width = window.innerWidth;
	height = window.innerHeight;
	context = canvas.getContext("2d");
	canvas.setAttribute("width", width);
	canvas.setAttribute("height", height);
	spacing = (width / 1024);


	window.addEventListener('resize', adjustSize);
}

//-------------------------------------
//adjust canvas size and recalculate spacing
function adjustSize(event) {

	width = event.target.innerWidth;
	height = event.target.innerHeight;
	canvas.width = width;
	canvas.height = height;
	spacing = (width / 1024);
}
//-------------------------------------
setInterval(draw, 30);// interval at which it draws


function addUtilities() {
	//  Map function. Will produce values out of range if input is out of range
	//  https://gist.github.com/AugustMiller/85b54d49493bb71ba81e
	Number.prototype.map = function (in_min, in_max, out_min, out_max) {
		return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	};

	//  -------------------------
	//  both ways work
	window.randNum = function (min, max) {
		//  generate a random number
		//  not inclusive of max though
		return (Math.random() * (max - min)) + min;
	}

	//  -------------------------
	window.randNum2 = function (min, max) {
		//  another way to randomize, the map function would be needed for this one, unless I encapsulate it here
		return (Math.random() - 0) * (max - min) / (1 - 0) + min; // map embedded here
		// return Math.random().map(0, 1, min, max);
	}
}