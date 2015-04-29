
    // Load up theMap object with goodies.

    theMap.timeToLoadArray = [],  // Used to calculate panning duration.

    theMap.startSend = undefined, // Used to calculate panning duration.

    theMap.panningObj = {
        panningAnimationMultiplier: theMap.parameters.PANNING_ANIMATION_MULTIPLIER,
        panningAnimationTime: theMap.parameters.PANNING_ANIMATION_TIME
    };

    theMap.pageHasFocus = true;
    theMap.pageHasFocusForClick = true;

    theMap.popStateCounter = 0;

    theMap.resizedMapHeight = undefined;
    theMap.resizedMapWidth  = undefined;

    theMap.viewPortWidth  = window.innerWidth;
    theMap.viewPortHeight = window.innerHeight;

    theMap._left   = 0; // Modified when zooming.
    theMap._top    = 0; // Modified when zooming.

    theMap._width  = undefined; // Modified when zooming.
    theMap._height = undefined; // Modified when zooming.

    theMap.mapContainer = $( 'theMap_container' );

    theMap.mapContainer._left = undefined;
    theMap.mapContainer._top  = undefined;
    theMap.mapContainer._right  = undefined;
    theMap.mapContainer._bottom = undefined;

    theMap.currentMapImg = document.createElement( 'img' );
    theMap.currentMapImg._left = undefined;
    theMap.currentMapImg._top  = undefined;

    theMap.dragDiv = window.$( 'theMap_drag_div' );
    theMap.dragDiv._left = 0;
    theMap.dragDiv._top  = 0;

    theMap.svgContainer = window.$( 'theMap_svg_container' );
    theMap.svgPropertyHightlightGroup = window.$( 'svg_property_highlight_group' );

    theMap.svgDrawLastEClientX = undefined;
    theMap.svgDrawLastEClientY = undefined;

    theMap.clickedOnASvgCity = false;

    theMap.calculateMarkerPosition = theMap.marker_module.calculateMarkerPosition;

    theMap.ZOOM_POWER = {'0': 350, '20': 700, '40': 1400, '60': 2800, '80': 5600, '100': 11200, '120': 22400, '140': 44800, '160': 89600, '180': 179200, '200': 358400 }; // Used when doing the zoom in zoom_module -> private_centerMainImage().
    theMap.ZOOM_POWER_NUMBER = {'0': 0, '20': 1, '40': 2, '60': 3, '80': 4, '100': 5, '120': 6, '140': 7, '160': 8, '180': 9, '200': 10 };

    theMap.zoomStartTimer = undefined;

    theMap.setTimeoutt = window.setTimeout.bind( window );
    theMap.clearTimeoutt = window.clearTimeout.bind( window );

    theMap.presentMinX = theMap.parameters.FULL_ZOOM_MIN_X;
    theMap.presentMaxX = theMap.parameters.FULL_ZOOM_MAX_X;
    theMap.presentMinY = theMap.parameters.FULL_ZOOM_MIN_Y;
    theMap.presentMaxY = theMap.parameters.FULL_ZOOM_MAX_Y;

    theMap.pan = {  panningXYOld: undefined, panningXYNew: undefined,
                    oldMouseY: undefined, oldMouseX: undefined,
                    oldMouseXpan: undefined, oldMouseYpan: undefined,
                    mouseMoveFunction: undefined };

    theMap.sliderPosition = 200; // 200 is full zoom out (county wide zoom level).

    theMap.resetMapOnErrorSliderPosition = 200;

    theMap.zoomSliderStyle = $( 'zoom_slider' ).style;
    theMap.zoom_slider_container_styleTop = $( 'zoom_slider_container' ).getBoundingClientRect().top;

    theMap.markersArray = [];

    theMap.state = { panning: false, zooming: false, waitingForAjax: false, waitingForImage: false, lineDrawingMode: false };

    theMap.optionsReference = theMap.parameters.OPTIONS_CHECK_MARK_DEFAULTS;

    theMap.tempTransformText = '';
    theMap.tempTransformString = '';

    theMap.CSSTRANSFORM = theMap.utilities_module.testProp( ['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform'] );

    theMap.BROWSER_IS_CHROME = /Chrome/.test( navigator.userAgent );

    theMap.MOUSE_WHEEL_EVT = ( /Firefox/i.test( window.navigator.userAgent ) )? "DOMMouseScroll" : "mousewheel";

    theMap.onPopState = undefined;

    theMap.infoFromUrl = false;

    theMap.drawingALine = false;

    theMap.boxZoom = undefined; // Holds boxZoom element.

    theMap.zoomAllTheWayOut = theMap.zoom_module.zoomAllTheWayOut;

    theMap.throttleResize = undefined;

    theMap.parsedXMLFromServer = undefined;

    theMap.mainAjaxHTTPRequest = new XMLHttpRequest();

    theMap.addMapLoadListener = theMap.mapControl_module.addFuncTo_mapLoadFuncArray;
    theMap.removeMapLoadListener = theMap.mapControl_module.removeFuncFrom_mapLoadFuncArray;

    theMap.resetMapOnError = theMap.mapControl_module.resetMapOnError;

    theMap.calcBezier = theMap.utilities_module.UnitBezier(0,0,0.25,1);

    theMap.utils = theMap.utilities_module;

var main = function (){
    var theMap = window.theMap,
        $ = window.$;

    if ( theMap.parameters.PANNING_ANIMATION_TRUE_OR_FALSE ){

        theMap.pan.mouseMoveFunction = theMap.mapControl_module.mapDragAndAnimation;
    } else {

        theMap.pan.mouseMoveFunction = theMap.mapControl_module.mapDragOnly;
    }

    theMap.utilities_module.calculateMaxWidthHeight();

    theMap._width  = theMap.resizedMapWidth;
    theMap._height = theMap.resizedMapHeight;

    document.body.addEventListener( theMap.MOUSE_WHEEL_EVT , function( e ){

        e.preventDefault();
        e.stopPropagation();
    }, false );

    // Check the url and see if there is any information in it.
    if (  window.location.search !== ''  ){

        theMap.utilities_module.getInfoFromUrl();
    }

    // If the panning animation is turned off, remove the slider from the options panel.
    if ( !theMap.parameters.PANNING_ANIMATION_TRUE_OR_FALSE ){

        $( 'panning_control_row' ).parentNode.removeChild( $( 'panning_control_row' ) );
    }

    // addPageHasFocusClickHandling() makes it so when the person clicks out of the browser or tab and then
    // clicks back in, they won't inadvertently create an unwanted parcel marker, when what they really
    // wanted was just to get focus back on the map so they can zoom or what ever they wanted to do.
    theMap.utilities_module.addPageHasFocusClickHandling();

    theMap.addMapLoadListener( 'Runs on first map load, remove banner, show small county svg ect., removes itself on first load.', window.theMap, theMap.utilities_module.firstMapLoad );

    theMap.options_module.init();
    theMap.citiesTownsSvg_module.init();
    theMap.smallCountySvg_module.init();

    theMap.drawLine = new DrawSVGLine_module( theMap );
    theMap.drawLine.init();

    //theMap.measureSvgLine_module2.init();
    theMap.measureLine = new MeasureSvgLine_module( theMap );
    theMap.measureLine.init('measureLine_CheckMark');

    theMap.infoSearch_module.init();

    window.onpopstate = theMap.utilities_module.popStateHandler;

    $( 'zoom_slider' ).style.top = theMap.sliderPosition +'px';

    theMap.zoom_module.zoomToStatePlaneXY( theMap.presentMinX, theMap.presentMaxX, theMap.presentMinY, theMap.presentMaxY );
    //theMap.utilities_module.makeArcXMLRequest( theMap.presentMinX, theMap.presentMaxX, theMap.presentMinY, theMap.presentMaxY );
};

window.onresize = function( e ){

    window.clearTimeout( theMap.throttleResize );
    theMap.throttleResize = setTimeout( function(){ theMap.utilities_module.handleResize(); }, 500 );
};

window.onload = window.main;