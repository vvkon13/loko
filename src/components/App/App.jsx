import { useState } from 'react';
import './App.css';
import { YMaps, Map, GeoObject, Placemark } from '@pbe/react-yandex-maps';

const location = require('../../utils/location.json');
const temperatures = require('../../utils/temperatures.json');

function App() {
  const [isVisible, setIsVisible] = useState(false);
  const [point, setPoint] = useState({
    coordinate: [],
    temperature: null,
  });

  const convertStringToDate = arr => arr.map(item => new Date(item));

  const kKxPlusB = (x1, x2, y1, y2) => (y2 - y1) / (x2 - x1);

  const bKxPlusB = (x, k, y) => y - k * x;

  const approximationTemperatureFromTime = (timestamp1, outsideTemp1, timestamp2) => {
    const resultOutsideTemp2 = [];
    for (let i = 0, j = 0; j < timestamp2.length; j += 1) {
      let k = 1;
      if (i + 1 < timestamp1.length) {
        k = kKxPlusB(+timestamp1[i], +timestamp1[i + 1], outsideTemp1[i], outsideTemp1[i + 1]);
      }
      const b = bKxPlusB(+timestamp1[i], k, outsideTemp1[i]);
      if (i + 1 >= timestamp1.length) {
        resultOutsideTemp2.push(outsideTemp1[i])
      } else if (timestamp2[j] >= timestamp1[i] && timestamp2[j] <= timestamp1[i + 1]) {
        resultOutsideTemp2.push(k * timestamp2[j].getTime() + b);
      } else {
        i += 1;
        j -= 1;
      }
    }
    return resultOutsideTemp2;
  }

  const convertArraysToCoordinates = (arr1, arr2) => {
    const result = [];
    for (let i = 0; i < arr1.length; i += 1) {
      const item = [];
      item.push(arr1[i]);
      item.push(arr2[i]);
      result.push(item);
    }
    return result;
  }

  const determineCenterRoute = (arr1, arr2) => {
    const result = [];
    result.push((arr1[0] + arr1[arr1.length - 1]) / 2);
    result.push((arr2[0] + arr2[arr2.length - 1]) / 2);
    return result;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180)
  }

  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);  // deg2rad below
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
      ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }


  for (let i = 0; i < location.Latitude.length; i += 1) {
    if (location.Latitude[i] === "NA" || location.Longitude[i] === "NA") {
      location.Latitude.splice(i, 1);
      location.Longitude.splice(i, 1);
      location.Timestamp.splice(i, 1);
      i -= 1;
    }
  }
  temperatures.Timestamp = convertStringToDate(temperatures.Timestamp);
  location.Timestamp = convertStringToDate(location.Timestamp);
  location.OutsideTemp = approximationTemperatureFromTime(
    temperatures.Timestamp,
    temperatures.OutsideTemp,
    location.Timestamp
  );
  const coordinates = convertArraysToCoordinates(location.Latitude, location.Longitude);
  const center = determineCenterRoute(location.Latitude, location.Longitude);

  const handleMouseEnter = (e) => {
    const cursorCorrd = e.get('coords');
    const arrayDistances = coordinates.map(
      item => getDistanceFromLatLonInKm(item[0], item[1], cursorCorrd[0], cursorCorrd[1]
      ));
    const min = Math.min(...arrayDistances);
    let indexDesireElement = arrayDistances.findIndex(item => item === min);
    if (indexDesireElement < 0) {
      indexDesireElement = 0;
    }
    setPoint({
      coordinate: coordinates[indexDesireElement],
      temperature: location.OutsideTemp[indexDesireElement]
    })
    setIsVisible(true);
  }

  const handlerMouseLeave = () => {
    setIsVisible(false);
  }

  return (
    <div className="App">
      <YMaps>
        <Map
          defaultState={{
            center,
            zoom: 13,
            controls: ["zoomControl", "fullscreenControl"],
          }}
          modules={["control.ZoomControl", "control.FullscreenControl"]}
        >
          <GeoObject
            modules={["geoObject.addon.balloon", 'geoObject.addon.hint']}
            geometry={{
              type: "LineString",
              coordinates,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handlerMouseLeave}
            options={{
              geodesic: true,
              strokeWidth: 5,
              strokeColor: "#F008",
            }}
          />
          {isVisible && (
            <Placemark
              geometry={point.coordinate}
              properties={{
                iconCaption: `Температура ${point.temperature}`,
              }}
            />)}
        </Map>
      </YMaps>;
    </div>
  );
}

export default App;
