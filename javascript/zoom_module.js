
theMap.zoom_module = function (){
    var theMap = window.theMap;

    // TODO: This is the old way of calculating the new coordinates to send to the server.
    // I'm not even sure exactly how it works anymore :/, but here is an attempt at explaining it.
    var private_centerMainImage = function ( mousex, mousey, mouseX, mouseY ){
        var presentStatePlaneWidth = this.presentMaxX - this.presentMinX,
            presentStatePlaneHeight = this.presentMaxY - this.presentMinY,

            // Calculate a multiplier to convert the old coordinates to new coordinates.
            // _width and _height are the zoomed in or out width and height.
            xMultiplier = presentStatePlaneWidth / this._width, //example: ( 1311592.01401389 - 1301107.16345745 ) / 2940.414201183432 = 3.5657733363619664. This is the X multiplier.
            yMultiplier = presentStatePlaneHeight / this._height, 

            // Find the state plane coordinate that is half way between the min and max. 
            // halfStatePlaneWidth,halfStatePlaneHeight = middle point;
            halfStatePlaneWidth = ( presentStatePlaneWidth ) / 2, //example: 1311592.01401389 - 1301107.16345745 = 10484.850556439953 / 2 = 5242.4252782199765
            halfStatePlaneHeight = ( presentStatePlaneHeight ) / 2,

            // Adjust the coordinates so that the spot the person was zooming in on is 
            // in the center, by converting that spot to state plane coordinates, then 
            // subtracting half the width and height from all corners. That will move 
            // that spot to the center.
            minx = ( ( mousex * xMultiplier ) + this.presentMinX ) - halfStatePlaneWidth, //example: ( ( 1310.9346646942802 * 3.5657733363619664 ) + 1301107.16345745 ) - 5242.4252782199765 = 1300539.2340523093 
            maxx = ( ( mousex * xMultiplier ) + this.presentMaxX ) - halfStatePlaneWidth, 
            miny = ( ( this._height - mousey ) * yMultiplier ) + this.presentMinY - halfStatePlaneHeight,
            maxy = ( ( this._height - mousey ) * yMultiplier ) + this.presentMaxY - halfStatePlaneHeight,

            // This calculates the zooming in or zooming out by expanding or contracting 
            // the state plane width and height accordingly.
            doTheZoomWidth  = presentStatePlaneWidth  - ( /* I got this by accident */ this.ZOOM_POWER[this.sliderPosition] / ( this.resizedMapHeight / this.viewPortHeight ) ),
            doTheZoomHeight = presentStatePlaneHeight - ( /* I got this by accident */ this.ZOOM_POWER[this.sliderPosition] / ( this.resizedMapWidth / this.viewPortHeight ) );
        
        // Calculate the half width and height of the new zoomed width and height.
        halfStatePlaneWidth = doTheZoomWidth / 2;
        halfStatePlaneHeight = doTheZoomHeight / 2;

        // Adjust the min/max state plane coordinates.
        minx = minx + halfStatePlaneWidth;
        maxx = maxx - halfStatePlaneWidth;
        miny = miny + halfStatePlaneHeight;
        maxy = maxy - halfStatePlaneHeight;

        // Calculate a new half width and height again.
        halfStatePlaneWidth = ( maxx - minx ) / 2;
        halfStatePlaneHeight = ( maxy - miny ) / 2; 

        // Change course a bit and calculate a multiplier for the new min/max
        // coordinates by the size that the final map will be on the screen.
        xMultiplier = ( maxx - minx ) / this.resizedMapWidth;
        yMultiplier = ( maxy - miny ) / this.resizedMapHeight;

        // Adjust the mouseX (e.clientX) and mouseY (e.clientY) so that they reflect
        // where they are on the mapContainer ( may be smaller than the actual screen)
        // if the screen is bigger than the theMap.parameters.MAX_IMG_PIXELS contestant.
        mouseX = mouseX - this.mapContainer._left;
        mouseY = mouseY - this.mapContainer._top;
        
        // Finish it by moving the spot that the person was zooming in/out away from
        // the center and back to where it was originally. Previously we subtracted the 
        // half width and height to move the spot to the center, now we are adding the 
        // half width and height back and subtracting converted mouseX(Y) coordinates
        // so that the spot will be under their mouse like they expect.
        minx = halfStatePlaneWidth + minx - ( mouseX * xMultiplier );
        maxx = halfStatePlaneWidth + maxx - ( mouseX * xMultiplier );
        maxy = halfStatePlaneHeight + maxy - ( ( this.resizedMapHeight - mouseY ) * yMultiplier );
        miny = halfStatePlaneHeight + miny - ( ( this.resizedMapHeight - mouseY ) * yMultiplier );
        
        // So basically: 
        // 1) move the spot the person was zooming at to the center.
        // 2) zoom in/out.
        // 3) move the spot back under the mouse pointer.

        // Send it off to make some XML.
        this.ArcXML_module.makeArcXMLRequest( minx, maxx, miny, maxy );
    }.bind( theMap );

    var plus = function (){// The plus sign on the zoom element.
        zoomInOut( {wheelDelta: 120,
                    clientX: this.viewPortWidth/2,
                    clientY: this.viewPortHeight/2,
                    } );
    }.bind( theMap );

    var minus = function (){// The minus sign on the zoom element.
        zoomInOut( {wheelDelta: -120,
                    clientX: this.viewPortWidth/2,
                    clientY: this.viewPortHeight/2,
                    } );
    }.bind( theMap );

    function sliderMouseDown( e ){
        document.body.style.cursor = 'pointer';
        window.addEventListener( 'mousemove', sliderMove, true );
        window.addEventListener( 'mouseup', sliderMouseUp, false );
        e.preventDefault();
    }

    var sliderMouseUp = function ( e ){
        document.body.style.cursor = 'default'; 
        window.removeEventListener( 'mousemove', sliderMove, true );
        window.removeEventListener( 'mouseup', sliderMouseUp, false );
        zoomStart( this._width/2, this._height/2, this.viewPortWidth/2, this.viewPortHeight/2 );
        e.preventDefault();
        e.stopImmediatePropagation();
    }.bind( theMap );

    // This is fairly lazy, I didn't want to make a whole new zoom function,
    // probably should thou because if the person zooms in and out to fast,
    // it will get confused.
    var sliderMove = function ( e ){
        var z = this.round( ( e.clientY - this.theMap.zoom_slider_container_styleTop ) / 11 ) * 10; 
        if ( z >= -10 && z < 210 && z !== this.theMap.sliderPosition && z % 20 === 0 ){
            if ( z > this.theMap.sliderPosition ){
                zoomInOut( {
                            wheelDelta: -120,
                            clientX: this.theMap.viewPortWidth/2,
                            clientY: this.theMap.viewPortHeight/2,
                            }, true );
            } else { 
                zoomInOut( {
                            wheelDelta: 120,
                            clientX: this.theMap.viewPortWidth/2,
                            clientY: this.theMap.viewPortHeight/2,
                            }, true ); 
            }
            this.theMap.sliderPosition = z;
            this.zoom_slider.top = z +'px';
        }
    }.bind( {   theMap: theMap,
                zoom_slider: window.$( 'zoom_slider' ).style,
                round: window.Math.round,
            });

    // The main zoom function.
    var zoomInOut = function( arg_e, arg_slider, arg_zoomBox ){
        var evt = undefined, // This is needed for the delta.
            ratio = undefined,
            x = undefined, y = undefined,
            styleLeft = undefined, styleTop = undefined,
            delta = ( ( arg_e.wheelDelta )? arg_e.wheelDelta: ( evt = ( window.event || arg_e ), evt.detail * - 120 ) ),
            clientX = arg_e.clientX - this.mapContainer._left,
            clientY = arg_e.clientY - this.mapContainer._top,
            
            // Find where the mouse is on the map img its self, not where the mouse is in the viewport (aka screen).
            XcoordOnMapImg = ( clientX - this.dragDiv._left ) - this._left,
            YcoordOnMapImg = ( clientY - this.dragDiv._top ) - this._top ,
            markers = this.markersArray, markersArrayLength = markers.length;
            

        this.state.zooming = true;
        this.clearTimeoutt( this.zoomStartTimer );

        if ( delta <= -120 && this.sliderPosition <= 200 ){ //zoom out
            ratio = ( this.sliderPosition  !== 200 )? 0.5: 1;
            if ( !arg_slider && this.sliderPosition  !== 200 ){
                this.sliderPosition += 20;
                this.zoomSliderStyle.top = this.sliderPosition +'px';
            } else if ( !arg_slider ){
                this.sliderPosition = 200;
                this.zoomSliderStyle.top = this.sliderPosition +'px';
            }
        } else if ( delta >= 120 && this.sliderPosition >= 0 ){ // zoom in
            ratio = ( this.sliderPosition  !== 0 )? 2: 1;
            if ( !arg_slider && this.sliderPosition  !== 0 ){
                this.sliderPosition -= 20;
                this.zoomSliderStyle.top = this.sliderPosition +'px';
            } else if ( !arg_slider ){
               this.sliderPosition = 0;
            }
        }

        this.currentMapImg.className = 'smoothTransition';
        this.svgContainer.setAttribute( 'class', 'smoothTransition' );

        this._left = this._left - ( ( XcoordOnMapImg / this._width ) * ( ratio * this._width ) ) + XcoordOnMapImg ;
        this._top  = this._top  - ( ( YcoordOnMapImg / this._height ) * ( ratio * this._height ) - YcoordOnMapImg );
        this._height = this._height * ratio;
        this._width  = this._width * ratio;

        if( ratio === 2 ){

            x = clientX - ( this.dragDiv._left + this.currentMapImg._left ) - ( this.resizedMapWidth  / 2 );
            y = clientY - ( this.dragDiv._top  + this.currentMapImg._top )  - ( this.resizedMapHeight / 2 );
            
            this.tempTransformString = 'translate3d('+ ( 0-x ) +'px,'+ ( 0-y ) +'px, 0px) scale(2)' + this.tempTransformString;
        } else if( ratio === 0.5 ){
            
            x = ( clientX - ( this.dragDiv._left + this.currentMapImg._left ) - ( this.resizedMapWidth  / 2 ) ) / 2;
            y = ( clientY - ( this.dragDiv._top  + this.currentMapImg._top )  - ( this.resizedMapHeight / 2 ) ) / 2;
            
            this.tempTransformString = 'translate3d('+ x +'px,'+ y +'px, 0px) scale(0.5)' + this.tempTransformString;
        }

        this.currentMapImg.style[this.CSSTRANSFORM] = this.tempTransformText + this.tempTransformString;
        this.svgContainer.style[this.CSSTRANSFORM] = this.tempTransformText + this.tempTransformString;
        
        if ( markersArrayLength !== 0 ){
            while( markersArrayLength-- ){// The decrement operator needs to be 'post-' not 'pre-' for a while loop.
                markers[markersArrayLength].style.transition = 'all 0.4s cubic-bezier( 0,0,0.25,1 )';
            }
        }
        this.calculateMarkerPosition();

        if ( !arg_slider && !arg_zoomBox ){// Only wait when person is zooming with mouse wheel.
            this.zoomStartTimer = this.setTimeoutt(
                function(){
                    zoomStart( this.mousePositionOnMapX, this.mousePositionOnMapY, this.eClientX, this.eClientY ); 
                    theMap.utilities_module.removeTransitionFromMarkers(); 
                }.bind({
                    mousePositionOnMapX: ( arg_e.clientX - this.mapContainer._left - this.dragDiv._left - this._left ),
                    mousePositionOnMapY: ( arg_e.clientY - this.mapContainer._top - this.dragDiv._top - this._top ),
                    eClientX: arg_e.clientX,
                    eClientY: arg_e.clientY
                }), 1000 );
        }
    }.bind( theMap );

    var zoomStart = function( arg_mousePositionOnMapX, arg_mousePositionOnMapY, arg_eClientX, arg_eClientY ){
        this.state.zooming = false;
        if ( this.sliderPosition === 200 ){ //zoomed all the way out
            zoomAllTheWayOut();
        } else {
            private_centerMainImage( arg_mousePositionOnMapX, arg_mousePositionOnMapY, arg_eClientX, arg_eClientY );
        }
    }.bind( theMap );

    var zoomAllTheWayOut = function(){
        this.sliderPosition = 200;
        this.zoomSliderStyle.top = this.sliderPosition +'px';
        theMap.ArcXML_module.makeArcXMLRequest( theMap.parameters.FULL_ZOOM_MIN_X, theMap.parameters.FULL_ZOOM_MAX_X, theMap.parameters.FULL_ZOOM_MIN_Y, theMap.parameters.FULL_ZOOM_MAX_Y );
    }.bind( theMap );

    function zoomToMinExtent(){ // Zooms to the minimum-ish extent that all the property markers will show up on.
             var maxX  = undefined, minX  = undefined,
                 maxY  = undefined, minY  = undefined,
                 x = undefined, y = undefined,
                 xArray = [], yArray = [],
                 zoomPowerKeys = Object.keys( theMap.ZOOM_POWER ),
                 distance = undefined;
            
            for( var m = 0; m < theMap.markersArray.length; ++m ){
               if( /markerParent/.test( theMap.markersArray[m].className ) ){
                   xArray.push( theMap.markersArray[m].data.statePlaneCoordX );
                   yArray.push( theMap.markersArray[m].data.statePlaneCoordY );
               }
            }
            maxX = xArray.reduce( function( prev, curr ){ return prev > curr? prev: curr; });
            minX = xArray.reduce( function( prev, curr ){ return prev < curr? prev: curr; });
            maxY = yArray.reduce( function( prev, curr ){ return prev > curr? prev: curr; }) + 50;
            minY = yArray.reduce( function( prev, curr ){ return prev < curr? prev: curr; }) + 50;
            if( xArray.length < 2 || (maxX === minX && maxY === minY /*units in an apartment building would have the same x,y coordinates*/) ){
                maxX = xArray[0] + 5;
                minX = xArray[0];
                maxY = yArray[0] + 55;
                minY = yArray[0] + 50;
            }
            zoomPowerKeys = Object.keys( theMap.ZOOM_POWER );
            distance = ( maxX - minX > maxY - minY )?  maxX - minX: maxY - minY;
            for( var n = 0; n < zoomPowerKeys.length; ++n ){
                if( theMap.ZOOM_POWER[zoomPowerKeys[n]] < distance){
                    continue;
                } else {
                     theMap.sliderPosition = +zoomPowerKeys[n + 2];
                     $( 'zoom_slider' ).style.top = theMap.sliderPosition +'px';
                     break;
                 }
            }
            theMap.presentMaxX = ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapHeight / theMap.viewPortHeight ) / 2 ) + xArray.reduce( function( prev, curr ){ return prev > curr? prev: curr; });
            theMap.presentMinX = xArray.reduce( function( prev, curr ){ return prev < curr? prev: curr; }) - ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapHeight / theMap.viewPortHeight ) / 2 );
            theMap.presentMaxY = ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapWidth / theMap.viewPortHeight ) / 2 ) + yArray.reduce( function( prev, curr ){ return prev > curr? prev: curr; }) + 50;
            theMap.presentMinY = yArray.reduce( function( prev, curr ){ return prev < curr? prev: curr; }) - ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapWidth / theMap.viewPortHeight ) / 2 ) + 50; 
            zoomToStatePlaneXY( maxX, minX, maxY, minY );
    }

    var zoomToStatePlaneXY = function( arg_maxX, arg_minX, arg_maxY, arg_minY ){
       var xMultiplier = ( this.presentMaxX - this.presentMinX ) / this._width,
           yMultiplier = ( this.presentMaxY - this.presentMinY ) / this._height,
           clientX = undefined,
           clientY = undefined,
           x = ( arg_maxX - arg_minX ) / 2 + arg_minX,
           y = ( arg_maxY - arg_minY ) / 2 + arg_minY;
        
        clientX = ( ( x - this.presentMinX ) / xMultiplier );
        clientY  = ( ( this.presentMaxY - y ) / yMultiplier );
        theMap.zoom_module.zoomStart( clientX - theMap.mapContainer._left, clientY - theMap.mapContainer._top, clientX, clientY );
    }.bind(theMap);

    return {
        zoomStart: zoomStart,
        zoomAllTheWayOut: zoomAllTheWayOut,
        plus: plus,
        minus: minus,
        zoomToMinExtent: zoomToMinExtent,
        sliderMove: sliderMove,
        sliderMouseUp: sliderMouseUp,
        sliderMouseDown: sliderMouseDown,
        zoomInOut: zoomInOut,
        zoomToStatePlaneXY: zoomToStatePlaneXY,
    }
}()
/* TODO
    * clean up makeArcXMLRequest().
    * done: make it so the pan works on full zoom out.
    * Done: rename "t".
    * delete unused properties and methods in the theMap.zoom_module.js return object.
    * make it so the marker information ( message, image url ) is saved in local storage.
    * Done: add the "sliderPosition" variable to the "theMap".
*/


/*
function zoom(img){
    var container = img.parentElement,
        imgRect = img.getBoundingClientRect(),
        zoomTracker = 1;

    container.style.display = 'block';
    container.style.width = imgRect.width + 'px';
    container.style.overflow = 'hidden';
    container.href = 'javascript: void(0);';

    img.onload = '';
    img.src = 'http://i40.photobucket.com/albums/e212/chandleric/3mm%20leds/DSCF3371.jpg~original';
    img.addEventListener('mousewheel', zoomInOut);
    img.addEventListener('mousedown', mouseDown);
    img.tempTransformString = '';
    img.panX = 0;
    img.panY = 0;

    function zoomInOut( arg_e ){// this === img.
        var evt = undefined, // This is needed for the delta.
            ratio = undefined,
            x = undefined, y = undefined,
            parentRect = this.parentElement.getBoundingClientRect(),
            delta = ( ( arg_e.wheelDelta )? arg_e.wheelDelta: ( evt = ( window.event || arg_e ), evt.detail * - 120 ) ),
            clientX = arg_e.clientX - parentRect.left,
            clientY = arg_e.clientY - parentRect.top;

        arg_e.preventDefault(); // Prevents scrolling of the page.

        if( delta >= -120 ){

            x = clientX - ( imgRect.width  / 2 );
            y = clientY - ( imgRect.height / 2 );
            this.tempTransformString = 'translate('+ ( 0-x ) +'px,'+ ( 0-y ) +'px) scale(2)' + this.tempTransformString;
        
        } else if( delta <= -120 ){

            x = ( clientX  - ( imgRect.width  / 2 ) ) / 2;
            y = ( clientY  - ( imgRect.height / 2 ) ) / 2;
            this.tempTransformString = 'translate('+ x +'px,'+ y +'px) scale(0.5)' + this.tempTransformString;
        
        }

        this.style.transform = this.tempTransformString;
    }



    function mouseDown(arg_e){// this === img.
        this.panX = arg_e.clientX;
        this.panY = arg_e.clientY;

        document.addEventListener('mousemove', pan);
        document.addEventListener('mouseup', mouseUp);
    }

    var pan = function( arg_e){
        var left = (arg_e.clientX - this.panX);
        var top  = (arg_e.clientY - this.panY);

        arg_e.preventDefault();

        this.style.transform = 'translate('+ (left) +'px,'+ (top) +'px)' + this.tempTransformString;
    }.bind(img);

    function mouseUp(arg_e){// this === document.
        document.removeEventListener('mousemove', pan);
        document.removeEventListener('mouseup', mouseUp);
      
        var x = (arg_e.clientX - img.panX);
        var y = (arg_e.clientY - img.panY);

        img.tempTransformString = 'translate('+ x +'px,'+ y +'px)' + img.tempTransformString;
    }

}

function zoom(){
    var img = document.getElementById('testImg');
    var container = img.parentElement,
        imgRect = img.getBoundingClientRect(),
        zoomTracker = 1;
    
    container.style.display = 'block';
    container.style.width = imgRect.width + 'px';
    container.style.overflow = 'hidden';
    container.href = 'javascript: void(0);';
    
    img.onload = '';
    img.src = 'http://i40.photobucket.com/albums/e212/chandleric/3mm%20leds/DSCF3371.jpg~original';
    img.addEventListener('mousewheel', zoomInOut);
    img.addEventListener('mousedown', mouseDown);
    img.tempTransformString = '';
    img.panX = 0;
    img.panY = 0;

    function zoomInOut( arg_e ){// this === img.
        var evt = undefined, // This is needed for the delta.
            ratio = undefined,
            x = undefined, y = undefined,
            parentRect = this.parentElement.getBoundingClientRect(),
            delta = ( ( arg_e.wheelDelta )? arg_e.wheelDelta: ( evt = ( window.event || arg_e ), evt.detail * - 120 ) ),
            clientX = arg_e.clientX - parentRect.left,
            clientY = arg_e.clientY - parentRect.top;

        arg_e.preventDefault(); // Prevents scrolling of the page.

        if( delta >= 120 ){

            x = clientX - ( imgRect.width  / 2 );
            y = clientY - ( imgRect.height / 2 );
            this.tempTransformString = 'translate('+ ( 0-x ) +'px,'+ ( 0-y ) +'px) scale(2)' + this.tempTransformString;
        
        } else if( delta <= -120 ){

            x = ( clientX  - ( imgRect.width  / 2 ) ) / 2;
            y = ( clientY  - ( imgRect.height / 2 ) ) / 2;
            this.tempTransformString = 'translate('+ x +'px,'+ y +'px) scale(0.5)' + this.tempTransformString;
        
        }

        this.style.transform = this.tempTransformString;
    }



    function mouseDown(arg_e){// this === img.
        this.panX = arg_e.clientX;
        this.panY = arg_e.clientY;
        
        this.style.transition = '';
        
        document.addEventListener('mousemove', pan);
        document.addEventListener('mouseup', mouseUp);
    }

    var pan = function( arg_e){
        var left = (arg_e.clientX - this.panX);
        var top  = (arg_e.clientY - this.panY);

        arg_e.preventDefault();
        
        this.style.transform = 'translate('+ (left) +'px,'+ (top) +'px)' + this.tempTransformString;
    }.bind(img);

    function mouseUp(arg_e){// this === document.
        document.removeEventListener('mousemove', pan);
        document.removeEventListener('mouseup', mouseUp);
      
        var x = (arg_e.clientX - img.panX);
        var y = (arg_e.clientY - img.panY);

        img.tempTransformString = 'translate('+ x +'px,'+ y +'px)' + img.tempTransformString;
    }

}

(function zoom(){function g(c){document.removeEventListener("mousemove",h);document.removeEventListener("mouseup",g);a.tempTransformString="translate("+(c.clientX-a.panX)+"px,"+(c.clientY-a.panY)+"px)"+a.tempTransformString}var a=document.getElementById("testImg"),f=a.parentElement,e=a.getBoundingClientRect();f.style.display="block";f.style.width=e.width+"px";f.style.overflow="hidden";f.href="javascript: void(0);";a.onload="";a.src="http://i40.photobucket.com/albums/e212/chandleric/3mm%20leds/DSCF3371.jpg~original";
a.addEventListener("mousewheel",function(c){var a=void 0,d=void 0,b=void 0,b=this.parentElement.getBoundingClientRect(),d=c.wheelDelta?c.wheelDelta:(a=window.event||c,-120*a.detail),a=c.clientX-b.left,b=c.clientY-b.top;c.preventDefault();120<=d?(d=a-e.width/2,b-=e.height/2,this.tempTransformString="translate("+(0-d)+"px,"+(0-b)+"px) scale(2)"+this.tempTransformString):-120>=d&&(d=(a-e.width/2)/2,b=(b-e.height/2)/2,this.tempTransformString="translate("+d+"px,"+b+"px) scale(0.5)"+this.tempTransformString);
this.style.transform=this.tempTransformString});a.addEventListener("mousedown",function(a){this.panX=a.clientX;this.panY=a.clientY;this.style.transition="";document.addEventListener("mousemove",h);document.addEventListener("mouseup",g)});a.tempTransformString="";a.panX=0;a.panY=0;var h=function(a){var e=a.clientX-this.panX,d=a.clientY-this.panY;a.preventDefault();this.style.transform="translate("+e+"px,"+d+"px)"+this.tempTransformString}.bind(a)})()

(function(){
//debugger;
[].forEach.call(document.body.getElementsByTagName('img'), function(pic){

    if(/photobucket/.test(pic.src) || /\/.*##.+$/.test(pic.src)){
        var link = document.createElement('a');
            link.style.cursor = 'pointer';
            link.style.display = 'block';
            link.innerHTML = "Click here to enhance image.";
            link.onclick = function(e){
                var previousElement = pic.previousElementSibling,
                    resizedMsg = previousElement.querySelector('.td2');

                e.preventDefault();
                this.parentElement.removeChild(this);

                if(resizedMsg && resizedMsg.innerHTML === 'This image has been resized. Click this bar to view the full image.'){
                    previousElement.outerHTML = previousElement.cloneNode(true).outerHTML; //Take out the eventListeners by cloning the element, but don't change anything else.
                    pic.previousElementSibling.querySelector('.td2').innerHTML = "This image has been enhanced (just like the tv show CSI!). The image is now zoomable and pannable.";
                }

                zoom(pic);
                return false;
            };

        pic.parentElement.insertBefore(link, pic.nextSibling);

    }

});

function zoom(img1){
    var div = document.createElement('div');
    var container = img1.parentElement,
        imgRect = img1.getBoundingClientRect(),
        zoomTracker = 1;
    
    
    var img = document.createElement('img');
    img.id = img1.src;
    img.width = img1.width;
    img.height = img1.height;

    if( /\/.*##.+$/.test(img1.src)){
        img.src = img1.src.replace(/^.*\/.*?##(.*)/, '$1');
    }

    if(/photobucket/.test(img1.src) && !/~original$/.test(img1.src)){
        img.src = img1.src +'~original';
    }

    div.style.width = imgRect.width +'px';
    div.style.height = imgRect.height +'px';
    div.style.overflow = 'hidden';
    div.style.border = '1px solid rgb(126, 0, 0)';
    div.appendChild(img);

    if(container.tagName === 'A'){
        container.outerHTML = div.outerHTML;
    } else {

        img1.outerHTML = div.outerHTML;

    }

    img = document.getElementById(img1.src)
    img.addEventListener('mousewheel', zoomInOut);
    img.addEventListener('mousedown', mouseDown);
    img.tempTransformString = '';
    img.panX = 0;
    img.panY = 0;

    function zoomInOut( arg_e ){// this === img.
        var evt = undefined, // This is needed for the delta.
            ratio = undefined,
            x = undefined, y = undefined,
            parentRect = this.parentElement.getBoundingClientRect(),
            delta = ( ( arg_e.wheelDelta )? arg_e.wheelDelta: ( evt = ( window.event || arg_e ), evt.detail * - 120 ) ),
            clientX = arg_e.clientX - parentRect.left,
            clientY = arg_e.clientY - parentRect.top;

        arg_e.preventDefault(); // Prevents scrolling of the page.

        if( delta >= 120 ){

            x = clientX - ( imgRect.width  / 2 );
            y = clientY - ( imgRect.height / 2 );
            this.tempTransformString = 'translate('+ ( 0-x ) +'px,'+ ( 0-y ) +'px) scale(2)' + this.tempTransformString;
        
        } else if( delta <= -120 ){

            x = ( clientX  - ( imgRect.width  / 2 ) ) / 2;
            y = ( clientY  - ( imgRect.height / 2 ) ) / 2;
            this.tempTransformString = 'translate('+ x +'px,'+ y +'px) scale(0.5)' + this.tempTransformString;
        
        }

        this.style.transform = this.tempTransformString;
    }



    function mouseDown(arg_e){// this === img.
        this.panX = arg_e.clientX;
        this.panY = arg_e.clientY;
        
        this.style.transition = '';
        
        document.addEventListener('mousemove', pan);
        document.addEventListener('mouseup', mouseUp);
    }

    var pan = function( arg_e){
        var left = (arg_e.clientX - this.panX);
        var top  = (arg_e.clientY - this.panY);

        arg_e.preventDefault();
        
        this.style.transform = 'translate('+ (left) +'px,'+ (top) +'px)' + this.tempTransformString;
    }.bind(img);

    function mouseUp(arg_e){// this === document.
        document.removeEventListener('mousemove', pan);
        document.removeEventListener('mouseup', mouseUp);
      
        var x = (arg_e.clientX - img.panX);
        var y = (arg_e.clientY - img.panY);

        img.tempTransformString = 'translate('+ x +'px,'+ y +'px)' + img.tempTransformString;
    }

}
})();

// ==UserScript==
// @name         toyota nation test
// @namespace    http://your.homepage/
// @version      0.1
// @description  enter something useful
// @author       You
// @match        http://www.toyotanation.com/forum/*
// @grant        none
// ==/UserScript==

(function(){
//debugger;
[].forEach.call(document.body.getElementsByTagName('img'), function(pic){

    if(/photobucket/.test(pic.src) || /\/.*##.+$/.test(pic.src)){
        var link = document.createElement('a');
            link.style.cssText = "cursor: pointer; display: block; font-size: 0.6em;";
            link.innerHTML = "Click here to enhance image.";
            link.onclick = function(e){
                var previousElement = pic.previousElementSibling;

                e.preventDefault(); // If image is wrapped in an anchor tag, prevent it from opening a new web page.
                this.parentElement.removeChild(this);

                if(previousElement && previousElement.querySelector('.td2') && previousElement.querySelector('.td2').innerHTML === 'This image has been resized. Click this bar to view the full image.'){
                    previousElement.outerHTML = previousElement.cloneNode(true).outerHTML; //Take out the eventListeners by cloning the element, but don't change anything else.
                    pic.previousElementSibling.querySelector('.td2').innerHTML = "This image has been enhanced (just like the tv show CSI!). The image is now zoomable and pannable.";
                }

                zoom(pic);
                return false;
            };

        pic.parentElement.insertBefore(link, pic.nextSibling);

    }

});

function zoom(arg_img){
    var div = document.createElement('div')
        container = arg_img.parentElement,
        imgRect = arg_img.getBoundingClientRect();
    
    
    var newImg = document.createElement('img');
    newImg.id = arg_img.src;
    newImg.width = arg_img.width;
    newImg.height = arg_img.height;

    if( /\/.*##.+$/.test(arg_img.src)){
        newImg.src = arg_img.src.replace(/^.*\/.*?##(.*)/, '$1');
    }

    if(/photobucket/.test(arg_img.src) && !/~original$/.test(arg_img.src)){
        newImg.src = arg_img.src +'~original';
    }

    div.style.width = imgRect.width +'px';
    div.style.height = imgRect.height +'px';
    div.style.overflow = 'hidden';
    div.style.border = '1px solid rgb(126, 0, 0)';
    div.appendChild(newImg);

    if(container.tagName === 'A'){
        container.outerHTML = div.outerHTML;
    } else {
        arg_img.outerHTML = div.outerHTML;
    }

    newImg = document.getElementById(arg_img.src);
    newImg.addEventListener('mousewheel', zoomInOut);
    newImg.addEventListener('mousedown', mouseDown);
    newImg.tempTransformString = '';
    newImg.startPanX = 0;
    newImg.startanY = 0;

    function zoomInOut(arg_e){// this === newImg.
        var evt = undefined, // This is needed for the delta.
            ratio = undefined,
            x = undefined, y = undefined,
            parentRect = this.parentElement.getBoundingClientRect(),
            delta = ( ( arg_e.wheelDelta )? arg_e.wheelDelta: ( evt = ( window.event || arg_e ), evt.detail * - 120 ) ),
            clientX = arg_e.clientX - parentRect.left,
            clientY = arg_e.clientY - parentRect.top;

        arg_e.preventDefault(); // Prevents scrolling of the page.

        if( delta >= 120 ){

            x = clientX - ( imgRect.width  / 2 );
            y = clientY - ( imgRect.height / 2 );
            this.tempTransformString = 'translate('+ ( 0-x ) +'px,'+ ( 0-y ) +'px) scale(2)' + this.tempTransformString;
        
        } else if( delta <= -120 ){

            x = ( clientX  - ( imgRect.width  / 2 ) ) / 2;
            y = ( clientY  - ( imgRect.height / 2 ) ) / 2;
            this.tempTransformString = 'translate('+ x +'px,'+ y +'px) scale(0.5)' + this.tempTransformString;
        
        }

        this.style.transform = this.tempTransformString;
    }

    function mouseDown(arg_e){// this === newImg.
        this.startPanX = arg_e.clientX;
        this.startanY = arg_e.clientY;
        
        this.style.transition = '';
        
        document.addEventListener('mousemove', pan);
        document.addEventListener('mouseup', mouseUp);
    }

    var pan = function(arg_e){

        arg_e.preventDefault();
        
        this.style.transform = 'translate('+ (arg_e.clientX - this.startPanX) +'px,'+ (arg_e.clientY - this.startanY) +'px)' + this.tempTransformString;
    }.bind(newImg);

    function mouseUp(arg_e){// this === document.
        document.removeEventListener('mousemove', pan);
        document.removeEventListener('mouseup', mouseUp);
      
        var x = (arg_e.clientX - newImg.startPanX);
        var y = (arg_e.clientY - newImg.startanY);

        newImg.tempTransformString = 'translate('+ x +'px,'+ y +'px)' + newImg.tempTransformString;
    }

}
})();



*/