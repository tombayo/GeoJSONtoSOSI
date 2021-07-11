import SOSIconverter from './src/GeoJSONtoSOSI.js'
import fs from 'fs/promises'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

main(process.argv).catch(console.dir)

async function main([,,path]) {
  console.log('Reading file...',path)
  let geojson = await parseFile(path)
  console.log('Analyzing file...')
  let featurelist = analyzeGeoJSON(geojson)
  console.log('Please provide the SOSI object types for each Feature in the GeoJSON:')
  let SOSI_objtypes = await promptObjtypes(featurelist)
  console.log('Converting file...')
  let sosi = SOSIconverter(geojson, SOSI_objtypes)
  console.log('Writing to disk...')
  let result = await writeSOSI(sosi,path)
  console.log('Done!')
  rl.close()

  return result
}

async function parseFile(path) {
  let data = await fs.readFile(path)
  let json = JSON.parse(data)

  return json
}

function analyzeGeoJSON(geojson) {
  let featurelist = {}

  for (let feature of geojson.features) {
    let label = feature.properties.label ?? '(no label)'

    featurelist[feature.id] = `${feature.id}: ${label} ${feature.geometry.type} = ${feature.geometry.coordinates.length} coords\n`
  }

  return featurelist
}

async function promptObjtypes(featurelist) {
  let SOSI_objtypes = {}

  for (let i in featurelist) {
    SOSI_objtypes[i] = await readLineAsync(featurelist[i])
  }

  return SOSI_objtypes
}

async function writeSOSI(sosi,path) {
  let result = await fs.writeFile(`${path}.sos`, sosi.replace(/  +/g,''))

  return result
}

function readLineAsync(message) {
  return new Promise((resolve, reject) => {
    rl.question(message, (answer) => {
      resolve(answer);
    });
  });
} 