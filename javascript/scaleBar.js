  theMap.addMapLoadCallBack("re-compute scale bar", null, function(){
    var ftPerPixel = Math.round((theMap.presentMaxX - theMap.presentMinX) / theMap._width * 100),
        ftPerPixelToStr = ftPerPixel.toString(),
        ftPerPixelCeil = (Number(ftPerPixelToStr[0]) + 1) * Math.pow(10, ftPerPixelToStr.length - 1);

    var scale = document.getElementById('scale_bar');

    scale.style.width = (ftPerPixelCeil / ftPerPixel) * 100/*pixels*/ +'px';
    scale.innerHTML = ftPerPixelCeil +' ft';
  });

