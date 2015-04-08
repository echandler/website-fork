
theMap.smallCountySvg_module = function(){
// The svg was made on a monitor that had an innerWidth of 1680 and innerHeight
// of 927.

var theMap = window.theMap,
    snohomishCountyCoords = {  MINX: 1245006.735392857,
                              MAXX: 1622342.497,
                              MINY: 275624.10969642834,
                              MAXY: 484507.123089286,
                              WIDTH: 377335.76160714286,
                              HEIGHT: 208883.01339285763 },
    smallCountySvgParent = window.$( 'small_county_svg' );

   function private_smallCountyZoom( e ){
      var width = undefined, height = undefined,
         clientRect = this.getBoundingClientRect();
         delta = ( ( e.wheelDelta )? e.wheelDelta: ( evt = ( window.event || e ), evt.detail * - 120 ) );

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if( delta <= -120 ){
        width = clientRect.width - ( 90 * ( clientRect.width/400 ) );
        height = ( width * 0.55 );
      } else if( delta >= 120 ){
        width = clientRect.width + 90;
        height = ( width*0.55 );
      }
      if( e.clientX < clientRect.right - width ){ return; }
      if( e.clientY < clientRect.bottom - height ){ return; }
      if( width < 20 ){ width = 20; height = ( 20*0.55 );}
      this.style.width = width +'px';
      this.style.height = height +'px';
  }

  var private_mouseMove = function( e ){
    var left = e.clientX - this.leftt - this.offSetLeft;
    var leftRatio = left/this.widthh;
    var spotX = 1680 * leftRatio;
    var top = e.clientY - this._top  - this.offSetTop;
    var topRatio = top / this.heightt;
    var spotY = 927 * topRatio;
    this.box.data.x = spotX+this.box.data.offsetX;
    this.box.data.y = spotY+this.box.data.offsetY;
    this.box.setAttribute( 'x', this.box.data.x -this.box.data.offsetX );
    this.box.setAttribute( 'y', this.box.data.y-this.box.data.offsetY );
  }.bind( smallCountySvgParent );

  var private_mouseDown = function( e ){
      e.preventDefault();
      this.style.cursor = 'pointer';
      //this.clientRect = this.getBoundingClientRect();
      this.heightt = +this.style.height.replace(/px/,'' );
      this.widthh = +this.style.width.replace(/px/,'' );
      this.leftt = window.theMap.resizedMapWidth - (+this.style.right.replace(/px/,'' ) + this.widthh );
      this._top  = window.theMap.resizedMapHeight - (+this.style.bottom.replace(/px/,'' ) + this.heightt );
      this.offSetLeft = e.clientX - this.box.getBoundingClientRect().left;
      this.offSetTop = e.clientY - this.box.getBoundingClientRect().top;
      this.addEventListener( 'mousemove', private_mouseMove );
      document.addEventListener( 'mouseup', private_mouseUp );
  }.bind( smallCountySvgParent );

  var private_mouseUp = function( e ){
      var countyWidth = snohomishCountyCoords.MAXX-snohomishCountyCoords.MINX,
          countyHeight = snohomishCountyCoords.MAXY - snohomishCountyCoords.MINY,
          leftRatio = this.box.data.x / 1680,
          rightRatio = ( this.box.data.x + this.box.data.width ) / 1680,
          topRatio = this.box.data.y / 927,
          bottomRatio = ( this.box.data.y + this.box.data.height ) / 927,
          minX = ( countyWidth* leftRatio ) + snohomishCountyCoords.MINX,
          maxX = ( countyWidth* rightRatio )+ snohomishCountyCoords.MINX,
          minY = snohomishCountyCoords.MAXY - ( countyHeight * topRatio ),
          maxY = snohomishCountyCoords.MAXY - ( countyHeight * bottomRatio );

      this.removeEventListener( 'mousemove', private_mouseMove );
      document.removeEventListener( 'mouseup', private_mouseUp );
      this.style.cursor = 'default';
      theMap.ArcXML_module.makeArcXMLRequest( minX, maxX,  minY, maxY );
  }.bind( smallCountySvgParent );

  var smallCountySvgReCalc = function(){
      var widthPercent = 1680 / snohomishCountyCoords.WIDTH,
          heightPercent = 927 / snohomishCountyCoords.HEIGHT,
          mainMapHeightRatio = this.theMap.resizedMapHeight / this.theMap.resizedMapWidth,
          mainMapWidthRatio = this.theMap.resizedMapWidth / this.theMap.resizedMapHeight,
          minX = ( ( this.theMap.presentMinX - snohomishCountyCoords.MINX ) * widthPercent ),
          maxX = ( ( this.theMap.presentMaxX - snohomishCountyCoords.MINX ) * widthPercent ),
          minY = ( ( snohomishCountyCoords.MAXY - this.theMap.presentMinY ) * heightPercent ),
          maxY = ( ( snohomishCountyCoords.MAXY - this.theMap.presentMaxY ) * heightPercent ),
          arrayOfSmallCountyMarkers = [];
 
    this.box.data.x = minX;
    this.box.data.y = maxY;
    this.box.data.width = maxX - minX;
    this.box.data.height = this.box.data.width * mainMapHeightRatio;
    this.box.style.visibility = '';
    this.box.data.offsetX = 0;
    this.box.data.offsetY = 0;
    if(  this.box.data.width * this.box.data.height < ( 75*75 ) ){
      if( this.box.data.width > this.box.data.height ){
        var w = 90;//TODO: put these variables at the top or something.
        var x = this.box.data.x - ( ( w / 2 ) - ( this.box.data.width / 2 ) );
        this.box.data.offsetX = ( ( w / 2 ) - ( this.box.data.width / 2 ) ); 
        var h = ( 90 * mainMapHeightRatio );
        var y = this.box.data.y -( ( h/2 ) - ( this.box.data.height/2 ) );
        this.box.data.offsetY = ( ( h/2 ) - ( this.box.data.height/2 ) );
        this.box.setAttribute( 'x', x );
        this.box.setAttribute( 'y', y );
        this.box.setAttribute( 'width', w );
        this.box.setAttribute( 'height', h );
      } else {
        var w = 90 * mainMapWidthRatio;
        var x = this.box.data.x - ( ( w/2 ) - ( this.box.data.width/2 ) );
        this.box.data.offsetX = ( ( w/2 ) - ( this.box.data.width/2 ) );
        var h = 90;
        var y = this.box.data.y -( ( h/2 ) - ( this.box.data.height/2 ) );
        this.box.data.offsetY = ( ( h/2 ) - ( this.box.data.height/2 ) );
        this.box.setAttribute( 'x', x );
        this.box.setAttribute( 'y', y );
        this.box.setAttribute( 'width', w );
        this.box.setAttribute( 'height', h );
      }
    }else{
      this.box.setAttribute( 'x', this.box.data.x );
      this.box.setAttribute( 'y', this.box.data.y );
      this.box.setAttribute( 'width', this.box.data.width );
      this.box.setAttribute( 'height', this.box.data.height );
    }
    if( theMap.sliderPosition !== 200 ){
       this.box.style.visibility = '';
     }else {
       this.box.style.visibility = 'hidden';
    }
    if( this.theMap.optionsReference.showSatelliteView_CheckMark ){
      this.box.style.fill = 'rgb( 93, 141, 195 )';
      this.g.style.fill = 'white';
      if( !this.mouseIsOver ){
        this.g.style.fillOpacity = '0.5';
      }
    } else { 
      this.box.style.fill = '';
      this.g.style.fill = '';
      this.g.style.fillOpacity = '';
    }
    arrayOfSmallCountyMarkers = this.querySelectorAll( 'path.smallCountyMarker' );
    for( var m = 0; m < arrayOfSmallCountyMarkers.length; ++m ){
      arrayOfSmallCountyMarkers[m].style.fill = this.box.style.fill;
    }
  }.bind( smallCountySvgParent );

  var smallCountySvgResize = function(){
      var miniFooterTop = +window.$( 'mini_footer' ).getBoundingClientRect().height,
          width = this.theMap.resizedMapWidth * 0.10,
          height = width * 0.5517857142857143, // 927/1680 is the viewBox coordinates, also the resolution of the monitor I was working on.
          bottom = ( this.theMap.resizedMapHeight * 0.05 ) + miniFooterTop,
          right = this.theMap.resizedMapWidth * 0.03;

      this.style.width = width +'px';
      this.style.height = height +'px';
      this.style.right = right +'px';
      this.style.bottom = bottom +'px';
  }.bind( smallCountySvgParent );

  var init = function(){
      this.smallCountySvg.addEventListener( window.theMap.MOUSE_WHEEL_EVT , private_smallCountyZoom );
      this.smallCountySvg.addEventListener( 'mouseover', function(){ 
        this.mouseIsOver = true;
        this.g.style.fillOpacity = '1'; 
      });
      this.smallCountySvg.addEventListener( 'mouseout', function(){ 
        if( window.theMap.optionsReference.showSatelliteView_CheckMark ){
          this.g.style.fillOpacity = '0.5';
        } else {
          this.g.style.fillOpacity = '1';
        }
        this.mouseIsOver = false;
      });
      theMap.addMapLoadListener( 'Recalculates the transparent square on the mini county map', window, smallCountySvgReCalc );
      this.smallCountySvg.clientRect = undefined;
      this.smallCountySvg.offSetLeft = undefined;
      this.smallCountySvg.offSetTop = undefined;
      this.smallCountySvg.mouseIsOver = false;
      this.smallCountySvg.theMap = theMap;
      this.smallCountySvg.g = this.smallCountySvg.querySelector( 'g' );
      this.smallCountySvg.box = this.box;
      this.box.addEventListener( 'mousedown', private_mouseDown );
      this.box.data = { x: undefined, y: undefined, width: undefined, height: undefined, offsetX: 0, offsetY: 0 };
      smallCountySvgResize();
  }.bind( { box: window.$( 'svg_rect' ), smallCountySvg: smallCountySvgParent });

  function smallCountySvgMakerMaker( arg_coords ){
        var parent = smallCountySvgParent,
            box = window.$( 'svg_rect' ),
            path = undefined,
            startPoint = private_smallCountySvgCalculateStartPosition( arg_coords.x, arg_coords.y, 7, -20 );

        path = document.createElementNS( "http://www.w3.org/2000/svg", 'path' );
        path.setAttribute( 'd', 'm'+ startPoint +' 47.58421,-0.62759 -0.10833,-57.1194 -109.3743,-0.0217 0.44382,58.5263 48.65192,-0.12627 6.19026,19.87617 z' );
        path.setAttribute( 'style', 'fill:'+ box.style.fill );
        path.setAttribute( 'class', 'smallCountyMarker' );
        path.setAttribute( 'id', 'smallCountyMarker'+ arg_coords.id );
        parent.insertBefore( path, box );
  }

  var private_smallCountySvgCalculateStartPosition = function( arg_spX, arg_spY, arg_offsetWidth, arg_offsetHeight ){
      var leftt = 0,
          topp = 0,
          countyWidth = 1680, countyHeight = 927,
          xMultiplier = ( snohomishCountyCoords.MAXX - snohomishCountyCoords.MINX ) / countyWidth,
          yMultiplier = ( snohomishCountyCoords.MAXY - snohomishCountyCoords.MINY ) / countyHeight;

      leftt = ( ( ( arg_spX - snohomishCountyCoords.MINX ) / xMultiplier ) + arg_offsetWidth );
      topp  = ( ( snohomishCountyCoords.MAXY - arg_spY ) / yMultiplier ) + arg_offsetHeight;
      return leftt +','+ topp;
  }; 

      return {
          smallCountySvgMakerMaker: smallCountySvgMakerMaker,
          smallCountySvgResize: smallCountySvgResize,
          init: init,
          smallCountySvgReCalc: smallCountySvgReCalc,
        };
}()

// TODO: normalize the "box" here and the DOM (ie it's id ect.);
