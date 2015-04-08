
theMap.measureSvgLine_module = function(){
    var theMap = window.theMap,
        private_svgContainer =  window.$( 'theMap_svg_container' ),
        private_Math = window.Math,
        private_doubleClick = false,
        private_doubleClickTimer = undefined,
        private_linesArray = [],
        private_clientX = undefined,
        private_clientY = undefined,
        private_mouseMoveHandler = undefined;
    
    function private_createNewPolyline( e ){
        var polyline = theMap.drawSvgLine_module.PolyLineConstructor( e );

        polyline.feetDivsArray = [];
        polyline.setAttribute( 'class', 'measureLine' );
        private_linesArray.push( polyline );
        polyline.startPoint.onclick = private_startPointOnClick.bind( polyline );
        private_svgContainer.insertBefore( polyline, private_svgContainer.firstElementChild );
        private_svgContainer.appendChild( polyline.startPoint );
        private_mouseMoveHandler = function( e ){
            theMap.private_lasteClientX = e.clientX;
            theMap.private_lasteClientY = e.clientY;
            if( theMap.drawingALine && !theMap.state.panning ){
                this.setAttribute( 'points', this.currentPointsString +' '+ ( e.clientX - theMap.mapContainer._left - theMap.dragDiv._left  ) +','+ ( e.clientY - theMap.mapContainer._top - theMap.dragDiv._top ) );
            }
        }.bind( polyline );
        private_svgContainer.addEventListener( 'mousemove', private_mouseMoveHandler );
    }

    // Feet div constructor, makes the feet signs on the line when the person creates a new vertex or finishes the line.
    function private_FeetDiv( arg_polyline, arg_lastPoint, arg_index ){
        var feetDiv = document.createElement( 'div' ),
            lengthOfLineInFeet = undefined,
            x = undefined,
            y = undefined;

        if ( arg_index ){
            x = private_Math.abs( +arg_polyline.statePlaneCoords[arg_index-1].x - +arg_polyline.statePlaneCoords[arg_index].x );
            y = private_Math.abs( +arg_polyline.statePlaneCoords[arg_index-1].y - +arg_polyline.statePlaneCoords[arg_index].y );
        } else {
            x = private_Math.abs( +arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-2].x - +arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-1].x );
            y = private_Math.abs( +arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-2].y - +arg_polyline.statePlaneCoords[arg_polyline.statePlaneCoords.length-1].y );
        }
        lengthOfLineInFeet = private_Math.round( private_Math.sqrt( private_Math.pow( x, 2 ) + private_Math.pow( y, 2 ) ) );
        if( lengthOfLineInFeet === 0 ){ 
            arg_polyline.currentPointsArray.pop();
            arg_polyline.statePlaneCoords.pop();
            return; 
        }
        feetDiv.className = 'feetDiv';
        feetDiv.addEventListener( 'mousedown', function( e ){ e.stopPropagation(); })
        feetDiv.addEventListener( theMap.MOUSE_WHEEL_EVT , setFeetDivsDisplaytoNone );
        feetDiv.polyline = arg_polyline;
        feetDiv.index = arg_polyline.feetDivsArray.length + 1;// Used to calculate position.
        feetDiv.setPosition = private_positionFeetDiv;
        window.$( 'theMap_misc_container' ).appendChild( feetDiv );
        feetDiv.lengthOfLineInFeet = lengthOfLineInFeet;
        feetDiv.innerHTML = lengthOfLineInFeet.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',' ) + ' ft';
        arg_polyline.feetDivsArray.push( feetDiv );
        if( arg_lastPoint && arg_polyline.feetDivsArray.length > 1 ){
            for( var m = 0, t = 0; m < arg_polyline.feetDivsArray.length; ++m ){
                t += +arg_polyline.feetDivsArray[m].innerHTML.replace(/\D/g,'' );
            }
            feetDiv.innerHTML = feetDiv.innerHTML +'<br><div style="color: grey; margin-top: 5px; font-style: italic;">'+ t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',' ) + ' ft</div>';
        }
        feetDiv.setPosition();
        return feetDiv;
    }

    function private_positionFeetDiv(){
        var x1 = +this.polyline.currentPointsArray[this.index].split( ',' )[0],
            y1 = +this.polyline.currentPointsArray[this.index].split( ',' )[1],
            x2 = +this.polyline.currentPointsArray[this.index-1].split( ',' )[0],
            y2 = +this.polyline.currentPointsArray[this.index-1].split( ',' )[1],
            halfWayBetweenx1Andx2 = ( ( x1 - x2 ) / 2 ) + x2,
            halfWayBetweeny1Andy2 = ( ( y1 - y2 ) / 2 ) + y2,
            feetDivBox = this.getBoundingClientRect();

        // TODO: subtract dragDiv_left then add dragDiv._left?
        this.style.left = halfWayBetweenx1Andx2 - theMap.dragDiv._left + theMap.dragDiv._left  - ( feetDivBox.width / 2 ) +'px';
        this.style.top = halfWayBetweeny1Andy2 - theMap.dragDiv._top + theMap.dragDiv._top  - ( feetDivBox.height / 2 ) +'px';
    }

    function private_startPointOnClick( e ){
        var feetDiv = undefined;

        e.stopPropagation();
        if( !theMap.drawingALine && this.deleteDoubleClick ){
            private_deleteLineFromArray( this );
        } else if( theMap.drawingALine ){
            private_svgContainer.removeEventListener( 'mousemove', private_mouseMoveHandler );
            theMap.drawingALine = false;
            this.endPoint = this.startPoint;
            this.currentPointsArray.push( this.currentPointsArray[0] );
            this.statePlaneCoords.push( this.statePlaneCoords[0] );
            this.setAttribute( 'points', this.currentPointsArray.join( ' ' ) );
            feetDiv = private_FeetDiv( private_linesArray[ private_linesArray.length -1], true );
            if( feetDiv ){
                feetDiv.innerHTML = feetDiv.innerHTML +'<div style="color: grey; margin-top: 5px; font-style: italic; ">'+ ( (+private_polygonArea( this.statePlaneCoords ) ).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',' ) ) + ' ac</div>';
                feetDiv.setPosition();
            } else { // if feetDiv is undefined then there must not be a distance to measure.
                private_deleteLineFromArray( this );
            }
        }
        this.deleteDoubleClick = true;
        window.setTimeout( function(){ this.deleteDoubleClick = false; }.bind( this ), 200 );
    }

    function private_endPointOnClick( e ){
        e.stopPropagation(); 
        if( this.deleteDoubleClick ){
            private_deleteLineFromArray( this );
        }
        this.deleteDoubleClick = true;
        window.setTimeout( function(){ this.deleteDoubleClick = false; }.bind( this ), 200 );
    }

    function private_svgContainerDrawLineClickHandler( e ){
        var currentPointsArray = undefined,
            polyline = private_linesArray[ private_linesArray.length -1 ];

        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        if( !theMap.pageHasFocusForClick ){ // theMap.pageHasFocus was set to true by the theMap.mapControl_module -> private_mouseUp( ).
            theMap.pageHasFocusForClick = true;
            return;
        }
        if( private_clientX !== e.clientX && private_clientY !== e.clientY ){ return; }
        if( !private_doubleClick && !theMap.drawingALine ){
            private_createNewPolyline( e );
            document.body.addEventListener( theMap.MOUSE_WHEEL_EVT, setFeetDivsDisplaytoNone );
            theMap.drawingALine = true;
        } else if( private_doubleClick ){ // The person didn't click the start point.
            window.clearTimeout( private_doubleClickTimer );
            theMap.drawingALine = false;
            private_svgContainer.removeEventListener( 'mousemove', private_mouseMoveHandler );
            polyline.endPoint = theMap.drawSvgLine_module.createEndPoint( e );
            polyline.endPoint.onclick = private_endPointOnClick.bind( polyline );
            private_svgContainer.appendChild( polyline.endPoint );
            if( polyline.feetDivsArray.length > 1 ){
                polyline.feetDivsArray[polyline.feetDivsArray.length-1].innerHTML = polyline.feetDivsArray[polyline.feetDivsArray.length-1].innerHTML +'<br><div style="color: grey; margin-top: 5px; font-style:italic;">'+ private_calculateTotalFeet( polyline.feetDivsArray ).toString( ).replace(/\B(?=(\d{3})+(?!\d ))/g, ',' ) + ' ft</div>';
            }
            polyline.feetDivsArray[polyline.feetDivsArray.length-1].setPosition( );
        } else if( theMap.drawingALine ){
            polyline.currentPointsArray.push( ( e.clientX - theMap.mapContainer._left - theMap.dragDiv._left ) +','+ ( e.clientY - theMap.mapContainer._top - theMap.dragDiv._top ) );
            polyline.currentPointsString = polyline.currentPointsArray.join( ' ' );
            polyline.statePlaneCoords.push( theMap.utilities_module.convertMouseCoordsToStatePlane({ clientX: e.clientX, clientY: e.clientY }) );
            polyline.setAttribute( 'points', polyline.currentPointsString );
            private_FeetDiv( polyline );
        }
        private_doubleClick = true;
        private_doubleClickTimer = window.setTimeout( function( setDoublClickToFalse ){ setDoublClickToFalse( ) }, 200, private_setDoublClickToFalse );
    }

    function private_setDoublClickToFalse( ){
        private_doubleClick = false;
    }

    function createPolylinesFromUrl( arg_linesArray ){
        var polyline = undefined,
            spCoords = undefined,
            feetDiv = undefined,
            drawSvgLine_module = theMap.drawSvgLine_module;

        for( var n = 0; n < arg_linesArray.length; ++n ){
            polyline = drawSvgLine_module.PolyLineConstructor( );
            polyline.startPoint.onclick = private_startPointOnClick.bind( polyline );
            polyline.endPoint = drawSvgLine_module.createEndPoint( );
            polyline.endPoint.onclick = private_endPointOnClick.bind( polyline );
            polyline.setAttribute( 'class', 'measureLine' );
            polyline.feetDivsArray = [];
            for( var t = 0; t < arg_linesArray[n].length; ++t ){
                spCoords = arg_linesArray[n][t].split( ',' );
                polyline.statePlaneCoords.push( { x: +spCoords[0], y: +spCoords[1]} );
            }
            private_linesArray.push( polyline );
            private_svgContainer.insertBefore( polyline, private_svgContainer.firstElementChild.nextElementSibling );
            private_svgContainer.appendChild( polyline.startPoint );
            private_svgContainer.appendChild( polyline.endPoint );
            drawSvgLine_module.resizeOneLine( polyline );// Populates points array for private_positionFeetDiv which is called when making a new feet div.
            for( var v = 1; v < polyline.statePlaneCoords.length; ++v ){// Make the feet divs.
                feetDiv = private_FeetDiv( polyline, false, v-1 ); // Make a new feet div.
                //feetDiv.style.display = 'none';
                newFeetDivX = private_Math.abs( polyline.statePlaneCoords[v-1].x - polyline.statePlaneCoords[v].x );
                newFeetDivY = private_Math.abs( polyline.statePlaneCoords[v-1].y - polyline.statePlaneCoords[v].y );
                feetDiv.innerHTML = ( private_Math.round( private_Math.sqrt( private_Math.pow( newFeetDivX, 2 ) + private_Math.pow( newFeetDivY, 2 ) ) ) ).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',' ) + ' ft';
                if( v === ( polyline.statePlaneCoords.length - 1 ) && polyline.feetDivsArray.length > 1 ){ // Add extra info to last feetDiv.
                    feetDiv.innerHTML = feetDiv.innerHTML +'<br><div style="color: grey; margin-top: 5px; font-style:italic;">'+ private_calculateTotalFeet( polyline.feetDivsArray ).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',' ) + ' ft</div>';
                    if( polyline.statePlaneCoords[0].x === polyline.statePlaneCoords[v].x 
                     && polyline.statePlaneCoords[0].y === polyline.statePlaneCoords[v].y ){ // Add area (acres) to last feetDiv.
                        feetDiv.innerHTML = feetDiv.innerHTML +'<div style="color: grey; margin-top: 5px; font-style:italic;">'+ ( (+private_polygonArea( polyline.statePlaneCoords ) ).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',' ) ) + ' ac</div>';
                    }
                }
                feetDiv.setPosition();
            }
        }
        document.body.addEventListener( theMap.MOUSE_WHEEL_EVT, setFeetDivsDisplaytoNone );
    }

    function resizeLines(){
        var lines = private_linesArray,
            points = [],
            index = 0,
            newFeetDivX = undefined,
            newFeetDivY = undefined,
            drawSvgLine_module = theMap.drawSvgLine_module_module,
            showSatelliteView_CheckMark = theMap.optionsReference.showSatelliteView_CheckMark;
        
        for( var i = 0; i < lines.length; ++i ){
            theMap.drawSvgLine_module.resizeOneLine( lines[i] );
            if( showSatelliteView_CheckMark ){
                lines[i].style.stroke = 'rgb( 225,0,0 )';
            } else {
                lines[i].style.stroke = 'rgb( 93, 141, 195 )';
            }
            points = lines[i].currentPointsArray;
            index = 0;
            while( index < lines[i].feetDivsArray.length ){// position the feetDiv's.
                lines[i].feetDivsArray[index].style.display = '';
                lines[i].feetDivsArray[index].setPosition();
                ++index;
            }
        }
    }

    function private_polygonArea( arg_xyObj ){ //http://www.mathopenref.com/coordpolygonarea2.html
        var area = 0; // Accumulates area in the loop

        for ( i = 1; i < arg_xyObj.length; i++){
            area = area + ( arg_xyObj[i-1].x + arg_xyObj[i].x ) * ( arg_xyObj[i].y - arg_xyObj[i-1].y );
        }
        area = private_Math.abs( area ) / 2;
        area = area / 9 / 4840; // area/(9 feet in a square yard)/(4840 square yards in an acre)
        return area.toFixed( 2 );
    }

    function private_calculateTotalFeet( arg_feetDivsArray ){
        var index = 0,
            total = 0;

        for(; index < arg_feetDivsArray.length; ++index ){
            total += +arg_feetDivsArray[index].lengthOfLineInFeet;
        }
        return total;
    }

    function private_svgContainerDeleteLastVertex( e ){
        var code = undefined,
            polyline = undefined;

        if( theMap.drawingALine && e.srcElement.nodeName !== 'INPUT' ){
            if (!e ) var e = window.event;
            if ( e.keyCode ){ code = e.keyCode; }
            else if ( e.which ){ code = e.which; }
            if ( code == 8 || code == 46 ){ // 8 = BackSpace key, 46 = Delete key
                polyline = private_linesArray[ private_linesArray.length - 1 ];
                if( polyline.currentPointsArray.length > 1 ){
                    polyline.statePlaneCoords.pop();
                    polyline.currentPointsArray.pop();
                    polyline.currentPointsString = polyline.currentPointsArray.join( ' ' );
                    polyline.setAttribute( 'points', polyline.currentPointsString + polyline.getAttribute( 'points' ).replace( /.*( .+ ?)$/, '$1' ) );
                    polyline.feetDivsArray[polyline.feetDivsArray.length-1].parentNode.removeChild( polyline.feetDivsArray[polyline.feetDivsArray.length-1] );
                    polyline.feetDivsArray.pop();
                }
                e.preventDefault();
                return false;
            }
        }
    }

    function private_drawLineSetup(){
        if( window.$( 'measureLine_CheckMark' ).checkedState() ){
            theMap.utilities_module.simpleMessageBox(
                                '<center style="border-bottom: 1px solid rgba( 93, 141, 195, 0.5 );">Measure Distance</center>'
                                +( ( window.$( 'overlay_map' ) )?'<br><center>(Move overlay map out of the way)</center><br>': '' )
                                +'<table><tbody><tr><td valign="top">1)</td><td>Click anywhere to start a line.</td></tr>'
                                +'<tr><td valign="top">2)</td><td>Click anywhere to make a new vertex.</td></tr>'
                                +'<tr><td valign="top">3)</td><td>Press &lt;Backspace&gt; or &lt;Delete&gt; to delete the last vertex.</td></tr>'
                                +'<tr><td valign="top">4)</td><td>Double click anywhere or click the starting point to finish the line.</td></tr>'
                                +'<tr><td valign="top">5)</td><td>Delete a line by double clicking on the start or end points when you are finished.</td></tr>'
                                +'</tbody></table></div>', 'draw_message' );
            private_svgContainer.addEventListener( 'mousedown', private_svg_containerMouseDown );
            private_svgContainer.addEventListener( 'click', private_svgContainerDrawLineClickHandler );
            document.addEventListener( 'keydown', private_svgContainerDeleteLastVertex );
            theMap.state.lineDrawingMode = true;
            document.body.style.cursor = 'crosshair';
        } else {
            if( theMap.drawingALine ){
                theMap.drawingALine = false;
                private_svgContainer.removeEventListener( 'mousemove', private_mouseMoveHandler );
                private_deleteLineFromArray( private_linesArray[ private_linesArray.length - 1 ] );
            }
            private_svgContainer.removeEventListener( 'mousedown', private_svg_containerMouseDown );
            private_svgContainer.removeEventListener( 'click', private_svgContainerDrawLineClickHandler );
            document.removeEventListener( 'keydown', private_svgContainerDeleteLastVertex );
            theMap.state.lineDrawingMode = false;
            document.body.style.cursor = '';
            try{
                window.$( 'draw_message' ).parentNode.removeChild( window.$( 'draw_message' ) );
            }catch( e ){}
        }
    }

    function private_svg_containerMouseDown( e ){
        //theMap.drawingALine = false;
        private_clientX = e.clientX;
        private_clientY = e.clientY;
        var mouseUp = function( e ){
            //this.drawingALine = true;
            document.body.removeEventListener( 'mouseup', mouseUp );
        }.bind( theMap );
        document.body.addEventListener( 'mouseup', mouseUp );
    }

    function private_deleteLineFromArray( arg_line ){
        var array = private_linesArray,
            len = array.length
            m = 0;

        arg_line.startPoint.parentNode.removeChild( arg_line.startPoint );
        if( arg_line.endPoint && arg_line.endPoint.parentNode ){
            arg_line.endPoint.parentNode.removeChild( arg_line.endPoint );            
        }
        arg_line.parentNode.removeChild( arg_line );        
        for( ; m < len; ++m ){
            if( arg_line === array[m] ){
                private_linesArray.splice( m, 1 );
                break;
            }
        }

        // Delete the feetDivs from the DOM and reset feetDivsArray
        for( m = arg_line.feetDivsArray.length-1; m > -1; --m ){
            arg_line.feetDivsArray[m].parentNode.removeChild( arg_line.feetDivsArray[m] );
            arg_line.feetDivsArray.splice( m, 1 );
        }
        if( private_linesArray.length === 0 ){
            document.body.removeEventListener( theMap.MOUSE_WHEEL_EVT, setFeetDivsDisplaytoNone );
        }
    }

    var setFeetDivsDisplaytoNone = function(){
        var m = 0,
            n = 0;

        for( m = 0; m < this.length; ++m ){
            for( n = 0; n < this[m].feetDivsArray.length; ++n ){
                this[m].feetDivsArray[n].style.display = 'none';
            }
        }
    }.bind( private_linesArray );

    function init(){
        window.$( 'measureLine_Label' ).addEventListener( 'click', private_drawLineSetup );
        window.$( 'measureLine_CheckBox' ).addEventListener( 'click', private_drawLineSetup );
        theMap.addMapLoadListener( 'Resizes the measuring lines when the map loads', window, resizeLines );
    }

    return {
        resizeLines: resizeLines,
        init: init,
        createPolylinesFromUrl: createPolylinesFromUrl,
        setFeetDivsDisplaytoNone: setFeetDivsDisplaytoNone,
    };
}()