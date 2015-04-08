theMap.infoSearch_module = function(){
    var theMap = window.theMap,
        private_searchInfoAjax = new XMLHttpRequest(),
        private_searchContainer = $( 'search_container' ),
        private_firstNameInput = document.querySelector( '#search_first_name_div input' ),
        private_lastNameInput = document.querySelector( '#search_last_name_div  input' ),
        private_unitInput = document.querySelector( '#search_unit_number_div  input' ),
        private_streetNumInput = document.querySelector( '#search_street_number_div  input' ),
        private_streetNameInput = document.querySelector( '#search_street_name_div  input' ),
        private_cityInput = document.querySelector( '#search_city_name_div  input' ),
        private_apnInput = document.querySelector( '#search_apn_div  input' ),
        private_zipCodeInput = document.querySelector( '#search_zip_code_div input'),
        private_resultsDiv = $( 'search_results_div' ),
        private_searchArrowUpContainer = $( 'search_results_arrow_up_container' ),
        private_searchArrowUp = $( 'search_results_arrow_up_container' ),
        private_searchFooter = $( 'search_footer_container' ),
        private_searchCounterDiv = $( 'search_counter_div' ),
        private_searchArrowDown = $( 'search_results_arrow_down' );

    var private_getInfoFromSearchDiv = function(){
        var xmlRequest = undefined,
            url = theMap.parameters.URL_PREFIX + theMap.parameters.SEARCH_BY_APN_URL,
            xml = undefined,
            firstName = private_firstNameInput.value.toUpperCase().trim(),
            lastName = private_lastNameInput.value.toUpperCase().trim(),
            unit = private_unitInput.value.toUpperCase().trim(),
            streetName = private_streetNameInput.value.toUpperCase().replace( /^[A-Za-z] | [A-Za-z] | [A-Za-z]$/g, ' ' ).trim(),
            streetNum = private_streetNumInput.value.toUpperCase().replace( /[A-Za-z]/g, '' ).trim(),
            city = private_cityInput.value.toUpperCase().trim(),
            zipCode = private_zipCodeInput.value.toUpperCase().replace( /[A-Za-z]/g, '' ).trim(),
            apn = private_apnInput.value.replace( /[A-Za-z\s]/g, '' ).split( ',' ).map(function(el){ return "'"+ el +"'"; });

        private_searchInfoAjax.abort();
        xml =   '<?xml version="1.0" encoding="UTF-8" ?><ARCXML version="1.1">\n'
                + '<REQUEST>\n<GET_FEATURES outputmode="xml" geometry="true" compact="true" '
                + 'envelope="true" featurelimit="30" beginrecord="1">\n'
                + '<LAYER id="11" /><SPATIALQUERY subfields="#SHAPE# '
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.TAB_ACRES'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSLINE1'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSCITY'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSZIP'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.OWNERNAME'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.PARCEL_ID'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.MKTTL'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.X_COORD'
                + ' GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.Y_COORD'
                + "\" where=\"GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.OWNERNAME LIKE '%"+firstName+"%' AND GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.OWNERNAME LIKE '%"+ lastName +"%'"
                + " AND GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSLINE1 LIKE '%"+ unit +"%' AND GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSLINE1 LIKE '%"+ streetNum +"%'"
                + " AND GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSLINE1 LIKE '%"+ streetName +"%' AND GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSCITY LIKE '%"+ city +"%'"
                + " AND GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.SITUSZIP LIKE '%"+ zipCode +"%'"
                + ( ( apn != "''" )? " AND GIS_FEATURES.DBA.CADASTRAL_PARCELS_ASSESSOR.PARCEL_ID IN ("+ apn.join( ',' ) +")":"" ) 
                + ' "\/>'
                + '</GET_FEATURES></REQUEST></ARCXML>',
        xmlRequest = 'ArcXMLRequest=' + encodeURIComponent( xml );
        private_searchInfoAjax.open( "POST", url, true );
        private_searchInfoAjax.onload = searchInfoAjaxOnload;
        private_searchInfoAjax.onerror = function( e ){
            theMap.utilities_module.handleAjaxError( e );
        }
        private_searchInfoAjax.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
        private_searchInfoAjax.send( xmlRequest );
        theMap.options_module.svgController( 'start Send Request To Server' );
    }

    var searchInfoAjaxOnload = function(){//{"a": "apn number goes here","x": lat,"y": lng,"m":"text message","i":"img url"}
        var parcelNumber = undefined,
                parcelNumberRegex = /PARCEL_ID="(.*?)"/g,
                ownerName = /OWNERNAME="(.*?)"/g,
                addrLine1 = /SITUSLINE1="(.*?)"/g,
                addrCity = /SITUSCITY="(.*?)"/g,
                addrZip = /SITUSZIP="(.*?)"/g,
                marketValue = /MKTTL="(.*?)"/g,
                feature = undefined,
                featuresRegex = /<FEATURE>(.*?)<\/FEATURE>/g,
                sizeAcres = /TAB_ACRES="(.*?)"/g,
                lngRegex = /X_COORD="(\d+\.\d+)"/g,
                latRegex = /Y_COORD="(\d+\.\d+)"/g,
                featureCount = private_searchInfoAjax.responseText.match(/FEATURECOUNT count="(.*?)"/),
                obj = {}, xArray = [], yArray = [],
                maxX = 0, minX = 0, maxY = 0, minY = 0, 
                zoomPowerKeys = [], distance = 0, infoDiv = undefined, counter = 1;

        theMap.options_module.svgController( 'start Map Done Loading' );
        if( /error/.test( private_searchInfoAjax.responseText ) ){ console.log( private_searchInfoAjax.responseText.match(/\<error.*?\<\/error/i ) ) }
        if( featureCount && +featureCount[1] == 0 ){ 
            private_resultsDiv.innerHTML = 'Didn\'t find any results'; 
            private_searchCounterDiv.innerHTML='';
            private_searchArrowUpContainer.style.display = 'none';
            private_searchFooter.style.display = 'none';
            return;
        } 
        if( featureCount && +featureCount[1] > 1 ){ 
            private_searchArrowUpContainer.style.display = '';
            private_searchFooter.style.display = '';
        } else {
            private_searchArrowUpContainer.style.display = 'none';
            private_searchFooter.style.display = 'none';
        }
        private_resultsDiv.innerHTML = '';
        private_searchCounterDiv.innerHTML = '1 of ' +featureCount[1];
        while( ( feature = featuresRegex.exec( private_searchInfoAjax.responseText ) ) !== null ){
            feature += '<FEATURECOUNT count="1"/>';
            obj = {"a": parcelNumberRegex.exec( private_searchInfoAjax.responseText )[1],
                    "y": latRegex.exec( private_searchInfoAjax.responseText )[1],
                    "x": lngRegex.exec( private_searchInfoAjax.responseText )[1],
                    "m": theMap.marker_module.makeInfoHtml( feature ),
                    "g": feature,
                    "i":""
                };
            //xArray.push( +obj.x );
            //yArray.push( +obj.y );
            //theMap.marker_module.makeMarker( null, obj );
            infoDiv = private_makeResultsHTML( obj );
            infoDiv.id = counter;
            infoDiv.featureCount = +featureCount[1];
            if( counter === 1 ){
                infoDiv.style.display = 'block';
            }
            ++counter;
            private_resultsDiv.appendChild( infoDiv );
        }

        // if( featureCount && +featureCount[1] > 0 ){
        //     var maxX = xArray.reduce(function( prev, curr ){ return prev > curr? prev: curr; }),
        //         minX = xArray.reduce(function( prev, curr ){ return prev < curr? prev: curr; }),
        //         maxY = yArray.reduce(function( prev, curr ){ return prev > curr? prev: curr; }),
        //         minY = yArray.reduce(function( prev, curr ){ return prev < curr? prev: curr; }),
        //         zoomPowerKeys = Object.keys( theMap.ZOOM_POWER ),
        //         distance = ( maxX - minX > maxY - minY )? maxX - minX: maxY - minY;
            
        //     for( var n = 0; n < zoomPowerKeys.length; n++ ){
        //         if( theMap.ZOOM_POWER[zoomPowerKeys[n]] < distance ){
        //             continue
        //         } else {
        //             theMap.sliderPosition = +zoomPowerKeys[n];
        //             $( 'zoom_slider' ).style.top = theMap.sliderPosition +'px';
        //             break;
        //         }
        //     }
        //     theMap.presentMinX = minX;
        //     theMap.presentMaxX = maxX;
        //     theMap.presentMinY = minY;
        //     theMap.presentMaxY = maxY;
        //     theMap.utilities_module.zoomToStatePlaneXY( maxX, minX, maxY, minY );
        // }
    }

    function private_makeResultsHTML( arg_infoObj ){
        var containerDiv = document.createElement( 'div' );
            containerDiv.className = 'searchResultsDivDiv';
            containerDiv.style.display = 'none';
            containerDiv.innerHTML = '<div style="display:block;margin-bottom:0px;">'
                                    +'<div class="markerApnText" style="margin-bottom: 0px;">Apn:</div>'
                                    +'<a class="markerApnLink" href="https://www.snoco.org/proptax/search.aspx?parcel_number='+ arg_infoObj.a +'" target="_blank">'+ arg_infoObj.a +'</a>'
                                    +'</div>'
                                    + arg_infoObj.m
                                    +'</div>';
            containerDiv.infoObj = arg_infoObj;
            containerDiv.counterDiv = private_searchCounterDiv;
            containerDiv.oldMouseX = undefined;
            containerDiv.oldMouseY = undefined;
            containerDiv.markerBody = undefined;
            theMap.markersArray.forEach( function( forEachArg_marker ){ if( forEachArg_marker.data.apn == arg_infoObj.a ){ containerDiv.markerBody = forEachArg_marker; return true; } });
            containerDiv.addEventListener( 'mousedown', function( e ){
                var that = this;

                if( e.target.nodeName === 'A' || e.which !== 1 ){ return; }
                this.oldMouseX = e.clientX;
                this.oldMouseY = e.clientY;
                this.style.backgroundColor = 'rgba(93, 141, 195, 0.15)';
                document.addEventListener( 'mouseup', function searchMouseUp( e ){
                    if( e.clientX === that.oldMouseX && e.clientY === that.oldMouseY ){
                        private_makeSearchMarker( that.infoObj, that );
                    }
                    that.style.backgroundColor = '';
                    document.removeEventListener( 'mouseup', searchMouseUp );
                });
            });
            containerDiv.addEventListener('mouseover', function(){
                if( this.markerBody ){
                    this.markerBody.data.changeBgColorAndzIndex('white', 9999990);
                }
            });
            containerDiv.addEventListener('mouseout', function(){
                if( this.markerBody ){
                    this.markerBody.data.changeBgColorAndzIndex('', this.markerBody.data.zindex);
                }
            });
            containerDiv.addEventListener( theMap.MOUSE_WHEEL_EVT, function( e ){
                var delta = ( ( e.wheelDelta )? e.wheelDelta: ( evt = ( window.event || e ), evt.detail * - 120 ) );
                
                e.preventDefault();
                e.stopPropagation();
                if( delta <= -120){
                    private_searchNextResult( this );
                } else {
                    private_searchPreviousResult( this );
                }
            });
            return containerDiv;
    }

    function private_makeSearchMarker( arg_infoObj, arg_infoDiv ){
            theMap.sliderPosition = 60;
            $( 'zoom_slider' ).style.top = theMap.sliderPosition +'px';
            var maxX = ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapHeight / theMap.viewPortHeight ) / 2 ) + ( +arg_infoObj.x ),
                minX = ( +arg_infoObj.x ) - ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapHeight / theMap.viewPortHeight ) / 2 ),
                maxY = ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapWidth / theMap.viewPortHeight ) / 2 ) + ( +arg_infoObj.y ),
                minY = ( +arg_infoObj.y ) - ( theMap.ZOOM_POWER[theMap.sliderPosition] / ( theMap.resizedMapWidth / theMap.viewPortHeight ) / 2 );
            
            theMap.presentMinX = minX;
            theMap.presentMaxX = maxX;
            theMap.presentMinY = minY;
            theMap.presentMaxY = maxY;
            theMap.zoom_module.zoomToStatePlaneXY( maxX, minX, maxY, minY );
            theMap.addMapLoadListener('creates new marker after clicking in search window. deletes itself on first use.', theMap, function makeSearchMarker(){
                if( !arg_infoDiv.markerBody || !theMap.markersArray.some( function( arg_marker ){ return arg_marker.data.apn == arg_infoObj.a; }) ){
                    arg_infoDiv.markerBody = theMap.marker_module.makeMarker( null, arg_infoObj );
                    if( private_searchContainer.style.display == 'block' ){
                        arg_infoDiv.markerBody.data.changeBgColorAndzIndex( 'white', 9999990 );
                    }
                }
                theMap.removeMapLoadListener( makeSearchMarker );
            });
    }
    
    function private_searchPreviousResult( arg_result ){
        if( arg_result.previousElementSibling ){
            arg_result.style.display = 'none';
            arg_result.previousElementSibling.style.display = 'block';
            arg_result.counterDiv.innerHTML = arg_result.previousElementSibling.id +' of '+ arg_result.featureCount;
            if( arg_result.previousElementSibling.markerBody ){
                arg_result.previousElementSibling.markerBody.data.changeBgColorAndzIndex( 'white', 9999990 );
            }
            if( arg_result.markerBody ){
                arg_result.markerBody.data.changeBgColorAndzIndex('', arg_result.markerBody.data.zindex );
            }
        }
    }

    function private_searchNextResult( arg_result ){
        if( arg_result.nextElementSibling ){
            arg_result.style.display = 'none';
            arg_result.nextElementSibling.style.display = 'block';
            arg_result.counterDiv.innerHTML = arg_result.nextElementSibling.id +' of '+ arg_result.featureCount;
            if( arg_result.nextElementSibling.markerBody ){
                arg_result.nextElementSibling.markerBody.data.changeBgColorAndzIndex( 'white', 9999990 );
            }
            if( arg_result.markerBody ){
                arg_result.markerBody.data.changeBgColorAndzIndex('', arg_result.markerBody.data.zindex );
            }
        }
    }

    function private_searchArrowUpClickEventHandler(){
        var div = undefined;

        [].forEach.call( $( 'search_results_div' ).children, function( elm ){ if( elm.style.display !== 'none' ){ div = elm; } });
        private_searchPreviousResult( div );
    }

    function private_searchArrowDownClickEventHandler(){
        var div = undefined;

        [].forEach.call( $( 'search_results_div' ).children, function( elm ){ if( elm.style.display !== 'none' ){ div = elm; } });
        private_searchNextResult( div );
    }

    var init = function(){
        private_searchContainer.addEventListener( 'mousedown', function( e ){
            var that = this,
                rect = this.getBoundingClientRect(),
                offSetLeft = e.clientX - rect.left,
                offSetTop = e.clientY - rect.top,
                searchDocMouseMove = function( e ){
                       that.style[theMap.CSSTRANSFORM] = 'translate( '+ ~~(e.clientX - offSetLeft) +'px, '+ ~~( e.clientY - offSetTop ) +'px)';
                       //that.style.top = ( e.clientY - offSetTop ) +'px';
                    };

            if( e.target.nodeName === 'INPUT' || e.target.nodeName === 'BUTTON' || e.target.id == 'search_results_div' ){ return; };
            e.preventDefault();
            document.addEventListener( 'mousemove', searchDocMouseMove );
            document.addEventListener( 'mouseup', function searchDocMouseUp(){
                document.removeEventListener( 'mousemove', searchDocMouseMove );
                document.removeEventListener( 'mouseup', searchDocMouseUp );
            });
        });
        $( 'search_close_div' ).addEventListener( 'click', function(){
            private_searchContainer.style.display = '';
            theMap.markersArray.forEach( function( elem ){
                if( /markerParent/.test( elem.className ) ){
                    elem.data.changeBgColorAndzIndex('', elem.data.zindex );
                }
            });
        });
        $( 'search_div_button' ).addEventListener( 'click', private_getInfoFromSearchDiv );
        private_resultsDiv.addEventListener( 'mousedown', function( e ){
            e.stopPropagation();
        });

        // This prevents the mousewheel event from being disabled by the body mouse wheel event.
        private_searchContainer.addEventListener( theMap.MOUSE_WHEEL_EVT , function( e ){
            e.stopPropagation();
        });

        private_searchArrowUp.addEventListener( 'click', private_searchArrowUpClickEventHandler );
        private_searchArrowDown.addEventListener( 'click', private_searchArrowDownClickEventHandler );
        private_searchArrowUp.style.display = 'none';
        private_searchFooter.style.display = 'none';
    }.bind( theMap )
    
    return {
        init: init,
    };
}();

/*http://jsfiddle.net/JSLhp/8/




*/