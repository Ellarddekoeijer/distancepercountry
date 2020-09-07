import turf from '@turf/turf'
import polyline from '@mapbox/polyline'
import shapefile from 'shapefile'

// The google routes api result
import data from './coords.js';

// The compete route polyline
const polydata = polyline.toGeoJSON(data.routes[0].overview_polyline.points);

async function fetchWorldData() {
    let worldData = [];
    try {
        let overBorder = false;

        // Load country borders shapeFile
        const source = await shapefile.open("TM_WORLD_BORDERS-0.3.shp");

        // Loop over all countries
        while (true) {
            // Read the source for a specific country
            const result = await source.read();
            if (result.done) break;

            // Check if the trip will cross any borders, if they do, set overBorder to true
            if (turf.lineIntersect(polydata, result.value.geometry).features.length !== 0) {
                overBorder = true;

                // Append intersected borders
                worldData.push(result.value);
            }
        }


        // Return a list with all the country data
        return worldData;

    } catch (e) {
        console.log(e);
    }
}

async function makePrediction() {
    console.time("execution time");
    // Object to returned

    let countries = []

    // When leaving a border you will intersect with it(1) You will then intersect with the next border (2) causing another intersect.
    // This bool ignores the entering intersect.
    let ignoreNextBorder = false;

    try {
        // Fetch the world data
        let worldData = await fetchWorldData();

        worldData.map(async border => {
            // Store distance and duration per country
            let distance = 0;
            let duration = 0;

            data.routes[0].legs[0].steps.map(async (step) => {
                // Get the step starting point
                let pt = turf.point([step.start_location.lng, step.start_location.lat]);
                const pointInCountry = turf.booleanPointInPolygon(pt, border.geometry);

                // Check if the step starting point is in the current country
                if (pointInCountry) {
                    // Add the step distance to the total
                    distance += step.distance.value;
                    duration += step.duration.value;
                }
            });

            countries[border.properties.NAME] = {
                duration: duration,
                distance: distance
            }
        });

        console.timeEnd("execution time");

        return countries;
    } catch (e) {
        console.log(e)
    }
}

makePrediction().then(console.log);
