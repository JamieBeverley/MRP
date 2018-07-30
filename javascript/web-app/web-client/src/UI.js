import WebSocket from "./WebSocket.js"
import Audio from "./Audio.js"

var xDown = null;
var yDown = null;
var instructions = null;
var slideIndex = null;

var UI = {}

var send = null;
var sendRate = 100; //ms

var shareDiv;
UI.sharing = false;

var muteDiv;
UI.muted = true;

var beginDiv;
UI.begun = false;

var viewInstructionsDiv;
var viewMapDiv;
var viewVisualizationDiv;
UI.currentView = "instructions"


var mapDiv;
var instructionsDiv;
var visualizationDiv;

var popupMenuDiv;
var popupMenuContainerDiv;

UI.init = function(){

  slideIndex = 0;
  showSlides(slideIndex);
  //Share/unshare button
  shareDiv = document.getElementById("share")
  shareDiv.addEventListener('click', toggleShare)
  // mute/unmute button
  muteDiv = document.getElementById('mute')
  muteDiv.addEventListener('click', toggleListen)

  // For view selector interaction
  mapDiv = document.getElementById('map');
  instructionsDiv = document.getElementById('instructions');
  visualizationDiv = document.getElementById('visualizations')

  // View toggles
  viewInstructionsDiv = document.getElementById('view-instructions');
  viewInstructionsDiv.addEventListener('click',function(){switchView("instructions")})
  viewVisualizationDiv = document.getElementById('view-visualization')
  viewVisualizationDiv.addEventListener('click', function(){switchView('visualization')})
  viewMapDiv = document.getElementById('view-map');
  viewMapDiv.addEventListener('click', function(){switchView("map")})

  popupMenuDiv = document.getElementById('popup');
  popupMenuContainerDiv = document.getElementById('popup-container')

  beginDiv = document.getElementById('start')
  beginDiv.addEventListener('click', begin)

  instructions = document.getElementById('instructions')
  instructions.addEventListener('touchstart', handleTouchStart, false);
  instructions.addEventListener('touchmove', handleTouchMove, false);

  var dots = document.getElementsByClassName('dot');
  dots[0].addEventListener('click',function(){currentSlide(0)})
  dots[1].addEventListener('click',function(){currentSlide(1)})
  dots[2].addEventListener('click',function(){currentSlide(2)})
  dots[3].addEventListener('click',function(){currentSlide(3)})
  dots[4].addEventListener('click',function(){currentSlide(4)})

  console.log("UI init")
}



UI.popupListenMenu = function(uid){
  popupMenuContainerDiv.className = "popup-container";
  popupMenuDiv.className = "popup"
  popupMenuDiv.innerHTML = ""
  popupMenuDiv.innerHTML = "<div id='popupClose'></div>"
  popupMenuDiv.innerHTML += "<div id='popupInfo'></div>"
  popupMenuDiv.innerHTML += "<div id='subscribeButton'></div>"

  var close = document.getElementById('popupClose');
  close.innerHTML = "<div id='popupCloseButton'>X</div>"
  close.addEventListener("click", function(e){
    popupMenuContainerDiv.className = "popup-container-inactive"
  });

  var popupInfo = document.getElementById('popupInfo')
  popupInfo.innerHTML = "Click subscribe to start listening to a resonification of this user's weather (don't forget to wear headphones!)"

  var subscribe = document.getElementById('subscribeButton');
  subscribe.innerHTML = UI.subscribed==uid?"unsubscribe":("subscribe to user: "+uid)
  subscribe.addEventListener('click', function (e){
    if(UI.subscribed!=uid){
      subscribe.innerHTML = "unsubscribe"
      if (UI.subscribed) {
        WebSocket.send({type:"unsubscribe", uid:UI.subscribed});
      }
      UI.subscribed = uid;
      WebSocket.send({type:"subscribe", uid:uid});
    } else {
      subscribe.innerHTML = ("subscribe to user: "+uid);
      WebSocket.send({type:"unsubscribe", uid:uid});
      UI.subscribed = undefined;
    }
    // TODO something to change style of subscribed
  })

}


// for when this client is resonifying another client's stuff
// and the other client leaves or stops sharing
UI.unsharedWhileListening = function (){
  WebSocket.send({type:"unsubscribe", uid:UI.subscribed});

  popupMenuContainerDiv.className = "popup-container";
  popupMenuDiv.className = "popup"
  popupMenuDiv.innerHTML = ""
  popupMenuDiv.innerHTML = "<div id='popupClose'></div>"
  popupMenuDiv.innerHTML += "<div id='popupInfo'></div>"

  var close = document.getElementById('popupClose');
  close.innerHTML = "<div id='popupCloseButton'>X</div>"
  close.addEventListener("click", function(e){
    popupMenuContainerDiv.className = "popup-container-inactive"
  });

  var popupInfo = document.getElementById('popupInfo')
  popupInfo.innerHTML = "Oops, it seems you were listening to a re-sonification of someone who has now left - please select another user to listen to from the map!"

  UI.subscribed = undefined
}

function begin (){
  shareDiv.className = "setting-button";
  muteDiv.className = "setting-button";
  document.getElementById('view-visualization').className = "view-selector"
  document.getElementById('view-map').className = "view-selector"
  UI.begun = true;
  Audio.startMachineListening();
}



function switchView(v){
	var viewClass = UI.begun?"view-selector":"view-selector-inactive"

  viewMapDiv.className = viewClass
	viewInstructionsDiv.className = viewClass
	viewVisualizationDiv.className = viewClass

	mapDiv.style.display = "none";
	instructionsDiv.style.display = "none";
	visualizationDiv.style.display = "none";

	if (v=="instructions"){
		UI.currentView = v;
		viewInstructionsDiv.className = "view-selector-selected"
		instructionsDiv.style.display = "inline-block"
	} else if (v == "visualization"){
		UI.currentView = v
		viewVisualizationDiv.className = "view-selector-selected"
		visualizationDiv.style.display = "inline-block"
	} else if (v == "map"){
		UI.currentView = v
		viewMapDiv.className = "view-selector-selected"
		mapDiv.style.display = "inline-block"
	} else {
    console.log("!Error - no view for: "+v)
  }
}

// Start button interaction
function toggleListen(){
  UI.muted = !UI.muted;
	if (UI.muted){
    Audio.sonificationGain.disconnect(Audio.ac)
    muteDiv.innerHTML="muted"
	} else{
    Audio.sonificationGain.connect(Audio.ac.destination)
    muteDiv.innerHTML = "unmuted"
	}
}


// Share button interaction
function toggleShare(){
  UI.sharing = !UI.sharing;
  if(UI.sharing){
    navigator.geolocation.getCurrentPosition(function(pos){
      var coordinates = [pos.coords.longitude, pos.coords.latitude];
      var msg = {type:"consented",coordinates:coordinates};
      WebSocket.send(msg);

      // TODO Maybe this is redundant? should you be able to hit 'share' before having started the machine listening?
      Audio.startMachineListening();
      send = setInterval(function(){
        var params = {}
        for (var i in Audio.params){
          params[i] = Audio.params[i].vals[0]
        }
        WebSocket.sendParams(params);
      }, sendRate)
      console.log("sharing")
    });

  } else{
    clearInterval(send);
    var msg = {type:"unconsented"};
    WebSocket.send(msg);
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


export default UI
