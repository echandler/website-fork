
theMap.overlayMap_module = function(){
    var theMap = window.theMap,
        private_overlayXmlHttp = new XMLHttpRequest(),
        private_xml = undefined,
        private_overlayMapContainer = undefined,
        private_overlayMapImg = undefined,
        private_topDragDiv = undefined,
        private_rightDragDiv = undefined,
        private_bottomDragDiv = undefined,
        private_leftDragDiv = undefined,
        private_tabCoords = undefined;

    function overlayAjax( arg_xmlRequest ){
        var encodedResponse = undefined,
            url = theMap.parameters.URL_PREFIX + theMap.parameters.MAP_URL;

        if( private_overlayMapContainer ){
            private_overlayMapContainer.style.opacity = '0';
        }
        private_overlayXmlHttp.abort();
        private_overlayXmlHttp.onreadystatechange = function(){
            if ( private_overlayXmlHttp.readyState == 4 && private_overlayXmlHttp.status == 200 ){
                if( /error/.test( private_overlayXmlHttp.responseText ) ){ console.log( private_overlayXmlHttp.responseText.match(/\<error.*?\<\/error/i ) )}
                private_xml = ( new DOMParser() ).parseFromString( /<\?xml.*>/g.exec( private_overlayXmlHttp.responseText )[0], "application/xml" );
                private_setOverlayMap();
            }
        }
        encodedResponse = window.encodeURIComponent( 'ArcXMLRequest' ) +'='+ window.encodeURIComponent( arg_xmlRequest );
        private_overlayXmlHttp.open( 'POST', url, true );
        private_overlayXmlHttp.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
        private_overlayXmlHttp.send( encodedResponse );
    }


    function private_setOverlayMap(){
        var xmlOutput = undefined;

         if( !private_overlayMapContainer ){
            private_makeOverlayMap();
        }else {
            xmlOutput = private_xml.getElementsByTagName( "OUTPUT" );
            window.$( 'overlay_map' ).src = xmlOutput[0].getAttribute( 'url' );
            return;
        }
    }

    function private_makeOverlayMap(){
        var theMap = window.theMap,
            tabwidthHeight = ( ( theMap.resizedMapWidth * 0.1 ) < ( theMap.resizedMapHeight * 0.1 ) )? ( theMap.resizedMapWidth * 0.1 ): ( theMap.resizedMapHeight * 0.1 );
            topBottomDivParams = { height: 20, width: tabwidthHeight }, //width = 10%;
            leftRightDivParams = { height: tabwidthHeight, width: 20 }, //height = 10%;
            xmlOutput = private_xml.getElementsByTagName( "OUTPUT" );

        private_tabCoords = { top: 0, bottom: theMap.resizedMapHeight, left: 0, right: theMap.resizedMapWidth};
        private_overlayMapContainer = document.createElement( 'div' );
        private_overlayMapContainer.id = 'overlay_map_container';
        private_overlayMapContainer.style.position = 'absolute';
        private_overlayMapContainer.style.top = theMap._top  + 'px';
        private_overlayMapContainer.style.left= theMap._left + 'px';
        private_overlayMapContainer.style.width = theMap.resizedMapWidth +'px';
        private_overlayMapContainer.style.height = theMap.resizedMapWidth +'px';
        private_overlayMapContainer.style.zIndex = '30';
        //private_overlayMapContainer.style.clip ='rect( 300px, '+ ( private_tabCoords.right-300 ) +'px, '+ ( private_tabCoords.bottom-300 ) +'px, 300px )';// TODO: The height and width are hard coded, they need to be flexible.
        private_overlayMapContainer.style.clip ='rect( '+ ( theMap.resizedMapHeight /2 ) + 'px, '+ ( theMap.resizedMapWidth /2 ) + 'px, '+ ( theMap.resizedMapHeight /2 ) + 'px, '+ ( theMap.resizedMapWidth /2 ) + 'px )';// TODO: The height and width are hard coded, they need to be flexible.
        private_overlayMapContainer.style.transition = 'clip 1s ease, opacity 200ms ease-in';
        private_overlayMapContainer.mouseCoords = {};
        private_overlayMapContainer.addEventListener( ( /Firefox/i.test( window.navigator.userAgent ) )? "DOMMouseScroll" : "mousewheel", function (){
                this.style.opacity = '0';
        });
        private_overlayMapContainer.addEventListener( 'mousedown', function( e ){
            this.addEventListener( 'mousemove', mouseMove );
            this.addEventListener( 'mouseup', mouseUp );
            this.mouseCoords = { x: e.clientX, y: e.clientY };
            function mouseMove( e ){
                this.style.opacity = '0';
                this.removeEventListener( 'mousemove', mouseMove );
                this.removeEventListener( 'mouseup', mouseUp );
            }
            function mouseUp( e ){
                if( !this.mouseCoords.x === e.clientX && !this.mouseCoords.y === e.clientY ){
                    this.style.opacity = '0';
                }
                this.removeEventListener( 'mousemove', mouseMove );
                this.removeEventListener( 'mouseup', mouseUp );
            }
        });
        if( !private_overlayMapImg ){
            private_overlayMapImg = document.createElement( 'img' );
            private_overlayMapImg.id = 'overlay_map';
            //private_overlayMapImg.style.width = '100%';
            //private_overlayMapImg.style.height = '100%';
            private_overlayMapImg.addEventListener( 'load', overLayMapImgFirstLoadAlertMessage ); //This only loads once and displays a message then doesn't load again.
            private_overlayMapImg.addEventListener( 'load', function(){
                this.parentNode.style.opacity = '';
            });
        }
        private_overlayMapImg.addEventListener( 'load', overlayMapImgInitialLoad );// This loades evertime.
        private_overlayMapImg.src = xmlOutput[0].getAttribute( 'url' ); //window.theMap.src;
        private_topDragDiv = document.createElement( 'div' );
            private_topDragDiv.id = 'top_drag_div';
            private_topDragDiv.className = 'overlayMapTabs';
            private_topDragDiv.style.top = private_tabCoords.top +'px';//TODO: This needs to be 1/2 the container height.
            private_topDragDiv.style.left = ( ( private_tabCoords.right / 2 ) - ( topBottomDivParams.width / 2 ) ) + 'px';
            private_topDragDiv.style.width = topBottomDivParams.width +'px';
            private_topDragDiv.style.height = topBottomDivParams.height +'px';
            private_topDragDiv.style.borderRadius = '0px 0px 5px 5px';
            private_topDragDiv.container = private_overlayMapContainer;
            private_topDragDiv.addEventListener( 'mousedown',function( e ){
                this.style.opacity = '0';
                window.addEventListener( 'mousemove', top_dragDiv_mouseMove );
                window.addEventListener( 'mouseup', dragDiv_mouseUp );
                e.preventDefault();
                e.stopImmediatePropagation();
            } );
            private_topDragDiv.innerHTML = window.theMap.parameters.SATELLITE_MAP_YEARS.a.year ;
        private_rightDragDiv = document.createElement( 'div' );
        private_rightDragDiv.id = 'right_drag_div';
        private_rightDragDiv.className = 'overlayMapTabs';
        private_rightDragDiv.style.top = ( ( theMap.resizedMapHeight / 2 ) - ( leftRightDivParams.height / 2 ) ) + 'px';//TODO: This needs to be 1/2 the container height.private_leftDragDiv.style.top;
        private_rightDragDiv.style.left = private_tabCoords.right - 25 +'px';
        private_rightDragDiv.style.width = leftRightDivParams.width +'px';
        private_rightDragDiv.style.height = leftRightDivParams.height +'px';
        private_rightDragDiv.style.borderRadius = '5px 0px 0px 5px';
        private_rightDragDiv.container = private_overlayMapContainer;
        private_rightDragDiv.addEventListener( 'mousedown', function( e ){
            this.style.opacity = '0';
            window.addEventListener( 'mousemove', right_dragDiv_mouseMove );
            window.addEventListener( 'mouseup', dragDiv_mouseUp );
            e.preventDefault();
            e.stopImmediatePropagation();
        });
        private_bottomDragDiv = document.createElement( 'div' );
        private_bottomDragDiv.id = 'bottom_drag_div';
        private_bottomDragDiv.className = 'overlayMapTabs';
        private_bottomDragDiv.style.top = private_tabCoords.bottom - 25 +'px';//TODO: This needs to be 1/2 the container height.
        if ( ( ( ( theMap.resizedMapWidth / 2 ) - ( topBottomDivParams.width / 2 ) ) + 20 )> document.getElementById( 'mini_footer' ).getBoundingClientRect().left ){
            private_tabCoords.bottom = +document.getElementById( 'mini_footer' ).getBoundingClientRect().top - 2 /* 2 is a spacer */;
            private_bottomDragDiv.style.top = ( private_tabCoords.bottom - 25 ) +'px';
        }
        private_bottomDragDiv.style.left = private_topDragDiv.style.left;
        private_bottomDragDiv.style.width = topBottomDivParams.width +'px';
        private_bottomDragDiv.style.height = topBottomDivParams.height +'px';
        private_bottomDragDiv.style.borderRadius = '5px 5px 0px 0px';
        private_bottomDragDiv.container = private_overlayMapContainer;
        private_bottomDragDiv.addEventListener( 'mousedown', function( e ){
            this.style.opacity = '0';
            window.addEventListener( 'mousemove', bottom_dragDiv_mouseMove );
            window.addEventListener( 'mouseup', dragDiv_mouseUp );
            e.preventDefault();
            e.stopImmediatePropagation();
        });
        private_bottomDragDiv.innerHTML = window.theMap.parameters.SATELLITE_MAP_YEARS.a.year;
        private_leftDragDiv = document.createElement( 'div' );
        private_leftDragDiv.id = 'left_drag_div';
        private_leftDragDiv.className = 'overlayMapTabs';
        private_leftDragDiv.style.top = private_rightDragDiv.style.top;
        private_leftDragDiv.style.left = private_tabCoords +'px';
        private_leftDragDiv.style.width = leftRightDivParams.width +'px';
        private_leftDragDiv.style.height = leftRightDivParams.height +'px';
        private_leftDragDiv.style.borderRadius = '0px 5px 5px 0px';
        private_leftDragDiv.container = private_overlayMapContainer;
        private_leftDragDiv.addEventListener( 'mousedown', function( e ){
            this.style.opacity = '0';
            window.addEventListener( 'mousemove', left_dragDiv_mouseMove );
            window.addEventListener( 'mouseup', dragDiv_mouseUp );
            e.preventDefault();
            e.stopImmediatePropagation();
        });
        private_overlayMapContainer.appendChild( private_overlayMapImg );
        private_overlayMapContainer.appendChild( private_leftDragDiv );
        private_overlayMapContainer.appendChild( private_topDragDiv );
        private_overlayMapContainer.appendChild( private_rightDragDiv );
        private_overlayMapContainer.appendChild( private_bottomDragDiv );
        //document.getElementById( 'drag_div' ).apend//appendChild( private_overlayMapContainer );
        theMap.dragDiv.insertBefore( private_overlayMapContainer, window.$( 'theMap_misc_container' ).nextElementSibling );
        var top_dragDiv_mouseMove = function( e ){
            var temp = ( e.clientY - this.theMap.mapContainer._top ) - 10;

            this.overlayMap.removeEventListener( 'mousemove', overLayMap_mouseMove );
            if ( temp < 0 ){ return; }
            if( temp > private_tabCoords.bottom - 50 ){ return; }
            this.private_tabCoords.top = temp;
            this.div.style.top = temp +'px';
            this.div.container.style.clip = this.div.container.style.clip.replace(/(^rect\()-?\d+/, '$1'+ ~~temp );
        }.bind( {theMap: theMap, div: private_topDragDiv, private_tabCoords: private_tabCoords, overlayMap: private_overlayMapImg } );
        
        var right_dragDiv_mouseMove = function( e ){
            var temp = e.clientX - theMap.mapContainer._left + 10;
            this.overlayMap.removeEventListener( 'mousemove', overLayMap_mouseMove );
            if( temp > theMap.resizedMapWidth ){ return; }
            if( temp < private_tabCoords.left + 50 ){ return; }
            this.private_tabCoords.right = temp;
            this.div.style.left = temp - 25 +'px';
            this.div.container.style.clip = this.div.container.style.clip.replace(/(^rect\(-?\d+px,?\s?)-?\d+/, '$1'+ ~~temp );
        }.bind( { theMap: theMap, div: private_rightDragDiv, private_tabCoords: private_tabCoords, overlayMap: private_overlayMapImg } );
        
        var  bottom_dragDiv_mouseMove = function( e ){
            var temp = e.clientY - theMap.mapContainer._top + 10;
            this.overlayMap.removeEventListener( 'mousemove', overLayMap_mouseMove );
            if( temp > theMap.resizedMapHeight ){ return; }
            if( temp < private_tabCoords.top + 50 ){ return; }
            this.private_tabCoords.bottom = temp;
            this.div.style.top = temp - 25 +'px';
            this.div.container.style.clip = this.div.container.style.clip.replace(/(^rect\(-?\d+px,?\s?-?\d+px,?\s?)-?\d+/, '$1'+ ~~temp );
        }.bind( { theMap: theMap, div: private_bottomDragDiv, private_tabCoords: private_tabCoords, overlayMap: private_overlayMapImg } );
        
        var  left_dragDiv_mouseMove = function( e ){
            var temp = ( e.clientX - this.theMap.mapContainer._left )-10;
            this.overlayMap.removeEventListener( 'mousemove', overLayMap_mouseMove );
            if ( temp < 0 ){ return; }
            if( temp > private_tabCoords.right - 50 ){ return; }
            this.private_tabCoords.left = temp;
            this.div.style.left = temp +'px';
            this.div.container.style.clip = this.div.container.style.clip.replace(/-?\d+px(?:\))$/, ~~temp+'px' );
        }.bind( {theMap: theMap, div: private_leftDragDiv, private_tabCoords: private_tabCoords, overlayMap: private_overlayMapImg } );
        
        var dragDiv_mouseUp = function( e ){
            if( ( e.button && e.button ===1 ) || ( e.which && e.which === 2 ) ){ return; }
            window.removeEventListener( 'mousemove', left_dragDiv_mouseMove );
            window.removeEventListener( 'mousemove', top_dragDiv_mouseMove );
            window.removeEventListener( 'mousemove', right_dragDiv_mouseMove );
            window.removeEventListener( 'mousemove', bottom_dragDiv_mouseMove );
            window.$( 'overlay_map' ).addEventListener( 'mousemove', overLayMap_mouseMove  );
            this.topDragDiv.style.opacity    = '1';
            this.rightDragDiv.style.opacity  = '1';
            this.bottomDragDiv.style.opacity = '1';
            this.leftDragDiv.style.opacity   = '1';               
        }.bind( {rightDragDiv: private_rightDragDiv, leftDragDiv: private_leftDragDiv, topDragDiv: private_topDragDiv, bottomDragDiv: private_bottomDragDiv});

        private_overlayMapImg.removeEventListener( 'mousemove', overLayMap_mouseMove );
        var overLayMap_mouseMove = function( e ){
            this.rightDragDiv.style.top   = e.clientY - 30 - this.theMap.mapContainer._top +'px';
            this.leftDragDiv.style.top    = e.clientY - 30 - this.theMap.mapContainer._top +'px';
            this.topDragDiv.style.left    = e.clientX - 30 - this.theMap.mapContainer._left +'px';
            this.bottomDragDiv.style.left = e.clientX - 30 - this.theMap.mapContainer._left +'px';
        }.bind( {theMap: window.theMap, rightDragDiv: private_rightDragDiv , leftDragDiv: private_leftDragDiv, topDragDiv: private_topDragDiv, bottomDragDiv: private_bottomDragDiv});
        private_overlayMapImg.addEventListener( 'mousemove', overLayMap_mouseMove );
    }

    function overlayMapImgInitialLoad(){
        private_overlayMapContainer.style.clip ='rect( 0px, '+ private_tabCoords.right +'px, '+ private_tabCoords.bottom +'px, 0px )';
        window.setTimeout( function( arg_mapContainer ){ 
            arg_mapContainer.style.transition = 'opacity 100ms ease-in';
        }, 1700, private_overlayMapContainer );
        theMap.addMapLoadListener( 'Updates the overlay map top and left coordinates.', theMap, updateTopLeftOnMapLoad );
        this.removeEventListener( 'load', overlayMapImgInitialLoad );
    }

    function updateTopLeftOnMapLoad(){
        overlayMapUpdateTopLeft( theMap._left, theMap._top );
    }
    
    function overLayMapImgFirstLoadAlertMessage(){
        window.setTimeout( function( ){ 
            theMap.utilities_module.simpleMessageBox( '<center style="border-bottom: 1px solid rgba( 93, 141, 195, 0.5 );">Overlay Map</center>'
                                                    +'&nbsp;&nbsp;Use the the four tabs on the sides<br>'
                                                    +'to resize the overlay map.<br>', 'overlayMessage2' );
        }, 1100 );
        this.removeEventListener( 'load', overLayMapImgFirstLoadAlertMessage );
    }
    
    function deleteOverlayMap(){
        if( private_overlayMapContainer ){
            private_overlayMapContainer.parentNode.removeChild( private_overlayMapContainer );
            private_overlayMapContainer = false;
            theMap.removeMapLoadListener( updateTopLeftOnMapLoad );
        }
    }

    function resizeOverlayMapContainer(){
        var tabwidthHeight = undefined,
            topBottomDivParams = undefined, //width = 10%;
            leftRightDivParams = undefined;//height = 10%;

        if( private_overlayMapContainer ){
            tabwidthHeight = ( ( theMap.resizedMapWidth * 0.1 ) < ( theMap.resizedMapHeight * 0.1 ) )? ( theMap.resizedMapWidth * 0.1 ): ( theMap.resizedMapHeight * 0.1 );
            topBottomDivParams = { "height": 20, width: tabwidthHeight }, //width = 10%;
            leftRightDivParams = { height: tabwidthHeight, width: 20 }, //height = 10%;
            private_tabCoords.top = 0;
            private_tabCoords.right = theMap.resizedMapWidth;
            private_tabCoords.bottom = theMap.resizedMapHeight;
            private_tabCoords.left = 0;
            private_topDragDiv.style.cssText += 'height: '+ topBottomDivParams.height +'px; width: '+ topBottomDivParams.width +'px; top: '+ ( private_tabCoords.top )+'px; left: '+ ( ( private_tabCoords.right / 2 ) - ( topBottomDivParams.width / 2 ) ) +'px;';
            private_rightDragDiv.style.cssText += 'height: '+ leftRightDivParams.height +'px; width: '+ leftRightDivParams.width +'px; top: '+ ( ( theMap.resizedMapHeight / 2 ) - ( leftRightDivParams.height / 2 ) ) +'px; left: '+ ( private_tabCoords.right - 25 ) +'px;'; 
            private_bottomDragDiv.style.cssText += 'height: '+ topBottomDivParams.height  +'px; width: '+ topBottomDivParams.width  +'px; top: '+ ( private_tabCoords.bottom - 20 )+'px; left: '+ private_topDragDiv.style.left;
            if ( ( ( ( theMap.resizedMapWidth / 2 ) - ( topBottomDivParams.width / 2 ) ) + 20 ) > document.getElementById( 'mini_footer' ).getBoundingClientRect().left ){
                private_tabCoords.bottom = +document.getElementById( 'mini_footer' ).getBoundingClientRect().top - 2 /* 2 is a spacer */;
                private_bottomDragDiv.style.top = ( private_tabCoords.bottom - 25 ) +'px';
            }
            private_leftDragDiv.style.cssText += 'height: '+ leftRightDivParams.height +'px; width: '+ leftRightDivParams.width +'px; top: '+ private_rightDragDiv.style.top +'; left: '+ private_tabCoords.left +'px;';
            private_overlayMapContainer.style.clip ='rect( 0px, '+ private_tabCoords.right +'px, '+ private_tabCoords.bottom +'px, 0px )';
        }
    }

    function overlayMapUpdateTopLeft( arg_x, arg_y ){
        if( private_overlayMapContainer ){
            private_overlayMapContainer.style.left = arg_x +'px';
            private_overlayMapContainer.style.top = arg_y +'px';
        }
    }

    return {
        overlayAjax: overlayAjax,
        deleteOverlayMap: deleteOverlayMap,
        resizeOverlayMapContainer: resizeOverlayMapContainer,
        overlayMapUpdateTopLeft: overlayMapUpdateTopLeft,
    }
}();