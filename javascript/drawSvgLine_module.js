
var DrawSVGLine_module = function (arg_theMap) {

    this.theMap = arg_theMap;

    this.drawLineOptionsLabel = window.$('drawLine_Label');
    this.drawLineOptionsCheckMark = window.$('drawLine_CheckMark');

    this.SVGContainer = window.$('theMap_svg_container');
    this.SVGContainerClickHandler = this.bindSVGContainerClickHandlerTo_this();
    this.SVGContainerMouseDownHandler = this.bindSVGContainerMouseDownHandlerTo_this();
    this.SVGContainerDeleteLastVertex = this.bindSVGContainerDeleteLastVertexTo_this();

    this.doubleClick = false;

    this.doubleClickTimer = undefined;

    this.linesArray = [];

    this.clientX = undefined;
    this.clientY = undefined;

    this.mouseMoveHandler = undefined;

    this.polyline = undefined;

    this.drawingALine = false;
    //this.init();
};

DrawSVGLine_module.prototype.createNewPolyline = function (e) {

    this.polyline = this.PolyLineConstructor(e);
    this.polyline.startPoint.onclick = this.startPointOnClick.bind(this.polyline);
    this.polyline.setAttribute('class', 'drawSVGLine');
    this.polyline.style.strokeDasharray = '5px 10px';

    this.linesArray.push(this.polyline);

    this.SVGContainer.insertBefore(this.polyline, theMap.svgCitiesGroup);
    this.SVGContainer.appendChild(this.polyline.startPoint);

    this.mouseMoveHandler = function (e) {

        this.polyline.lastEClientX = e.clientX;//TODO: private_ needs to be replaced.
        this.polyline.lastEClientY = e.clientY;//TODO: private_ needs to be replaced.

        if (this.drawingALine && !this.theMap.state.panning) {

            this.polyline.setAttribute('points', this.polyline.currentPointsString
                                                + ' '
                                                + (e.clientX - this.theMap.mapContainer._left - this.theMap.dragDiv._left)
                                                +','
                                                + (e.clientY - this.theMap.mapContainer._top - this.theMap.dragDiv._top));
        }
    }.bind(this);

    this.SVGContainer.addEventListener('mousemove', this.mouseMoveHandler);
};

    DrawSVGLine_module.prototype.PolyLineConstructor = function (e) {
        var polyline = document.createElementNS("http://www.w3.org/2000/svg", 'polyline');

        polyline.style.strokeWidth = '3px';
        polyline.style.strokeLinejoin = 'round';
        polyline.style.strokeLinecap = 'round';

        if (this.theMap.optionsReference.showSatelliteView_CheckMark) {

            polyline.style.stroke = 'rgb(225,0,0)';
        } else {

            polyline.style.stroke = 'rgb(93, 141, 195)';
        }

        polyline.style.fill = 'transparent';

        if (e) {

            polyline.setAttribute('points',  (e.clientX - this.theMap.mapContainer._left - this.theMap.dragDiv._left) +','+ (e.clientY - this.theMap.mapContainer._top - this.theMap.dragDiv._top));

            polyline.statePlaneCoords = [ this.theMap.utilities_module.convertMouseCoordsToStatePlane(e) ];

            polyline.currentPointsArray= [ (e.clientX - this.theMap.mapContainer._left - this.theMap.dragDiv._left) +','+ (e.clientY - this.theMap.mapContainer._top - this.theMap.dragDiv._top) ];
            polyline.currentPointsString = polyline.currentPointsArray[0];

        } else {

            polyline.statePlaneCoords = [];

            polyline.currentPointsArray= [];
            polyline.currentPointsString = '';
        }

        polyline.startPoint = this.createStartPoint(e);
        polyline.endPoint = undefined;

        polyline.thisPointer = this;

        polyline.deleteDoubleClick = false;

        return polyline;
    };

    DrawSVGLine_module.prototype.bindSVGContainerClickHandlerTo_this = function () {
        return function (e) {

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            if (!this.theMap.pageHasFocusForClick) { // this.theMap.pageHasFocus was set to true by the this.theMap.mapControl_module -> private_mouseUp().

                this.theMap.pageHasFocusForClick = true;

                return false;
            }

            if (this.clientX !== e.clientX && this.clientY !== e.clientY) {

                return false;
            }

            if (!this.doubleClick && !this.drawingALine) {

                this.createNewPolyline(e);

                this.drawingALine = true;
            } else if (this.doubleClick) {

                window.clearTimeout(this.doubleClickTimer);

                this.drawingALine = false;

                this.SVGContainer.removeEventListener('mousemove', this.mouseMoveHandler);
                //polyline.startPoint.onmouseover = function () { this.style.stroke = 'rgb(225,0,0)'; };
                //polyline.startPoint.onmouseout = function () { this.style.stroke = 'blue' };

                this.polyline.style.strokeDasharray = '';
                this.polyline.endPoint = this.createEndPoint(e);
                this.polyline.endPoint.onclick = this.endPointOnClick.bind(this.polyline);

                this.SVGContainer.appendChild(this.polyline.endPoint);
            } else if (this.drawingALine) {

                this.polyline.currentPointsArray.push((e.clientX - this.theMap.mapContainer._left - this.theMap.dragDiv._left) +','+ (e.clientY - this.theMap.mapContainer._top - this.theMap.dragDiv._top));
                this.polyline.currentPointsString = this.polyline.currentPointsArray.join(' ');
                this.polyline.statePlaneCoords.push(this.theMap.utilities_module.convertMouseCoordsToStatePlane({ clientX: e.clientX, clientY: e.clientY }));
                this.polyline.setAttribute('points', this.polyline.currentPointsString);
            }

            this.doubleClick = true;

            this.doubleClickTimer = window.setTimeout(function () { this.setDoublClickToFalse(); }.bind(this), 200);
        }.bind(this);
    };

    DrawSVGLine_module.prototype.setDoublClickToFalse = function () {

        this.doubleClick = false;
    };

    DrawSVGLine_module.prototype.createStartPoint = function (e) {
        var startPoint = document.createElementNS("http://www.w3.org/2000/svg", 'circle');

        if (e) {

            startPoint.setAttribute('cx', (e && (e.clientX - this.theMap.mapContainer._left - this.theMap.dragDiv._left) || 0));
            startPoint.setAttribute('cy', (e && (e.clientY - this.theMap.mapContainer._top - this.theMap.dragDiv._top) || 0));
        }

        startPoint.setAttribute('r', '5px');
        startPoint.style.fill = 'white';
        startPoint.style.stroke = 'white';
        startPoint.style.cursor = 'pointer';

        return startPoint;
    };

    DrawSVGLine_module.prototype.startPointOnClick = function (e) {

        // 'this' === the polyline that the start point is associated with.
        e.stopPropagation();

        if (!this.thisPointer.drawingALine && this.deleteDoubleClick) {

            this.thisPointer.deleteLineFromArray(this);
        } else if (this.thisPointer.drawingALine) {

            this.thisPointer.SVGContainer.removeEventListener('mousemove', this.mouseMoveHandler);
            this.thisPointer.drawingALine = false;

            this.style.strokeDasharray = '';

            this.endPoint = this.startPoint;

            this.currentPointsArray.push(this.currentPointsArray[0]);

            this.statePlaneCoords.push(this.statePlaneCoords[0]);

            this.setAttribute('points', this.currentPointsArray.join(' '));
        }

        this.deleteDoubleClick = true;

        window.setTimeout(function () { this.deleteDoubleClick = false; }.bind(this), 200);
    };

    DrawSVGLine_module.prototype.createEndPoint = function (e) {
        var endPoint = this.createStartPoint(e);

        endPoint.setAttribute('r', '4px');

        return endPoint;
    };

    // TODO: this is not going to work because 'this' points to the SVG circle.
    DrawSVGLine_module.prototype.endPointOnClick = function (e) {

        e.stopPropagation();

        if (this.deleteDoubleClick) {

            this.thisPointer.deleteLineFromArray(this);
        }

        this.deleteDoubleClick = true;

        window.setTimeout(function () { this.deleteDoubleClick = false; }.bind(this), 200);
    };

    DrawSVGLine_module.prototype.createPolylinesFromUrl = function (arg_linesArray) {
        var polyline = undefined,
            spCoords = undefined;

        for (var n = 0; n < arg_linesArray.length; ++n) {
            polyline = PolyLineConstructor();
            polyline.startPoint.onclick = this.startPointOnClick.bind(polyline);
            polyline.endPoint = this.createEndPoint();
            polyline.endPoint.onclick = this.endPointOnClick.bind(polyline);
            polyline.setAttribute('class', 'drawSVGLine');
            for (var t = 0; t < arg_linesArray[n].length; ++t) {
                spCoords = arg_linesArray[n][t].split(',');
                polyline.statePlaneCoords.push({ x: +spCoords[0], y: +spCoords[1]});
            }
            //polyline.currentPointsArray= [ e.clientX +','+ e.clientY ];
            this.linesArray.push(polyline);
            this.SVGContainer.insertBefore(polyline, this.SVGContainer.firstElementChild.nextElementSibling);
            this.SVGContainer.appendChild(polyline.startPoint);
            this.SVGContainer.appendChild(polyline.endPoint);
        }
        this.resizeLines();
    };

    DrawSVGLine_module.prototype.resizeLines = function () {
        var linesArray = this.linesArray,
            showSatelliteView_CheckMark = this.theMap.optionsReference.showSatelliteView_CheckMark;

        for (var i = 0; i < linesArray.length; ++i) {

            this.resizeOneLine(linesArray[i]);

            if (showSatelliteView_CheckMark) {

                linesArray[i].style.stroke = 'rgb(225,0,0)';
            } else {

                linesArray[i].style.stroke = 'rgb(93, 141, 195)';
            }
        }
    };

    DrawSVGLine_module.prototype.resizeOneLine = function (arg_line) {
        var xMultiplier = (this.theMap.presentMaxX - this.theMap.presentMinX) / this.theMap._width,
            yMultiplier = (this.theMap.presentMaxY - this.theMap.presentMinY) / this.theMap._height,
            index = 0,
            len = arg_line.statePlaneCoords.length,
            x = undefined,
            y = undefined,
            points = [],
            presentMinX = this.theMap.presentMinX,
            presentMaxY = this.theMap.presentMaxY;

        while (index < len) {

            //arr = pointsData[index].split(',');
            x = ((arg_line.statePlaneCoords[index].x - presentMinX) / xMultiplier + theMap._left).toFixed(0);
            y = ((presentMaxY - (arg_line.statePlaneCoords[index].y)) / yMultiplier + theMap._top).toFixed(0);

            if (index === 0) {

                arg_line.startPoint.setAttribute('cx', x);
                arg_line.startPoint.setAttribute('cy', y);
            }

            if (index === (len - 1) && arg_line.endPoint) {

                arg_line.endPoint.setAttribute('cx', x);
                arg_line.endPoint.setAttribute('cy', y);
            }

            points.push(x +','+ y);

            ++index;
        }

        arg_line.currentPointsArray = points;

        arg_line.currentPointsString = points.join(' ');

        if (arg_line.endPoint) { // Don't follow the mouse.

            arg_line.setAttribute('points', arg_line.currentPointsString);
        } else{ // Follow the mouse.

            arg_line.setAttribute('points', arg_line.currentPointsString
                                  + ' '
                                  + (arg_line.lastEClientX - theMap.mapContainer._left - theMap.dragDiv._left)
                                  + ','
                                  + (arg_line.lastEClientY - theMap.mapContainer._top - theMap.dragDiv._top));
        }
    };

    DrawSVGLine_module.prototype.bindSVGContainerDeleteLastVertexTo_this = function () {

        return  function (e) {
            var code = undefined;

            e.preventDefault();
            e.stopPropagation();

            if (this.drawingALine) {

                if (!e) {

                    e = window.event;
                }

                if (e.keyCode) {

                    code = e.keyCode;
                } else if (e.which) {

                    code = e.which;
                }

                if (code == 8 || code == 46) {// 8 = Backspace, 46 = Delete.

                    if (this.polyline.currentPointsArray.length > 1) {

                        this.polyline.statePlaneCoords.pop();

                        this.polyline.currentPointsArray.pop();

                        this.polyline.currentPointsString = this.polyline.currentPointsArray.join(' ');

                        this.polyline.setAttribute('points', this.polyline.currentPointsString
                                                            + ' '
                                                            + (this.polyline.lastEClientX - this.theMap.mapContainer._left - this.theMap.dragDiv._left)
                                                            + ','
                                                            + (this.polyline.lastEClientY - this.theMap.mapContainer._top - this.theMap.dragDiv._top));
                    }
                }
            }

            return false;
        }.bind(this);
    };

    DrawSVGLine_module.prototype.drawLineSetup = function () {

        if (this.drawLineOptionsCheckMark.checkedState()) {

            this.theMap.utilities_module.simpleMessageBox(                                '<center style="border-bottom: 1px solid rgba(93, 141, 195, 0.5);">Draw a line</center>'
                                +((window.$('overlay_map'))?'<br><center>(Move overlay map out of the way)</center><br>':'')
                                +'<table><tbody><tr><td valign="top">1)</td><td>Click anywhere to start a line.</td></tr>'
                                +'<tr><td valign="top">2)</td><td>Click anywhere to make a new vertex.</td></tr>'
                                +'<tr><td valign="top">3)</td><td>Press &lt;Backspace&gt; or &lt;Delete&gt; to delete the last vertex.</td></tr>'
                                +'<tr><td valign="top">4)</td><td>Double click anywhere or click the starting point to finish the line.</td></tr>'
                                +'<tr><td valign="top">5)</td><td>Delete a line by double clicking on the start or end points when you are finished.</td></tr>'
                                +'</tbody></table></div>', 'draw_message');

            this.SVGContainer.addEventListener('mousedown', this.SVGContainerMouseDownHandler);
            this.SVGContainer.addEventListener('click', this.SVGContainerClickHandler);

            document.addEventListener('keydown', this.SVGContainerDeleteLastVertex);

            document.body.style.cursor = 'crosshair';

            //window.$('SVG_cities_group').displayStatus = window.$('SVG_cities_group').style.display;
            //window.$('SVG_cities_group').style.display = 'none';

            this.addDelStartEndPoints('add');

            this.theMap.state.lineDrawingMode = true;
        } else {

            if (this.drawingALine) {

                this.drawingALine = false;

                this.SVGContainer.removeEventListener('mousemove', this.mouseMoveHandler);

                if (this.polyline.currentPointsArray.length === 1) {

                    this.polyline.startPoint.parentNode.removeChild(this.polyline.startPoint);

                    this.polyline.parentNode.removeChild(this.polyline);
                } else {

                    //this.addDelStartEndPoints('delete');
                    this.polyline.endPoint = this.createEndPoint({
                        clientX: +this.polyline.currentPointsArray[this.polyline.currentPointsArray.length-1].split(',')[0],
                        clientY: +this.polyline.currentPointsArray[this.polyline.currentPointsArray.length-1].split(',')[1]
                    });
                    this.polyline.endPoint.onclick = this.endPointOnClick.bind(this.polyline);

                    this.SVGContainer.appendChild(this.polyline.endPoint);

                    this.polyline.setAttribute('points', this.polyline.currentPointsArray);
                }

            }

            this.SVGContainer.removeEventListener('mousedown', this.SVGContainerMouseDownHandler);
            this.SVGContainer.removeEventListener('click', this.SVGContainerClickHandler);

            document.removeEventListener('keydown', this.SVGContainerDeleteLastVertex);

            document.body.style.cursor = '';

            this.addDelStartEndPoints('delete');

            this.polyline.style.strokeDasharray = '';

            this.theMap.state.lineDrawingMode = false;
            try{

                window.$('draw_message').parentNode.removeChild(window.$('draw_message'));
            }catch(e) {}
        }
    };

    DrawSVGLine_module.prototype.bindSVGContainerMouseDownHandlerTo_this = function () {

        return function test(e) {

            this.clientX = e.clientX;
            this.clientY = e.clientY;
        }.bind(this);
    };

    DrawSVGLine_module.prototype.deleteLineFromArray = function (arg_line) {
        var array = this.linesArray,
            len = array.length;

        arg_line.startPoint.parentNode.removeChild(arg_line.startPoint);

        if (arg_line.endPoint && arg_line.endPoint.parentNode) {

            arg_line.endPoint.parentNode.removeChild(arg_line.endPoint);
        }

        arg_line.parentNode.removeChild(arg_line);

        for (var m = 0; m < len; ++m) {

            if (arg_line === array[m]) {

                array.splice(m, 1);

                break;
            }
        }
    };

    DrawSVGLine_module.prototype.addDelStartEndPoints = function (arg_addOrDel) {
        var array = this.linesArray,
            len = array.length;

        for (var m = 0; m < len; ++m) {

            if (arg_addOrDel === 'add') {

                array[m].startPoint.style.display = '';

                array[m].endPoint.style.display = '';
            } else {

                array[m].startPoint.style.display = 'none';

                array[m].endPoint.style.display = 'none';
            }
        }
    };

    DrawSVGLine_module.prototype.init = function () {
        //TODO: add event listener for checkmark

        this.drawLineOptionsLabel.addEventListener('click', this.drawLineSetup.bind(this));

        this.theMap.addMapLoadListener('Resize lines when map loads', this, this.resizeLines);
    };