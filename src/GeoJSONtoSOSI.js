const SOSI_producer           = 'GeoJSONtoSOSI'
const SOSI_altitude_accuracy  = 3
const SOSI_latlong_accuracy   = 7
const SOSI_type_from_geojson  = {
  Point: 'PUNKT',
  MultiPoint: 'SVERM',
  LineString: 'KURVE'
}

var [SOSI_maxlat,SOSI_minlat] = [0,Infinity]
var [SOSI_maxlon,SOSI_minlon] = [0,Infinity]

Number.prototype.toSOSI = function (accuracy) {
  return this.toFixed(accuracy).toString().replace('.','')
}

export default function convert(geojson,SOSI_objtypes) {
  if (typeof(geojson) === "object") {
    if(!(Array.isArray(geojson.features) && (geojson.type === "FeatureCollection"))) {
      throw new Error('Invalid GeoJSON supplied for conversion.')
    }
  } else if (typeof(geojson) === "string") {
    return convert(JSON.parse(geojson, objtypes))
  } else {
    throw new TypeError('Argument geojson must be of type object or string.')
  }

  return compileSOSI(geojson.features,SOSI_objtypes)
}

function compileSOSI(FeatureCollection, SOSI_objtypes) {
  let SOSIsets = generateSOSIsets(FeatureCollection, SOSI_objtypes)
  let SOSIarea = generateSOSIarea()
  let SOSIunit = Math.pow(10,-(SOSI_latlong_accuracy)).toFixed(SOSI_latlong_accuracy)
  let SOSIheightunit = Math.pow(10,-(SOSI_altitude_accuracy)).toFixed(SOSI_altitude_accuracy)

  let SOSI = 
  `.HODE 0:
  ..TEGNSETT UTF-8
  ..TRANSPAR
  ...KOORDSYS 84
  ...ORIGO-NØ 0 0
  ...ENHET ${SOSIunit}
  ...ENHET-H ${SOSIheightunit}
  ...ENHET-D ${SOSIheightunit}
  ..PRODUSENT "${SOSI_producer}"
  ..SOSI-VERSJON 4.0
  ..SOSI-NIVÅ 2
  ${SOSIarea}
  ${SOSIsets}
  .SLUTT`

  return SOSI
}

function generateSOSIsets(FeatureCollection, SOSI_objtypes) {
  if (FeatureCollection.length === 0) throw new RangeError('FeatureCollection is empty.')

  let SOSIsets = ""
  let SOSIsetcounter = 1

  for (let feature of FeatureCollection) {
    let SOSIset = generateSOSIset(SOSIsetcounter,SOSI_objtypes[feature.id],feature.geometry)
    if (SOSIset) {
      SOSIsets += SOSIset
      SOSIsetcounter++
    }
  }

  return SOSIsets
}

function generateSOSIset(setID, SOSI_objtype, {type, coordinates}) {
  let SOSIsetType = convertFeatureTypes(type)
  if (!SOSIsetType) {
    console.log('WARNING: Cannot generate SOSIset from type: ',type)
    return false
  }

  let SOSIset = 
    `.${SOSIsetType} ${setID}:
    ..OBJTYPE ${SOSI_objtype}
    ..NØH
    ${generateSOSIcoordString(coordinates)}`

  return SOSIset
}

function convertFeatureTypes(geojsonType) {
  return SOSI_type_from_geojson[geojsonType] ?? false
}

function generateSOSIcoordString(coordinates) {
  let coordSOSIstring = ''
  let coords = (Array.isArray(coordinates[0]))?coordinates:[coordinates]
  
  for (let [lat, lon, alt=0] of coords) {
    coordSOSIstring += `${lon.toSOSI(SOSI_latlong_accuracy)} ${lat.toSOSI(SOSI_latlong_accuracy)} ${alt.toSOSI(SOSI_altitude_accuracy)}\n`

    // Evaluate global max/min values:
    SOSI_maxlat = (SOSI_maxlat < lat)?lat:SOSI_maxlat
    SOSI_minlat = (SOSI_minlat > lat)?lat:SOSI_minlat
    SOSI_maxlon = (SOSI_maxlon < lon)?lon:SOSI_maxlon
    SOSI_minlon = (SOSI_minlon > lon)?lon:SOSI_minlon
  }

  return coordSOSIstring
}

function generateSOSIarea() {
  if ((SOSI_maxlat == 0) || (SOSI_maxlon == 0) || (SOSI_minlat == Infinity) || (SOSI_minlon == Infinity)) {
    throw new Error('Cannot generate SOSI-area. Possible due to no coordinates processed during SOSIset generation.')
  }

  return `..OMRÅDE
  ...MIN-NØ ${Math.floor(SOSI_minlon)} ${Math.floor(SOSI_minlat)}
  ...MAX-NØ ${Math.ceil(SOSI_maxlon)} ${Math.ceil(SOSI_maxlat)}`
}