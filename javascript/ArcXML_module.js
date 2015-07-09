theMap.ArcXML_module = function () {
    var theMap = window.theMap;

    var makeArcXMLRequest = function (arg_minX, arg_maxX, arg_minY, arg_maxY, arg_onPopState, arg_overLayMap) {
        var math = window.Math,
            height = this.resizedMapHeight,
            width  = this.resizedMapWidth,
            scale  = (((arg_maxX - arg_minX) / this.mapContainer.offsetWidth) * 96 * 12), // http://support.esri.com/fr/knowledgebase/techarticles/detail/23278
            pageIsSmall = ((width * height < 1051632)? true: false),
            options = this.optionsReference,
            sliderPositionNumber = this.ZOOM_POWER_NUMBER[this.sliderPosition],

            traffic = {
                interstateColor         : '138, 173, 96',
                highwayColor            : '230,170,150',
                roadWidth               : math.round((170 / (scale / 96 /*dpi*/)) + (sliderPositionNumber < 5? 2: 1)),
                roadFontSize            : math.round((40 / (scale / 96 /*dpi*/))) + 9,
                rdNameOutlneClr         : '',
                roadFontColor           : '60,60,43',
                cityRdTransparency      : 0.5,
                showStrtCenterLns       :  (!options.showSatelliteView_CheckMark && scale < 50000) && sliderPositionNumber >= 6,
                showArterialCirculation : (scale > 40000),
            },

            cityTwns = {
                showNames        : sliderPositionNumber >= 2,
                nameCase         : ((sliderPositionNumber <= 5)? '': 'titlecaps'), //Title caps = first letter capitalized the rest lowercase.
                textSize         : ((sliderPositionNumber >= 8)? (pageIsSmall? '15': '19'): '24'),
                textStyle        : ((sliderPositionNumber >= 7)? 'bold': ''),
                textColor        : ((sliderPositionNumber <= 5)? '51, 153, 51' : '60,60,43'),
                textOutlineClr   : '255,255,255',
                boundaryWidth    : ((sliderPositionNumber > 5)? (pageIsSmall? '1': '2'): (pageIsSmall? '2': '3')),
                boundaryColor    : ((this.clickedOnASvgCity)? '210,20,40': '255, 102, 0'),
                boundaryDash     : 'solid',
                fillTransparency : 0.035,
                showBoundaries   : ((sliderPositionNumber < 9)? true: false),
            },

            addresses = {
                showAddresses  : ((options.showAddresses_CheckMark && scale < 7000)? true: false),
                textSize       :  math.round((20 / (scale / 96 /*dpi*/))) + 9,
                textColor      : '90, 90, 90',
                textOutLineClr : '',
            },

            parcels = {
                showNumbers  : ((options.showParcelNumbers_CheckMark && scale < 2400)? true: false),
                boundryColor : '185,177,169',
                boundryWidth : ((scale < 1800)? 2 : 1),
            },

            water = {
                showFeatures     : true, //true
                showFeatureNames : ((scale < 55000)? true : false),
                textSize         : traffic.roadFontSize + 3,
                textColor        : '95,145,245',//"165,205,255"
                textOutlineClr   : '',
            },

            satelliteMapYearA = false,
            satelliteMapYearB = false,

            showTerrain = false,

            showAirPortRunWay = true,

            xmlRequest = undefined;

        // <-----End of variable assignments.----->

        if (this.clickedOnASvgCity) { // They clicked on a city instead of zooming in manually.

            cityTwns.boundaryWidth = 2;
        }

        // If the sattellite view is checked, some of the setting need to be changed.
        if (options.showSatelliteView_CheckMark) {
            cityTwns.textColor        = '255,255,255';
            cityTwns.textOutlineClr = '20,20,10';
            cityTwns.boundaryDash     = 'dash';
            cityTwns.fillTransparency = ((sliderPositionNumber > 6)? '0.05': '0');

            traffic.rdNameOutlneClr    = cityTwns.textOutlineClr;
            traffic.roadFontColor      = '255,255,255';
            traffic.cityRdTransparency = 0.3;

            addresses.textColor      = '0,0,0';
            addresses.textOutLineClr = '255,255,255';

            water.showFeatures   = false;
            water.textColor      = '160,200,255';
            water.textOutlineClr = 'outline="20,20,10"';
            //water.textSize = '16';

            parcels.boundryColor  = '230,230,230';

            showAirPortRunWay = false;

            showTerrain = true;

            if (options['show'
                        + this.parameters.SATELLITE_MAP_YEARS.a.year
                        + 'SatelliteYearMap_CheckMark']) {

                satelliteMapYearA = true;
                satelliteMapYearB = false;
            } else {

                satelliteMapYearA = false;
                satelliteMapYearB = true;
            }
        }

        if (options.showOverlayMap_state) {
            if (arg_overLayMap) { // Second

                satelliteMapYearA = true;
                satelliteMapYearB = false;
            } else { // First

                satelliteMapYearA = false;
                satelliteMapYearB = true;

                window.setTimeout(function () {
                    // Run it again with arg_overLayMap set to true.
                    makeArcXMLRequest(arg_minX, arg_maxX, arg_minY, arg_maxY, arg_onPopState, true);
                }, 100);
            }
        }

        traffic.roadWidth = ((sliderPositionNumber > 7)? 2: traffic.roadWidth);

        xmlRequest = [
            '<?xml version="1.0" encoding="UTF-8" ?>',
            '<ARCXML version="1.1">',
            '<REQUEST>',
            '<GET_IMAGE>',
            '<PROPERTIES>',
            '<ENVELOPE minx="'+ arg_minX +'" miny="'+ arg_minY +'" maxx="'+ arg_maxX +'" maxy="'+ arg_maxY +'"/>',
            '<IMAGESIZE height="'+ height +'" width="'+ width +'" dpi="96"  scalesymbols="true"/>',
            '<LAYERLIST order="true">',

            '<LAYERDEF id="0" visible="'+ showTerrain +'"/>',

            ((water.showFeatureNames || water.showFeatures)?
                '<LAYERDEF id="10" visible="true">' // Display and Name water.water features.
                    + '<GROUPRENDERER>'
                    +((water.showFeatureNames)?
                        '<SIMPLELABELRENDERER field="NAME">'
                            +'<TEXTSYMBOL antialiasing="true" font="Calibri" fontsize="'+ water.textSize +'" fontcolor="'+ water.textColor +'" '+ water.textOutlineClr +'/>'
                        +'</SIMPLELABELRENDERER>'
                    : '')
                    +((water.showFeatures)?
                        '<VALUEMAPRENDERER lookupfield="LABEL" labelfield="LABEL" linelabelposition="placeontop" howmanylabels="one_label_per_shape">'
                            +'<EXACT value="LAKE/POND;STREAM;FLATS;MARSH ETC;" label="">'
                                +'<SIMPLEPOLYGONSYMBOL boundary="false" filltransparency="1" boundarywidth="0" fillcolor="165,205,255"  />'
                            +'</EXACT>'
                            +'<EXACT value="BAY ETC" label="">'
                                +'<SIMPLEPOLYGONSYMBOL boundary="false" filltransparency="1" boundarywidth="0" fillcolor="140,190,255"  />'
                            +'</EXACT>'
                            +'<EXACT value="SEWAGE POND" label="">'
                                +'<SIMPLEPOLYGONSYMBOL boundary="false" filltransparency="0.4" boundarywidth="0" fillcolor="165,200,100"  />'
                            +'</EXACT>'
                        +'</VALUEMAPRENDERER>'
                    : '')
                    +'</GROUPRENDERER>'
                +'</LAYERDEF>'
            : ''),

            '<LAYERDEF id="'+ this.parameters.SATELLITE_MAP_YEARS.a.layerId +'" visible="'+ satelliteMapYearA +'"/>',
            '<LAYERDEF id="'+ this.parameters.SATELLITE_MAP_YEARS.b.layerId +'" visible="'+ satelliteMapYearB +'"/>', //satellite view

/*7*/       '<LAYERDEF id="7" visible="true">',// RailRoad
                //'<SCALEDEPENDENTRENDERER lower="1:30" upper="1:200000000">', // Scale renderer doesn't do anything.
                    '<SIMPLERENDERER>',
                        '<HASHLINESYMBOL color="210,210,210" antialiasing="true" linethickness="2" tickthickness="2" width="7" interval="30" />',// TODO: Change boundy/fill color, darker with no satellite image, lighter with satellite image.
                    '</SIMPLERENDERER>',
                //'</SCALEDEPENDENTRENDERER>',
            '</LAYERDEF>',

            '<LAYERDEF id="12" visible="'+ traffic.showStrtCenterLns +'">', // steet names
                '<SIMPLELABELRENDERER field="TEXT" labelbufferratio="3.5"  howmanylabels="one_label_per_shape">',
                    '<TEXTSYMBOL antialiasing="true" font="Arial" fontcolor="'+ traffic.roadFontColor +'" outline="'+ traffic.rdNameOutlneClr +'" fontstyle="bold" printmode="titlecaps" fontsize="'+ traffic.roadFontSize +'" />',
                '</SIMPLELABELRENDERER>',/*Verdana*/
            '</LAYERDEF>',

            //'<LAYERDEF id="20" visible="false"/>' // Rural Miles, shows mile markers.

            '<LAYERDEF id="9" visible="true">', // County border
                '<SPATIALQUERY where="LABEL=\'Snohomish County\'" />',
                '<SIMPLERENDERER>',
                    '<SIMPLEPOLYGONSYMBOL boundarywidth="3" boundarycaptype="round" boundarycolor="205,197,189" filltransparency="0"/>',// TODO: Change boundy/fill color, darker with no satellite image, lighter with satellite image.
                '</SIMPLERENDERER>',
            '</LAYERDEF>',

            // '<LAYERDEF id="19" visible="false"/>', // TownShip/range grid.
            // '<LAYERDEF id="18" visible="false"/>', // TownShip/range grid.
            // '<LAYERDEF id="17" visible="false"/>', // Section grid.

            ((options.$14SaleRecord_CheckMark)? '<LAYERDEF id="31" visible="true"/>': ''),
            //'<LAYERDEF id="31" visible="'+ options.$14SaleRecord_CheckMark +'"/>', //TODO: 2013 sales records doesn't work.
            //'<LAYERDEF id="32" visible="false"/>',

            ((options.$13SaleRecord_CheckMark)? '<LAYERDEF id="33" visible="true"/>' : ''),
            //'<LAYERDEF id="33" visible="'+ options.$13SaleRecord_CheckMark +'"/>',
            //'<LAYERDEF id="34" visible="false"/>',

            ((options.$12SaleRecord_CheckMark)? '<LAYERDEF id="35" visible="true"/>' : ''),
            //'<LAYERDEF id="35" visible="'+ options.$12SaleRecord_CheckMark +'"/>',
            //'<LAYERDEF id="36" visible="false"/>',
            //'<LAYERDEF id="30" visible="false"/>',// turns on property description, in blue;

            '<LAYERDEF id="8" visible="true">', // Airports.
                '<GROUPRENDERER>',
                    '<SIMPLELABELRENDERER field="NAME">',
                        '<TEXTSYMBOL antialiasing="true" font="Calibri" fontsize="'+ water.textSize +'" fontcolor="'+ cityTwns.textColor +'" outline="'+ cityTwns.textOutlineClr +'"/>',
                    '</SIMPLELABELRENDERER>',
                    ((showAirPortRunWay)?
                        '<SIMPLERENDERER >'// Runway color.
                            +'<SIMPLEPOLYGONSYMBOL boundary="false" boundarycolor="220,200,200" fillcolor="220,200,200" />'
                        +'</SIMPLERENDERER>'
                    : ''),
                '</GROUPRENDERER>',
            '</LAYERDEF>',

            '<LAYERDEF id="6" visible="'+ traffic.showStrtCenterLns +'" type="polygon">',// Street Center Lines.
                '<GROUPRENDERER>',//roads
                    '<SIMPLERENDERER>', // Minor roads border zoomed in
                        '<SIMPLELINESYMBOL width="'+ (traffic.roadWidth + 2) +'" antialiasing="true" captype="round" color="215,215,215" />',
                    '</SIMPLERENDERER>',
                    '<SIMPLERENDERER>',// Minor roads zoomed in
                        '<SIMPLELINESYMBOL width="'+ traffic.roadWidth +'" antialiasing="true" captype="round" color="255,255,255"/>',
                    '</SIMPLERENDERER>',
                    '<VALUEMAPRENDERER lookupfield="NAME">',
                        '<EXACT value="I 5;I 405;" >',// Interstates
                            '<SIMPLELINESYMBOL width="'+ (traffic.roadWidth * 2)+'" antialiasing="true" captype="round" color="'+ traffic.interstateColor +'"/>',
                        '</EXACT>',
                        // '<EXACT value="SR 522;US 2;SR 9;SR 530;SR 526;" label="">',// Highways
                        //     '<SIMPLELINESYMBOL type="solid" width="'+ (traffic.roadWidth + 3) +'" antialiasing="true" captype="round" color="'+ traffic.highwayColor +'" />',
                        //     //  '<SHIELDSYMBOL antialiasing="true" font="Arial" fontstyle="regular" fontsize="10" type="usroad"/>',
                        //     //  '<TEXTSYMBOL antialiasing="true" interval="1130" font="Arial" fontcolor = "'+ cityTwns.textColor +'" outline="'+ cityTwns.textOutlineClr +'" printmode="'+ cityTwns.nameCase +'" fontstyle="" fontsize="15" shadow="120,120,120" transparency ="1" blockout=""/>',
                        // '</EXACT>',
                        '<EXACT value="Ramp;" method="isContained">',// Ramps
                            '<SIMPLELINESYMBOL width="'+ traffic.roadWidth +'" antialiasing="true" captype="round" color="178, 223, 136"/>',
                        '</EXACT>',
                        '<EXACT value="SR;US ;" method="isContained">',// Interstates
                            '<SIMPLELINESYMBOL width="'+ (traffic.roadWidth * 2)+'" antialiasing="true" captype="round" color="158, 203, 106"/>',
                        '</EXACT>',
                        //  '<OTHER>',
                        //      '<TEXTSYMBOL antialiasing="true" font="Arial" fontcolor = "'+ cityTwns.textColor +'" outline="'+ cityTwns.textOutlineClr +'" printmode="'+ cityTwns.nameCase +'" fontstyle="" fontsize="10" shadow="120,120,120" transparency ="1" blockout=""/>',
                        //  '</OTHER>',
                    '</VALUEMAPRENDERER>',
                '</GROUPRENDERER>',
            '</LAYERDEF>',

            '<LAYERDEF id="5" visible="'+ traffic.showArterialCirculation +'">', // Arterial Circulation
                '<GROUPRENDERER>',
                    '<SIMPLERENDERER>',// Minor roads border zoomed out
                        '<SIMPLELINESYMBOL width="'+ (traffic.roadWidth + 1) +'" antialiasing="true" transparency="'+ traffic.cityRdTransparency +'" captype="round" color="200,200,200"/>',
                    '</SIMPLERENDERER>',
                    '<SIMPLERENDERER>',// Minor roads zoomed out
                        '<SIMPLELINESYMBOL type="solid" width="'+ (traffic.roadWidth - 1) +'" antialiasing="true" transparency="'+ traffic.cityRdTransparency +'" captype="round" color="255,255,255"/>',
                    '</SIMPLERENDERER>',
                    '<SIMPLELABELRENDERER field="HWY_NUM" labelbufferratio="3.5"  howmanylabels="one_label_per_shape">',
                        '<TEXTSYMBOL antialiasing="true" font="Calibri" fontcolor = "'+ cityTwns.textColor +'" outline="'+ cityTwns.textOutlineClr +'" fontsize="14" shadow="120,120,120"/>',
                    '</SIMPLELABELRENDERER>',
                    '<VALUEMAPRENDERER lookupfield="HWY_NUM" labelfield="HWY_NUM">',
                        '<EXACT value="I-5;I-405;">',// Interstates
                            '<SIMPLELINESYMBOL width="'+ traffic.roadWidth +'" antialiasing="true" captype="round" color="'+ traffic.interstateColor +'"/>',
                        '</EXACT>',
                        '<EXACT value="SR 522;US 2;SR 9;SR 530;SR 526;" label="">',// Highways
                            '<SIMPLELINESYMBOL width="'+ traffic.roadWidth +'" antialiasing="true" captype="round" color="'+ traffic.highwayColor +'"/>',
                        '</EXACT>',
                    '</VALUEMAPRENDERER>',
                '</GROUPRENDERER>',
            '</LAYERDEF>',

            '<LAYERDEF id="11" visible="'+ options.showParcelBoundary_CheckMark +'">',// parcel numbers and boundary lines
                ((options.showParcelBoundary_CheckMark)?
                    '<GROUPRENDERER>'
                        +'<SIMPLERENDERER>'// Parcel Boundry
                            +'<SIMPLELINESYMBOL width="'+ parcels.boundryWidth +'" antialiasing="true" transparency="'+(((11.5 / (sliderPositionNumber + 2)) * 0.3) + 0.3) +'" captype="round" color="'+ parcels.boundryColor +'"/>'
                        +'</SIMPLERENDERER>'+

                        ((parcels.showNumbers)? // Show parcel numbers
                            '<SIMPLELABELRENDERER field="PARCEL_ID">'
                                +'<TEXTSYMBOL antialiasing="true" font="Calibri" fontsize="'+ addresses.textSize +'" fontcolor="'+ cityTwns.textColor +'" outline="'+ cityTwns.textOutlineClr +'"/>'
                            +'</SIMPLELABELRENDERER>'
                        : '')
                   +'</GROUPRENDERER>'
                : ""),
            '</LAYERDEF>',

            ((addresses.showAddresses)?
                '<LAYERDEF id="13" visible="true">'
                    +'<SIMPLELABELRENDERER field="'+ ((sliderPositionNumber < (pageIsSmall? 1: 3))?'SITUSLINE1': 'SITUSHOUSE') +'">'
                        +'<TEXTSYMBOL antialiasing="true" font="Calibri" fontsize="'+ addresses.textSize +'" fontcolor="'+ addresses.textColor +'" outline="'+ addresses.textOutLineClr +'"/>'
                    +'</SIMPLELABELRENDERER>'
                +'</LAYERDEF>'
            : ''),

            '<LAYERDEF id="4" visible="'+ options.showCities_CheckMark +'">', //cityTwns.city names and bound
                ((this.clickedOnASvgCity)? // Used when person clicks on a svg cityTwns.city.
                    '<SPATIALQUERY where=" NAME=\''+ this.clickedOnASvgCity +'\'"></SPATIALQUERY>'
                : ''),
                '<GROUPRENDERER>',
                    ((cityTwns.showBoundaries || this.clickedOnASvgCity)?
                        '<SIMPLERENDERER>'
                            +'<SIMPLEPOLYGONSYMBOL antialiasing="true" filltransparency="0" boundarywidth="'+ (+cityTwns.boundaryWidth + 1) +'" fillcolor="255,255,255" boundarycaptype="round"  boundarycolor="255,255,255"/>'
                        +'</SIMPLERENDERER>'
                        +'<SIMPLERENDERER>'
                            +'<SIMPLEPOLYGONSYMBOL antialiasing="true" filltransparency="'+ cityTwns.fillTransparency +'" boundarytransparency="0.3" boundarywidth="'+ cityTwns.boundaryWidth +'" boundarytype="'+ cityTwns.boundaryDash +'" fillcolor="89,137,208" boundarycaptype="round" boundarycolor="'+ cityTwns.boundaryColor +'"/>'
                        +'</SIMPLERENDERER>'
                    : ''),
                    ((sliderPositionNumber > 1 /* Don't show cityTwns.city names at sliderPosition 1 or 0 */)?
                        '<SIMPLELABELRENDERER field="'+ ((cityTwns.showNames && options.showCities_CheckMark)? 'NAME': 'FALSE') +'">'
                            +'<TEXTSYMBOL antialiasing="true" font="Calibri" fontcolor="'+ cityTwns.textColor +'" outline="'+ cityTwns.textOutlineClr +'" printmode="'+ cityTwns.nameCase +'" fontstyle="'+ cityTwns.textStyle +'" fontsize="'+ cityTwns.textSize +'" shadow="120,120,120"/>'
                        +'</SIMPLELABELRENDERER>'
                    : ''),
                '</GROUPRENDERER>',
            '</LAYERDEF>',

            ((options.showBenchMark_CheckMark)?
                '<LAYERDEF id="38" visible="true"/>'
               +'<LAYERDEF id="37" visible="true"/>'
            : ''),

            //'<LAYERDEF id="38" visible="'+ options.showBenchMark_CheckMark +'"/>', // BenchMark Names
            //'<LAYERDEF id="37" visible="'+ options.showBenchMark_CheckMark +'"/>', // BenchMark Areas
            //'<LAYERDEF id="3" visible="false"/>', // National Forests
            //     '<SIMPLELABELRENDERER field="NAME">',
            //          '<TEXTSYMBOL antialiasing="true" font="Calibri" fontstyle="" fontsize="14" fontcolor = "'+ cityTwns.textColor +'" outline="'+ cityTwns.textOutlineClr +'"/>',
            //      '</SIMPLELABELRENDERER>',
            //'</LAYERDEF>',
            //'<LAYERDEF id="1" visible="false"/>', // Information about 2007 satallite view.

            '</LAYERLIST>',

            '<BACKGROUND color="235,235,240"/>',

            '</PROPERTIES>',

            // '<LAYER type="acetate" name="theScaleBar">',
            // '<OBJECT units="pixel">',
            // '<SCALEBAR coords="'+ scaleBarXCoord +' '+ scaleBarYCoord +'" outline="'+ cityTwns.textOutlineClr +'" font="Arial" fontcolor="'+ cityTwns.textColor +'" style="Bold" barcolor="255,255,255" mapunits="feet" scaleunits="feet" antialiasing="True" screenlength="'+ scaleBarWidth +'" fontsize="15" barwidth="7" overlap="False"/>',
            // '</OBJECT>',
            // '</LAYER>',

            '</GET_IMAGE>',
            '</REQUEST>',
            '</ARCXML>'
        ].join('');

        this.options_module.svgController('start Send Request To Server');

        this.startSend = Date.now();

        this.zoomStartTimer = undefined;

        this.clickedOnASvgCity = false; // TODO: This is a global.

        if (arg_onPopState) {

            this.onPopState = true;
        } else {

            this.onPopState = false;
        }

        if (!arg_overLayMap) {

            this.utilities_module.mainAjax(xmlRequest);
            svg_streets.getMapInfo({
                x: arg_minX,
                X: arg_maxX,
                y: arg_minY,
                Y: arg_maxY,
            });

        } else {

            this.overlayMap_module.overlayAjax(xmlRequest);
        }
    }.bind(theMap);

    return {
        makeArcXMLRequest: makeArcXMLRequest,
    };
}();

/*
document.body.innerHTML = '<html><head><title>gis.snoco.org - /output/</title></head><body><H1>gis.snoco.org - /output/</H1><hr><pre><A HREF="/">[To Parent Directory]</A><br>'+document.body.innerHTML.match(/<br>.*?<\/a>/g)
.map(function (elm) { return  { bytes: elm.match(/[PM|AM]\s*?(\d+)/)[1], elm: elm }; })
.sort(function (a,b) { return b.bytes-a.bytes })
.map(function (elm) { return elm.elm; })
.join('').replace(/<br><br>/, '<br>');
}
*/

var tg = {"ARCXML": {
    children: {
    "LAYERDEF_0": {
    attributes: {id: 1, visible: true},
    children: {
        "GROUPRENDERER_0": {
        children: {
            "SIMPLELABELRENDERER_0": {
            attributes: {field: "NAME"},
            children: {
                "TEXTSYMBOL": {
                    attributes: {antialiasing: "true", font: "Calibri", fontsize: "12", fontcolor: "255,255,255"}
                }
            }
            },
            "SIMPLELABELRENDERER_1": {
            attributes: {field: "sdfsdfsdf"},
            children: {
                "TEXTSYMBOL": {
                    attributes: {antialiasing: "true", font: "Calibri", fontsize: "12", fontcolor: "255,255,255"}
                }
            }
            }
        }
        }
    }
    },
    "LAYERDEF_1": {
        attributes: {id: 2, visible: true},
        children: {
            "SIMPLELABELRENDERER_0": {
                attributes: {field: "NAME"},
                children: {
                    "TEXTSYMBOL": {
                        attributes: {antialiasing: "true", font: "Calibri", fontsize: "12", fontcolor: "255,255,255"}
                    }
                }
            }
        }
    },
    "LAYERDEF_2": {
        attributes: {id: 3, visible: true},
        children: {
            "SIMPLELABELRENDERER_0": {
                attributes: {field: "NAME"},
                children: {
                    "TEXTSYMBOL": {
                        attributes: {antialiasing: "true", font: "Calibri", fontsize: "12", fontcolor: "255,255,255"}
                    }
                }
            },
            "SIMPLELABELRENDERER_1": {
                attributes: {field: "sdfsdfsdf"},
                children: {
                    "TEXTSYMBOL": {
                        attributes: {antialiasing: "true", font: "Calibri", fontsize: "12", fontcolor: "255,255,255"}
                    }
                }
            }
        }
    },
    "LAYERDEF_3": {
        attributes: {id: 4, visible: true},
        children: {
            "SIMPLELABELRENDERER_0": {
                attributes: {field: "NAME"},
                children: {
                    "TEXTSYMBOL": {
                        attributes: {antialiasing: "true", font: "Calibri", fontsize: "12", fontcolor: "255,255,255"}
                    }
                }
            }
        }
    }
}}
};

function jsonToXML(o_obj, b_debug, a_keys, s_indent, n_iter) {
    var s_xml = '',
        s_newLine = b_debug? '\n': '',
        o_children,
        o_attributes;

    s_indent = b_debug? s_indent: '';

    if (typeof o_obj === "string" || !a_keys || !n_iter) {

       o_obj  = (typeof o_obj === "string")? JSON.parse(o_obj): o_obj;
       a_keys = Object.keys(o_obj);
       s_indent = s_indent || '';
       n_iter = 0;
    }

    if (n_iter < a_keys.length) {

        o_children   = o_obj[a_keys[n_iter]].children;
        o_attributes = o_obj[a_keys[n_iter]].attributes || {};

        s_xml += s_indent +'<'+ a_keys[n_iter].replace(/_[\s\S]*/, '')

               + s_getAttributes(o_attributes, Object.keys(o_attributes), 0)

               + (o_children? ">"+ s_newLine: "/>"+ s_newLine);

        if (o_children) {

            s_xml += jsonToXML(o_children,
                                b_debug,
                                Object.keys(o_children),
                                s_indent +'    ',
                                0)

                   + s_indent +'</'+ a_keys[n_iter].replace(/_[\s\S]*/, '') +'>'+ s_newLine;
        }

        s_xml += jsonToXML(o_obj, b_debug, a_keys, s_indent, ++n_iter);
    }

    return s_xml;

    // Returns the attributes as a string
    function s_getAttributes(o_attributes, a_keys, n_iter) {
        var s_attribs = '';

        if (o_attributes && n_iter < a_keys.length) {

            s_attribs += ' '+ a_keys[n_iter] +'="'+ o_attributes[a_keys[n_iter]] +'"';

            s_attribs += s_getAttributes(o_attributes, a_keys, ++n_iter);
        }

        return s_attribs;
    }
}

//console.log(jsonToXML(t, true));