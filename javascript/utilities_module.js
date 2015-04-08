theMap.utilities_module = function(){  
    var theMap = window.theMap;

    var convertMouseCoordsToStatePlane = function( e ){
        var xMultiplier = ( this.presentMaxX - this.presentMinX ) / this._width;
        var yMultiplier = ( this.presentMaxY - this.presentMinY ) / this._height;
        var x = ( ( ( e.clientX - this.mapContainer._left ) - ( this.dragDiv._left + this._left ) ) * xMultiplier + this.presentMinX );
        var y = ( this.presentMaxY - ( ( ( e.clientY - this.mapContainer._top ) - ( this.dragDiv._top + this._top ) ) * yMultiplier ) );
        
        return { x: x, y: y };
    }.bind( theMap );
    
    // firstMapLoad only gets called on the first map load.
    function firstMapLoad(){
        
        // This primes the first history position so that there will be a "state" if the person
        // uses the back button, then sets the onPopState variable to true so that an identical 
        // "state" won't be pushed onto the history stack.

        if( window.history.replaceState ){
            window.history.replaceState( {
                        minxOld: this.presentMinX,
                        maxxOld: this.presentMaxX,
                        minyOld: this.presentMinY,
                        maxyOld: this.presentMaxY,
                        zoom: theMap.sliderPosition,
                        title: "SnoCo Interactive Map: Welcome!"
                    }, 
                    "title 1",
                    ( !window.theMap.infoFromUrl )
                        ? '?={"x":' + this.presentMinX.toFixed( 3 ) 
                            +',"X":'+ this.presentMaxX.toFixed( 3 ) 
                            +',"y":'+ this.presentMinY.toFixed( 3 ) 
                            +',"Y":'+ this.presentMaxY.toFixed( 3 ) 
                            +',"z":'+ this.sliderPosition 
                            +'}' 
                        : window.location.search
            );
        }

        theMap.onPopState = true;
        theMap.citiesTownsSvg_module.resizeAllSvgCities(); //This sets the size of the svg container.
        theMap.marker_module.makeInterStateShields();
        theMap.marker_module.isSimpleMarkerOnImage();
        window.$( 'small_county_svg' ).style.opacity = 1;
        window.$( 'loading_div' ).parentNode.removeChild( window.$( 'loading_div' ) );
        window.$( 'zoom_control' ).style.visibility = 'visible';
        addListeners();// TODO: rename this.
        theMap.removeMapLoadListener( firstMapLoad );
    }

    function createMarkersFromInfoFromUrl(){
        
        // First check if the first char ( after '?=') is a number, if so assume it is an APN that needs to be calculated,
        // otherwise assume it is a JSON object with pre-calculated marker information.
        if ( checkUrlForApn().doesExist ){
            document.querySelector( '#search_apn_div  input' ).value = checkUrlForApn().contents;
            theMap.marker_module.searchByAPNs();
        } else if( theMap.infoFromUrl && theMap.infoFromUrl.x ) {
            //theMap.infoFromUrl = JSON.parse( window.decodeURIComponent( location.search.replace( /^\?=/,'' ) ) );
            if ( theMap.infoFromUrl.mr ){
                theMap.infoFromUrl.mr.forEach( function( mrker ){
                    theMap.marker_module.makeMarker( null, mrker );
                } );
            }
        } 

        // If there was an number pasted into #find_parcel_number_input, then style the "Search by APN"
        // anchor so it looks like a button.
        if ( /^\d/.test ( document.querySelector( '#search_apn_div  input' ).value ) ){
             //window.$( 'document.querySelector( '#search_apn_div  input' ),' ).className = 'findParcelNumberBorder';
        } 
        setTimeout( function(){ theMap.infoFromUrl = undefined; }, 500 );
    }

    function testProp( props ) {// Got this from leaflet
        var style = document.documentElement.style;

        for ( var i = 0; i < props.length; i++ ) {
            if ( props[i] in style ) {
                return props[i];
            }
        }
        return false;
    } 
    
    var getInfoFromUrl = function(){ 

        // First check to see if it is a JSON object, if it is then stick it in infoFromUrl,
        //  that will be checked for true/false then used to create the first map.
        try{
            if ( /^\?=\{/.test( window.decodeURIComponent( window.location.search ) ) ){
                this.infoFromUrl = JSON.parse( window.decodeURIComponent( window.location.search.replace( /^\?=/,'' ) ) );
                this.presentMinX = this.infoFromUrl.x;
                this.presentMaxX = this.infoFromUrl.X;
                this.presentMinY = this.infoFromUrl.y;
                this.presentMaxY = this.infoFromUrl.Y;
                this.sliderPosition = this.infoFromUrl.z;
                if( this.infoFromUrl.$2 !== undefined ){
                    this.optionsReference.$12SaleRecord_CheckMark = this.infoFromUrl.$2;
                    this.optionsReference.$13SaleRecord_CheckMark = this.infoFromUrl.$3;
                    this.optionsReference.$14SaleRecord_CheckMark = this.infoFromUrl.$4;
                    this.optionsReference.showSatelliteView_CheckMark = this.infoFromUrl.s;
                    this.optionsReference.show2007SatelliteYearMap_CheckMark = this.infoFromUrl.s7;
                    this.optionsReference.show2012SatelliteYearMap_CheckMark = this.infoFromUrl.s12;
                    this.optionsReference.showAddresses_CheckMark = this.infoFromUrl.a;
                    this.optionsReference.showBenchMark_CheckMark = this.infoFromUrl.b;
                    this.optionsReference.showCities_CheckMark = this.infoFromUrl.c;
                    this.optionsReference.showParcelBoundary_CheckMark = this.infoFromUrl.pb;
                    this.optionsReference.showParcelNumbers_CheckMark = this.infoFromUrl.pn;
                }
                if( this.infoFromUrl.l && this.infoFromUrl.l.length !== 0 ){
                    this.addMapLoadListener( 'Creates svg lines from information in the url, deleted after first use.', theMap, 
                            function makeLines(){
                                theMap.drawSvgLine_module.createPolylinesFromUrl( theMap.infoFromUrl.l ); 
                                theMap.removeMapLoadListener( makeLines );
                            } );
                    //this.drawSvgLine_module.createPolylinesFromUrl( this.infoFromUrl.l );
                }
                if( this.infoFromUrl.ml && this.infoFromUrl.ml.length !== 0 ){
                    this.addMapLoadListener( 'Creates svg lines from information in the url, deleted after first use.', theMap, 
                            function makeLines(){
                                theMap.measureSvgLine_module.createPolylinesFromUrl( this.infoFromUrl.ml );
                                theMap.removeMapLoadListener( makeLines );
                            } );
                }
            } else if ( checkUrlForApn().doesExist ){
                this.infoFromUrl = checkUrlForApn().contents;
            }

            // Either way call call a function that will attempt to create markers if there is APN information.
            this.addMapLoadListener( 'Creates markers from information in the url, deleted after first use.', theMap, 
                function createMarkers(){
                    theMap.utilities_module.createMarkersFromInfoFromUrl();
                    theMap.removeMapLoadListener( createMarkers );
                });
        } catch ( error ){
            window.alert(   'There appears to be a problem with the URL.\n\nCryptic Error Message:\n  "  '+ 
                            error +'  "\n\n'+
                            'The URL length is: '+ ( location.pathname + location.search ).length +
                            ' characters.' ); 
        }
    }.bind( theMap );

    // TODO: Can popState be re-factored in a smarter way?
    var popStateHandler = function( event ){
        if( !event.state ){ return false; }
        document.title = event.state.title;
        this.parsedXMLFromServer.getElementsByTagName( "ENVELOPE" )[0].attributes[0].nodeValue = event.state.minxOld;
        this.parsedXMLFromServer.getElementsByTagName( "ENVELOPE" )[0].attributes[2].nodeValue = event.state.maxxOld;
        this.parsedXMLFromServer.getElementsByTagName( "ENVELOPE" )[0].attributes[1].nodeValue = event.state.minyOld;
        this.parsedXMLFromServer.getElementsByTagName( "ENVELOPE" )[0].attributes[3].nodeValue = event.state.maxyOld;
        window.$( 'zoom_slider' ).style.top = event.state.zoom +'px';
        this.sliderPosition = +event.state.zoom;
        this.ArcXML_module.makeArcXMLRequest( event.state.minxOld, event.state.maxxOld, event.state.minyOld, event.state.maxyOld, true );
        getInfoFromUrl();
    }.bind( theMap );

    var addPageHasFocusClickHandling = function(){

        // This controls pageHasFocus when the browser isn't focused ( clicked outside the browser );
        // The visibility api doesn't fire off when someone clicks outside the browser.
        window.onblur = function(){ 
            theMap.pageHasFocus = false;// Mouse down event will set this to true, the click event will still fire.
            theMap.pageHasFocusForClick = false; // Used to prevent click events from firing.

            // This is used to set the pageHasFocus variable to true if the person uses the mousewheel to 
            // zoom on the map. ThetheMap.zoom_module.zoomInOut function was setting pageHasFocus everytime
            // which was unnecessary.
            theMap.mapContainer.addEventListener( theMap.MOUSE_WHEEL_EVT, onFocusMouseWheelEvnt );
            function onFocusMouseWheelEvnt(){
                theMap.pageHasFocus = true;
                theMap.pageHasFocusForClick = false;
                this.removeEventListener( theMap.MOUSE_WHEEL_EVT, onFocusMouseWheelEvnt );
            }
        };
        
        // From mdn "Using the Page Visibility API" 1/26/2014.
        // This controls pageHasFocus when switching between tabs.
        // First window.onblur will set pageHasFocus = false, then when switching back the visibly api will set pageHasFocus = true.
        if ( typeof document.hidden !== "undefined" ){ // Opera 12.10 and Firefox 18 and later support 
            document.addEventListener( "visibilitychange", setPageHasFocusToTrue );
        } else if ( typeof document.mozHidden !== "undefined" ){
            document.addEventListener( "mozvisibilitychange", setPageHasFocusToTrue );
        } else if ( typeof document.msHidden !== "undefined" ){
            document.addEventListener( "msvisibilitychange", setPageHasFocusToTrue );
        } else if ( typeof document.webkitHidden !== "undefined" ){
            document.addEventListener( "webkitvisibilitychange", setPageHasFocusToTrue );
        }

        // This will set a "click" event listener that will set pageHasFocus = true if the person clicks on 
        // the options panel or the zoom slider.
        window.$( 'options_container' ).addEventListener( 'click', setPageHasFocusToTrue );
        window.$( 'zoom_control' ).addEventListener( 'click', setPageHasFocusToTrue );
        function setPageHasFocusToTrue(){
            theMap.pageHasFocus = true;
            theMap.pageHasFocusForClick = true;
        }
    };

    function checkUrlForApn(){
        return { doesExist: /^\?=\s*\d\d/.test( window.decodeURIComponent( window.location.search ) ) ,
                 contents: window.decodeURIComponent( window.location.search ).replace( /[\s|?=]/g, '' ) };
    }

    var private_addRemoveEventListenersObj = {
        array: [
            [ window.$( 'zoom_slider' ), 'mousedown', theMap.zoom_module.sliderMouseDown ],
            [ window.$( 'zoom_in_button' ), 'click', theMap.zoom_module.plus ],
            [ window.$( 'zoom_out_button' ), 'click', theMap.zoom_module.minus],
            [ window.$( 'full_zoom_out_button' ), 'click', theMap.zoom_module.zoomAllTheWayOut],
            [ window.$( 'update_button' ), 'click', theMap.options_module.updateButtonHandler],
            [ window.$( 'save_button' ), 'click', theMap.options_module.updateButtonHandler],
            //[ window.$( 'find_parcel_number' ), 'click', theMap.marker_module.searchByAPNs],
            [ window.$( 'theMap_container' ), 'mousedown', theMap.mapControl_module.theMap_mouseDown],
        ],
        updateButton: window.$( 'update_button' ),
        saveButton: window.$( 'save_button' ),
    };
    
    var addListeners = function(){
        var i = undefined;

        theMap.setTimeoutt( function(){ theMap.options_module.svgController( 'finish Map Done Loading' ); }, 2000 );
        theMap.mapContainer.addEventListener( theMap.MOUSE_WHEEL_EVT, theMap.zoom_module.zoomInOut );
        for( i = 0; i < this.array.length; ++i ){
            this.array[i][0].addEventListener( this.array[i][1], this.array[i][2], false );
        }
        this.updateButton.disabled = false;
        this.saveButton.disabled = false;        
    }.bind( private_addRemoveEventListenersObj );

    var handleResize = function(){
        var middleOfContainerX = this._width / 2,
            middleOfContainerY = this._height / 2; 

        this.viewPortWidth  = window.innerWidth;
        this.viewPortHeight = window.innerHeight;
        calculateMaxWidthHeight();
        this.mapContainer.style.width  = this.resizedMapWidth +'px';
        this.mapContainer.style.height = this.resizedMapHeight +'px';
        this.svgContainer.style.width  = this.resizedMapWidth +'px';
        this.svgContainer.style.height = this.resizedMapHeight +'px';
        // This finds the top of the zoom slider on the screen, it changes when the screen resizes
        // because it's containers ( #zoom_control ) left and top are set as a percentage of the screen size.
        this.zoom_slider_container_styleTop = window.$( 'zoom_slider_container' ).getBoundingClientRect().top;       
        this.overlayMap_module.resizeOverlayMapContainer();
        this.smallCountySvg_module.smallCountySvgResize();
        this.zoom_module.zoomStart( middleOfContainerX, middleOfContainerY, this.viewPortWidth/2, this.viewPortHeight/2 );
    }.bind( theMap );

    var calculateMaxWidthHeight = function(){
        var maxWidthHeight = theMap.parameters.MAX_IMG_PIXELS;
            
        // If the viewPortHeight multiplied by viewPortWidth is greater than the max number
        // of pixels the server will serve then find the biggest size the map image can be.
        if ( this.viewPortHeight * this.viewPortWidth > maxWidthHeight ){
            
            // By default it will try to reduce the width of the map and and not touch 
            // the height so it will be full height.
            if ( this.viewPortWidth < theMap.parameters.MAX_WIDTH ){
                this.resizedMapWidth = ( function ( height, width, maxWidthHeight ){
                            while( true ){
                                --width;
                                if ( height * width > maxWidthHeight ){
                                    continue;
                                }
                                return width;
                            }
                        } )( this.viewPortHeight, this.viewPortWidth, maxWidthHeight );
                this.resizedMapHeight = this.viewPortHeight;
            } else {

                // If the persons resolution is just too big, then revert to the default
                // max width and height settings.
                this.resizedMapWidth = theMap.parameters.MAX_WIDTH;
                this.resizedMapHeight = theMap.parameters.MAX_HEIGHT;
            }
        } else {

            // If the view port is smaller than the max size the server will serve, then
            // set the image to fill up the browser window.
            this.resizedMapWidth = this.viewPortWidth;
            this.resizedMapHeight = this.viewPortHeight;
        }

        // Try to center the div that contains the map ( #theMap_container ).
        this.mapContainer._left = ( this.viewPortWidth - this.resizedMapWidth ) / 2;
        this.mapContainer._top = ( this.viewPortHeight - this.resizedMapHeight ) / 2;
        this.mapContainer._right =  this.resizedMapWidth + this.mapContainer._left; //not sure if right and bottom are necessary or used.
        this.mapContainer._bottom = this.resizedMapHeight + this.mapContainer._top;
        this.mapContainer.setAttribute( 'style', 'opacity: 1; position:absolute; top:'+ this.mapContainer._top +'px; left:'+ this.mapContainer._left +'px; height:'+ this.resizedMapHeight +'px; width:'+ this.resizedMapWidth +'px; ' );
    }.bind( theMap );

    // TODO: This was experimental.
    // function iframeLoadHandler(){
    //     var z = document.getElementsByTagName( 'iframe')[0];
    //         //z.contentDocument.GCvalue = [];
    //         try{ z.contentDocument.forms[0].target = ''; } catch( e ){}
    //         console.log( 'iframeLoadHandler');
    //         try{
    //             var v = z.contentDocument.getElementsByTagName( 'a');
    //             [].forEach.call( v, function( anchor ){ anchor.onclick = function( e ){ e.preventDefault; window.parent.console.log( this.href ); return false;}; } );
    //         } catch( e ){}
    // }

    var removeTransitionFromMarkers = function(){
        var markers = this.markersArray;
        var len = markers.length;
        
        while ( len-- ){
        
            markers[len].style.cssText = markers[len].style.cssText.replace( /(-webkit-|-moz-|-ms-)?transition.*?;/g, '' );
        }
    }.bind( theMap );
    
    function simpleMessageBox( arg_innerHTML, arg_id, arg_width ){
        var message = document.createElement( 'div' );
        
        message.className = 'simpleMessageBox';
        message.style.width = ( arg_width && ( arg_width +'px' ) ) || '300px';
        message.style.left = ( ( window.innerWidth / 2 ) - ( ( arg_width && ( arg_width / 2 ) ) || 150 ) ) +'px';
        message.id = arg_id || 'simple_message_box';
        message.innerHTML = arg_innerHTML;
        message.onclick = function( e ){ e.stopPropagation(); this.parentNode.removeChild( this ); };
        document.body.appendChild( message );
        return message;
    }

    function mainAjax( xmlRequest ){// TODO: this should be named better?
        // Features request
        // var encodedResponse = window.encodeURIComponent( 'ArcXMLRequest' ) +'='+ window.encodeURIComponent( '<?xml version="1.0" encoding="UTF-8" ?><ARCXML version="1.1"><REQUEST><GET_SERVICE_INFO envelope="false" renderer="false" extensions="false" fields="true" /></REQUEST></ARCXML>' ),
        var encodedResponse = window.encodeURIComponent( 'ArcXMLRequest' ) +'='+ window.encodeURIComponent( xmlRequest ),
            url = theMap.parameters.URL_PREFIX + theMap.parameters.MAP_URL,
            mainAjaxHTTPRequest = theMap.mainAjaxHTTPRequest;

        mainAjaxHTTPRequest.abort(); 
        
        theMap.state.waitingForAjax = true;
        theMap.citiesTownsSvg_module.svgCitiesSetDisplay( 'none' );
        //document.body.className = 'waiting';
        
        window.theMap.className = '';

        mainAjaxHTTPRequest.onreadystatechange = function(){
            try{

                if( mainAjaxHTTPRequest.status === 200 && mainAjaxHTTPRequest.readyState === 4){
                    
                    onload();
                }
            } catch(e){
                
                console.log(e); 
            }
        };

        var onload = function(){
             //z = ( new DOMParser() ).parseFromString( /<\?xml.*>/.exec(  mainAjaxHTTPRequest.responseText )[0], "application/xml" );
            if( /error/i.test ( mainAjaxHTTPRequest.responseText ) ){
                
                handleAjaxError( mainAjaxHTTPRequest.responseText, mainAjaxHTTPRequest );
                return;
            }

            try{
            
                theMap.parsedXMLFromServer = ( new DOMParser() ).parseFromString( /<\?xml.*>/.exec(  mainAjaxHTTPRequest.responseText )[0], "application/xml" );
            } catch ( tryCatchError ){
            
               handleAjaxError( tryCatchError, mainAjaxHTTPRequest);
               theMap.mapControl_module.resetMapOnError();
               
               return;
            } 

            window.theMap.state.waitingForAjax = false;
            
            theMap.mapControl_module.setImg();
        };

        mainAjaxHTTPRequest.onerror = function( e ){
            handleAjaxError( e, mainAjaxHTTPRequest );
        };

        mainAjaxHTTPRequest.open( 'POST', url, true );
        mainAjaxHTTPRequest.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
        mainAjaxHTTPRequest.send( encodedResponse );
    }

    function handleAjaxError( arg_Error, arg_responseObj ){
        var error = undefined;

        theMap.state.waitingForAjax = false;
        
        if( /error/i.test( arg_responseObj.responseText ) ){
            
            error = arg_responseObj.responseText.match( /<error.*?>(.*?)<\/error>/i );
            
            if( error ){ //Error from map server
                
                error = error[1].replace( /\\/g , '' );
                
                window.console.error( 'There was an ajax error from onload: ', arg_Error );
                window.console.log( arg_responseObj );
                
                window.alert( 'There was an error: \n\n    ' 
                            + error 
                            +'\n\nThis error does not indicate a problem with '
                            +'your computer, network or internet connection.\n'
                            +'Please try again later.' );

            } else if ( arg_responseObj.responseText.match( /HTTPException:(.*?)\n/i ) ){
                
                error = arg_responseObj.responseText.match( /HTTPException:(.*?)\n/i )[1].replace( /\\/g , '' );

                window.alert( 'There was an error.\nPlease try again later.\n\n'+ error );

            }
        } else if (arg_responseObj.responseText === ''){

            window.console.error( 'There was an ajax error: ', arg_Error, arg_responseObj.status );
            window.console.log( arg_responseObj );            

            window.alert( 'There was an error.\nPlease try again later.\n\nBlank response from server\n\n'+ arg_responseObj.status +': '+ arg_responseObj.statusText );
        } else {

            window.console.error( 'There was an ajax error: ', arg_Error, arg_responseObj.status );
            window.console.log( arg_responseObj );            

            window.alert( 'There was an error.\nPlease try again later.\n\n'+ arg_responseObj.status +': '+ arg_responseObj.statusText );
        }

        theMap.resetMapOnError();
    }

    // This function calculates where theMap.dragDiv is in the css cubic bezier transition when 
    // the panning animation is canceled before it is has finished. It is a port of a port of webkit UnitBezier.
    // http://stackoverflow.com/questions/11696736/recreating-css3-transitions-cubic-bezier-curve
    // https://trac.webkit.org/browser/trunk/Source/WebCore/platform/graphics/UnitBezier.h
    // https://gist.github.com/mckamey/3783009
    function UnitBezier( p1x, p1y, p2x, p2y ) {
        var cx = 3.0 * p1x, 
            bx = ( 3.0 * ( p2x - p1x ) ) - cx, 
            ax = 1.0 - cx - bx,
            cy = 3.0 * p1y, 
            by = ( 3.0 * ( p2y - p1y ) ) - cy, 
            ay = 1.0 - cy - by;

        return  function ( arg_percentCompleted ){
                    var t0 = 0.0, t1= 1.0, t2 = arg_percentCompleted,
                        x2, abs = window.Math.abs;

                    //if ( t2 > t1 ) { return ( ( ( ( ay * t1 ) + by ) * t1 ) + cy ) * t1; }
                    while ( t0 < t1 ) {
                        x2 = ( ( ( ax * t2 ) + bx ) * t2 + cx ) * t2;
                        if ( abs( x2 - arg_percentCompleted ) < 0.001 ){
                            return ( ( ( ( ay * t2 ) + by ) * t2 ) + cy ) * t2;
                        }
                        if ( arg_percentCompleted > x2 ){ t0 = t2; }
                        else { t1 = t2; }
                        t2 = ( ( t1 - t0 ) * 0.5 ) + t0;
                    }
                    
                };
    }

    // Convert state plane coordinates to wgs 84 coordinates...I'm guessing anyway, not sure.
    function convertSPToWGS84( uX, uY ){ // Copied from scopi! How about that!
        var sqrt = window.Math.sqrt, pow = window.Math.pow,
            atan = window.Math.atan, sin = window.Math.sin,
            abs = window.Math.abs,
            part1 = undefined, 
            rho   = undefined, theta = undefined, txy = undefined,
            lon   = undefined, 
            lat0  = undefined,  lat1 = undefined, 
            Lat   = undefined, Lon   = undefined;

        uX = uX - 1640416.666666667; 
        uY = uY - 0;
        rho = sqrt( pow( uX,2 ) + pow( ( 19205309.96888484 - uY ),2 ) );  
        theta = atan( uX / ( 19205309.96888484 - uY ) ); 
        txy = pow( ( rho / ( 20925646.00* 1.8297521088829285 ) ),( 1 / 0.7445203265542939 ) ); 
        lon = ( theta / 0.7445203265542939 ) + -2.1089395128333326; 
        uX = uX + 1640416.666666667; 
        lat0 = 1.5707963267948966 - ( 2 * atan( txy ) ); 
        part1 = ( 1 - ( 0.08181905782 * sin( lat0 ) ) ) / ( 1 + ( 0.08181905782 * sin( lat0 ) ) ); 
        lat1 = 1.5707963267948966 - ( 2 * atan( txy * pow( part1,( 0.08181905782 / 2 ) ) ) ); 
        while ( ( abs( lat1 - lat0 ) ) > 0.000000002 ){ 
            lat0 = lat1; 
            part1 = ( 1 - ( 0.08181905782 * sin( lat0 ) ) ) / ( 1 + ( 0.08181905782 * sin( lat0 ) ) ); 
            lat1 = 1.5707963267948966 - ( 2 * atan( txy * pow( part1,( 0.08181905782 / 2 ) ) ) ); 
        } 
        Lat = lat1 / 0.01745329252;
        Lon = lon / 0.01745329252; 
        return { x: Lat.toFixed( 7 ), y: Lon.toFixed( 7 ) };
    }

    return {
        convertMouseCoordsToStatePlane: convertMouseCoordsToStatePlane,
        firstMapLoad: firstMapLoad,
        createMarkersFromInfoFromUrl: createMarkersFromInfoFromUrl,
        getInfoFromUrl: getInfoFromUrl,
        popStateHandler: popStateHandler,
        addPageHasFocusClickHandling: addPageHasFocusClickHandling,
        checkUrlForApn: checkUrlForApn,
        addListeners: addListeners,
        handleAjaxError: handleAjaxError,
        handleResize: handleResize,
        calculateMaxWidthHeight:calculateMaxWidthHeight,
        removeTransitionFromMarkers: removeTransitionFromMarkers,
        testProp: testProp,
        simpleMessageBox: simpleMessageBox,
        mainAjax: mainAjax,
        UnitBezier: UnitBezier,
        convertSPToWGS84: convertSPToWGS84,
    };
}();

/*
    TODO:
        *   When order is true in arcxml the layers that are not sent are considers view = false,
            so use a ternary statement to remove them if they are not needed? 
*/
/*errors: <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=Cp1252"><HTML><HEAD><TITLE>Default Form</TITLE><!-- Title must match jsForm.htm's title --><SCRIPT TYPE="text/javascript" LANGUAGE="JavaScript">function passXML() {

var XMLResponse='<?xml version="1.0" encoding="UTF-8"?><ARCXML version="1.1"><RESPONSE><ERROR>Server: Assessor was not found.</ERROR></RESPONSE></ARCXML>';
null( XMLResponse );
}</SCRIPT></HEAD><BODY BGCOLOR="null" onload="passXML()"><FORM ACTION="" METHOD="POST" name="theForm"><!--- <input type="Hidden" name="Form" value="True"> ---><INPUT TYPE="Hidden" NAME="ArcXMLRequest" VALUE=""><INPUT TYPE="Hidden" NAME="JavaScriptFunction" VALUE="parent.MapFrame.processXML"><INPUT TYPE="Hidden" NAME="BgColor" VALUE="null"><INPUT TYPE="Hidden" NAME="FormCharset" VALUE="Cp1252"><INPUT TYPE="Hidden" NAME="RedirectURL" VALUE=""><INPUT TYPE="Hidden" NAME="HeaderFile" VALUE=""><INPUT TYPE="Hidden" NAME="FooterFile" VALUE=""></FORM></BODY></HTML>


"<html>\n  
<head>\n    
<title>Internal Server Error</title>\n    
<style>\n   body {\n        padding: 20px;\n        font-family: arial, sans-serif;\n        font-size: 14px;\n      }\n      pre {\n        background: #F2F2F2;\n        padding: 10px;\n      }\n    
</style>\n  
</head>\n  
<body>\n    
<h1>Internal Server Error</h1>\n    
<p>The server has either erred or is incapable of performing\n    the requested operation.</p>\n    
<pre>Traceback (most recent call last):\n  File &quot;/base/data/home/runtimes/python27/python27_lib/versions/third_party/webapp2-2.5.2/webapp2.py&quot;, line 1535, in __call__\n    rv = self.handle_exception(request, response, e)\n  File &quot;/base/data/home/runtimes/python27/python27_lib/versions/third_party/webapp2-2.5.2/webapp2.py&quot;, line 1529, in __call__\n    rv = self.router.dispatch(request, response)\n  File &quot;/base/data/home/runtimes/python27/python27_lib/versions/third_party/webapp2-2.5.2/webapp2.py&quot;, line 1278, in default_dispatcher\n    return route.handler_adapter(request, response)\n  File &quot;/base/data/home/runtimes/python27/python27_lib/versions/third_party/webapp2-2.5.2/webapp2.py&quot;, line 1102, in __call__\n    return handler.dispatch()\n  File &quot;/base/data/home/runtimes/python27/python27_lib/versions/third_party/webapp2-2.5.2/webapp2.py&quot;, line 572, in dispatch\n    return self.handle_exception(e, self.app.debug)\n  File &quot;/base/data/home/runtimes/python27/python27_lib/versions/third_party/webapp2-2.5.2/webapp2.py&quot;, line 570, in dispatch\n    return method(*args, **kwargs)\n  File &quot;/base/data/home/apps/s~forwarding-proxy/1.376496693057479353/helloworld.py&quot;, line 38, in post\n    response = urllib2.urlopen(req)\n  File &quot;/base/data/home/runtimes/python27/python27_dist/lib/python2.7/urllib2.py&quot;, line 127, in urlopen\n    return _opener.open(url, data, timeout)\n  File &quot;/base/data/home/runtimes/python27/python27_dist/lib/python2.7/urllib2.py&quot;, line 404, in open\n    response = self._open(req, data)\n  File &quot;/base/data/home/runtimes/python27/python27_dist/lib/python2.7/urllib2.py&quot;, line 422, in _open\n    '_open', req)\n  File &quot;/base/data/home/runtimes/python27/python27_dist/lib/python2.7/urllib2.py&quot;, line 382, in _call_chain\n    result = func(*args)\n  File &quot;/base/data/home/runtimes/python27/python27_dist/lib/python2.7/urllib2.py&quot;, line 1214, in http_open\n    return self.do_open(httplib.HTTPConnection, req)\n  File &quot;/base/data/home/runtimes/python27/python27_dist/lib/python2.7/urllib2.py&quot;, line 1187, in do_open\n    r = h.getresponse(buffering=True)\n  File &quot;/base/data/home/runtimes/python27/python27_dist/lib/python2.7/gae_override/httplib.py&quot;, line 526, in getresponse\n    raise HTTPException(str(e))\nHTTPException: Deadline exceeded while waiting for HTTP response from URL: http://gis.snoco.org/servlet/com.esri.esrimap.Esrimap?ServiceName=Assessor&amp;ClientVersion=9.4.1&amp;Form=True&amp;Encode=False?\n</pre>\n  </body>\n</html>"
*/
