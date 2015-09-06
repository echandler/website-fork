
theMap.panning_module = function () {
    var theMap = window.theMap;

    function panningControlsliderMouseDown(e) {

        document.body.style.cursor = 'pointer';

        window.addEventListener('mousemove', panningControlsliderMove, true);
        window.addEventListener('mouseup', panningControlsliderMouseUp, false);

        panningControlsliderMove(e);

        e.preventDefault();
        e.stopImmediatePropagation();
    }

    var panningControlsliderMouseUp = function (e) {

        document.body.style.cursor = 'default';

        window.removeEventListener('mousemove', panningControlsliderMove, true);
        window.removeEventListener('mouseup', panningControlsliderMouseUp, false);

        // TODO: Find out difference between e.preventDefault() and
        // e.stopImmediatePropagation().
        e.preventDefault();
        e.stopImmediatePropagation();
    };

    var panningControlsliderMove = function (e) {
        var sliderRailWidth = this.sliderRail.clientWidth,
            //tick = this.Math.floor(sliderRailWidth / 3 /10)*10,
            z = this.Math.round((e.clientX - this.sliderRail.getBoundingClientRect().left)) - 8;

        if (z >= 0 && z < sliderRailWidth - 12) {

            // There is a bug in chrome that causes the text to be fuzzy if using "-webkit-transform: translate" to
            // position the marker, all is well if the number is an int and not a float. This causes the number to
            // be a float thou which will make the text blurry. Works fine in other browsers.
            theMap.panningObj.panningAnimationMultiplier = (z / sliderRailWidth) * 21;// if panningAnimationMultiplier default was changed this needs to be changed and 1 added to it.

            this.slider.style.left = z +'px';
        }
    }.bind({
        sliderRail: window.$('panning_control_slider_rail'),
        slider: window.$('panning_control_slider'),
        Math: window.Math,
    });

    // Start the panning animation.
    var panningAnimationMouseUp = function () {
        var points = this.theMap.pan.points;

        if (!points[points.length-1] || (this.date.now() - points[points.length-1].time) > 150) {

            return;
        }

        var lastIndex = points[points.length - 2],
            secondToLastIndex = points[points.length - 4];

        // Calculate angle.
        var deltaX = lastIndex.x - secondToLastIndex.x,
            deltaY = lastIndex.y - secondToLastIndex.y,
            angle = Math.atan2(deltaY, deltaX);

        //Calculate speed.
        var time = lastIndex.time - secondToLastIndex.time,
            dist = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY)),
            speed = dist / time;

        // Calculate distance needed to travel.
        var vectorLength = speed * (theMap.resizedMapWidth * theMap.resizedMapHeight / theMap.parameters.MAX_IMG_PIXELS
                                    * 200 /*seems like a good number*/
                                    + 120 /*can't be smaller than this number*/); // TODO

        // Calculate x and y.
        var dx = vectorLength * Math.cos(angle),
            dy = vectorLength * Math.sin(angle);

        // Calculate the final x and y positions for the animation.
        // Rounding the coordinates so that the text in chrome is not blurry.
        var finishX = Math.round(dx + lastIndex.x),
            finishY = Math.round(dy + lastIndex.y);

        // How long the animation will be.
        var duration = this.theMap.panningObj.panningAnimationTime - 50;

        // Object used to stop the animation at a certian point so the person can pan the map around.
        this.theMap.panningObj.haltPanning = { // TODO: rename or re factor panningObj.haltPanning.
            startTime: this.date.now(),
            finishTime: undefined,
            duration: duration,
            startX: lastIndex.x,
            startY: lastIndex.y,
            finishX: finishX,
            finishY: finishY
        };
        this.theMap.panningObj.haltPanning.finishTime = this.theMap.panningObj.haltPanning.startTime + duration;

        this.theMap.dragDiv.style.transition = 'all '+ duration +'ms cubic-bezier(0, 0, 0.25, 1)'; // theMap.calcBezier(x,x,x,x) needs to be changed also.
        this.theMap.dragDiv.style[this.theMap.CSSTRANSFORM] = 'translate('+ finishX +'px,'+ finishY +'px)';
    }.bind({
        theMap: theMap,
        date: window.Date,
    });

    function calculatePanTime(now) {
        var total = 0;

        theMap.timeToLoadArray.push(now - theMap.startSend);

        theMap.timeToLoadArray.forEach(function (recordedTime) {

            total = total + recordedTime;
        });

        theMap.panningObj.panningAnimationTime = (total / theMap.timeToLoadArray.length < 1000)? ~~(total / theMap.timeToLoadArray.length): 1000 ;

        if (theMap.timeToLoadArray.length > 10) {

            theMap.timeToLoadArray = [];
        }
    }

return {
    panningControlsliderMouseDown: panningControlsliderMouseDown,
    panningControlsliderMove: panningControlsliderMove,
    panningAnimationMouseUp: panningAnimationMouseUp,
    calculatePanTime: calculatePanTime,
};
}();