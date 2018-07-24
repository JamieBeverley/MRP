import WebSocket from "./WebSocket.js"
import Listen from "./Listen.js"

var xDown = null;
var yDown = null;
var instructions = null;
var slideIndex = null;

var UI = {}






var send = null;
var sendRate = 100; //ms

var shareDiv;
UI.sharing = false;

var listenDiv;
UI.listening = false;

UI.init = function(){

  slideIndex = 0;
  showSlides(slideIndex);

  shareDiv = document.getElementById("share")
  shareDiv.addEventListener('click', toggleShare)

  listenDiv = document.getElementById('listen')
  listenDiv.addEventListener('click', toggleListen)

  instructions = document.getElementById('instructions')
  instructions.addEventListener('touchstart', handleTouchStart, false);
  instructions.addEventListener('touchmove', handleTouchMove, false);
}


// Start button interaction

function toggleListen(){
  UI.listening = !UI.listening;
	if (UI.listening){
    Listen.sonificationGain.disconnect(Listen.ac)
    listenDiv.innerHTML="Mute"
	} else{
    Listen.sonificationGain.connect(Listen.ac)
    listenDiv.innerHTML = "Listen"
	}
}


// Share button interaction
function toggleShare(){
  UI.sharing = !UI.sharing;
  if(UI.sharing){
   clearInterval(send)
   var msg = {type:"unconsented"}
   WebSocket.send(msg)
  } else{
   navigator.geolocation.getCurrentPosition(function(pos){
     var coordinates = [pos.coords.longitude, pos.coords.latitude];
     var msg = {type:"consented",coordinates:coordinates};
     WebSocket.send(msg);

     Listen.start()

     send = setInterval(function(){
       var params = {}
       for (var i in Listen.params){
         params[i] = Listen.params[i].vals[0]
       }
       WebSocket.sendParams(params);
     }, sendRate)
   });
  }
}



function plusSlides(n) {
 showSlides(slideIndex += n);
}

// Thumbnail image controls
function currentSlide(n) {
 showSlides(slideIndex = n);
}

function showSlides(n) {
 var i;
 var dots = document.getElementsByClassName("dot");
 var slides = document.getElementsByClassName("instructionBlock");
 if (n >= slides.length-1) {
   slideIndex = slides.length-1;
   // document.getElementById("next").style.display="none"
 } else {
   // document.getElementById("next").style.display="block";
 }
 if (n <= 0) {
   slideIndex = 0
   // document.getElementById("prev").style.display="none";
 } else {
   // document.getElementById("prev").style.display="block";
 }
 for (i = 0; i < slides.length; i++) {
     slides[i].style.display = "none";
     if(i<=n){dots[i].style.backgroundColor = "rgb(140,240,120 )"}
     else {dots[i].style.backgroundColor = "rgb(200,200,200)"}
 }
 slides[slideIndex].style.display = "block";
}


function handleTouchStart(evt) {
    xDown = evt.touches[0].clientX;
    yDown = evt.touches[0].clientY;
};

function handleTouchMove(evt) {
    if ( ! xDown || ! yDown ) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
        if ( xDiff > 0 ) {
            /* left swipe */
            plusSlides(1)
        } else {
            /* right swipe */
            plusSlides(-1)
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};
