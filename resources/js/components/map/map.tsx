import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { useGeoData } from '../../hooks/geodata-context';

//needed to fix bug within leaflet draw rectangle
window.type = true;

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const { setGeoJson } = useGeoData();

  useEffect(() => {
    if (mapRef.current) {
      const map = L.map(mapRef.current).setView([24.787911, -107.397850], 13);
  
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      const drawControl = new L.Control.Draw({
         position: 'topright',
            draw: {
         polygon: {
          shapeOptions: {
           color: 'purple'
          },
          allowIntersection: false,
          drawError: {
           color: 'orange',
           timeout: 1000
          },
         },
         polyline: {
          shapeOptions: {
           color: 'red'
          },
         },
         rectangle: {
          
          shapeOptions: {
           color: 'green'
          },
         },
         circle: {
          shapeOptions: {
           color: 'steelblue'
          },
         },
        },
          edit: {
              featureGroup: drawnItems
          }
      });
      map.addControl(drawControl);
        map.on('draw:created', function (e) {
            drawnItems.clearLayers();
             const layer = e.layer;

             console.log(layer.toGeoJSON());
             setGeoJson(layer.toGeoJSON());
             drawnItems.addLayer(layer);
         });    
    }
  }, []); 
  

  return <div id="map" ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}


