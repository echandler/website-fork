import * as utils from "./utils";

export function panning_module(thisMap) {
    let theMap = thisMap;
    let transitionResetTimeout = undefined;

    thisMap.pan = {
        mainContainerXY: null,
        mouseDownX: null,
        mouseDownXOffset: null,
        mouseDownY: null,
        mouseDownYOffset: null,
        panningFunction: mapDragAndAnimation,
        points: null,
        spCoords: null
    };

    // Start the panning animation.
    function panningAnimationMouseUp(e) {
        let transistionDurationMS = 2200;

        let points = theMap.pan.points;

        if (points.length < 3 || Date.now() - points[points.length - 1].time > 150) {
            //theMap.coords_module.updateStatePlaneCoordsByDistance(e.clientX - thisMap.pan.mouseDownX, e.clientY - thisMap.pan.mouseDownY);
            return;
        }

        let startPoint = points[points.length - 1];
        let offsetPoint = points[points.length - 3];

        let deltaA = points[points.length - 2],
            deltaB = points[points.length - 3],
            deltaX = deltaA.x - deltaB.x,
            deltaY = deltaA.y - deltaB.y,
            angle = Math.atan2(deltaY, deltaX);

        // prettier-ignore
        let time = (points[points.length - 1].time - points[points.length - 2].time +
                    (points[points.length - 2].time - points[points.length - 3].time)) / 2,
                    //deltaA.time - deltaB.time,
            offsetX = startPoint.x - offsetPoint.x,
            offsetY = startPoint.y - offsetPoint.y,
            dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY),
            speed = dist / time;

        //console.log(speed * 150, speed, "d", dist, Math.sqrt(speed * 150), time);
        if (dist <= 2 || time === 0) {
            clearTimeout(transitionResetTimeout);
            return;
        }

        // Calculate distance needed to travel.
        // graph -> https://www.desmos.com/calculator/wopqdbru4y
        let dampen = Math.sqrt(Math.log10(Math.log10(speed ** 3 + 1) ** 15 + 1)) ** 0.07 / 4;

        let vectorLength = speed ** 1.09 * 400 * dampen;
        //speed**0.6 * (40 * Math.sqrt(speed**1.6));
        //speed * (20 * Math.sqrt(speed));
        //speed * 150 - 60; // Found this magic number through trial and error.

        transistionDurationMS *= dampen;

        // New vector.
        let vector = {
            rise: vectorLength * Math.sin(angle),
            run: vectorLength * Math.cos(angle)
        };

        // Calculate the final x and y positions for the animation.
        // Rounding the coordinates so that the text on the markers in chrome is not blurry.
        let finishPoint = {
            x: Math.round(vector.run + startPoint.x),
            y: Math.round(vector.rise + startPoint.y)
        };

        thisMap.mainContainer.left = finishPoint.x;
        thisMap.mainContainer.top = finishPoint.y;

        // prettier-ignore
        theMap.mainContainer.element
            .style[utils.CSS_TRANSITION] = "transform " + transistionDurationMS +
                                                "ms cubic-bezier(0, 0, 0.3, 1)";
        // theMap.calcBezier(x,x,x,x) needs to be changed also.

        // prettier-ignore
        theMap.mainContainer.element
            .style[utils.CSS_TRANSFORM] = "translate3d(" + finishPoint.x + "px," +
                                                         finishPoint.y + "px, 0px)";

        // Reset transition.
        clearTimeout(transitionResetTimeout);

        transitionResetTimeout = setTimeout(
            function() {
                this.mainContainer.element.style[utils.CSS_TRANSITION] = "";
            }.bind(theMap),
            transistionDurationMS
        );
    }

    function stopPanAnimation(e) {
        // prettier-ignore
        let posOnBezierCurve = document.defaultView
                                .getComputedStyle(thisMap.mainContainer.element)
                                .transform.match(/(-?\d*.?\d*), (-?\d*.?\d*)\)$/);
        //(thisMap.calcBezier((Date.now() - pan.anim.startTime) / pan.anim.duration));

        if (!posOnBezierCurve) {
            return;
        }

        let x = Math.round(posOnBezierCurve[1]), //Math.round(pan.anim.startPoint.x - ((pan.anim.startPoint.x - pan.anim.endPoint.x) * posOnBezierCurve)),
            y = Math.round(posOnBezierCurve[2]); //Math.round(pan.anim.startPoint.y - ((pan.anim.startPoint.y - pan.anim.endPoint.y) * posOnBezierCurve));

        thisMap.state.waitingForAjax = false;
        thisMap.state.waitingForImage = false;

        thisMap.updateStatePlaneCoordsByDistance(x - thisMap.mainContainer.left, y - thisMap.mainContainer.top);

        //thisMap.mainContainer.element.style[utils.CSS_TRANSITION] = "";
        thisMap.mainContainer.element.style[utils.CSS_TRANSFORM] = "translate(" + x + "px," + y + "px)";

        thisMap.mainContainer.top = y;
        thisMap.mainContainer.left = x;

        thisMap.event.fire("stopPanAnimation");
    }

    function calculateMapImgLoadTime(now) {
        // Tries to guess how much time the map images will need to load.
        let total = 0;

        theMap.timeToLoadArray.push(now - theMap.startSend);

        theMap.timeToLoadArray.forEach(function(recordedTime) {
            total = total + recordedTime;
        });

        // prettier-ignore
        theMap.mapImg.loadTime = total / theMap.timeToLoadArray.length < 1000
                                    ? ~~(total / theMap.timeToLoadArray.length)
                                    : 1000;

        if (theMap.timeToLoadArray.length > 10) {
            theMap.timeToLoadArray = [];
        }
    }

    function panningMouseDown(e) {
        let evt = e.__event__;
        let pan = thisMap.pan;

        if (evt.which !== 1 || evt.which === 0 /*touch*/) {
            return;
        }

        if (evt.shiftKey) {
            thisMap.boxZoom_module.boxZoom_mouseDown(evt);

            return false;
        }

        evt.preventDefault();
        pan.mouseDownX = evt.clientX;
        pan.mouseDownY = evt.clientY;
        pan.mouseDownXOffset = evt.clientX - thisMap.mainContainer.left;
        pan.mouseDownYOffset = evt.clientY - thisMap.mainContainer.top;

        pan.points = []; // TODO: testing

        // thisMap.utils.removeTransitionFromMarkers();
        stopPanAnimation();

        pan.mainContainerXY = {
            x: thisMap.mainContainer.left,
            y: thisMap.mainContainer.top
        };

        pan.spCoords = {
            x: thisMap.extent.visible.x,
            X: thisMap.extent.visible.X,
            y: thisMap.extent.visible.y,
            Y: thisMap.extent.visible.Y
        };

        document.addEventListener("mouseout", private_removePanningEventListeners);
        document.addEventListener("mouseup", private_mapMouseUp);
        document.addEventListener("mousemove", mapInitialDragTasks);
        document.addEventListener("mousemove", thisMap.pan.panningFunction);
    }

    // This function is called once and immediately removed just to make the panning feel smoother.
    // Math.round is for a bug in chrome, the text is blurry if the left and\or top coordinates
    // are not integers. ("left: 543.3321px;" = blurry text, "left: 543px;" = sharp text).
    function mapInitialDragTasks(e) {
        if (e.clientY - thisMap.pan.mouseDownY === 0 && e.clientX - thisMap.pan.mouseDownX === 0) {
            // A bug in chrome will call this function if a mousedown event happens.
            // Bug hasn't been fixed in atleast chrome version 51.0.2704.103 and earlier.

            return;
        }

        thisMap.mainContainer.element.style[utils.CSS_TRANSITION] = "";

        // End any zooming activity
        //thisMap.Zoom_class.zoomStop();

        thisMap.state.panning = true;

        document.removeEventListener("mousemove", mapInitialDragTasks);
        thisMap.event.fire("pan initial", e);
    }

    function private_mapMouseUp(e) {
        // mouse up for the image
        if (e.relatedTarget) {
            return;
        }

        e.preventDefault();

        private_removePanningEventListeners(e);

        panningMouseUp(e);
        //thisMap.event.fire("map mouse up", e);
    }

    function private_removePanningEventListeners(e) {
        if (e.relatedTarget) {
            return;
        }

        e.preventDefault();

        document.removeEventListener("mouseup", private_mapMouseUp);
        document.removeEventListener("mouseout", private_mapMouseUp);

        document.removeEventListener("mousemove", mapInitialDragTasks);
        document.removeEventListener("mousemove", thisMap.pan.panningFunction);
    }

    var mapDragOnly = function(e) {
        let mainCont = this.mainContainer;
        let x = mainCont.left + (e.clientX - this.pan.mouseDownX);
        let y = mainCont.top + (e.clientY - this.pan.mouseDownY);

        // prettier-ignore
        mainCont.element.style[utils.CSS_TRANSFORM] = "translate(" + x + "px, " + y + "px)";
    }.bind(thisMap);

    function mapDragAndAnimation(e) {
        //var x = e.clientX - thisMap.pan.mouseDownXOffset,
        //   y = e.clientY - thisMap.pan.mouseDownYOffset;
        let mainCont = thisMap.mainContainer;

        let distanceX = thisMap.pan.mainContainerXY.x + e.clientX - thisMap.pan.mouseDownX,
            distanceY = thisMap.pan.mainContainerXY.y + e.clientY - thisMap.pan.mouseDownY;

        mainCont.top = distanceY;
        mainCont.left = distanceX;

        thisMap.pan.points.push({
            x: distanceX,
            y: distanceY,
            time: Date.now()
        });

        // prettier-ignore
        mainCont.element.style[utils.CSS_TRANSFORM] =
            "translate3d(" + distanceX + "px, " + distanceY + "px, 0px)";

        thisMap.event.fire("pan", e);
    }


    function panningMouseUp(e) {
        let evt = e.__event__ || e;
        let pan = thisMap.pan;

        if (evt.clientY - pan.mouseDownY !== 0 || evt.clientX - pan.mouseDownX !== 0) {
            thisMap.panning_module.panningAnimationMouseUp(evt);

            // prettier-ignore
            theMap.updateStatePlaneCoordsByDistance(
                thisMap.mainContainer.left - pan.mainContainerXY.x,
                thisMap.mainContainer.top - pan.mainContainerXY.y,
                pan.spCoords
            );

            thisMap.event.fire("pan end");
        }

        thisMap.state.panning = false;
    }

    function panTo(spPoint, panTime) {
        let pxlPoint = thisMap.getPixelPointInMapContainer.bind(thisMap);
        let convertSpToPxl = thisMap.convertProjPointToPixelPoint.bind(thisMap);

        let centerPxls = pxlPoint({
            x: thisMap.mapContainer.left + thisMap.mapContainer.width / 2,
            y: thisMap.mapContainer.top + thisMap.mapContainer.height / 2
        });
        let pointOfInterestPxl = convertSpToPxl(spPoint);
        let distance = {
            x: centerPxls.x - pointOfInterestPxl.x,
            y: centerPxls.y - pointOfInterestPxl.y
        };

        panByPixels(distance, panTime);

        return thisMap;
    }

    function panByPixels(spPoint, panTime) {
        let mainCont = thisMap.mainContainer;
        let vectorLen = Math.sqrt(spPoint.x * spPoint.x + spPoint.y * spPoint.y);

        // Played around with this on a graphing website, might want to revisit in the future.
        let max = Math.max( 200, vectorLen * (500 * (0.45 / vectorLen ** 0.9) + 0.06));
        let time = panTime || Math.min( 1000, max );

        mainCont.left += Math.round(spPoint.x);
        mainCont.top += Math.round(spPoint.y);

        thisMap.updateStatePlaneCoordsByDistance(spPoint.x, spPoint.y);

        // prettier-ignore
        {
        // Block for prettier-ignore
        mainCont.element.style[utils.CSS_TRANSITION] =
            "all " + time + "ms cubic-bezier(0, 0, 0.25, 1)";

        mainCont.element.style[utils.CSS_TRANSFORM] =
            "translate3d(" + mainCont.left + "px," + mainCont.top + "px,0px)";
        }

        setTimeout(() => {
            mainCont.element.style[utils.CSS_TRANSITION] = null;
        }, time);


            thisMap.event.fire("pan end", { panEndTime: time });

    }

    function enablePanning() {
        thisMap.event.on("mousedown", panningMouseDown);
        //thisMap.event.on("mouseup", panningMouseUp);
    }

    function disablePanning() {
        thisMap.event.off("mousedown", panningMouseDown);
        //thisMap.event.off("mouseup", panningMouseUp);
    }

    return {
        panTo: panTo,
        panByPixels: panByPixels,
        enablePanning: enablePanning,
        disablePanning: disablePanning,
        stopPanAnimation: stopPanAnimation,
        mapDragOnly: mapDragOnly,
        calculateMapImgLoadTime: calculateMapImgLoadTime,
        mapDragAndAnimation: mapDragAndAnimation,
        panningAnimationMouseUp: panningAnimationMouseUp
    };
}
