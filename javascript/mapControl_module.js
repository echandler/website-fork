
theMap.mapControl_module = function () {
    var theMap = window.theMap;

    // Tried out a simple 'observer' (or 'pub/sub') pattern.
    var mapLoadFuncArray = [],
        addFuncTo_mapLoadFuncArray = function (arg_description, arg_scope, arg_function) {

            // arg_description is for debugging in the dev tools.
            mapLoadFuncArray.push([arg_description, arg_scope, arg_function]);
        },
        removeFuncFrom_mapLoadFuncArray = function (arg_function) {

            for (var z = 0; z < mapLoadFuncArray.length; ++z) {

                if (mapLoadFuncArray[z][2] === arg_function) {

                    mapLoadFuncArray.splice(z, 1);
                    break;
                }
            }
        },
        callFuncsIn_mapLoadFuncArray = function () {
            for (var a = mapLoadFuncArray.length-1; a > -1; --a) {

                try{

                    mapLoadFuncArray[a][2].call(mapLoadFuncArray[a][1]);
                } catch(e) {

                    console.error('**** Error calling function "callFuncsIn_mapLoadFuncArray()" in "theMap.mapControl_module".')
                    console.log('**** This is the error object:\n', e , '\n\n');
                    console.log('**** This is the stack trace:\n', e.stack , '\n\n');
                    console.log('**** Element at index '+ a +' in mapLoadFuncArray:', mapLoadFuncArray[a]);
                }
            }
            return 0;
        };

    var setImg = function () {
        var xmlOutput = theMap.parsedXMLFromServer.getElementsByTagName("OUTPUT"),
            newMapImg = document.createElement('img');

        if (this.state.panning || this.state.zooming) {

            return;
        }

        try{

            theMap.state.waitingForImage = true;

            newMapImg.src = xmlOutput[0].getAttribute('url');
            newMapImg.addEventListener('load', mapLoad);
            newMapImg.style.opacity = '0';
            newMapImg.style.zIndex = '1';
            newMapImg.style.imageRendering= 'pixelated'; // TODO: Test of new css feature in chrome.
            newMapImg.className = 'theMap_primary ';
        } catch(error) {

            console.error(error);

            theMap.utilities_module.handleAjaxError(error);

            resetMapOnError();

            return;
        }
    }.bind(theMap);

    var mapLoad = function () {
        var theMap = window.theMap,
            xmlEnvelope = theMap.parsedXMLFromServer.getElementsByTagName("ENVELOPE");

        if (theMap.state.panning || theMap.state.zooming || theMap.state.waitingForAjax) {

            return;
        }

        theMap.currentMapImg = this;
        theMap.resetMapOnErrorSliderPosition = theMap.sliderPosition;
        theMap.options_module.svgController('start Map Done Loading');// Spins the gear

        if (xmlEnvelope && xmlEnvelope[0]) {

            theMap.presentMinX = +(+xmlEnvelope[0].getAttribute("minx")).toFixed(3);
            theMap.presentMaxX = +(+xmlEnvelope[0].getAttribute("maxx")).toFixed(3);
            theMap.presentMinY = +(+xmlEnvelope[0].getAttribute("miny")).toFixed(3);
            theMap.presentMaxY = +(+xmlEnvelope[0].getAttribute("maxy")).toFixed(3);
        }

        theMap._left = 0 - theMap.dragDiv._left;
        theMap._top  = 0 - theMap.dragDiv._top;
        theMap.currentMapImg._left = theMap._left; // TODO: add these in main.
        theMap.currentMapImg._top = theMap._top;

        // svg_streets.getMapInfo({
        //         x: theMap.presentMinX,
        //         X: theMap.presentMaxX,
        //         y: theMap.presentMinY,
        //         Y: theMap.presentMaxY,
        //     });

        theMap.baseCSSTransformValue = 'translate3d('+ theMap._left +'px,'+ theMap._top  +'px, 0px)';
        theMap.tempCSSTransformString = '';

        theMap._height = theMap.resizedMapHeight;
        theMap._width  = theMap.resizedMapWidth;

        theMap.svgContainer._left = theMap._left;
        theMap.svgContainer._top = theMap._top;
        theMap.svgContainer.setAttribute('viewBox', theMap._left +' '+ theMap._top +' '+ theMap._width +' '+ theMap._height);
        theMap.svgContainer.setAttribute('class', '');

        // Chrome around version 40 locks up the tab when zoomed in a lot of times, found that
        // resorting to using top and left on the svg container, then after a some milliseconds
        // delete the top and left and apply the css transform.
<<<<<<< HEAD
=======

>>>>>>> origin/master
        theMap.svgContainer.style.top = theMap._top +'px'; // Chrome workaround
        theMap.svgContainer.style.left = theMap._left +'px'; // Chrome workaround

        setTimeout(function(){

            theMap.svgContainer.style.top = '0px'; // Chrome workaround
            theMap.svgContainer.style.left = '0px'; // Chrome workaround
            theMap.svgContainer.style.transform = theMap.baseCSSTransformValue; // Apply this too early and tab locks up.
        }, 100);

        // End of chrome zoom CSS transform bug fix.

        theMap.svgContainer.style[theMap.CSSTRANSFORM] = "";

        this.style[theMap.CSSTRANSFORM] = theMap.baseCSSTransformValue;

        document.body.className = '';

        if (theMap.parameters.PANNING_ANIMATION_TRUE_OR_FALSE) {

            theMap.panning_module.calculatePanTime(Date.now());
        }

        theMap.marker_module.isSimpleMarkerOnImage();
        theMap.calculateMarkersPositions(); // TODO: Markers don't need to be calculated every time the map loads.
        theMap.marker_module.calculatePropHighlightPosition();

        if (theMap.optionsReference.showSatelliteView_CheckMark) {

            theMap.svgPropertyHightlightGroup.style.fill = 'white';
        } else {

            theMap.svgPropertyHightlightGroup.style.fill = 'rgb(93, 141, 195)';
        }

        theMap.mapControl_module.callFuncsIn_mapLoadFuncArray();

        // Put the image on the screen
        theMap.dragDiv.firstElementChild.style.zIndex = -1;

        theMap.dragDiv.insertBefore(this, theMap.dragDiv.firstChild);

        setTimeout(function () {

            this.style.opacity = '1';
        }.bind(this), 20);

        setTimeout(function () {

            this.dragDiv.removeChild(theMap.dragDiv.firstChild.nextElementSibling);

            this.currentMapImg.className = this.currentMapImg.className.replace(/ transitionAll2sEaseOut/, '');

            ++theMap.popStateCounter;

            if (!this.onPopState) {

                if (window.history.pushState && !document.location.origin === "file://") {

                    window.history.pushState({
                        minxOld : this.presentMinX,
                        maxxOld : this.presentMaxX,
                        minyOld : this.presentMinY,
                        maxyOld : this.presentMaxY,
                        zoom: theMap.sliderPosition,
                        title: "SnoCo Interactive Map "+ theMap.popStateCounter,
                    },
                    "title 1",
                    '?={"x":'+ this.presentMinX +',"X":'+ this.presentMaxX +',"y":'+ this.presentMinY +',"Y":'+ this.presentMaxY +',"z":'+ this.sliderPosition +'}'
                  );
                }

                document.title = "SnoCo Interactive Map "+ theMap.popStateCounter;
            }
        }.bind(theMap), 250);

        theMap.state.waitingForImage = false; // Set to true when making an ajax request.
    };

    // This is attached to the map in main.js.
    // Might not be used anymore.....
    var mapLoadError = function (e) {

        this.className = '';

        document.body.className = '';

        console.dir(e);

        window.alert(' There was a problem, the map image didn\'t load properly.\n\n Please try again.\n\n');

        resetMapOnError();
    };

    var resetMapOnError = function () {// TODO: Fix this

        theMap.options_module.svgController('start Map Done Loading');
    }.bind(theMap);

    var theMap_mouseDown = function (e) { // mouse down on theMap, either set a marker or drag the map.

        if (e.which !== 1) {

            return;
        }

        if (e.shiftKey) {

            theMap.boxZoom_module.boxZoom_mouseDown(e);

            return false;
        }

        e.preventDefault();

        this.pan.mouseDownStartX = e.clientX;
        this.pan.mouseDownStartY = e.clientY;
        this.pan.mouseDownStartXpan = e.clientX - this.dragDiv._left;
        this.pan.mouseDownStartYpan = e.clientY - this.dragDiv._top;
        this.pan.panningXYOld = undefined;
        this.pan.panningXYNew = undefined;

        this.pan.points = []; // TODO: testing

       // theMap.utilities_module.removeTransitionFromMarkers();

        // This if block stops the animated panning of the map immediately.
        if (Date.now() < this.panningObj.haltPanning.finishTime) {

            var posOnBezierCurve = (this.calcBezier((Date.now() - this.panningObj.haltPanning.startTime) / this.panningObj.haltPanning.duration));

            var finishX = Math.round((this.panningObj.haltPanning.startX * (1 - posOnBezierCurve)) + (this.panningObj.haltPanning.finishX * posOnBezierCurve)),
                finishY = Math.round((this.panningObj.haltPanning.startY * (1 - posOnBezierCurve)) + (this.panningObj.haltPanning.finishY * posOnBezierCurve));

            this.dragDiv.style.transition = '';
            this.dragDiv.style[this.CSSTRANSFORM] = 'translate('+ finishX +'px,'+ finishY +'px)';

            this.dragDiv._left = finishX;
            this.dragDiv._top  = finishY;
        }

        document.addEventListener('mouseout', private_mapMouseUp);
        document.addEventListener('mouseup', private_mapMouseUp);
        document.addEventListener('mousemove', mapInitialDragTasks);
        document.addEventListener('mousemove', this.pan.mouseMoveFunction);
    }.bind(window.theMap);

    var private_mapMouseUp = function (e) {// mouse up for the image
        var xyCoords = undefined;

        if (e.relatedTarget) { return; }

        e.preventDefault();

        document.removeEventListener('mouseup', private_mapMouseUp);
        document.removeEventListener('mouseout', private_mapMouseUp);

        document.removeEventListener('mousemove', mapInitialDragTasks);
<<<<<<< HEAD
        document.removeEventListener('mousemove', this.theMap.pan.mouseMoveFunction);
=======
        document.removeEventListener('mousemove',  this.theMap.pan.mouseMoveFunction);
>>>>>>> origin/master

        if (!theMap.pageHasFocus) {
            theMap.pageHasFocus = true;
            if (e.clientY - this.theMap.pan.mouseDownStartY === 0 && e.clientX - this.theMap.pan.mouseDownStartX === 0) {
                this.theMap.state.panning = false;
                return;
            }
        }

        if (e.clientY - this.theMap.pan.mouseDownStartY === 0
            && e.clientX - this.theMap.pan.mouseDownStartX === 0) {

            if (this.theMap.sliderPosition > 120
                || document.body.style.cursor === "crosshair"
                || (e && e.target.nodeName === 'circle')
                || this.theMap.state.panning) {

<<<<<<< HEAD
=======
            if (this.theMap.sliderPosition > 120
                || document.body.style.cursor === "crosshair"
                || (e && e.target.nodeName === 'circle')
                || this.theMap.state.panning) {
>>>>>>> origin/master
                return;
            }

            theMap.marker_module.deleteUnUsedMarkers();

            theMap.marker_module.makeMarker(e);

            if (e.ctrlKey) {

                if (!/dontdelete/i.test(this.theMap.markersArray[ this.theMap.markersArray.length - 1 ].className)) {

                    this.theMap.markersArray[ this.theMap.markersArray.length - 1 ].data.pinButton.click();
                }
            }
        } else {

            if (this.theMap.parameters.PANNING_ANIMATION_TRUE_OR_FALSE) {

                this.panningAnimationMouseUp(e);
            }

            xyCoords = theMap.dragDiv.style[this.theMap.CSSTRANSFORM].match(/(-?[\d.]*?)px, (-?[\d.]*?)px/);

            theMap.dragDiv._top  = +xyCoords[2];
            theMap.dragDiv._left = +xyCoords[1];

            theMap.zoom_module.zoomStart(
                (e.clientX - this.theMap.mapContainer._left - theMap.dragDiv._left - (+this.theMap._left)) ,
                (e.clientY - this.theMap.mapContainer._top  - theMap.dragDiv._top  - (+this.theMap._top)),
                e.clientX,
                e.clientY
            );
        }

        this.theMap.state.panning = false;
    }.bind({
        theMap: theMap,
        panningAnimationMouseUp: theMap.panning_module.panningAnimationMouseUp
    });

    var mapDragOnly = function (e) {

        this.dragDiv.style[this.CSSTRANSFORM] = 'translate('
                                    + (this.dragDiv._left + (e.clientX - this.pan.mouseDownStartX)) +'px,'
                                    + (this.dragDiv._top  + (e.clientY - this.pan.mouseDownStartY)) +'px)';
    }.bind(theMap);

    var mapDragAndAnimation = function (e) {
        var x = e.clientX - this.theMap.pan.mouseDownStartXpan,
            y = e.clientY - this.theMap.pan.mouseDownStartYpan;

        // this.theMap.pan.panningXYOld = this.theMap.pan.panningXYNew || {x: x, y: y};
<<<<<<< HEAD

        // this.theMap.pan.panningXYNew = {
        //     x: x,
        //     y: y,
        //     time: this.date.now()
        // };

=======

        // this.theMap.pan.panningXYNew = {
        //     x: x,
        //     y: y,
        //     time: this.date.now()
        // };

>>>>>>> origin/master
        this.theMap.pan.points.push({ // TODO: testing
            x: x,
            y: y,
            time: this.date.now()
        });

        this.theMap.dragDiv.style[this.theMap.CSSTRANSFORM] = 'translate3d('+ (this.theMap.dragDiv._left + (e.clientX - this.theMap.pan.mouseDownStartX)) +'px,'+ (this.theMap.dragDiv._top + (e.clientY - this.theMap.pan.mouseDownStartY)) +'px,0px)';
    }.bind({
        theMap: theMap,
        date: window.Date
    });

    // This function is called once and immediately removed just to make the panning feel smoother.
    // Math.round is for a bug in chrome, the text is blurry if the left and\or top coordinates
    // are not integers. ("left: 543.3321px;" = blurry text, "left: 543px;" = sharp text)
    var mapInitialDragTasks = function () {

        this.theMap.dragDiv.style.transition = '';

        this.theMap.clearTimeoutt(this.theMap.zoomStartTimer);

        this.theMap.state.panning = true;

        document.removeEventListener('mousemove', mapInitialDragTasks);
    }.bind({
        theMap: theMap
    });

    return {
            addFuncTo_mapLoadFuncArray: addFuncTo_mapLoadFuncArray,
            removeFuncFrom_mapLoadFuncArray: removeFuncFrom_mapLoadFuncArray,
            callFuncsIn_mapLoadFuncArray: callFuncsIn_mapLoadFuncArray,
            setImg: setImg,
            mapLoad: mapLoad,
            mapLoadError: mapLoadError,
            resetMapOnError:  resetMapOnError,
            theMap_mouseDown: theMap_mouseDown,
            mapDragOnly: mapDragOnly,
            mapDragAndAnimation: mapDragAndAnimation,
        };
}();