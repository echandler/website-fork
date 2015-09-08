
theMap.panning_module = function () {
    var theMap = window.theMap,
        transitionResetTimeout = undefined;

    // Start the panning animation.
    var panningAnimationMouseUp = function () {
        var points = this.theMap.pan.points;

        if (points.length < 4 || (this.date.now() - points[points.length-1].time) > 150) {

            return;
        }

        var firstPoint = points[points.length - 2],
            secondPoint = points[points.length - 4];

        // Calculate angle.
        var deltaX = firstPoint.x - secondPoint.x,
            deltaY = firstPoint.y - secondPoint.y,
            angle  = Math.atan2(deltaY, deltaX);

        //Calculate speed.
        var time  = firstPoint.time - secondPoint.time,
            dist  = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY)),
            speed = dist / time;

        // Calculate distance needed to travel.
        var vectorLength = speed * (theMap.resizedMapWidth * theMap.resizedMapHeight / theMap.parameters.MAX_IMG_PIXELS
                                * 200 /*seems like a good number*/
                                + 120 /*the vector can't be smaller than this number*/); // TODO

        // Calculate x and y.
        var vectorX = vectorLength * Math.cos(angle),
            vectorY = vectorLength * Math.sin(angle);

        // Calculate the final x and y positions for the animation.
        // Rounding the coordinates so that the text in markers  in chrome is not blurry.
        var finishX = Math.round(vectorX + firstPoint.x),
            finishY = Math.round(vectorY + firstPoint.y);

        // How long the animation will be.
        var duration = this.theMap.pan.panningAnimationTime;

        // Object used to stop the animation at a certian point so the person can pan the map around.
        this.theMap.pan.haltPanning = { // TODO: rename or re factor pan.haltPanning.
            startTime: this.date.now(),
            finishTime: undefined,
            duration: duration,
            start: {
                x: firstPoint.x,
                y: firstPoint.y
            },
            finish: {
                x: finishX,
                y: finishY
            }
        };
        this.theMap.pan.haltPanning.finishTime = this.theMap.pan.haltPanning.startTime + duration;

        this.theMap.dragDiv.style.transition = 'all '+ duration +'ms cubic-bezier(0, 0, 0.25, 1)'; // theMap.calcBezier(x,x,x,x) needs to be changed also.
        this.theMap.dragDiv.style[this.theMap.CSSTRANSFORM] = 'translate('+ finishX +'px,'+ finishY +'px)';

        // Reset transition after animation is finished.
        clearTimeout(transitionResetTimeout);

        transitionResetTimeout = setTimeout(function(){

            this.theMap.dragDiv.style.transition = '';
        }.bind(this), duration);
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

        theMap.pan.panningAnimationTime = (total / theMap.timeToLoadArray.length < 1000)
                                                    ? ~~(total / theMap.timeToLoadArray.length)
                                                    : 1000;

        if (theMap.timeToLoadArray.length > 10) {

            theMap.timeToLoadArray = [];
        }
    }

    return {
        panningAnimationMouseUp: panningAnimationMouseUp,
        calculatePanTime: calculatePanTime,
    };
}();