
theMap.options_module = function () {
    var private_checkMarkArray = [],
        theMap = window.theMap,
        private_bothMapYearsAreCheckedAlertBollean = undefined;

    var private_retrieveAndSaveOptions = function () {
        var checkMarks = private_checkMarkArray,
            optionsObject = {},
            i = undefined;

        for (i = 0; i < checkMarks.length; i++) {

          optionsObject[checkMarks[i].id] = checkMarks[i].checkedState();
        }

        if (optionsObject.showSatelliteView_CheckMark && optionsObject['show'+ this.parameters.SATELLITE_MAP_YEARS.a.year +'SatelliteYearMap_CheckMark'] &&

            optionsObject['show'+ this.parameters.SATELLITE_MAP_YEARS.b.year +'SatelliteYearMap_CheckMark']) {

            optionsObject.showOverlayMap = true;
        } else {

            optionsObject.showOverlayMap = false;
        }

        this.optionsReference = optionsObject;

        return optionsObject;
    }.bind(window.theMap);

    var private_updateOptions = function () {
        var checkMarks = private_checkMarkArray,
            optionsObject = this.theMap.optionsReference,
            i = undefined;

        for (i = 0; i < checkMarks.length; i++) {
            if (/dontChangeState/.test(checkMarks[i].className)) { continue; }
            if (optionsObject[checkMarks[i].id]) {
                checkMarks[i].animatedCheck();
            } else {
                checkMarks[i].animatedUnCheck();
            }
        }
        if (!optionsObject.showSatelliteView_CheckMark) {
            window.$('show'+ this.theMap.parameters.SATELLITE_MAP_YEARS.a.year +'SatelliteYearMap_Label').style.color = 'grey';
            window.$('show'+ this.theMap.parameters.SATELLITE_MAP_YEARS.b.year +'SatelliteYearMap_Label').style.color = 'grey';
        }
    }.bind({
      optionsTable: window.$('options_table'),
      theMap: window.theMap,
    });

    // setHomesSoldYears() sets the sale records options in the options panel to whatever
    // is enter in theMap.parameters.HOME_SOLD_YEARS
    var private_setHomesSoldYears = function () {
        var $ = window.$,
            homesSold = theMap.parameters.HOME_SOLD_YEARS;

        for (var i = 0; i < homesSold.years.length; i++) {

            var trimmedYear = homesSold.years[i][0].replace(/20/, '');

            // Can't have a number as first letter of variable or property so added the '$' in front of the id's ... plus ya know for the bling.
            $(i +'SaleRecord_CheckBox').id = '$'+ trimmedYear +"SaleRecord_CheckBox";
            $(i +'SaleRecord_CheckMark').id = '$'+ trimmedYear +"SaleRecord_CheckMark";
            $(i +'SaleRecord_Label').innerHTML = "'"+ trimmedYear +' Sale Records';
            $(i +'SaleRecord_Label').style.cssText = 'background-color:'+ homesSold.years[i][1] +';';
            $(i +'SaleRecord_Label').id = '$'+ trimmedYear +"SaleRecord_Label";
        }
    };

    var private_setSatelliteMapYears = function () {
        var $ = window.$;

        // a
        $('aSatelliteYearMap_CheckBox').id = 'show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +"SatelliteYearMap_CheckBox";
        $('aSatelliteYearMap_CheckMark').id = 'show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +"SatelliteYearMap_CheckMark";

        $('aSatelliteYearMap_Label').innerHTML = theMap.parameters.SATELLITE_MAP_YEARS.a.year;
        $('aSatelliteYearMap_Label').id = 'show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +"SatelliteYearMap_Label";

        theMap.optionsReference['show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +'SatelliteYearMap_CheckMark'] = theMap.optionsReference['aSatelliteYearMap_CheckMark'];

        // b
        $('bSatelliteYearMap_CheckBox').id = 'show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +"SatelliteYearMap_CheckBox";
        $('bSatelliteYearMap_CheckMark').id = 'show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +"SatelliteYearMap_CheckMark";

        $('bSatelliteYearMap_Label').innerHTML = theMap.parameters.SATELLITE_MAP_YEARS.b.year;
        $('bSatelliteYearMap_Label').id = 'show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +"SatelliteYearMap_Label";

        theMap.optionsReference['show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +'SatelliteYearMap_CheckMark'] = theMap.optionsReference['bSatelliteYearMap_CheckMark'];
    };

    //TODO: make a private_makeSmallerUrl that knocks the decimal places off the coordinates.
    var private_makeUrl = function () {
        var json = { mr: [], l: [], ml: [],x: 0 ,mx: 0 ,my: 0 ,z: 0 },
            url = undefined,
            markersArray = document.querySelectorAll('div.markerParent'),
            lines = document.querySelectorAll('.drawSvgLine'),
            measureLines = document.querySelectorAll('.measureLine'),
            lineCoords = [];

        for (var m = 0; m < markersArray.length; ++m) {
            json.mr.push({  a: markersArray[m].data.apn || '',
                            x: markersArray[m].data.statePlaneCoordX,
                            y: markersArray[m].data.statePlaneCoordY,
                            m: markersArray[m].data.message.replace(/#/g,'').replace(/"/g,"'").replace(/\n/g,'<br>'),
                            i: markersArray[m].data.imgUrl
                        });
        }

        for (var l = 0; l < lines.length; ++l) {

            lineCoords = [];

            for (var s = 0; s < lines[l].statePlaneCoords.length; ++s) {

                lineCoords.push(lines[l].statePlaneCoords[s].x.toFixed(0) +','+ lines[l].statePlaneCoords[s].y.toFixed(0));
            }

            json.l.push(lineCoords);
        }

        for (var l = 0; l < measureLines.length; ++l) {

            lineCoords = [];

            for (var s = 0; s < measureLines[l].statePlaneCoords.length; ++s) {

                lineCoords.push(measureLines[l].statePlaneCoords[s].x.toFixed(2) +','+ measureLines[l].statePlaneCoords[s].y.toFixed(2));
            }

            json.ml.push(lineCoords);
        }

        json.$2  = (this.optionsReference.$12SaleRecord_CheckMark)? 1: 0;
        json.$3  = (this.optionsReference.$13SaleRecord_CheckMark)? 1: 0;
        json.$4  = (this.optionsReference.$14SaleRecord_CheckMark)? 1: 0;
        json.s   = (this.optionsReference.showSatelliteView_CheckMark)? 1: 0;
        json.s7  = (this.optionsReference.show2007SatelliteYearMap_CheckMark)? 1: 0;
        json.s12 = (this.optionsReference.show2012SatelliteYearMap_CheckMark)? 1: 0;
        json.a   = (this.optionsReference.showAddresses_CheckMark)? 1: 0;
        json.b   = (this.optionsReference.showBenchMark_CheckMark)? 1: 0;
        json.c   = (this.optionsReference.showCities_CheckMark)? 1: 0;
        json.pb  = (this.optionsReference.showParcelBoundary_CheckMark)? 1: 0;
        json.pn  = (this.optionsReference.showParcelNumbers_CheckMark)? 1: 0;
        json.x   = this.presentMinX;
        json.X   = this.presentMaxX;
        json.y   = this.presentMinY;
        json.Y   = this.presentMaxY;
        json.z   = this.sliderPosition;

        url      = 'http://' + window.location.host + window.location.pathname + "?=" + JSON.stringify(json);

        return url;
    }.bind(window.theMap);

    var svgController = function (arg) {
        var currentClasses = this.getAttribute('class');

        switch (arg) {
            case 'start options open':

                    if (!/ ?spinGear/i.test(currentClasses)) {

                        this.setAttribute('class', currentClasses +' gearOpen gearAnimationOpen');
                        //window.setTimeout(function () { this.setAttribute('class', currentClasses +' gearOpen'); }.bind(this), 200);
                    } else {

                        this.setAttribute('class', currentClasses +' gearOpen');
                    }

                    break;

            case 'start options close':

                    currentClasses = currentClasses.replace(/ ?gearAnimationOpen| ?gearOpen/g, '');

                    if (/spinGear(?!DownSlowly)/.test(currentClasses)) {

                        currentClasses = currentClasses.replace(/ ?spinGear(?!DownSlowly)/g, '');

                        this.setAttribute('class', currentClasses +' transitionAll2sEaseOut');

                        window.setTimeout(function () {

                          svgController('start Send Request To Server');
                        }, 250); //clearTimeout(timeOut);
                    } else {

                        this.setAttribute('class', currentClasses +' transitionAll2sEaseOut');
                    }

                    break;

            case 'finish options close':

                    currentClasses = currentClasses.replace(/ ?transitionAll2sEaseOut/g,'');

                    this.setAttribute('class', currentClasses);

                    break;

            case 'start Send Request To Server':

                    currentClasses = currentClasses.replace(/ ?spinGearDownSlowly| ?gearAnimationOpen/g, '');

                    this.setAttribute('class', ' spinGear '+ currentClasses);

                    break;

            case 'start Map Done Loading':

                    currentClasses = currentClasses.replace(/ ?spinGear(?!DownSlowly)/g, '');

                    if (!/gearOpen/i.test(currentClasses)) {

                        this.setAttribute('class', currentClasses);

                        // This setTimeout is a work around for chrome 33.
                        setTimeout(function (currentClasses) {

                            if (!theMap.state.waitingForAjax && !theMap.state.waitingForImage) {

                                //this.setAttribute('class', currentClasses +' spinGearDownSlowly');
                            }

                            // Delete "spinGearDownSlowly" class from class list.
                            setTimeout(function (currentClasses) {

                                if (!theMap.state.waitingForAjax && !theMap.state.waitingForImage) {

                                    this.setAttribute('class', currentClasses.replace(/^\s|\s{2}/g,''));
                                }
                            }.bind(this), 2000, currentClasses);
                        }.bind(this), 50, currentClasses);
                    } else {

                        if (!/gearAnimationOpen/i.test(currentClasses)) {

                            this.setAttribute('class', currentClasses +' gearAnimationOpen');
                        } else {

                            this.setAttribute('class', currentClasses);
                        }
                    }

                    break;

            case 'finish Map Done Loading':
                    currentClasses = currentClasses.replace(/ ?spinGearDownSlowly/g, '').replace(/\s+/g, ' ');

                    if (!/gearOpen/i.test(currentClasses)) {

                        this.setAttribute('class', currentClasses);
                    } else {

                        if (!/gearAnimationOpen/i.test(currentClasses)) {

                            this.setAttribute('class', currentClasses +' gearAnimationOpen');
                        } else {

                            this.setAttribute('class', currentClasses);
                        }
                    }

                    break;
         }
    }.bind(window.$('options_svg_gear'));

    var private_optionsOpenCloseObj = {
            optionsSVGImage:  window.$('options_svg_gear'),
            closeOptions:     window.$('closeOptions'),
            optionsDivStyle:  window.$('options_div').style,
            snocoTrees:       window.$('snoco_trees'),
            optionsContainer: window.$('options_container'),
            svgController: svgController
        };

    var private_optionsPanelOpen = function () {
        this.optionsContainer.className = 'expandOptionsContainer';
        this.optionsContainer.removeEventListener('click', private_optionsPanelOpen);
        this.optionsSVGImage.addEventListener('click', private_optionsPanelClose);
        this.snocoTrees.addEventListener('click', private_optionsPanelClose);
        this.optionsDivStyle.display = 'block';
        this.svgController('start options open');
        this.snocoTrees.setAttribute('class', 'snocoTreesOptionsOpen');
    }.bind(private_optionsOpenCloseObj);

    var private_optionsPanelClose = function () {
        this.optionsDivStyle.display = 'none';
        this.optionsContainer.className = '';
        svgController('start options close');
        this.snocoTrees.setAttribute('class', '');
        this.optionsSVGImage.removeEventListener('click', private_optionsPanelClose);
        this.snocoTrees.removeEventListener('click', private_optionsPanelClose);
        window.setTimeout(function () {
                        this.optionsContainer.addEventListener('click', private_optionsPanelOpen);
                        svgController('finish options close');
                        //private_updateOptions();
                     }.bind(this), 500);
        window.$('make_url_text_input').value = '';
    }.bind(private_optionsOpenCloseObj);

    function private_checkMarkHandler() { /* TODO: this needs to be renamed */
        var id = this.id.replace(/_.*/, '')+ "_CheckMark";
        var checkMark = window.$(id);

        //theMap.optionsReference[id] = checkMark.checkedState();



        //If you change this remember to change updateButtonHandler().
        if (checkMark.checkedState()) {

            checkMark.animatedUnCheck();
        } else {

            checkMark.animatedCheck();
        }

        updateButtonHandler();
    }

    var updateButtonHandler = function (e) {
        var deleteCheckMark = window.$('deleteAllMarkers_CheckMark');

        if (deleteCheckMark.checkedState()) {
            theMap.marker_module.deleteAllMarkers();
            deleteCheckMark.animatedUnCheck();
        }

        // If 'Property Image' is checked, update all the markers with county property images.
        if (window.$('showPropertyImage_CheckMark').checkedState() && !theMap.optionsReference.showPropertyImage_CheckMark) {
            theMap.markersArray.forEach(                function (marker) {
                    if (marker.data.apn) {
                        if (!marker.querySelector('.markerImg')) {
                           theMap.marker_module.markerAddImageAndText.call(marker.data.editButton, null, {"m":"", "i": theMap.parameters.PROPERTY_IMG_URL + marker.data.apn.replace(/^(\d{4})\d*/, "$1") +"/"+ marker.data.apn +"R011.jpg" });
                        }
                    }
                }
          );
        }

        if (window.$('showSatelliteView_CheckMark').checkedState() &&
            window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +'SatelliteYearMap_CheckMark').checkedState() &&
            window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +'SatelliteYearMap_CheckMark').checkedState()) {
                if (!private_bothMapYearsAreCheckedAlertBollean) {
                    if (theMap.parameters.SHOW_2_MAPS_AT_THE_SAME_TIME &&
                        window.confirm('  The years '+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +' and '+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +' are checked,\n'+
                                        'this will create an overlay map with\n'+
                                        theMap.parameters.SATELLITE_MAP_YEARS.b.year +' on the bottom and '+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +' on top.\n\n'+
                                        '  You can compare the two maps to see\n'+
                                        'the changes between '+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +' and '+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +'.\n\n'+
                                        'Warning: Disabling information messages\n'+
                                        'or alerts, will disable this feature also.')) {
                        private_bothMapYearsAreCheckedAlertBollean = true;

                    } else if (window.confirm('Would you like to uncheck '+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +'?')) {
                        window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +'SatelliteYearMap_CheckMark').animatedUnCheck();
                    } else {
                        window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +'SatelliteYearMap_CheckMark').animatedUnCheck();
                    }
                }
        } else {
            theMap.overlayMap_module.deleteOverlayMap();
        }

        private_retrieveAndSaveOptions();
        if (e && e.target.id === 'update_button') {
            if (theMap.state.waitingForImage || theMap.state.waitingForAjax) {// Wait until image has loaded them
                theMap.addMapLoadCallBack(                'Waiting to update map(options panel), removes itself on first use.',
                    theMap,
                    function options_updateMap() {
                        theMap.ArcXML_module.makeArcXMLRequest(theMap.presentMinX, theMap.presentMaxX, theMap.presentMinY, theMap.presentMaxY);
                        theMap.removeMapLoadCallBack(options_updateMap);
                    }
              );
            } else {
                theMap.ArcXML_module.makeArcXMLRequest(theMap.presentMinX, theMap.presentMaxX, theMap.presentMinY, theMap.presentMaxY);
            }
        }
        //private_optionsPanelClose();
    };

    var init = function () {
        var $ = window.$;

        Array.prototype.forEach.call(document.querySelectorAll('.checkBox, .labelTd, .checkMark'), function (elm) {
            if (/checkMark/.test(elm.className)) {
                private_checkMarkArray.push(elm);

                // 2 way data binding using Object.defineProperty:
                // Object.defineProperty(                //   theMap.optionsReference, elm.id,
                //   {
                //     set: Function ("x",
                //             (function (x) {
                //               var checkMark = document.getElementById("{{ id }}");

                //               console.log(this, x);
                //               debugger;
                //               // If you change this remember to change updateButtonHandler().
                //               if (!x) {
                //                   checkMark.animatedCheck();
                //               } else {
                //                   checkMark.animatedUnCheck();
                //               }

                //               this["{{ id }}"+'_state'] = !x;

                //               return this["{{ id }}"+'_state'];
                //             })
                //             .toString()
                //             .replace(/function \(x\) {|}$/, '')
                //             .replace(/}$/, '')
                //             .replace(/{{ id }}/g, elm.id)
                //       ),
                //     get: function () { return this.value; },
                //     configurable: true
                //   }
                //);

                elm.checkedState = function () {

                    return (this.style.color === ''); // Defaults to the css color specified in checkMark class.
                };

                elm.animatedCheck = function () {

                    this.style.cssText += 'margin-top: -13px; height: 30px;';

                    this.style.color = '';

                    window.setTimeout(function () {

                        this.style.width = '30px';
                    }.bind(this), 50);
                };

                elm.animatedUnCheck = function () {
                    this.style.cssText += 'opacity: 0; color: grey; height: 15px; width: 10px;';
                    window.setTimeout(function () {
                        this.style.cssText += 'opacity: 1; margin-top: 0px;';
                    }.bind(this), 110);
                };
            } else { // The elm has the className of .checkBox or labelTd, it's not a checkMark.

                elm.addEventListener('click', private_checkMarkHandler);
            }

            if (/dontChangeState/.test(elm.className)) {

                elm.style.color = 'grey';
            }
        });

        private_setHomesSoldYears();

        private_setSatelliteMapYears();

        private_updateOptions();

        private_retrieveAndSaveOptions();

        $('options_container').addEventListener('click', private_optionsPanelOpen);

        $('make_url_anchor').addEventListener('click', function () {
            var url = private_makeUrl();

            window.$('make_url_text_input').value = url;
            window.$('make_url_text_input').select();

            if (url.length >= 2000) {

            window.alert("  URL length exceeds 2000 characters, it might not work in all browsers.\n\n"+
                        "  There are "+ url.length +" characters in the URL.\n\n"+
                        "  Test this URL by pasting it into the address bar of the intended browser, and/or "+
                        "make a link in a test email, and/or create a test link on your website and test "+
                        "in multiple browsers.\n\n"+
                        "  Consider using fewer markers or make the content of the markers smaller in length "+
                        "and try again.\n\n");
            }

            try{

                window.decodeURIComponent(url);
            } catch(e) {

                window.alert('  There was a problem test decoding the URL.\n\n'+
                             '  Cryptic Error Message:\n\n'+
                            '    \" '+ e.message +' \"\n\n'+
                            ((/%(?![0-9a-f][0-9a-f])/i.test(url))? '  *Atleast one % (percent sign) was found.':''));
            }
        });

        if (theMap.parameters.PANNING_ANIMATION_TRUE_OR_FALSE) {

            $('panning_control_slider').addEventListener('mousedown', theMap.panning_module.panningControlsliderMouseDown);

            $('panning_control_slider_rail').addEventListener('mousedown', theMap.panning_module.panningControlsliderMouseDown);
        }

        //$('find_parcel_number_input').addEventListener('keyup', private_SearchByAPNEventListener);
        //$('find_parcel_number_input').addEventListener('paste', private_SearchByAPNEventListener);
        $('search_for_parcel_information').addEventListener('click', function () {// TODO: this should be in the info search module.
            var searchContainer = $('search_container'),
                rect = undefined;

            searchContainer.style.display = 'block';

            rect = searchContainer.getBoundingClientRect();

            searchContainer.style[theMap.CSSTRANSFORM] = 'translate('+ ~~(theMap.resizedMapWidth / 2 - rect.width / 2 + theMap.mapContainer._left) +'px, '+ ~~(theMap.resizedMapHeight/2 - rect.height / 2 + theMap.mapContainer._top) +'px)';
            searchContainer.style.top = '0px';
            searchContainer.style.left = '0px';

            private_optionsPanelClose();
        });

        $('showSatelliteView_Label').addEventListener('click', private_showSataliteViewEventListener);
    };

    function private_showSataliteViewEventListener() {
        window.setTimeout(function () {
             if (window.$('showSatelliteView_CheckMark').checkedState()) {
                window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +'SatelliteYearMap_Label').style.color = '';
                window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +'SatelliteYearMap_Label').style.color = '';
            } else {
                window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.a.year +'SatelliteYearMap_Label').style.color = 'grey';
                window.$('show'+ theMap.parameters.SATELLITE_MAP_YEARS.b.year +'SatelliteYearMap_Label').style.color = 'grey';
            }
        }, 100);
    }

    function private_SearchByAPNEventListener() {
            if (this.value !== '') {

              // If a change is made here then you might have to change window.utlility_module.createMarkersFromInfoFromUrl() to be consistent.
              window.$('find_parcel_number').className = 'findParcelNumberBorder';
            } else {
               window.$('find_parcel_number').className = '';
            }
    }

    return {
        svgController: svgController,
        init: init,
        updateButtonHandler: updateButtonHandler,
    };
}();

/*
TODO:
- Save satellite option when creating a url.


*/