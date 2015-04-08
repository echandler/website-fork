
var svgFeatures = function () {
  var layers = {};
  var streetNameGroup = document.createElementNS( "http://www.w3.org/2000/svg", "g" );
  var streetsGroup    = document.createElementNS( "http://www.w3.org/2000/svg", "g" );
  var streetsContainer = document.createElementNS( "http://www.w3.org/2000/svg", "g" );

  (function init() {
    var svg_container = document.getElementById('theMap_svg_container');

    // Make the filter for the sattallite view. http://stackoverflow.com/questions/14386642/if-two-partially-opaque-shapes-overlap-can-i-show-only-one-shape-where-they-ove
    var filter = document.createElementNS( "http://www.w3.org/2000/svg", "filter" );
    var fecomponent = document.createElementNS( "http://www.w3.org/2000/svg", "feComponentTransfer" );
    var fefunca = document.createElementNS( "http://www.w3.org/2000/svg", "feFuncA" );

    filter.setAttribute('id', 'constantOpacity');

    fefunca.setAttribute('type', 'table');
    fefunca.setAttribute('tableValues', '0 .2 .2');

    fecomponent.appendChild(fefunca);
    filter.appendChild(fecomponent);

    svg_container.appendChild(filter);

    // Make the layers for the different roads
    var layerOrderArray = [0,9,8,7,6,5,4,3,2,1];
    
    for (var n = 0; n < layerOrderArray.length; ++n) {

      layers[layerOrderArray[n]] = document.createElementNS( "http://www.w3.org/2000/svg", "g" );
      layers[layerOrderArray[n]].id = 'layer_'+ layerOrderArray[n];

      streetsGroup.appendChild(layers[layerOrderArray[n]]);
    }

    streetsContainer.appendChild(streetsGroup);
    streetsContainer.appendChild(streetNameGroup);

    svg_container.appendChild(streetsContainer);
  })();

  var convertSPtoScreenPoints = function (x,y) {
    var xMultiplier = ( this.presentMaxX - this.presentMinX ) / this.resizedMapWidth, // For paths.
        yMultiplier = ( this.presentMaxY - this.presentMinY ) / this.resizedMapHeight; // For paths.
    
    return ( ( x - this.presentMinX  ) / xMultiplier + this.currentMapImg._left ) +','+ ( ( this.presentMaxY - y ) / yMultiplier + this.currentMapImg._top ) +' ';
  }.bind(theMap)

  function getMapInfo (arg_coords) {
    

   // parcelInfo(arg_coords);
    streetInfo(arg_coords);
    //waterInfo(arg_coords);
  }

  var streetInfo = function ( arg_coords ) {

    // 'this' equals the marker body.
    var minX = arg_coords.x, maxX = arg_coords.X, minY = arg_coords.y, maxY = arg_coords.Y,
        scale  = ( ( ( maxX - minX ) / theMap.mapContainer.offsetWidth ) * 96 * 12 ),
        sliderPositionNumber = theMap.ZOOM_POWER_NUMBER[theMap.sliderPosition],
        streetXML = '<?xml version="1.0" encoding="UTF-8" ?>'
                  + '<ARCXML version="1.1">'
                  + '<REQUEST>'
                  + '<GET_FEATURES outputmode="newxml" envelope="false" geometry="true" compact="true" featurelimit="100000">'
                  + '<LAYER id="6" />'
                  + '<SPATIALQUERY subfields="#SHAPE# MAJRD_TYPE FULLNAME">' // FULLNAME
                  + '<SPATIALFILTER relation="area_intersection">'
                  + '<ENVELOPE maxy="' + maxY + '" maxx="' + maxX + '" miny="' + minY + '" minx="' + minX + '"/>'
                  + '</SPATIALFILTER>'
                  + '</SPATIALQUERY>'
                  + '</GET_FEATURES>'
                  + '</REQUEST>'
                  + '</ARCXML>',
    
        streetXMLPostRequest = window.encodeURIComponent( "ArcXMLRequest" ) + "=" + encodeURIComponent( streetXML ),
        streetUrl = theMap.parameters.URL_PREFIX + theMap.parameters.PROPERTY_INFO_URL,
        streetInfoAjax = new XMLHttpRequest();

    if (sliderPositionNumber >= 6) {
      streetNameGroup.textContent = '';

      for(var u in layers) {

        layers[u].textContent = '';
      }

      return; // Don't load the street information.
    }
    var obj = { 
                info: streetInfoAjax,
                color: 'rgb(210,210,210)',
                width: Math.round( (170 / ( scale / 96 /*dpi*/)) + ( sliderPositionNumber < 5? 2: 1 ) ) + 2,
                textSize: Math.round( (40 / ( scale / 96 /*dpi*/) ) ) + 9,
                street: true,
              };
    streetInfoAjax.onload = function () {

      if(/\d\d\d\.\d\d\d/.test(streetInfoAjax.responseText)) {

        if (theMap.state.waitingForAjax) {
        
          theMap.addMapLoadListener(
            "street loader",         // description 
            theMap,                  // this
            function streetLoader() { // function to run.
              private_ajaxOnload( obj );

              theMap.removeMapLoadListener(streetLoader);
            }
          );
        } else {
        
          private_ajaxOnload( obj );
        }
      } else {
        streetInfoAjax.onerror();
      }
    };

    streetInfoAjax.onerror = function () {
      streetNameGroup.textContent = '';

      for(var u in layers) {

        layers[u].textContent = '';
      }

      if (!/<FEATURECOUNT count="0" hasmore="false" \/>/.test(streetInfoAjax.responseText)) {
       
        alert('There was an error loading the road/highway information.');
      }
    }

    streetInfoAjax.open( "POST", streetUrl, true );
    streetInfoAjax.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
    streetInfoAjax.send( streetXMLPostRequest );
  };



  

var private_ajaxOnload = function (arg_info) {
    var arcXML = arg_info.info.responseText.match(/<ARCXML[\s\S]+?<\/ARCXML>/);
    var DOM = undefined;
    var satelliteView = theMap.optionsReference.showSatelliteView_CheckMark;
    
    if( arcXML && arcXML[0]) {

      DOM = (new DOMParser()).parseFromString(arcXML[0], 'text/xml');
    } else {

      return;
    }

    // Delete the old roads and text.
    streetNameGroup.textContent = '';

    for(var u in layers) {

      layers[u].textContent = '';
    }

    var features = DOM.querySelectorAll('FEATURE');

    if (satelliteView){

      streetsGroup.setAttribute('filter', 'url(#constantOpacity)');
    } else {

      streetsGroup.setAttribute('filter', '');
    }

    var coords = undefined;
    var points = undefined;
    var path = undefined;
    var text = undefined;
    var textPath = undefined;
    var streets = {};
    var m = undefined;
    var q = undefined;

      for (m = 0; m < features.length; ++m) {

        if(features[m].querySelector('FIELD:last-child').getAttribute('value')) {
        
          streets[features[m].querySelector('FIELD:last-child').getAttribute('value')] = { coords: [], type: '' };
        }
      }

      for (m = 0; m < features.length; ++m) {
        
        if(features[m].querySelector('FIELD:last-child').getAttribute('value')) {

          streets[features[m].querySelector('FIELD:last-child').getAttribute('value')]
            .coords.push(features[m].querySelector('COORDS').textContent);

          streets[features[m].querySelector('FIELD:last-child').getAttribute('value')]
            .type = features[m].querySelector('FIELDS').childNodes[1].getAttribute('value');
        }
      }

    var keys = Object.keys(streets);
    var num = 0;
    var width = undefined;
    var pathCoords =  undefined;
    var textIsUpsideDown = undefined; 

    for (q = 0; q < keys.length; ++q) {

      for ( m= 0; m < streets[keys[q]].coords.length; (++m, ++num)) { // Increment num at same time.

        coords = streets[keys[q]].coords[m].split(';'); //features[m].querySelector('COORDS').innerHTML.split(';');
       
        path = document.createElementNS( "http://www.w3.org/2000/svg", "path" );
        
        width = arg_info.width;

        switch (streets[keys[q]].type) {
          case '0':               break; // normal roads
          case '1': width *= 2.0; break;  // interstate
          case '2': width *= 1.5; break;
          case '3': width *= 1.5; break;
          case '4': width *= 1.0; break;
          case '9': width *= 0.5; break;  // ramps
        }

        points = ("M"+ convertSPtoScreenPoints(coords[0].split(' ')[0], coords[0].split(' ')[1]));

        for (var n = 1; n < coords.length; ++n) {

          points += "L"+ convertSPtoScreenPoints(coords[n].split(' ')[0], coords[n].split(' ')[1]);
        }

        path.setAttribute('d', points);
        path.setAttribute('id', 'street_'+ num);
        path.setAttribute('stroke-width', width+'px');
        path.setAttribute('class', 'road_'+ streets[keys[q]].type );
        layers[streets[keys[q]].type].appendChild(path);
        
        // Insert Street Names
        if ( streets[keys[q]].coords.length === 1 || 
            (m >= (streets[keys[q]].coords.length / 2) && 
              m < (streets[keys[q]].coords.length / 2 + 1)) ) {

          text = document.createElementNS( "http://www.w3.org/2000/svg", "text" );
          text.setAttribute('font-size',arg_info.textSize);
          text.setAttribute('dy', '4');
          text.setAttribute('class', (satelliteView ? ' road_text_satellite': '') );

          textPath = document.createElementNS( "http://www.w3.org/2000/svg", "textPath" );
          textPath.textContent = keys[q]; //features[m].querySelector('FIELD:last-child').getAttribute('value');
          textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#street_"+ num);
          textPath.setAttribute('startOffset', '25%');

          pathCoords = points.match(/^M\s?(-?\d*).*L\s?(-?\d*)/);  // TODO
          textIsUpsideDown = (pathCoords[1] - pathCoords[2]) > 0; // TODO
          
          if (textIsUpsideDown) { // Reverse coordinates so text is facing correct direction.

            points = points // Split it, filter it, and revese it.
                      .split(' ') 
                      .filter(function (ele) { 
                        return ele !== '';
                      })
                      .reverse();

            points[0] = points[0].replace(/L/,'M');
            points[points.length-1] = points[points.length-1].replace(/M/,'L');

            path.setAttribute('d', points.join(' '));
          }
          
          text.appendChild(textPath);
          streetNameGroup.appendChild(text);
        }
      }
    }
  };

  return {
    getMapInfo:getMapInfo,
    streetInfo: streetInfo,
  };

}();

/*errors:
----------------------- Network IO error
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=Cp1252"><HTML><HEAD><TITLE>Default Form</TITLE><!-- Title must match jsForm.htm's title --><SCRIPT TYPE="text/javascript" LANGUAGE="JavaScript">function passXML() {

var XMLResponse='<?xml version="1.0" encoding="UTF-8"?><ARCXML version="1.1"><RESPONSE><ERROR machine="pmz-arcims" processid="4176" threadid="2640">[ERR2407] (SDE error code -10 ) SE_stream_query_with_info : Network I/O error</ERROR></RESPONSE></ARCXML>';
null(XMLResponse);
}</SCRIPT></HEAD><BODY BGCOLOR="null" onload="passXML()"><FORM ACTION="" METHOD="POST" name="theForm"><!--- <input type="Hidden" name="Form" value="True"> ---><INPUT TYPE="Hidden" NAME="ArcXMLRequest" VALUE=""><INPUT TYPE="Hidden" NAME="JavaScriptFunction" VALUE="parent.MapFrame.processXML"><INPUT TYPE="Hidden" NAME="BgColor" VALUE="null"><INPUT TYPE="Hidden" NAME="FormCharset" VALUE="Cp1252"><INPUT TYPE="Hidden" NAME="RedirectURL" VALUE=""><INPUT TYPE="Hidden" NAME="HeaderFile" VALUE=""><INPUT TYPE="Hidden" NAME="FooterFile" VALUE=""></FORM></BODY></HTML>
-----------------------

---------------------[ERR2408] Connection to SDE is broken.
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=Cp1252"><HTML><HEAD><TITLE>Default Form</TITLE><!-- Title must match jsForm.htm's title --><SCRIPT TYPE="text/javascript" LANGUAGE="JavaScript">function passXML() {

var XMLResponse='<?xml version="1.0" encoding="UTF-8"?><ARCXML version="1.1"><RESPONSE><ERROR machine="pmz-arcims" processid="3280" threadid="2004">[ERR2408] Connection to SDE is broken. Datasource will try to connect on the next request.</ERROR></RESPONSE></ARCXML>';
null(XMLResponse);
}</SCRIPT></HEAD><BODY BGCOLOR="null" onload="passXML()"><FORM ACTION="" METHOD="POST" name="theForm"><!--- <input type="Hidden" name="Form" value="True"> ---><INPUT TYPE="Hidden" NAME="ArcXMLRequest" VALUE=""><INPUT TYPE="Hidden" NAME="JavaScriptFunction" VALUE="parent.MapFrame.processXML"><INPUT TYPE="Hidden" NAME="BgColor" VALUE="null"><INPUT TYPE="Hidden" NAME="FormCharset" VALUE="Cp1252"><INPUT TYPE="Hidden" NAME="RedirectURL" VALUE=""><INPUT TYPE="Hidden" NAME="HeaderFile" VALUE=""><INPUT TYPE="Hidden" NAME="FooterFile" VALUE=""></FORM></BODY></HTML>
--------------------
*/



/*
var waterInfo = function ( arg_coords ) {

    // 'this' equals the marker body.
    var minX = arg_coords.x, maxX = arg_coords.X, minY = arg_coords.y, maxY = arg_coords.Y,

        streetXML = '<?xml version="1.0" encoding="UTF-8" ?>'
                  + '<ARCXML version="1.1">'
                  + '<REQUEST>'
                  + '<GET_FEATURES outputmode="newxml" envelope="false" geometry="true" compact="true" featurelimit="200">'
                  + '<LAYER id="10" />'
                  + '<SPATIALQUERY subfields="#SHAPE#" >' // FULLNAME
                  + '<SPATIALFILTER relation="area_intersection">'
                  + '<ENVELOPE maxy="' + maxY + '" maxx="' + maxX + '" miny="' + minY + '" minx="' + minX + '"/>'
                  + '</SPATIALFILTER>'
                  + '</SPATIALQUERY>'
                  + '</GET_FEATURES>'
                  + '</REQUEST>'
                  + '</ARCXML>',
    
        streetXMLPostRequest = window.encodeURIComponent( "ArcXMLRequest" ) + "=" + encodeURIComponent( streetXML ),
        streetUrl = theMap.parameters.URL_PREFIX + theMap.parameters.PROPERTY_INFO_URL,
        streetInfoAjax = new XMLHttpRequest();

    streetInfoAjax.onload = private_ajaxOnload.bind( this, { 
                                                            info: streetInfoAjax,
                                                            color: '',
                                                            fill: 'rgba(165, 205, 255,0.4)',
                                                            width: 0,
                                                          } );
    streetInfoAjax.open( "POST", streetUrl, true );
    streetInfoAjax.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
    streetInfoAjax.send( streetXMLPostRequest );
  };

  

  var private_ajaxOnload_old = function (arg_info) {
    var arcXML = arg_info.info.responseText.match(/<ARCXML[\s\S]+?<\/ARCXML>/);
    if( arcXML && arcXML[0]) {
      var z = (new DOMParser).parseFromString(arcXML[0], 'text/xml');
    } else {
      return;
    }
    window.tt = z;
    var path;
    var arr = [
        { //coords: z.querySelectorAll('COORDS'),
          features: z.querySelectorAll('FEATURE'),
          color: arg_info.color,
          width: arg_info.width,
          fill: arg_info.fill,
         },
    ];

    var container = document.getElementById('theMap_svg_container');

    var coords = undefined;
    var points = undefined;
    var text = undefined;
    var textPath = undefined;
    var streets = {};

    for (var q = 0; q < arr.length; ++q) {

      for (var m = 0; m < arr[q].features.length; ++m) {
        
        streets[arr[q].features[m].querySelector('FIELD:last-child').getAttribute('value')] = '';

      }

      window.qq = [];
      for (var m = 0; m < arr[q].features.length; ++m) {
        if(arr[q].features[m].querySelector('FIELD:last-child').getAttribute('value') == '21st St') {
          window.qq.push(arr[q].features[m].querySelector('COORDS').innerHTML);
        }

        streets[arr[q].features[m].querySelector('FIELD:last-child').getAttribute('value')] += 
          arr[q].features[m].querySelector('COORDS').innerHTML +';';
      }
    }
    console.dir(streets);

    var keys = Object.keys(streets);
    var xy = undefined;
   // for (var q = 0; q < arr.length; ++q) {

     // for (var m = 0; m < arr[q].features.length; ++m) {
      for (var m = 0; m < keys.length; ++m) {
          coords = streets[keys[m]].split(';').reverse().sort(); //arr[q].features[m].querySelector('COORDS').innerHTML.split(';');
          path = document.createElementNS( "http://www.w3.org/2000/svg", "path" );
          text = document.createElementNS( "http://www.w3.org/2000/svg", "text" );
          textPath = document.createElementNS( "http://www.w3.org/2000/svg", "textPath" );
          
          //console.log(coords);

          text.setAttribute('font-size',"10");
          textPath.textContent = keys[m];//arr[q].features[m].querySelector('FIELD:last-child').getAttribute('value');
          textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#"+ m);
          textPath.setAttribute('startOffset', '25%');

          points = ("M"+ c(coords[1].split(' ')[0], coords[1].split(' ')[1]));

          for (var n = 2; n < coords.length; ++n) {
              xy = c(coords[n].split(' ')[0], coords[n].split(' ')[1]);
              
              //if(points.indexOf(xy) === -1) {
               console.log(xy);
                points += " L "+ xy;
              //}
          }
          
          //points += 'z';
          console.log(keys[m]+'\n', points);
          path.setAttribute('d', points);
          path.setAttribute('id',  m);
          path.style.stroke = arr[0].color;
          path.style.strokeWidth = arr[0].width;
          path.style.fill = arr[0].fill || 'transparent';
          
          if (arg_info.onmouseover) {
             path.onmouseover = arg_info.onmouseover;
             path.onmouseout  = arg_info.onmouseout;
          }

          text.appendChild(textPath);

          container.appendChild(path);

          container.appendChild(text);
      }
    //}

    // if(arg_info.street) {

    //   arg_info.street = false;
    //   arg_info.width  = arg_info.width - 2;
    //   arg_info.color  = 'rgba(255,255,255,0.2)';
      
    //   window.tt = z; // TODO: Testing

    //   private_ajaxOnload(arg_info);
    // }
  };

*/