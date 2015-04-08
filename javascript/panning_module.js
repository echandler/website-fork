
theMap.panning_module = function(){
    var theMap = window.theMap;

    function panningControlsliderMouseDown( e ){
        document.body.style.cursor = 'pointer';
        window.addEventListener( 'mousemove', panningControlsliderMove, true );
        window.addEventListener( 'mouseup', panningControlsliderMouseUp, false );
        panningControlsliderMove( e );
        e.preventDefault();
        e.stopImmediatePropagation();
    }

    var panningControlsliderMouseUp = function ( e ){
        document.body.style.cursor = 'default'; 
        window.removeEventListener( 'mousemove', panningControlsliderMove, true );
        window.removeEventListener( 'mouseup', panningControlsliderMouseUp, false );
        
        // TODO: Find out difference between e.preventDefault() and 
        // e.stopImmediatePropagation().
        e.preventDefault();
        e.stopImmediatePropagation();
    }

    var panningControlsliderMove = function ( e ){
        var sliderRailWidth = this.sliderRail.clientWidth,
            //tick = this.Math.floor( sliderRailWidth / 3 /10)*10,
            z = this.Math.round( ( e.clientX - this.sliderRail.getBoundingClientRect().left ) ) - 8; 
        
        if ( z >= 0 && z < sliderRailWidth - 12 ){

            // There is a bug in chrome that causes the text to be fuzzy if using "-webkit-transform: translate" to
            // position the marker, all is well if the number is an int and not a float. This causes the number to 
            // be a float thou which will make the text blurry. Works fine in other browsers. 
            theMap.panningObj.panningAnimationMultiplier = ( z / sliderRailWidth ) * 21;// if panningAnimationMultiplier default was changed this needs to be changed and 1 added to it.
            this.slider.style.left = z +'px';
        }
    }.bind({
        sliderRail: window.$( 'panning_control_slider_rail' ),
        slider: window.$( 'panning_control_slider' ),
        Math: window.Math,
        });

    // Start the panning animation.
    var panningAnimationMouseUp = function( e ){
        if ( this.theMap.pan.panningXYNew && ( this.date.now() - this.theMap.pan.panningXYNew.time ) < 200 ){
            var startX = this.theMap.pan.panningXYNew.x,
                startY = this.theMap.pan.panningXYNew.y,
                finishX = ( ( startX - this.theMap.pan.panningXYOld.x ) * this.theMap.panningObj.panningAnimationMultiplier ) + startX,
                finishY = ( ( startY - this.theMap.pan.panningXYOld.y ) * this.theMap.panningObj.panningAnimationMultiplier ) + startY,
                finishXYSum = this.abs( finishX ) + this.abs( finishY ),
                speed = ( finishXYSum > 1200 )? 1200: finishXYSum,
                duration = ( ( speed > this.theMap.panningObj.panningAnimationTime )? this.theMap.panningObj.panningAnimationTime - 50: speed );
                
            this.theMap.testObj = {
                    start: this.date.now(),
                    duration: duration,
                    finishTime: undefined,
                    panNew: this.theMap.pan.panningXYNew,
                    panOld: this.theMap.pan.panningXYOld,                    
                };
            this.theMap.testObj.finishTime = this.theMap.testObj.start + duration;
            this.theMap.dragDiv.style.transition = 'all '+ duration +'ms cubic-bezier( 0, 0, 0.25, 1 )'; // theMap.calcBezier(x,x,x,x) needs to be changed also.
            this.theMap.dragDiv.style[this.theMap.CSSTRANSFORM] = 'translate('+ finishX +'px,'+ finishY +'px)';
        }
    }.bind( {
        theMap: theMap,
        abs: window.Math.abs, 
        date: window.Date,
        } );

    function calculatePanTime( now ){
        var total = 0;
            
        theMap.timeToLoadArray.push( now - theMap.startSend );
        theMap.timeToLoadArray.forEach( function( recordedTime ){
            total = total + recordedTime;
        });
        theMap.panningObj.panningAnimationTime = ( total / theMap.timeToLoadArray.length < 1000 )? ~~( total / theMap.timeToLoadArray.length ): 1000 ;
        if ( theMap.timeToLoadArray.length > 10 ){ theMap.timeToLoadArray = [] }
    } 

return {
    panningControlsliderMouseDown: panningControlsliderMouseDown,
    panningControlsliderMove: panningControlsliderMove,
    panningAnimationMouseUp: panningAnimationMouseUp,
    calculatePanTime: calculatePanTime,
}

}();