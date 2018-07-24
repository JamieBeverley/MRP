var __instructions = document.getElementById('instructions')

__instructions.addEventListener('touchstart', handleTouchStart, false);
__instructions.addEventListener('touchmove', handleTouchMove, false);

var xDown = null;
var yDown = null;

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


var slideIndex = 0;
showSlides(slideIndex);

// Next/previous controls
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
