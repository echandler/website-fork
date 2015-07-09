
theMap.boxZoom_module = function () {
    var boxZoom = undefined;

// TODO: Re-factor these 'box' functions.
    function boxZoom_mouseDown(e) {
        var theMap = window.theMap,
            zoomBox = document.createElement('div');

        e.preventDefault();
        if (theMap.state.waitingForAjax || theMap.state.waitingForImage) {
            return;
        }
        zoomBox.id = 'boxZoom';
        zoomBox.className = 'boxZoom';

        //window.$('theMap_container').appendChild(zoomBox);
        theMap.dragDiv.insertBefore(zoomBox, window.$('theMap_marker_container'));

        zoomBox.style.top  = e.clientY - window.theMap.mapContainer._top - theMap.dragDiv._top +'px';
        zoomBox.style.left = e.clientX - window.theMap.mapContainer._left - theMap.dragDiv._left +'px';
        zoomBox.style.zIndex = 500;
        zoomBox.start = {x: undefined, y: undefined };// TODO: is this still used anywhere?
        zoomBox.start.clientX = e.clientX;
        zoomBox.start.clientY = e.clientY;

        //zoomBox.ratioWH = window.theMap.resizedMapWidth/window.theMap.resizedMapHeight;
        //zoomBox.zoomLevel = 0;

        theMap.pageHasFocus = true;

        boxZoom = zoomBox;

        window.addEventListener('mousemove', private_boxZoom_mouseMove);
        window.addEventListener('mouseup', private_boxZoom_mouseUp);
    }

    var private_boxZoom_mouseUp = function (e) {
        var mapHalfWidthPoint  = this.resizedMapWidth  / 2 + this.mapContainer._left,
            mapHalfHeightPoint = this.resizedMapHeight / 2 + this.mapContainer._top,
            widthOfBox  = e.clientX - boxZoom.start.clientX,
            heightOfBox = e.clientY - boxZoom.start.clientY;

        window.removeEventListener('mousemove', private_boxZoom_mouseMove);
        window.removeEventListener('mouseup', private_boxZoom_mouseUp);

        setTimeout(function () {

            this.dragDiv.removeChild(boxZoom);
        }.bind(this), 170);

        if (e.clientX === boxZoom.start.clientX &&
            e.clientY === boxZoom.start.clientY) {

            return;
        }

        // Move city to the middle of the screen to set it up for the zoom.
        var x = (e.clientX - this.mapContainer._left) - (widthOfBox / 2);
        var y = (e.clientY - this.mapContainer._top)  - (heightOfBox / 2);

        var halfMapWidth  = ((this._width  / 2) - x) / 2;
        var halfMapHeight = ((this._height / 2) - y) / 2;

        this._left = Math.round(this._left + halfMapWidth);
        this._top  = Math.round(this._top  + halfMapHeight);

        //this.currentMapImg.className = " smoothTransition";
        //this.currentMapImg.style[this.CSSTRANSFORM] = 'translate('+ this._left +'px, '+ this._top +'px)';

        this.dragDiv._left = Math.round(this.dragDiv._left + halfMapWidth);
        this.dragDiv._top  = Math.round(this.dragDiv._top  + halfMapHeight);

        //this.dragDiv.className += " smoothTransition";

        this.svgContainer.style.opacity = '0';
        this.svgContainer.style.zIndex = '-1000';

        //this.measureLine.setFeetDivsDisplaytoNone();

        this.markersArray.forEach(function (marker) {
            marker.className += " smoothTransition";
        });

        setTimeout(function () {

            this.dragDiv.className = this.dragDiv.className.replace(/ smoothTransition/,'');

            this.markersArray.forEach(function (marker) {
                marker.className = marker.className.replace(/ smoothTransition/g, '');
            });
        }.bind(this), 600);

        this.dragDiv.style[this.CSSTRANSFORM] = 'translate('+ this.dragDiv._left +'px, '+ this.dragDiv._top +'px)';

        this.currentMapImg._left = this._left; // TODO: add these in main.
        this.currentMapImg._top  = this._top;

        this.baseCSSTransformValue = 'translate('+ this._left +'px,'+ this._top  +'px)';

        boxZoom.style.transition ="opacity 0.15s ease-in-out";
        boxZoom.style.opacity = 0;

        this.state.panning = false;

        boxZoom_doTheZoom({
            width: widthOfBox,
            height: heightOfBox,
            x: mapHalfWidthPoint,
            y: mapHalfHeightPoint
        });
    }.bind(theMap);

    var private_boxZoom_mouseMove = function (e) {

        boxZoom.style.width  = (e.clientX - boxZoom.start.clientX) +'px';
        boxZoom.style.height = (e.clientY - boxZoom.start.clientY) +'px';
    };

    var boxZoom_doTheZoom = function (arg_zoomBox) {

        // X,YcoordOnMapImg is where the mouse is on the map image its self, not where the mouse is in the viewport (aka screen).
        var tempHeight = undefined,
            tempWidth  = undefined,
            heightRatioOfBoxToMap = undefined,
            widthRatioOfBoxToMap  = undefined;

        heightRatioOfBoxToMap = arg_zoomBox.height / this._height;
        widthRatioOfBoxToMap  = arg_zoomBox.width  / this._width;

        tempWidth  = (this._width  * 2) * widthRatioOfBoxToMap; // this._width * 2 is used to simulate the next zoom.
        tempHeight = (this._height * 2) * heightRatioOfBoxToMap;// this._height * 2 is used to simulate the next zoom.

        if (tempWidth  > this.resizedMapWidth  ||
            tempHeight > this.resizedMapHeight ||
            this.sliderPosition === 0) {

            this.zoom_module.zoomStart(                (arg_zoomBox.x - this.mapContainer._left - this.dragDiv._left - this._left),
                (arg_zoomBox.y - this.mapContainer._top - this.dragDiv._top - this._top),
                arg_zoomBox.x,
                arg_zoomBox.y
           );

            setTimeout(function () {

                this.utilities_module.removeTransitionFromMarkers();
            }.bind(this), 1000);
        } else {

            this.zoom_module.zoomInOut({
                clientX: arg_zoomBox.x,
                clientY: arg_zoomBox.y,
                wheelDelta: 120
            }, false, true);

            arg_zoomBox.width  = this._width  * widthRatioOfBoxToMap;
            arg_zoomBox.height = this._height * heightRatioOfBoxToMap;

            boxZoom_doTheZoom(arg_zoomBox);

            return;
        }
    }.bind(theMap);

    return{
        boxZoom_mouseDown: boxZoom_mouseDown,
        boxZoom_doTheZoom: boxZoom_doTheZoom,
    };
}();