function drawArrayOnCanvas (array, canvas,expectedMin=0,expectedMax=1){
  var ctx = canvas.getContext('2d')
  var height = canvas.height;
  var rectWidth = canvas.width/array.length;
  var center = Math.abs(expectedMin)*height
  ctx.clearRect(0,0,canvas.width, height);


  var clipped = false;
  ctx.fillStyle = "rgb(0,0,0)"
  for (i in array){
    // ctx.moveTo(i,height);
    // ctx.lineTo(i,array[i]*height/2);
    // ctx.stroke()
    // ctx.fillRect(i*rectWidth,height,rectWidth,(-1)*clip(array[i],expectedMin,expectedMax)*height/2);
    ctx.fillRect(i*rectWidth,height,rectWidth,(-1)*array[i]*height/expectedMax);
    if(array[i]>expectedMax){
      clipped = true;
    }
    // ctx.fillRect(i*rectWidth,array[i]*height/2,rectWidth,height);
    // ctx.fillRect(i,0,40,40);
    // ctx.fillRect(20,20,20,20);
  }
  if(clipped){
    ctx.fillStyle="rgb(255,0,0)"
    ctx.fillRect(0,0,canvas.width,10)
  }
}

function calculateWindowedValues(arr,longWin,mediumWin,shortWin){
  var long=longStdDev=0;
  var medium=mediumStdDev=0;
  var short=shortStdDev=0;
  // Calc Means..
  for (var i = arr.length; i>0; i--){
    var windowPassed = arr.length-i;

    if (windowPassed<shortWin){
      short = short+arr[i-1]
      medium = medium+arr[i-1]
      long = long+arr[i-1]

    } else if (windowPassed < mediumWin) {
      medium = medium+arr[i-1]
      long = long+arr[i-1]
    } else if (windowPassed < longWin){
      long = long+arr[i-1]
    } else {
      break;
    }
  }
  var result = {long:{mean:long/longWin},medium:{mean:medium/mediumWin},short:{mean:short/shortWin}}
  // calc. stdDevs
  for (var i = arr.length; i>0; i--){
    var windowPassed = arr.length-i;
    if (windowPassed<shortWin){
      shortStdDev = shortStdDev +Math.pow((arr[i-1]-result.short.mean),2);
      mediumStdDev = mediumStdDev + Math.pow((arr[i-1]-result.medium.mean),2);
      longStdDev = longStdDev + Math.pow(arr[i-1]-result.long.mean,2)
    } else if (windowPassed < mediumWin) {
      mediumStdDev = mediumStdDev + Math.pow((arr[i-1]-result.medium.mean),2);
      longStdDev = longStdDev + Math.pow(arr[i-1]-result.long.mean,2)
    } else if(windowPassed < longWin){
      longStdDev = longStdDev + Math.pow(arr[i-1]-result.long.mean,2)
    } else {
      break;
    }
  }
  result.long.stdDev = Math.sqrt(longStdDev/(longWin-1))
  result.medium.stdDev = Math.sqrt(mediumStdDev/(mediumWin-1))
  result.short.stdDev = shortStdDev/(shortWin-1)?Math.sqrt(shortStdDev/(shortWin-1)):0; // in case short window = 1;
  return result;
}


function dbamp(db){
  return Math.pow(10,db/20)
}
function ampdb(amp){
  return 20*Math.log10(amp)
}


function range(start, end) {
  return Array(end - start + 1).fill().map((_, idx) => start + idx)
}

function max(arr){
  var m = arr[0]
  for (i in arr){
    if (m<arr[i]){m=arr[i]}
  }
  return m
}
function min(arr){
  var min = arr[0]
  for (i in arr){
    if (min>arr[i]){min=arr[i]}
  }
  return min
}

function roundTo(x,n){
  var a = Math.pow(10,n)
  return Math.round(x*a)/a
}

function mean (a){
  return meanUpTo(a,-1)
}

var counter =0;
function everyXPrintY(x,y){
  counter++;
  if (counter>x){
    console.log(y)
    counter=0;
  }
}

function meanUpTo(list,n=-1){
  if (n==-1){
    n = list.length
  }
  var x = 0
  for (var i =list.length; i>(list.length-n); i--){
    x = x+list[i-1]
  }
  return x/n
}

function standardDeviation(l){
  var m = mean(l)
  var r =0;
  for (i in l){
    r = r+ Math.pow(l[i]-m,2);
  }
  return Math.sqrt(r/(l.length-1))
}


function clip(val,min,max){
  min = min?min:0;
  max = max?max:1;
  return Math.max(min, Math.min(max,val))
}
