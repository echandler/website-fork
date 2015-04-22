var svg_streets = function () {
  var glob = {
    streetLayers      : {},
    streetNameGroup   : document.createElementNS( "http://www.w3.org/2000/svg", "g" ),
    streetsGroup      : document.createElementNS( "http://www.w3.org/2000/svg", "g" ),
    streetsContainer  : document.createElementNS( "http://www.w3.org/2000/svg", "g" ),
    streetInfoAjax    : new XMLHttpRequest()
  };

  glob.streetInfoAjax.onload = function () {

    if (/\d\d\d\.\d\d\d/.test(glob.streetInfoAjax.responseText)) {

      if (theMap.state.waitingForAjax) {

        theMap.addMapLoadListener("street loader" , theMap,
          function streetLoader() { // function to run when map is done loading.

            theMap.removeMapLoadListener(streetLoader);

            createStreets(theMap.utils.arcXmlDOM(glob.streetInfoAjax.responseText));
          });
      } else {

       createStreets(theMap.utils.arcXmlDOM(glob.streetInfoAjax.responseText));
      }
    } else {

      glob.streetInfoAjax.onerror();
    }
  };

  glob.streetInfoAjax.onerror = function () {

    resetSvgGroups();

    if (!/<FEATURECOUNT count="0" hasmore="false" \/>/.test(glob.streetInfoAjax.responseText)) {

      alert('There was an error loading the road/highway information.');
    }
  };

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

    // Make the glob.streetLayers for the different roads
    var layerOrderArray = [9,0,8,7,6,5,4,3,2,1];

    var n = 0;
    while (n < layerOrderArray.length) {

      glob.streetLayers[layerOrderArray[n]] = document.createElementNS( "http://www.w3.org/2000/svg", "g" );
      glob.streetLayers[layerOrderArray[n]].id = 'layer_'+ layerOrderArray[n];

      glob.streetsGroup.appendChild(glob.streetLayers[layerOrderArray[n]]);
      ++n;
    }

    glob.streetsContainer.appendChild(glob.streetsGroup);
    glob.streetsContainer.appendChild(glob.streetNameGroup);

    svg_container.appendChild(glob.streetsContainer);
  })();

  function getMapInfo (arg_coords) {

   // parcelInfo(arg_coords);
    streetInfo(arg_coords);
    //waterInfo(arg_coords);
  }

  var streetInfo = function ( arg_coords ) {
    var SLIDER_POSITION_NUMBER = theMap.ZOOM_POWER_NUMBER[theMap.sliderPosition];

    var streetXML = '<?xml version="1.0" encoding="UTF-8" ?>'
                  + '<ARCXML version="1.1">'
                  + '<REQUEST>'
                  + '<GET_FEATURES outputmode="newxml" envelope="false" geometry="true" '
                  +                'compact="true" featurelimit="100000">'
                  + '<LAYER id="6" />'
                  + '<SPATIALQUERY subfields="#SHAPE# MAJRD_TYPE FULLNAME">' // FULLNAME
                  + '<SPATIALFILTER relation="area_intersection">'
                  + '<ENVELOPE maxy="' + arg_coords.Y + '" maxx="' + arg_coords.X
                  +         '" miny="' + arg_coords.y + '" minx="' + arg_coords.x + '"/>'
                  + '</SPATIALFILTER>'
                  + '</SPATIALQUERY>'
                  + '</GET_FEATURES>'
                  + '</REQUEST>'
                  + '</ARCXML>';

    var XMLPostRequest = window.encodeURIComponent( "ArcXMLRequest" )
                         +"="+ window.encodeURIComponent( streetXML );

    var url = theMap.parameters.URL_PREFIX + theMap.parameters.PROPERTY_INFO_URL;

    if (SLIDER_POSITION_NUMBER >= 6) {

      resetSvgGroups();

      return; // Don't load the street information.
    }

    // Clear the last request.
    glob.streetInfoAjax.abort();

    glob.streetInfoAjax.open("POST", url, true);
    glob.streetInfoAjax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    glob.streetInfoAjax.send(XMLPostRequest);
  };

  function createStreets(arg_DOM) {
    var FEATURES = arg_DOM.querySelectorAll('FEATURE');
    var SATELLITE_VIEW = theMap.optionsReference.showSatelliteView_CheckMark;
    var SCALE = ((((theMap.presentMaxX - theMap.presentMinX) / theMap.mapContainer.offsetWidth) * 96) * 12);
    var SLIDER_POSITION_NUMBER = theMap.ZOOM_POWER_NUMBER[theMap.sliderPosition];

    var STREET_WIDTH = Math.round((170 / ( SCALE / 96 /*96dpi*/))+(SLIDER_POSITION_NUMBER < 5? 2: 1)) + 2;
    var TEXT_SIZE = Math.round((40 / (SCALE / 96 /*96dpi*/))) + 9;

    if (SATELLITE_VIEW) {

      glob.streetsGroup.setAttribute('filter', 'url(#constantOpacity)');
    } else {

      glob.streetsGroup.removeAttribute('filter');
    }

    var cacheVar = undefined;

    var streets = {};

    // Build up a street object that will be iterated over.
    // This way all the street fragments are combined into one array.
    for (var b = 0; b < FEATURES.length; ++b) {

      cacheVar = FEATURES[b].querySelector(
        '[name="GIS_FEATURES.DBA.TRANSPORTATION_STREETS_GEOCODING.FULLNAME"]')
          .getAttribute('value');

      if (!cacheVar){

        continue;
      }

      streets[cacheVar] = streets[cacheVar] || { coords: [], type: '' };

      streets[cacheVar]
        .coords.push(FEATURES[b].querySelector('COORDS').textContent);

      streets[cacheVar]
        .type = FEATURES[b].querySelector(
          '[name="GIS_FEATURES.DBA.TRANSPORTATION_STREETS_GEOCODING.MAJRD_TYPE"]')
            .getAttribute('value');
    }

    window.tt = streets;

    // Clear the screen of all old streets.
    resetSvgGroups();

    var keys = Object.keys(streets);
    var num = 0;
    var streetWidth = STREET_WIDTH;
    var startOffset = '25%';
    var coords = undefined;

    var points = undefined;
    var path = undefined;
    var text = undefined;
    var textPath = undefined;

    var streetName = undefined;
    var streetsCache = undefined;
    var coordsLen = undefined;


    // var w = 0;
    // while (w < keys.length) {
    //   cacheVar = keys[w];

    //   var p = streets[cacheVar].join(';').split(';');

    //   for(var n = 0; n < p.length; ++n){
    //     for(var g = 0; g < p.length; ++g){

    //       if(g === n) { continue; }
    //       if(p[n] === p[g]){ p.splice(n,1); g = -1; }
    //     }
    //   }
    //   streets[cacheVar].coords = [p.join(';')];
    //   ++w;
    // }

    for (var q = 0; q < keys.length; ++q) {

      streetName = keys[q];
      streetsCache = streets[streetName];
      coordsLen = streetsCache.coords.length;

      for (var m = 0; m < coordsLen; (++m, ++num)) { // <-Increment 'num' and 'm' at same time.

        coords = streetsCache.coords[m].split(';');

        path = document.createElementNS( "http://www.w3.org/2000/svg", "path" );

        streetWidth = STREET_WIDTH;

        startOffset = '25%';

        // Change street width depending on street type.
        switch (streetsCache.type) {

          case '1': { // Interstate eg. I-5, I-405, SR-526 (<-boeing) ect.

            streetWidth *= 2.0;

            if (streetName.indexOf('SR') !== -1) {

              startOffset = '75%';
            }
          } break;

          case '2': { /*let it fall to case '4'.*/ }
          case '3': { /*let it fall to case '4'.*/ }
          case '4': {

            streetWidth *= 1.5;

            if (streetName.indexOf('SR') !== -1) { // Try to prevent name overlap on road

              startOffset = '75%';
            }
          } break;

          case '9': { // Interstate ramps. aka "Ramps".

            streetWidth *= 0.5;
          } break;
        }

        cacheVar = coords[0].split(' ');

        points = ("M"+ theMap.utils.convertSPtoScreenPoints(cacheVar[0], cacheVar[1]));

        for (var n = 1; n < coords.length; ++n) { // Todo: cache .split(' ')'s.

          cacheVar = coords[n].split(' ');

          points += "L"+ theMap.utils.convertSPtoScreenPoints(cacheVar[0], cacheVar[1]);
        }

        path.setAttribute('d', points);
        path.setAttribute('id', 'street_'+ num); // 'num' added for unique name for textpath.
        path.setAttribute('stroke-width', streetWidth +'px');
        path.setAttribute('class', 'road_'+ streetsCache.type );

        glob.streetLayers[streetsCache.type].appendChild(path);

        // Insert Street Names
        if (coordsLen === 1 || (m >= (coordsLen / 2) && m < (coordsLen / 2 + 1))) {

          text = document.createElementNS( "http://www.w3.org/2000/svg", "text" );
          text.setAttribute('font-size', TEXT_SIZE);
          text.setAttribute('dy', '4'); // Does a decent job of centering the text in the svg path.
          text.setAttribute('class', (SATELLITE_VIEW ? ' road_text_satellite': ''));

          textPath = document.createElementNS( "http://www.w3.org/2000/svg", "textPath" );
          textPath.textContent = streetName; //features[m].querySelector('FIELD:last-child').getAttribute('value');
          textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#street_"+ num);
          textPath.setAttribute('startOffset', startOffset);
          textPath.style.cursor = 'pointer';

          textPath.addEventListener('mouseover', makeStreetNameDiv);
          textPath.addEventListener('mouseout' , removeStreetNameDiv);

          coords = points.match(/^M\s?(-?\d*).*L\s?(-?\d*)/); // Find first ([1]) and last ([2]) coordinate.

          // Reverse coordinates so text is facing correct direction.
          if ((+coords[1] - +coords[2]) > 0) { // true === text is upside down.

            points = points // Split it, filter it, and reverse it.
                      .split(' ')
                      .filter(function (ele) {
                        return ele !== '';
                      })
                      .reverse();

            points[0] = points[0].replace(/L/,'M');
            points[points.length - 1] = points[points.length - 1].replace(/M/,'L');

            path.setAttribute('d', points.join(' '));
          }

          text.appendChild(textPath);
          glob.streetNameGroup.appendChild(text);
        }
      }
    }
  };

  function makeStreetNameDiv() {
    var bb = this.getBoundingClientRect(),
        streetNameDiv = document.getElementById('$#streetNameDiv');

    if(!streetNameDiv){

      streetNameDiv           = document.createElement('div');
      streetNameDiv.id        = '$#streetNameDiv';
      streetNameDiv.className = 'streetNameDiv';
    }

    streetNameDiv.style.display = 'block';

    streetNameDiv.style.top  = ((bb.top + bb.bottom)/2) - 14 +'px';
    streetNameDiv.style.left = bb.right + 20 +'px';

    streetNameDiv.innerHTML = this.textContent
                      .replace(/(\d)(th|rd|nd|st) /,
                        '$1'
                        +'<font style="vertical-align: 30%; font-size: 65%; margin-left: 1px;">'
                        +'$2'
                        +'</font> ');

    document.body.appendChild(streetNameDiv);
  }

  function removeStreetNameDiv() {
    var streetNameDiv = document.getElementById('$#streetNameDiv');

    streetNameDiv.style.display = 'none';
  }

  function resetSvgGroups() {
    var keys = Object.keys(glob.streetLayers);

    // Clear all the streets out of the streets group element.
    glob.streetNameGroup.textContent = '';

    // Clear the street paths out of each of the street layers groups.
    for (var n = 0; n < keys.length; n++) {

      glob.streetLayers[keys[n]].textContent = '';
    }
  }

  return {
    getMapInfo: getMapInfo,
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