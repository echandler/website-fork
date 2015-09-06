var MeasureSvgLine_module = function (arg_theMap, arg_button) {
    var obj = new DrawSVGLine_module(arg_theMap);

    //this.drawLineOptionsLabel = window.$('drawLine_Label');
    obj.drawLineOptionsCheckMark = window.$('measureLine_CheckMark');
    obj.math = window.Math;
    obj.doubleClickA = undefined;

    obj.createNewPolyline = function (e) {

        this.constructor.prototype.createNewPolyline.call(this, e);

        this.polyline.feetDivsArray = [];
        this.polyline.startPoint.onclick = this.startPointOnClick.bind(this.polyline);
    };

    obj.FeetDiv = function (arg_polyline, arg_lastPointBoolean, arg_index) {
        var feetDiv = document.createElement('div'),
            lengthOfLineInFeet = undefined,
            x = undefined,
            y = undefined;

        if (arg_index) {

            x = Math.abs(+arg_polyline.statePlaneCoords[arg_index-1].x - +arg_polyline.statePlaneCoords[arg_index].x);
            y = Math.abs(+arg_polyline.statePlaneCoords[arg_index-1].y - +arg_polyline.statePlaneCoords[arg_index].y);
        } else {

            x = Math.abs(+arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-2].x - +arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-1].x);
            y = Math.abs(+arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-2].y - +arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-1].y);
        }

        lengthOfLineInFeet = Math.round(Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));

        if (lengthOfLineInFeet === 0) {

            arg_polyline.currentPointsArray.pop();
            arg_polyline.statePlaneCoords.pop();

            return;
        }

        feetDiv.className = 'feetDiv';

        feetDiv.addEventListener('mousedown', function (e) {

            e.stopPropagation();
        });

        feetDiv.polyline = arg_polyline;
        feetDiv.theMap = this.theMap;
        feetDiv.index = arg_polyline.feetDivsArray.length + 1;// Used to calculate position.

        window.$('theMap_misc_container').appendChild(feetDiv);//TODO

        feetDiv.lengthOfLineInFeet = lengthOfLineInFeet;
        feetDiv.innerHTML = lengthOfLineInFeet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ft';

        arg_polyline.feetDivsArray.push(feetDiv);

        if (arg_lastPointBoolean && arg_polyline.feetDivsArray.length > 1) {

            for (var m = 0, t = 0; m < arg_polyline.feetDivsArray.length; ++m) {

                t += +arg_polyline.feetDivsArray[m].innerHTML.replace(/\D/g,'');
            }

            feetDiv.innerHTML = feetDiv.innerHTML +'<br><div style="color: grey; margin-top: 5px; font-style: italic;">'+ t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ft</div>';
        }
        var x1 = +this.polyline.statePlaneCoords[feetDiv.index].x,
            y1 = +this.polyline.statePlaneCoords[feetDiv.index].y,
            x2 = +this.polyline.statePlaneCoords[feetDiv.index-1].x,
            y2 = +this.polyline.statePlaneCoords[feetDiv.index-1].y;

        feetDiv.data = {};

        feetDiv.data.statePlaneCoordX = ((x1 - x2) / 2) + x2;
        feetDiv.data.statePlaneCoordY = ((y1 - y2) / 2) + y2;

        feetDiv.data.offsetLeft = feetDiv.offsetWidth / 2;
        feetDiv.data.offsetTop =  feetDiv.offsetHeight / 2;

        feetDiv.style.left = '0px';
        feetDiv.style.top = '0px';

        //theMap.marker_module.makeMarker(null, {"a": "","x": feetDiv.data.statePlaneCoordX,"y": feetDiv.data.statePlaneCoordY,"m":"Hi"})
        this.theMap.markersArray.push(feetDiv);

        this.theMap.calculateMarkersPositions(feetDiv);

        return feetDiv;
    };

    obj.startPointOnClick = function (e) {
        var feetDiv = undefined,
            OKToMakeFeetDiv = this.thisPointer.drawingALine && !this.deleteDoubleClick;
        // 'this' === the polyline that the start point is associated with.

        e.stopPropagation();

        this.thisPointer.constructor.prototype.startPointOnClick.call(this, e);

        if (OKToMakeFeetDiv) {

            feetDiv = this.thisPointer.FeetDiv(this, true);

            if (feetDiv) {

                feetDiv.innerHTML = feetDiv.innerHTML +'<div style="color: grey; margin-top: 5px; font-style: italic; ">'+ ((+this.thisPointer.polygonArea(this.statePlaneCoords)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')) + ' ac</div>';

                setTimeout(function () {

                    feetDiv.data.offsetwidth = feetDiv.offsetWidth / 2;
                    feetDiv.data.offsetheight = feetDiv.offsetHeight / 2;

                    this.thisPointer.theMap.calculateMarkersPositions(feetDiv);
                }.bind(this), 10);
            } else { // if feetDiv is undefined then there must not be a distance to measure.

                this.thisPointer.deleteLineFromArray(this);
            }
        }

        this.deleteDoubleClick = true;

        window.setTimeout(function () {

            this.deleteDoubleClick = false;
        }.bind(this), 200);
    };

    obj.SVGContainerClickHandler = (function () {

        return function (e) {
            var clickHandler = this.bindSVGContainerClickHandlerTo_this(),
                OK = clickHandler(e),
                feetDivsArray = this.polyline.feetDivsArray;

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            if (OK === false) {

                return false;
            }

            if (this.doubleClickA) {

                if (feetDivsArray.length > 1) {

                    feetDivsArray[feetDivsArray.length-1].innerHTML =
                        feetDivsArray[feetDivsArray.length-1].innerHTML
                        + '<br><div style="color: grey; margin-top: 5px; font-style:italic;">'
                        + this.calculateTotalFeet(feetDivsArray).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                        + ' ft</div>';
                }

                setTimeout(function () {
                    var feetDiv = this.feetDivsArray[this.feetDivsArray.length-1];

                    feetDiv.data.offsetwidth = feetDiv.offsetWidth / 2;
                    feetDiv.data.offsetheight = feetDiv.offsetHeight / 2;
                    this.thisPointer.theMap.calculateMarkersPositions(feetDiv);
                }.bind(this.polyline), 10);

                this.theMap.calculateMarkersPositions(this.polyline.feetDivsArray[this.polyline.feetDivsArray.length-1]);
            } else if (this.drawingALine) {

                this.FeetDiv(this.polyline);
            }

            this.doubleClickA = true;

            this.doubleClickATimer = window.setTimeout(function () { this.setDoublClickAToFalse(); }.bind(this), 200);
        }.bind(obj);
    })();


    obj.setDoublClickAToFalse = function () {

        this.doubleClickA = false;
    };

    obj.resizeLines = function () {
        var linesArray = this.linesArray,
            points = [],
            index = 0;

        this.constructor.prototype.resizeLines.call(this);

        for (var i = 0; i < linesArray.length; ++i) {

            points = linesArray[i].currentPointsArray;

            index = 0;

            while (index < linesArray[i].feetDivsArray.length) {// position the feetDiv's.

                linesArray[i].feetDivsArray[index].style.display = '';

                this.theMap.calculateMarkersPositions(linesArray[i].feetDivsArray[index]);

                ++index;
            }
        }
    };

    obj.polygonArea = function (arg_xyObj) { //http://www.mathopenref.com/coordpolygonarea2.html
        var area = 0; // Accumulates area in the loop

        for (var i = 1; i < arg_xyObj.length; i++) {

            area = area + (arg_xyObj[i-1].x + arg_xyObj[i].x) * (arg_xyObj[i].y - arg_xyObj[i-1].y);
        }

        area = Math.abs(area) / 2;

        area = area / 9 / 4840; // area / (9 feet in a square yard) / (4840 square yards in an acre)

        return area.toFixed(2);
    };

    obj.calculateTotalFeet = function (arg_feetDivsArray) {
        var index = 0,
            total = 0;

        for (; index < arg_feetDivsArray.length; ++index) {

            total += +arg_feetDivsArray[index].lengthOfLineInFeet;
        }

        return total;
    };

    obj.SVGContainerDeleteLastVertex = (function () {
        return function (e) {
            var code = undefined,
                delVertex = this.constructor.prototype.bindSVGContainerDeleteLastVertexTo_this.call(this);

            delVertex.call(this, e);

            if (this.drawingALine && e.srcElement.nodeName !== 'INPUT') {
                if (!e) {

                    e = window.event;
                }

                if (e.keyCode) {

                    code = e.keyCode;
                } else if (e.which) {

                    code = e.which;
                }

                if (code == 8 || code == 46) { // 8 = BackSpace key, 46 = Delete key

                    if (this.polyline.feetDivsArray.length >= 1) {

                        this.polyline.feetDivsArray[this.polyline.feetDivsArray.length-1].parentNode.removeChild(this.polyline.feetDivsArray[this.polyline.feetDivsArray.length-1]);
                        this.polyline.feetDivsArray.pop();
                    }

                    e.preventDefault();

                    return false;
                }
            }
        }.bind(obj);
    })();

    obj.drawLineSetup = function () {
        var OKtoDelete = this.drawingALine;

        this.constructor.prototype.drawLineSetup.call(this);

        if (OKtoDelete) {

            this.deleteLineFromArray(this.polyline);
        }
    };

    obj.deleteLineFromArray = function (arg_line) {

        this.constructor.prototype.deleteLineFromArray.call(this, arg_line);

        // Delete the feetDivs from the DOM and reset feetDivsArray
        for (var m = arg_line.feetDivsArray.length-1; m > -1; --m) {

            arg_line.feetDivsArray[m].parentNode.removeChild(arg_line.feetDivsArray[m]);

            arg_line.feetDivsArray.splice(m, 1);
        }
    };

    obj.init = function (arg_id) { //TODO:

        this.drawLineOptionsCheckMark = document.getElementById(arg_id);

        window.$('measureLine_Label').addEventListener('click', this.drawLineSetup.bind(this));

        window.$('measureLine_CheckBox').addEventListener('click', this.drawLineSetup.bind(this));

        theMap.addMapLoadCallBack('Resizes the measuring lines when the map loads', this, this.resizeLines);
    };

    return obj;
};