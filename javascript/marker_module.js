"use strict";
theMap.marker_module = function () {
    var theMap = window.theMap;
    var private_largeDefaultMarkerImages = false;
    var private_markerCounter = 0;

    var private_xmlQueryParams = //' #ALL#'+
                                  ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.TAB_ACRES'
                                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSLINE1'
                                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSCITY'
                                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSZIP'
                                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.OWNERNAME'
                                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.PARCEL_ID'
                                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.MKTTL';

    var private_defaultSimpleMarkerArray = [
            ['css/images/I_405.svg', {x: 1297219.7944701847, y: 299087.74347618467}, 20, 24, 'interStateShields' ],
            ['css/images/I_5.svg', {x: 1310690.7391130, y: 365097.7726428}, 20, 20, 'interStateShields' ],
            ['css/images/I_5.svg', {x: 1304692.2556091, y: 439633.3538498} , 20, 20, 'interStateShields' ],
            ['css/images/I_5.svg', {x: 1280535.9065988, y: 299215.0671469}, 20, 20, 'interStateShields' ],
            ['css/images/SR_9.svg', {x: 1327302.7786226, y: 326899.4225040}, 20, 20, 'interStateShields' ],
            ['css/images/SR_9.svg', {x: 1328005.5309462373, y: 407681.92078087135}, 20, 20, 'interStateShields' ],
            ['css/images/SR_526.svg', {x: 1295163.6901966, y: 340020.5944062}, 20, 20, 'interStateShields' ],
            ['css/images/SR_530.svg', {x: 1401101.5901171, y: 467397.5034938}, 20, 20, 'interStateShields' ],
            ['css/images/US_2.svg', {x: 1380120.3987939, y: 313828.3406249}, 20, 20, 'interStateShields' ],
            ['css/images/snocoTrees.svg',{x: 1304547, y: 359370}, 13, 31, 'assessor interStateShields']
        ];

    function makeInterStateShields() {
        var m = 0, marker = undefined;

        while (private_defaultSimpleMarkerArray[m]) {
            marker = private_makeSimpleMarker(private_defaultSimpleMarkerArray[m][0], private_defaultSimpleMarkerArray[m][1], private_defaultSimpleMarkerArray[m][2], private_defaultSimpleMarkerArray[m][3], private_defaultSimpleMarkerArray[m][4]);
            if (/assessor/i.test(marker.className)) {
                marker.title = 'Snohomish County Assessor';
                marker.style.zIndex = 1000;
            }
            ++m;
        }
    }

    var private_makeSimpleMarker = function (arg_imgUrl, arg_spObj, arg_height, arg_width,  arg_className) {
        var simpleMarker = document.createElement('img');
            simpleMarker.src = arg_imgUrl;
            simpleMarker.style.position = 'absolute';
            simpleMarker.className = arg_className +' simpleMarker';
            simpleMarker.setAttribute('data', arg_imgUrl.replace(/.*(.?._..?.?)\..*/, '$1'));
            simpleMarker.width  = arg_width;
            simpleMarker.height = arg_height;
            simpleMarker.style.zIndex = '11';
            simpleMarker.data = {};
            simpleMarker.data.statePlaneCoordX = arg_spObj.x;
            simpleMarker.data.statePlaneCoordY = arg_spObj.y;
            simpleMarker.data.offsetLeft = (arg_width / 2) - 3;
            simpleMarker.data.offsetTop = arg_height / 2;

            theMap.markersArray.push(simpleMarker);

            window.$('theMap_misc_container').appendChild(simpleMarker);

            calculatePosition.marker(simpleMarker);

            return simpleMarker;
    };

    var makeMarker = function (e, arg_infoObject) {
        // TODO: Are all these var's necessary?
        // Don't set a marker if the map is not zoomed in enough, default is 100;
        var infoObject = (arg_infoObject || false), //{"a": "apn number goes here","x": lat,"y": lng,"m":"text message","i":"img url"}
            statePlaneCoordsXY = !infoObject && theMap.utilities_module.convertMouseCoordsToStatePlane(e);

        var markerBody = document.createElement('div');

        markerBody.data = {
            markerBody: markerBody,
            deleted: false
        };

        markerBody.className = 'markerParent';

        markerBody.data.statePlaneCoordX = +infoObject.x || statePlaneCoordsXY.x;
        markerBody.data.statePlaneCoordY = +infoObject.y || statePlaneCoordsXY.y;
        markerBody.data.zindex = 1e6 - markerBody.data.statePlaneCoordY.toFixed(0);

        var wsg84XYCoords = this.utilities_module.convertSPToWGS84(markerBody.data.statePlaneCoordX, markerBody.data.statePlaneCoordY);

        markerBody.data.wgs84XCoord = wsg84XYCoords.x;
        markerBody.data.wgs84YCoord = wsg84XYCoords.y;
        markerBody.data.offsetLeft = undefined;
        markerBody.data.offsetTop = undefined;
        markerBody.data.theMap = this;
        markerBody.data.svgGroup = { group: undefined, pathsArray: [] };

        markerBody.style.zIndex = markerBody.data.zindex;

        markerBody.id = 'parcelMarker'
                        +'_x_'+ markerBody.data.statePlaneCoordX
                        +'_y_'+ markerBody.data.statePlaneCoordY
                        +'_'+ (++private_markerCounter);

        markerBody.addEventListener('mouseover', lowerOpacityOfMarkersAroundThisMarker);
        markerBody.addEventListener('mouseout', resetOpacityOfMarkersAroundThisMarker);

        markerBody.data.setOffSetWH = function () {

            this.offsetLeft  = (this.markerBody.offsetWidth / 2);

            this.offsetTop =  this.markerBody.offsetHeight + 30;
        };

        markerBody.addEventListener('click', function () {

            theMap.pageHasFocus = true;
        });

        markerBody.data.removeSvgGroup = function () {

            if (this.svgGroup.group && this.svgGroup.group.parentNode) {

                this.svgGroup.group.parentNode.removeChild(this.svgGroup.group);
            }

            this.svgGroup = null;
        };

        markerBody.data.changeBgColorAndzIndex = function (arg_color, arg_zIndex) {

            this.markerBody.style.backgroundColor = arg_color;

            this.markerBody.data.innerArrow.style.borderTopColor = arg_color;

            this.markerBody.style.zIndex = arg_zIndex;
        };

        markerBody.data.apn = infoObject.a || undefined;

        // markerBody.message and markerBody.imgUrl are used by utilities_module.makeUrl();
        markerBody.data.message = infoObject.m || '';
        markerBody.data.imgUrl = infoObject.i || '';

        markerBody.addEventListener('mousedown', function (e) {

            e.stopPropagation();
        });

        var deleteButton = document.createElement('div');
        deleteButton.className = 'markerDeleteButton';
        deleteButton.innerHTML = '&#215;';
        deleteButton.markerBody = markerBody;
        deleteButton.addEventListener('click', function () {
            var markerArray = theMap.markersArray,
                markerArrayLen = markerArray.length,
                parentId = this.markerBody.id;

            while (markerArrayLen--) {

                if (markerArray[markerArrayLen].id === parentId) {

                    markerArray.splice(markerArrayLen, 1);
                }
            }

            resetOpacityOfMarkersAroundThisMarker.call(this.markerBody);

            this.markerBody.data.removeSvgGroup();

            this.markerBody.data.deleted = true;

            this.markerBody.parentNode.removeChild(this.markerBody);

            window.$('smallCountyMarker'+ parentId).parentNode.removeChild(window.$('smallCountyMarker'+ parentId));
        });
        markerBody.appendChild(deleteButton);

        // var colorDiv = document.createElement('div');
        //     colorDiv.className = 'markercolorDiv';
        //     colorDiv.markerBody = markerBody;
        //     colorDiv.style.cssText = 'opacity: 0.3; position: absolute;right: 10px;height: 35%;width: 12px;margin: auto;top: 0px;bottom: 6px;';
        // markerBody.data.colorDiv = colorDiv;
        // markerBody.appendChild(colorDiv);

        if (infoObject && infoObject.a && infoObject.a !== '') {

            var apnContainer = document.createElement('div');
            apnContainer.style.marginTop = "-0.54em";
            apnContainer.style.marginRight = "10px";

            var apn = document.createElement('div');
            apn.className = ('markerApnText');
            apn.innerHTML = 'Apn:';

            var anchor = document.createElement('a');
            anchor.className = 'markerApnLink';
            anchor.href = theMap.parameters.APN_URL + infoObject.a;
            anchor.target = '_blank';
            anchor.innerHTML= infoObject.a;
            markerBody.data.apnAnchor = anchor;

            apnContainer.appendChild(apn);
            apnContainer.appendChild(anchor);

            markerBody.appendChild(apnContainer);
        }


        var editButton = document.createElement('a');
        editButton.className = 'markerEdit';
        editButton.href = "javascript:void(0);";
        editButton.innerHTML = "edit";
        editButton.theMap = this;
        editButton.markerBody = markerBody;
        editButton.addEventListener('click', private_markerMessageEditor, false);
        markerBody.data.editButton = editButton;

        var editPinDiv = document.createElement('div');
        editPinDiv.style.cssText = 'line-height: 20px; margin-bottom: 8px;';
        editPinDiv.appendChild(editButton);

        var pinButton = document.createElement('div');
        pinButton.className = 'markerPinButton';
        pinButton.title = 'Pin this marker';
        pinButton.markerBody = markerBody;
        pinButton.addEventListener('click', function () {

            if (/pinned/i.test(this.className)) {

                this.className = this.className.replace(/ markerPinButtonPinned/ig, '');

                this.markerBody.className = this.markerBody.className.replace(/ dontdelete/ig, '');
            } else {

                this.className += ' markerPinButtonPinned';

                this.markerBody.className = this.markerBody.className.replace(/ dontdelete/ig, '');

                this.markerBody.className += ' DONTDELETE';
            }
        });

        markerBody.data.pinButton = pinButton;
        editPinDiv.appendChild(pinButton);
        markerBody.appendChild(editPinDiv);

        var arrow = document.createElement('div');
        arrow.className = 'markerArrow';
        markerBody.data.arrow = arrow;
        markerBody.appendChild(arrow);

        var innerArrow = document.createElement('div');
        innerArrow.className = 'markerInnerArrow';
        markerBody.data.innerArrow = innerArrow;
        arrow.appendChild(innerArrow);

        window.$('theMap_marker_container').appendChild(markerBody);

        markerBody.data.setOffSetWH();

        this.markersArray.push(markerBody);

        theMap.smallCountySvg_module.smallCountySvgMakerMaker({x: markerBody.data.statePlaneCoordX, y: markerBody.data.statePlaneCoordY, id: markerBody.id });

        if (infoObject) {

            pinButton.click(); // Pins the marker by default.

            markerAddImageAndText.call(editButton, null, infoObject);

            if (infoObject.g && !this.marker) {

                private_makePropertyBoundaryPolygon(infoObject.g, markerBody);
            }
        } else {

            if (e.target.id.indexOf('street') !== -1) { // Did they click on a svg street path?

                private_streetInfo.call(markerBody, markerBody.data.statePlaneCoordX, markerBody.data.statePlaneCoordY);
            } else {

                private_propertyInfo.call(markerBody, markerBody.data.statePlaneCoordX, markerBody.data.statePlaneCoordY);
            }

            calculatePosition.marker(markerBody);
        }

        return markerBody;
    }.bind(theMap);

    var lowerOpacityOfMarkersAroundThisMarker =  function () {
        var thisArrowRect       = this.data.arrow.getBoundingClientRect();
        var thisArrowRectBottom = thisArrowRect.bottom + 200;

        var thatMarkerRect = undefined;

        var markersArray    = this.data.theMap.markersArray;
        var markersArrayLen = markersArray.length;

        var thisMarkerRect      = this.getBoundingClientRect();
        var thisMarkerRectTop   = thisMarkerRect.top   - 220; // Add 20 for the other markers arrow.
        var thisMarkerRectLeft  = thisMarkerRect.left  - 200;
        var thisMarkerRectRight = thisMarkerRect.right + 200;

        for (var m = 0; m < markersArrayLen; ++m) {

            if (markersArray[m].className.indexOf('markerParent') === -1) {

              continue;
            }

            thatMarkerRect = markersArray[m].getBoundingClientRect();

            if ((thisArrowRectBottom > thatMarkerRect.top && thisMarkerRectTop < thatMarkerRect.bottom) &&
               (thisMarkerRectLeft < thatMarkerRect.right && thisMarkerRectRight > thatMarkerRect.left)) {

                markersArray[m].style.opacity = 0;
            }
        }

        this.style.opacity = 1;
    };

    var resetOpacityOfMarkersAroundThisMarker = function () {
        var len = theMap.markersArray.length;

        for (var m = 0; m < len; ++m) {

            theMap.markersArray[m].style.opacity = 1;
        }

        this.style.opacity = 1;
    };

    function private_markerMessageEditor(e) {
        // TODO: this should be re-factored a little bit.
        // 'this' equals the edit button/link on the marker.
        var createElement = document.createElement.bind(document),
            text = undefined,
            imageSrc = undefined,
            messageContainer = createElement('div'),
            coordsDiv        = createElement('div'),
            textArea         = createElement('textarea'),
            imgSrcTextArea   = createElement('textarea'),
            imgAnchor        = createElement('a');

        if (e) {

            e.preventDefault();

            this.removeEventListener('click', private_markerMessageEditor);

            this.addEventListener('click', markerAddImageAndText);

            this.innerHTML = 'done';
        }
        if (this.markerBody.querySelector('.markerTextDiv')) {

            text = this.markerBody.querySelector('.markerTextDiv').innerHTML;

            if (this.markerBody.querySelector('.markerImg')) {

                imageSrc = this.markerBody.querySelector('.markerImg').src;
            }

            this.markerBody.removeChild(this.markerBody.querySelector('.messageContainer'));
        }

        messageContainer.className = 'messageContainer';

        coordsDiv.innerHTML = 'x: '+ this.markerBody.data.wgs84XCoord +' y: '+ this.markerBody.data.wgs84YCoord;
        coordsDiv.className = 'coordsDiv';
        coordsDiv.title = 'Coordinates are approximate.';
        coordsDiv.setAttribute('data','');
        coordsDiv.markerBody = this.markerBody;
        coordsDiv.theMap = this.theMap;

        coordsDiv.addEventListener('click', function () {

            // TODO: Should minutes and seconds be an option also?
              if (this.getAttribute('data') === '') {

                this.innerHTML = "x: "+ this.markerBody.data.statePlaneCoordX.toFixed(7) +" y: " + this.markerBody.data.statePlaneCoordY.toFixed(7);

                this.setAttribute('data','sp');

                this.title = 'State plane coordinates are approximate.';
              } else {

                this.innerHTML = "x: "+ this.markerBody.data.wgs84XCoord +" y: " + this.markerBody.data.wgs84YCoord;

                this.setAttribute('data','');

                this.title = 'Coordinates are approximate.';
              }

              this.markerBody.data.setOffSetWH();

              this.theMap.calculateMarkersPositions(this.markerBody);
         });

        textArea.placeholder = "Enter message here";
        textArea.className = 'textArea';
        textArea.value = text || '';

        imgSrcTextArea.className = 'imgSrcTextArea';
        imgSrcTextArea.placeholder = "Enter image URL here";
        imgSrcTextArea.value = imageSrc || '';

        if (this.markerBody.data.apn) {

            imgAnchor.href = 'javascript:void(0);'; // TODO: This needs to be fixed.
            imgAnchor.innerHTML = 'Insert county image';
            imgAnchor.imgSrcTextArea = imgSrcTextArea;
            imgAnchor.markerBody = this.markerBody;
            imgAnchor.className = 'imgAnchor';
            imgAnchor.onclick = function () {
                this.imgSrcTextArea.value = theMap.parameters.PROPERTY_IMG_URL + this.markerBody.data.apn.replace(/^(\d{4})\d*/, "$1") +"/"+ this.markerBody.data.apn +"R011.jpg";
            };
        }

        messageContainer.appendChild(coordsDiv);
        messageContainer.appendChild(textArea);
        messageContainer.appendChild(imgSrcTextArea);
        messageContainer.appendChild(imgAnchor);

        this.markerBody.insertBefore(messageContainer, this.parentNode);

        this.markerBody.data.setOffSetWH();

        calculatePosition.marker(this.markerBody);
    }

    function markerAddImageAndText(e, arg_info) { // arg_info = {m: 'message' ,i: 'image src' }.
        // 'this' equals the edit 'button' (anchor tag) on the marker.
        var text = '',
            imageSrc = '',
            textDiv = document.createElement('div'),
            image = document.createElement('img'),
            messageContainer = this.markerBody.querySelector('.messageContainer');

        if (e) {

            e.preventDefault();

            this.removeEventListener('click', markerAddImageAndText);
            this.addEventListener('click', private_markerMessageEditor);
            this.innerHTML = 'edit';
        }
        if (arg_info) {

            text = arg_info.m;

            imageSrc = arg_info.i;

            if (this.innerHTML === 'done') {

                if (messageContainer.querySelector('.imgSrcTextArea').value === '') {

                    messageContainer.querySelector('.imgSrcTextArea').value = imageSrc;
                }

                return false;
            }
            if (!messageContainer) {

                messageContainer = document.createElement('div');
                messageContainer.className = 'messageContainer';

                this.markerBody.insertBefore(messageContainer, this.parentNode);
            }
        } else {

            text = this.markerBody.querySelector('.textArea').value;

            imageSrc = this.markerBody.querySelector('.imgSrcTextArea').value;

            messageContainer.innerHTML = '';
        }

        this.markerBody.data.message = text;
        this.markerBody.data.imgUrl = imageSrc;

        textDiv.innerHTML = text;
        textDiv.style.fontSize = '17px';
        textDiv.className = 'markerTextDiv';
        textDiv.markerBody = this.markerBody;

        Array.prototype.forEach.call(textDiv.getElementsByTagName('img'), function (img) {

            // There might be html img tags in the text which will mess up the markers position.
            // So set a onload listener that will recalculate the width and height, then call calculateMarkersPositions again.
            var load = function () {

                this.editButton.markerBody.data.setOffSetWH();
                this.editButton.theMap.calculateMarkersPositions(this.editButton.markerBody);

                this.img.removeEventListener('load', load);
            }.bind({ editButton: this, img: img });

            img.addEventListener('load', load);
        }.bind(this));

        messageContainer.appendChild(textDiv);

        if (textDiv.querySelector('.n')) {

            textDiv.querySelector('.n').addEventListener(
                (/Firefox/i.test(window.navigator.userAgent)? "DOMMouseScroll": "mousewheel"),
                function (e) {

                    e.stopPropagation();

                    return false;
                }
            );
        }

        // The div's with class '.m' are the single homes with owner name, address, ect.
        // don't touch the inline width style of "Apn:" it is set in the css.
        // The div's with class'.n' are for apt buildings where there is a list of apn's
        // and the owner info is in a title attribute. Set the inline width style manually.
        if (messageContainer.querySelector('.m') && this.markerBody.querySelector('.markerApnText')) {

            this.markerBody.querySelector('.markerApnText').style.width = '';
        } else if (!messageContainer.querySelector('.n') && this.markerBody.querySelector('.markerApnText')) {

            this.markerBody.querySelector('.markerApnText').style.width = '2.5em';
        }

        if (imageSrc !== '') {

            image.src           = imageSrc;
            image.normalWidth   = '150px';
            image.maxWidth      = '640px';
            image.style.width   = (private_largeDefaultMarkerImages)? image.maxWidth : image.normalWidth; // height will automatically adjust;
            image.style.display = 'none';
            image.className     = 'markerImg';
            image.theMap        = this.theMap;
            image.markerBody    = this.markerBody;
            image.onerror       = markerImgError;

            image.onload = function () {
                    this.style.display = '';
                    this.markerBody.data.setOffSetWH();
                    this.theMap.calculateMarkersPositions(this.markerBody);
                };

            image.onclick = function () {
                    if (this.style.width !== '640px') {
                        this.style.width = '640px';
                        private_largeDefaultMarkerImages = true;
                    } else {
                        this.style.width = this.normalWidth;
                        private_largeDefaultMarkerImages = false;
                    }
                    this.markerBody.data.setOffSetWH();
                    this.theMap.calculateMarkersPositions(this.markerBody);
                };

            messageContainer.appendChild(image);
        }

        this.markerBody.data.setOffSetWH();

        calculatePosition.marker(this.markerBody);
    }

    function markerImgError() {
        // what a mess..
        if (/http:\/\/www.snoco.org\/docs\/sas\/photos/.test(this.src)) {

            if (/R01/.test(this.src)) {

                window.setTimeout(function () {
                    replaceImgInfo(this, 'R01', 'C01');
                }.bind(this), 10);

            } else if (/C01/.test(this.src)) {

                window.setTimeout(function () {
                    replaceImgInfo(this, 'C01', 'R02');
                }.bind(this), 10);

            } else if (/R02/.test(this.src)) {

                window.setTimeout(function () {
                    replaceImgInfo(this, 'R02', 'C02');
                }.bind(this), 10);

            } else if (/C02/.test(this.src)) {

                window.setTimeout(function () {
                    replaceImgInfo(this, 'C02', 'R03');
                }.bind(this), 10);

            } else if (/R03/.test(this.src)) {

                window.setTimeout(function () {
                    replaceImgInfo(this, 'R03', 'C03');
                }.bind(this), 10);

            }  else {

                // Must not be a county picture so delete the image element and re-calculate the coords.
                window.setTimeout(function () {

                    this.container.data.setOffSetWH();

                    this.theMap.calculateMarkersPositions(this.container);
                }.bind({ container: this.markerBody, theMap: this.theMap }), 10);
                //this.parentNode.removeChild(this);

                this.parentNode.href = 'javascript: void(0);';

                this.src = 'css/images/House_Silhouette (1).svg';

                this.style.width = this.normalWidth;

                this.style.cursor = 'default';

                this.onclick = function () {};
            }
        }

        function replaceImgInfo(el, oldString, newString) {
            var regExp = new RegExp(oldString);

            el.parentNode.href = el.src.replace(regExp, newString);

            el.src = el.src.replace(regExp, newString);
        }
    }

    var calculatePosition = {
            marker: function (arg_singleMarker) {
                    var xMultiplier = (this.presentMaxX - this.presentMinX) / this._width, // For markers.
                        yMultiplier = (this.presentMaxY - this.presentMinY) / this._height, // For markers.
                        markersArray = (arg_singleMarker && arg_singleMarker.id)? [arg_singleMarker]: this.markersArray,
                        len = markersArray.length,
                        x = undefined, y = undefined;

                    for (var i = 0; i < len; ++i) {

                        x = (((markersArray[i].data.statePlaneCoordX - this.presentMinX) / xMultiplier) - markersArray[i].data.offsetLeft) + this._left;
                        y = ((this.presentMaxY - markersArray[i].data.statePlaneCoordY) / yMultiplier) - markersArray[i].data.offsetTop + this._top;

                        if (this.BROWSER_IS_CHROME) { // Chrome fonts are blurry if left and top coords are floats.

                            markersArray[i].style[this.CSSTRANSFORM] = 'translate('+ Math.round(x) +'px, '+ Math.round(y)+'px)';
                        } else {

                            markersArray[i].style[this.CSSTRANSFORM] = 'translate('+ x +'px, '+ y +'px)';
                        }
                    }
                }.bind(theMap),

            svgHighlight: function (arg_singleMarker) {
                    var xMultiplier = (this.presentMaxX - this.presentMinX) / this.resizedMapWidth, // For paths.
                        yMultiplier = (this.presentMaxY - this.presentMinY) / this.resizedMapHeight, // For paths.
                        path = undefined, points = '',
                        pathSpCoordsArrayLen = undefined,
                        markersArray = (arg_singleMarker && arg_singleMarker.id)? [arg_singleMarker]: this.markersArray,
                        markersArrayLen = markersArray.length,
                        n = 0, m = 0;

                    // Iterate through the different markers.
                    for (var i = 0; i < markersArrayLen; ++i) {

                        if (markersArray[i].data.svgGroup &&
                            markersArray[i].data.svgGroup.pathsArray.length > 0) {

                            // Iterate through the array of paths for each marker.
                            // Some properties span multiple parcels, each has it's own svg path element.
                            for (n = 0; n < markersArray[i].data.svgGroup.pathsArray.length; ++n) {

                              path = markersArray[i].data.svgGroup.pathsArray[n];
                              pathSpCoordsArrayLen = path.spCoords.length;

                              points = '';

                              // Iterate through the current paths state plane coords array.
                              // Some paths have holes, so there may be more than one element in the array.
                              // Usually there is only one element (one array of sp coords).
                              for (m = 0; m < pathSpCoordsArrayLen; ++m) {

                                points += '\nM';

                                // Iterate through each state plane x,y coord and convert to screen points.
                                for (var v = 0; v < path.spCoords[m].length; v++) {

                                  points += (((path.spCoords[m][v].x - this.presentMinX) / xMultiplier) + this.currentMapImg._left)
                                              + ','
                                              + (((this.presentMaxY - path.spCoords[m][v].y) / yMultiplier) + this.currentMapImg._top)
                                              + ' ';
                                }

                                points += 'z ';
                              }

                              path.setAttribute('d', points);
                            }

                        }
                    }

                }.bind(theMap)
            };

    var private_propertyInfo = function (arg_x, arg_y) {

        // 'this' equals the marker body.
        var minX = arg_x,
            maxX = minX + 1;

        var minY = arg_y,
            maxY = minY + 1;

        var propXML = '<?xml version="1.0" encoding="UTF-8" ?><ARCXML version="1.1"><REQUEST>'
                      + '<GET_FEATURES outputmode="xml" envelope="false" geometry="true" compact="true" featurelimit="10000">'
                      + '<LAYER id="11" /><SPATIALQUERY subfields="'
                      + private_xmlQueryParams
                      + ' #SHAPE#'
                      + '"><SPATIALFILTER relation="area_intersection" >'
                      + '<ENVELOPE maxy="' + maxY + '" maxx="' + maxX + '" miny="' + minY + '" minx="' + minX + '"/>'
                      + '</SPATIALFILTER></SPATIALQUERY></GET_FEATURES></REQUEST></ARCXML>';

        var propXMLPostRequest = window.encodeURIComponent("ArcXMLRequest") + "=" + encodeURIComponent(propXML);

        var propUrl = theMap.parameters.URL_PREFIX + theMap.parameters.PROPERTY_INFO_URL;

        var propInfoAjax = new XMLHttpRequest();

        propInfoAjax.x = arg_x;
        propInfoAjax.y = arg_y;

        propInfoAjax.onload = private_propertyInfoAjaxOnload.bind(this, propInfoAjax);

        propInfoAjax.open("POST", propUrl, true);

        propInfoAjax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        propInfoAjax.send(propXMLPostRequest);
    };

    var private_propertyInfoAjaxOnload = function (arg_propInfoAjax) {
        // this === marker

        var anchor = document.createElement('a'),
            apnContainer = document.createElement('div'),
            apn = document.createElement('div'),
            html = undefined,
            responseText = arg_propInfoAjax.responseText,
            featureCount = responseText.match(/FEATURECOUNT count="(.*?)"/);

        if (/error/.test(responseText)) {

            console.log(responseText.match(/<error.*<\/error/i));

            //private_streetInfo.call(this, arg_propInfoAjax.x, arg_propInfoAjax.y);
            markerAddImageAndText.call(this.querySelector('.markerEdit'), null, { "m": "No APN found.", "i":"" });
            return;
        }

        if (+featureCount[1] === 0 || +featureCount[1] === 1) { //TODO: Is there a single way of checking for 0 or 1?

            this.data.apn = /\d{14}/.exec(responseText);

            if (!this.data.apn) {

              // It didn't find a property so check if it is a road/street/interstate ect.
              // private_streetInfo.call(this, arg_propInfoAjax.x, arg_propInfoAjax.y);
              markerAddImageAndText.call(this.querySelector('.markerEdit'), null, { "m": "No parcel number found.", "i":"" });

              private_makePropertyBoundaryPolygon(arg_propInfoAjax.responseText, this);

              return;
            }

            this.data.apn = this.data.apn[0];

            apn.className = 'markerApnText';
            apn.innerHTML = 'Apn:';

            anchor.className = 'markerApnLink';
            anchor.href = theMap.parameters.APN_URL + this.data.apn;
            anchor.target = '_blank';
            anchor.innerHTML = this.data.apn;
            this.data.apnAnchor = anchor;

            apnContainer.appendChild(apn);
            apnContainer.appendChild(anchor);
            apnContainer.style.marginTop = "-0.54em";
            apnContainer.style.marginRight = "10px";

            this.insertBefore(apnContainer, this.children[1]);
        }

        this.style.width = '';
        this.data.setOffSetWH();

        calculatePosition.marker(this);

        html = makeInfoHtml(responseText, this);

        if (this.data.apn && theMap.optionsReference.showPropertyImage_CheckMark) {

            markerAddImageAndText.call(this.querySelector('.markerEdit'), null, { "m": html, "i":"http://www.snoco.org/docs/sas/photos/"+ this.data.apn.replace(/^(\d{4})\d*/, "$1") +"/"+ this.data.apn +"R011.jpg" });
        } else {

            markerAddImageAndText.call(this.querySelector('.markerEdit'), null, { "m": html, "i":"" });
        }
    };

    // Test property = file:///C:/Users/admin/Desktop/website%20fork/index.htm?={%22x%22:1279569.055,%22X%22:1280969.055,%22y%22:296488.493,%22Y%22:297186.306,%22z%22:40}
    // Test property = file:///C:/Users/admin/Desktop/website%20fork/index.htm?={%22x%22:1308837.076,%22X%22:1311637.076,%22y%22:306289.22,%22Y%22:307684.845,%22z%22:60}
    var private_makePropertyBoundaryPolygon = function (arg_response, arg_marker) {
        var features = (arg_response.match(/(<FEATURE>)(.*?)<\/FEATURE>/g) || []),
            coordsArray = [],
            group = document.createElementNS("http://www.w3.org/2000/svg", "g"),
            path  = undefined,
            n = 0, m = 0,
            coords = [],
            tempCoords = [],
            splitXY = [], duplicateObj = {};

        group.setAttribute('style', 'fill-opacity: 0.3;');

        for (var g = 0; g < features.length; g++) {

          coordsArray = features[g].match(/(<COORDS>)(.*?)<\/COORDS>/g);

          path  = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.spCoords = [];

          n = 0;
          while (coordsArray[n]) {

              coords = coordsArray[n].replace(/..?coords./i, '').split(';');

              tempCoords = [];
              //path = document.createElementNS("http://www.w3.org/2000/svg", "path");

              // This if statment checks if the first x coordinate is a duplicateObj key, if it is then it's
              // assumed that path already exists so skip it.
              if (coords[0].replace(/..?coords./i, '').split(' ')[0] in duplicateObj) {

                  ++n;

                  continue;
              } else {

                  duplicateObj[coords[0].replace(/..?coords./i, '').split(' ')[0]] = undefined;
              }

              m = 0;
              while (coords[m]) {

                  splitXY = coords[m].replace(/..?coords./i, '').split(' ');

                  tempCoords.push({ x: +splitXY[0], y: +splitXY[1] });

                  ++m;
              }

              path.spCoords.push(tempCoords);
              ++n;
          }

          if (path.spCoords.length > 0) {// Skip it if there are no coordinates.

            group.style.fill = ['red', 'rgb(17, 85, 204)', 'rgb(51, 153, 51)'][(++private_makePropertyBoundaryPolygon.fillColor > 2? (private_makePropertyBoundaryPolygon.fillColor = 0): private_makePropertyBoundaryPolygon.fillColor)];//'#'+((Math.random() * 0xFFFFFF << 0).toString(16));
            //arg_marker.data.apnAnchor.style.color = path.style.fill;

            group.appendChild(path);

            arg_marker.data.svgGroup.pathsArray.push(path);
          }
        }

        if (arg_marker.data.svgGroup) { // arg_marker.svgGroup may be null if the person deleted the arg_marker quick enough.

            arg_marker.data.svgGroup.group = group;

            theMap.svgPropertyHightlightGroup.appendChild(group);

            calculatePosition.svgHighlight(arg_marker);

            arg_marker.addEventListener('mouseover', function () {

              this.data.svgGroup.group.style.strokeWidth = '3px';
              this.data.svgGroup.group.style.stroke = this.data.svgGroup.group.style.fill;
            });

            arg_marker.addEventListener('mouseout', function () {

              this.data.svgGroup.group.style.strokeWidth = '';
              this.data.svgGroup.group.style.stroke = '';
            });
        }
    }.bind(theMap);

    // This is a hack.
    private_makePropertyBoundaryPolygon.fillColor = 0;

    var private_streetInfo = function (arg_x, arg_y) {

        // 'this' equals the marker body.
        var minX = arg_x - 20,
            maxX = minX + 40;

        var minY = arg_y - 20,
            maxY = minY + 40;

        var streetXML = '<?xml version="1.0" encoding="UTF-8" ?><ARCXML version="1.1"><REQUEST>'
                      + '<GET_FEATURES outputmode="xml" envelope="false" geometry="false" featurelimit="10000">'
                      + '<LAYER id="6" /><SPATIALQUERY subfields="'
                      + 'NAME FULLNAME STREETTYPE'
                      + '"><SPATIALFILTER relation="area_intersection" >'
                      + '<ENVELOPE maxy="' + maxY + '" maxx="' + maxX + '" miny="' + minY + '" minx="' + minX + '"/>'
                      + '</SPATIALFILTER></SPATIALQUERY></GET_FEATURES></REQUEST></ARCXML>';

        var streetXMLPostRequest =  window.encodeURIComponent("ArcXMLRequest")
                                    + "="
                                    + encodeURIComponent(streetXML);

        var streetUrl = theMap.parameters.URL_PREFIX + theMap.parameters.PROPERTY_INFO_URL;

        var streetInfoAjax = new XMLHttpRequest();

        streetInfoAjax.onload = private_streetInfoAjaxOnload.bind(this, streetInfoAjax);

        streetInfoAjax.open("POST", streetUrl, true);

        streetInfoAjax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        streetInfoAjax.send(streetXMLPostRequest);
    };

    var private_streetInfoAjaxOnload = function (arg_streetInfoAjax) {
        var responseText = arg_streetInfoAjax.responseText,
            featureCount = responseText.match(/FEATURECOUNT count="(.*?)"/),
            names     = responseText.match(/\.NAME=".*?"/g),
            fullNames = responseText.match(/FULLNAME=".*?"/g),
            streetType = responseText.match(/STREETTYPE=".*?"/g),
            message = '',
            noDuplicatesObject = {};

        if (/error/.test(responseText)) {

            console.log(responseText.match(/<error.*<\/error/i));
            console.log(arg_streetInfoAjax);

            private_propertyInfo.call(this, this.data.statePlaneCoordX, this.data.statePlaneCoordY);
            return;
        }

        if (+featureCount[1] !== 0) {

            for (var n = 0; n < fullNames.length; ++n) {

                if (fullNames[n].replace(/FULLNAME="(.*?)"/, '$1') !== '') {

                    fullNames[n] = fullNames[n].replace(/FULLNAME="(.*?)"/, '$1');

                    if (fullNames[n] == "I 5"    ||
                        fullNames[n] == "I 405"  ||
                        fullNames[n] == 'SR 9'   ||
                        fullNames[n] == 'SR 530' ||
                        fullNames[n] == 'US 2'   ||
                        fullNames[n] == 'SR 526') {

                        // Display an SVG highway/interstate sign in the place of words.
                        message = '<img src="css/images/'+ fullNames[n].replace(/ /,'_') +'.svg" height="50" width="50" title="'+ fullNames[n] +'"/><br>';
                        noDuplicatesObject = {};
                        break;
                    } else {

                        noDuplicatesObject[private_upperCase(fullNames[n])] = '';
                    }

                } else if (names[n].replace(/\.NAME="(.*?)"/, '$1') !== '') {

                    if (streetType[n].replace(/STREETTYPE="(.*?)"/,'$1') !== '') {

                        noDuplicatesObject[private_upperCase(names[n].replace(/\.NAME="(.*?)"/, '$1')) +' '+ private_upperCase(streetType[n].replace(/STREETTYPE="(.*?)"/,'$1'))] = '';

                    } else {

                        noDuplicatesObject[private_upperCase(names[n].replace(/\.NAME="(.*?)"/, '$1'))] = '';
                    }
                }
            }
        } else {

            private_propertyInfo.call(this, this.data.statePlaneCoordX, this.data.statePlaneCoordY);

            return;
        }

        Object.keys(noDuplicatesObject).forEach(function (arg_road) {

            message += arg_road +'<br>';// TODO: Adds an unnecessary <br> after last road.
        });

        markerAddImageAndText.call(this.data.editButton, null, { m: message, i:'' });

        this.style.width = '';

        this.data.setOffSetWH();

        calculatePosition.marker(this);
    };

    var searchByAPNs = function (e) {//lat,lng
        var apnArray = document.querySelector('#search_apn_div  input').value.replace(/\s/g, '').split(','),
            url = theMap.parameters.URL_PREFIX + theMap.parameters.SEARCH_BY_APN_URL,
            xml = undefined,
            searchByAPNsAjax = new XMLHttpRequest(),
            currentAPNs = {},
            xmlRequest = undefined;

        e && e.preventDefault;

        if (apnArray[0]) {

          return;
        }

        // Stick the APN's of the current markers into an object as a key so they
        // can be compared to what the user entered in text box. If an APN is already present
        // it will be skipped...because it already exists.
        theMap.markersArray.forEach(function (marker) {

              currentAPNs[marker.apn] = '';
        });

        for (var i = 0; i < apnArray.length; i++) {

            if (/^\d{14}$/.test(apnArray[i])) {

                if (apnArray[i] in currentAPNs) {

                    apnArray.splice(i, 1);
                }

                apnArray[i] = "'"+ apnArray[i] +"'";
            }  else {

                window.alert("There was an error parsing APN #"+ (i + 1) +": "+ apnArray[i].trim());

                console.error('marker_module.searchByAPNs - Error parsing: '+ apnArray[i].trim());

                if (apnArray.length == 1) {

                  return;
                }
            }
        }

        xml =   '<?xml version="1.0" encoding="UTF-8" ?><ARCXML version="1.1">\n'
                + '<REQUEST>\n<GET_FEATURES outputmode="xml" geometry="true" compact="true" '
                + 'envelope="true" featurelimit="14000" beginrecord="1">\n'
                + '<LAYER id="11" /><SPATIALQUERY subfields="#SHAPE# '
                + private_xmlQueryParams
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.X_COORD'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.Y_COORD'
                + "\" where=\"PARCEL_ID IN ("+ apnArray.join(',') +")\" \/>"
                + '</GET_FEATURES></REQUEST></ARCXML>';

        xmlRequest = 'ArcXMLRequest=' + window.encodeURIComponent(xml);

        searchByAPNsAjax.open("POST", url, true);

        searchByAPNsAjax.onreadystatechange = function () {

            if (searchByAPNsAjax.readyState == 4 && searchByAPNsAjax.status == 200 && searchByAPNsAjax.responseText) {

                if (/error/.test(searchByAPNsAjax.responseText)) {

                  console.log(searchByAPNsAjax.responseText.match(/<error.*?<\/error/i));

                }
                private_assembleMarkerTextFromResponse(searchByAPNsAjax.responseText);
            }
        };

        searchByAPNsAjax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        searchByAPNsAjax.send(xmlRequest);

        // If there was at least one valid apn (hopefully) then zoom all the way out
        // because it doesn't know if it is viewable or outside the viewable area.
        // if (apnArray.length === 1 && apnArray[0] === '') {
        //     theMap.zoomAllTheWayOut();
        // }
    };

    function private_assembleMarkerTextFromResponse(arg_responseText) {
        var lat = undefined, lng = undefined, obj = undefined, html = undefined,
            parcelNumber = undefined,
            parcelNumberRegex = /PARCEL_ID="(.*?)"/g,
            lngRegex = /X_COORD="(\d+\.\d+)"/g,
            latRegex = /Y_COORD="(\d+\.\d+)"/g,
            featureRegex = /<FEATURE>.*?<\/FEATURE>/g,
            featureElement = undefined,
            marker = undefined;

        while ((parcelNumber = parcelNumberRegex.exec(arg_responseText)) !== null) {

            parcelNumber = parcelNumber[1];

            lat = latRegex.exec(arg_responseText)[1];
            lng = lngRegex.exec(arg_responseText)[1];

            featureElement = featureRegex.exec(arg_responseText)[0] +' FEATURECOUNT count="1" ';

            html = makeInfoHtml(featureElement, null);

            obj = {
                "a": parcelNumber,
                "x": lng,
                "y": lat,
                "m": html,
                "i": ""
            };

            if (theMap.optionsReference.showPropertyImage_CheckMark) {

                obj.i = "http://www.snoco.org/docs/sas/photos/"+ obj.a.replace(/^(\d{4})\d*/, "$1") +"/"+ obj.a +"R011.jpg";
            }

            marker = theMap.marker_module.makeMarker(null, obj);

            private_makePropertyBoundaryPolygon(featureElement, marker);
        }

        theMap.zoom_module.zoomToMinExtent();
    }

    function makeInfoHtml(arg_xml, arg_marker) {
        var addrLine1 = private_upperCase(arg_xml.match(/SITUSLINE1="(.*?)"/)[1]),
            addrCity = private_upperCase(arg_xml.match(/SITUSCITY="(.*?)"/)[1]),
            addrZip = arg_xml.match(/SITUSZIP="(.*?)"/)[1].replace(/-.*/, ''),
            marketValue = (+arg_xml.match(/MKTTL="(.*?)"/)[1]).toLocaleString('en'),
            parcelNumber = undefined,
            parcelNumberRegex = /PARCEL_ID="(.*?)"/g,
            sizeAcres = arg_xml.match(/TAB_ACRES="(.*?)"/)[1],
            featureCount = +arg_xml.match(/FEATURECOUNT count="(.*?)"/)[1],
            html = undefined,
            addBrIncrementorObj = { a: 0 },
            ownerName = private_normalize(arg_xml.match(/OWNERNAME="(.*?)"/)[1])
                        .replace(/(\s)/g, function (match, p1, index) {
                                            if (index >= (this.a + 24)) {
                                                this.a += 24;
                                                return '<br>';
                                            }
                                            return p1;
                                          }.bind(addBrIncrementorObj)
                              ),// <- End of replace method.
            lineBreaks = /*Breaks up long owners name*/(function (o) { var a = ''; var s = o.indexOf("<br>");while (s != -1) {a += "<br>"; s = o.indexOf("<br>",s+1);}return a;})(ownerName);

        ownerName = private_upperCase(ownerName);

        if (featureCount === 0 || featureCount === 1) {

            try {

                if (!theMap.markersArray.some(function (makerParent) { return (arg_marker.data.apn == makerParent.data.apn) && makerParent.data.svgGroup && makerParent.data.svgGroup.group; })) {

                    private_makePropertyBoundaryPolygon(arg_xml, arg_marker);
                }

            } catch(e) {}

            html =  '<div class="m"><div>Owner:<br>' + lineBreaks
                    + 'Address:<br><br>'
                    + 'Value:</div><div>'
                    + ((!ownerName || /unknown/i.test(ownerName))? 'Unknown'  : ownerName) +'<br>'
                    + ((!addrLine1 || /unknown/i.test(addrLine1))? 'Unknown'  : addrLine1) +'<br>'
                    + ((!addrCity || /unknown/i.test(addrCity))? 'Unknown, ': addrCity +', ')
                    + (( !addrZip || /unknown/i.test(addrZip) )? 'Unknown'  : addrZip) +'<br>'
                    + '$'+ marketValue +' <div>('+ sizeAcres +' acres)</div></div>';

        // Properties with many parcel numbers associated with it, for example condominium complex.
        // Makes anchor tags with the persons information in the data attribute, the makeMultiFamilyHouseingMesssage function
        // uses the data to make a message that pops up on the side with the persons information.
        } else {

            try{

                private_makePropertyBoundaryPolygon(arg_xml, arg_marker);
            } catch(e) {

              console.log(e);
            }

            html = '<div class="n"style="'+ ((featureCount <= 8)? 'text-align:center;': 'height:200px;')+ '">';
            ownerName = /OWNERNAME="(.*?)"/g;
            addrLine1 = /SITUSLINE1="(.*?)"/g;
            addrCity = /SITUSCITY="(.*?)"/g;
            addrZip = /SITUSZIP="(.*?)"/g;
            marketValue = /MKTTL="(.*?)"/g;
            sizeAcres = /TAB_ACRES="(.*?)"/g;

            while ((parcelNumber = parcelNumberRegex.exec(arg_xml)) !== null) {

                parcelNumber = parcelNumber[1];

                html += '<a target="_blank"'
                     + 'data="'+ private_normalize(ownerName.exec(arg_xml)[1]) +'<br>'
                     + private_upperCase(addrLine1.exec(arg_xml)[1]) +'<br>'
                     + private_upperCase(addrCity.exec(arg_xml)[1]) +', '+ addrZip.exec(arg_xml)[1].replace(/-.*/, '') +'<br>'
                     + '$'+ (+marketValue.exec(arg_xml)[1]).toLocaleString('en') +'<br>'
                     + sizeAcres.exec(arg_xml)[1] +'"'
                     + 'onmouseover = "t.call(this)" '
                     + 'onmouseout = "this.m.parentNode.removeChild(this.m)" '
                     + 'href="'+ theMap.parameters.APN_URL + parcelNumber +'">'+ parcelNumber +'</a><br>';
            }

            html += '</div>';
        }

        return html;
    }

    function deleteAllMarkers() {
        var markersArray = theMap.markersArray;

        for (var i = markersArray.length; i > -1; --i) {
            if (markersArray[i] && /markerParent|smallCountyMarker/.test(markersArray[i].className)) {

                // Used a setTimeout for visual effect only, nothing special.
                window.setTimeout(function (m) {

                    window.$('smallCountyMarker'+ m.id).parentNode.removeChild(window.$('smallCountyMarker'+ m.id));

                    m.data.removeSvgGroup();

                    m.data.deleted = true;

                    m.parentNode.removeChild(m);
                  }, (window.Math.random() * 500), markersArray[i]);

                markersArray.splice(i, 1);
            }
        }
    }

    function deleteUnUsedMarkers() {

        // Only deletes markers with a className of 'parentMarker' unless they have a
        // className of 'DONTDELETE'.
        // Called when person clicks map to make a new marker, unless ctrl is held down.
        var markersArray = theMap.markersArray;

        for (var i = 0; i < markersArray.length; ++i) {

            if (markersArray[i] && /markerParent/.test(markersArray[i].className)
                && !/DONTDELETE/.test(markersArray[i].className)) {

                window.$('smallCountyMarker'+ markersArray[i].id).parentNode.removeChild(window.$('smallCountyMarker'+ markersArray[i].id));

                markersArray[i].data.removeSvgGroup();

                markersArray[i].data.deleted = true;

                markersArray[i].parentNode.removeChild(markersArray[i]);

                markersArray.splice(i, 1);
            }
        }
    }

    function private_normalize(arg_ownerName) { // This is basically of a hack job.

        // This function attempts to format the owners name in a better way so that
        // it is more appealing to read. This required a lot of trial and error, if it
        // isn't perfect who cares?
        var splitIt = '',
            words = '',
            temp = [],
            hud = /secretary of housing/i.test(arg_ownerName),
            fannie = /federal national mort/i.test(arg_ownerName),
            freddie = /federal home loan/i.test(arg_ownerName),
            USA = /u s a/i.test(arg_ownerName);

        arg_ownerName = arg_ownerName.replace(/\\/,'');
        if (hud) { return 'HUD'; }
        if (fannie) { return 'Fannie Mae'; }
        if (freddie) { return 'Freddie Mac'; }
        if (USA) { return '(USA) Federal Gov. Land'; }
        if (/LLC|l l c|realt|city of|town of|indian land|trust|forest|state|univ/i.test(arg_ownerName)) {
          return arg_ownerName.replace(/\\|\//,' & ');
        }

        words = arg_ownerName.replace(/&amp;|\&|\+|\/| jr(?!\w)| sr(?!\w)|  /gi,
                function (match) {
                  return ((/jr|sr/gi).test(match) === true) ? '' : ((/  /gi).test(match)) ? ' ' : ' & ';
                });
        splitIt = ((words.split(' ').length === 3 || words.split(' ').length === 2) &&
                   (/\&|bank|corp|llc|credit|union|RESIDENCE|Mortgage|apart|condo|inc.?\w{0}|ASSOC/gi).test(words) === false)
                    ? words.replace(/([a-z]*)\s?(\w*)\s?(\w*)/i,
                            function (match,a,b,c) {
                              return (b.length > 1) ? [ b, a ].join(' ') : [ c,a ].join(' ');
                            }).split(' ')
                    : words.split(' ');
        splitIt.forEach(function (value) {
          if ((value.length > 1 && (/II/g).test(value) === false) || (/\&/g).test(value) === true) {
            value = value.charAt(0).toUpperCase() + value.substring(1).toLowerCase();
            if (value == 'Llc') {
              value = 'LLC';
            }
            temp[temp.length] = value;
          }
        });
        if ((/\&/).test(words) === true && (/secretary of housing|bank/i).test(words) === false) {//If it finds an '&' then it will assume that the first word is the last name and push it to the end of the array and set the O element to blank;
            if (temp.length == 5 && temp[temp.length-2] != '&') {
                temp.splice(2, 0, temp[0]);
                temp.splice(0, 1);
                temp.splice(5, 0, temp[3]);
                temp.splice(3, 1);
            } else {
                temp.push(temp[0]);
                temp.splice(0, 1);
             }
        }
        return temp.join(' ');
    }

    function private_upperCase(str) { // Can't remember what website this is from.
        var pieces = str.split(" "), j = undefined,
            i = undefined, q = undefined;

        for (i = 0; q = pieces[i]; i++) {

            j = q.charAt(0).toUpperCase();

            pieces[i] = j + q.substr(1).toLowerCase();
        }

        return pieces.join(" ")
                .replace(/llc/i, "LLC")
                .replace(/(\d)(th|rd|nd|st) /, '$1<font style=\''
                                                  +'vertical-align:30%;font-size:65%;margin-left:1px;\''
                                               +'>$2</font> ');
    }

    var isSimpleMarkerOnImage = function () {
        var markersArray = this.markersArray,
            len = markersArray.length;

        for (var i = 0; i < len; ++i) {

            if (/simpleMarker/.test(markersArray[i].className)) {

                if (markersArray[i].data.statePlaneCoordX < this.presentMaxX &&
                    markersArray[i].data.statePlaneCoordY < this.presentMaxY &&
                    markersArray[i].data.statePlaneCoordX > this.presentMinX &&
                    markersArray[i].data.statePlaneCoordY > this.presentMinY) {

                    markersArray[i].style.visibility = 'visible';
                } else {

                    markersArray[i].style.visibility = 'hidden';
                }
            }
        }
    }.bind(theMap);

    function makeMultiFamilyHouseingMesssage() {
        var message = undefined,
            messageWidth = undefined,
            markerBodyRect = this.parentNode.parentNode.markerBody.getBoundingClientRect(),
            thisRect = this.getBoundingClientRect(),
            data = this.getAttribute('data').split('<br>'),
            html = undefined;

        html =  '<div class="m"><div>Owner:<br>'
                + 'Address:<br>'
                + ((!/unknown/i.test(data[1]) && /unknown|\w|\d/gi.test(data[2]))? '<br>':'')
                + 'Value:</div><div>'+ data[0] +'<br>'
                + ((!/unknown/i.test(data[1]))? data[1] +'<br>': 'Unknown<br>')
                + ((/unknown|\w|\d/gi.test(data[2]))? data[2] +'<br>': '')
                + data[3] +' <div style="color: grey; font-style: italic; display: inline-block;">('+ data[4] +' acres)</div></div>';

        message = theMap.utilities_module.simpleMessageBox(html, 'hi'),

        message.style.width = 'auto';

        messageWidth = message.offsetWidth;

        if ((markerBodyRect.left - 5 - messageWidth) < theMap.mapContainer._left + 10) {

            message.style.left = markerBodyRect.right + 15 +'px';

            message.className = message.className +' floatingMarkerRight';
        } else {

            message.style.left = (markerBodyRect.left - 5 - messageWidth) +'px';

            message.className = message.className +' floatingMarkerLeft';
        }

        message.style.top = thisRect.top - 18 +'px';
        message.style.padding = '15px';
        message.style.zIndex = '999999999999';
        message.style.color = 'black';

        // 'this' equals the anchor tag that the person is hovering their mouse over,
        // the anchor tag also holds the Apn number. 'm' is where the message is stored
        // so that onmouseout will have something easy to remove.
        this.m = message;
    }

    // Attached this to a single letter global so so that when the person tries to
    // make a url the url will be shorter.
    window.t = makeMultiFamilyHouseingMesssage;

    return {
        searchByAPNs: searchByAPNs,
        makeInterStateShields: makeInterStateShields,
        makeMarker: makeMarker,
        markerAddImageAndText: markerAddImageAndText,
        calculateMarkersPositions: calculatePosition.marker,
        calculatePropHighlightPosition: calculatePosition.svgHighlight,
        makeInfoHtml: makeInfoHtml,
        deleteAllMarkers: deleteAllMarkers,
        deleteUnUsedMarkers: deleteUnUsedMarkers,
        isSimpleMarkerOnImage: isSimpleMarkerOnImage,
        makeMultiFamilyHouseingMesssage: makeMultiFamilyHouseingMesssage,
    };
}();

/* TODO
    * Add the mouse wheel event normalizer statement to a central location, theMap.mWheelEvt?
    * Done: fix mouse calculateMarkersPositionsning bug, make dozens of markers and try to calculateMarkersPositions, get error can't set style of undefined.
    * Done: make it so the markers zoom in and out;
    * throttle ajax requests to maybe 500 milliseconds?
    * Done: make a box where someone can enter a message.
    * redo the calculateMarkersPositions and make it more efficient.
    * change "zooming" classname changes to smoothTransition();
    * Done???(added to the_Map): do something about minxOld ect. they are globals.

AJAX ERRORS:
    * 'Server: Assessor was not found.'
    * from clicking to get apn <ERROR machine="pmz-arcims" processid="3444" threadid="4028">[ERR2407] (SDE error code -10) SE_stream_query_with_info : Network I/O error</ERROR>


'<?xml version="1.0" encoding="UTF-8" ?><ARCXML version="1.1">\n'
                + '<REQUEST>\n<GET_FEATURES outputmode="xml" geometry="false" '
                + 'envelope="true" featurelimit="14000" beginrecord="1">\n'
                + '<LAYER id="11" /><SPATIALQUERY subfields="#ALL#'
                + "\" where=\"SITUSHOUSE LIKE  '%18019%' AND SITUSSTRT LIKE '%11%' AND SITUSTTYP LIKE '%ave%'\" \/>"
                + '</GET_FEATURES></REQUEST></ARCXML>',

*/