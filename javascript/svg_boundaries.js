var parcelInfo = function ( arg_coords ) {

    // 'this' equals the marker body.
    var minX = arg_coords.x, maxX = arg_coords.X, minY = arg_coords.y, maxY = arg_coords.Y,

        streetXML = '<?xml version="1.0" encoding="UTF-8" ?>'
                  + '<ARCXML version="1.1">'
                  + '<REQUEST>'
                  + '<GET_FEATURES outputmode="newxml" envelope="false" geometry="true" compact="true" featurelimit="100000">'
                  + '<LAYER id="11" />'
                  + '<SPATIALQUERY subfields="#SHAPE#">' // FULLNAME
                  + '<SPATIALFILTER relation="area_intersection">'
                  + '<ENVELOPE maxy="' + maxY + '" maxx="' + maxX + '" miny="' + minY + '" minx="' + minX + '"/>'
                  + '</SPATIALFILTER>'
                  + '</SPATIALQUERY>'
                  + '</GET_FEATURES>'
                  + '</REQUEST>'
                  + '</ARCXML>',
    
        streetXMLPostRequest = window.encodeURIComponent( "ArcXMLRequest" ) + "=" + encodeURIComponent( streetXML ),
        streetUrl = theMap.parameters.URL_PREFIX + theMap.parameters.PROPERTY_INFO_URL,
        streetInfoAjax = new XMLHttpRequest(),
        responseObj = {
          info: streetInfoAjax,
          color: '#bbb',
          width: 1,
          onmouseover: function() { this.style.fill = 'rgba(50,200,100,0.4)'; },
          onmouseout:  function() { this.style.fill = 'transparent'; },
        };

    if(parcelInfo.currentCoords && parcelInfo.oldResponse.responseText &&
        !/error/.test(parcelInfo.oldResponse.responseText)) {

      if(parcelInfo.currentCoords.x <= arg_coords.x &&
        parcelInfo.currentCoords.X >= arg_coords.X &&
        parcelInfo.currentCoords.y <= arg_coords.y &&
        parcelInfo.currentCoords.Y >= arg_coords.Y) {

          console.log('Parcels within bounds, reuse old request');

          private_ajaxOnload.call( this,  {
                      info: parcelInfo.oldResponse,
                      color: 'green',
                      width: 1,
                      onmouseover: function() { this.style.fill = 'rgba(255,0,0,0.4)'; },
                      onmouseout:  function() { this.style.fill = 'transparent'; },
                    });
          return;
      }
    }

    streetInfoAjax.onload = private_ajaxOnload.bind( this,  responseObj);
    streetInfoAjax.open( "POST", streetUrl, true );
    streetInfoAjax.setRequestHeader( "Content-type", "application/x-www-form-urlencoded" );
    streetInfoAjax.send( streetXMLPostRequest );
    parcelInfo.oldResponse   = Object.create(streetInfoAjax);
    parcelInfo.currentCoords = Object.create(arg_coords);
  };

  parcelInfo.currentCoords = undefined;
  parcelInfo.oldResponse = undefined;