import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';
import { useGeoData } from '../../hooks/geodata-context';

//needed to fix bug within leaflet draw rectangle
window.type = true;

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [rasterLayer, setRasterLayer] = useState<L.Layer | null>(null);

  const { setGeoJson, tiffBuffer } = useGeoData();

  useEffect(() => {
    if (leafletMap || !mapRef.current) return;

    const map = L.map(mapRef.current).setView([24.787911, -107.397850], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          shapeOptions: { color: 'purple' },
          allowIntersection: false,
          drawError: { color: 'orange', timeout: 1000 },
        },
        polyline: { shapeOptions: { color: 'red' } },
        rectangle: { shapeOptions: { color: 'green' } },
        circle: { shapeOptions: { color: 'steelblue' } },
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });

    map.addControl(drawControl);

    map.on('draw:created', (e: any) => {
      drawnItems.clearLayers();
      const layer = e.layer;
      setGeoJson(layer.toGeoJSON());
      drawnItems.addLayer(layer);
    });

    setLeafletMap(map);
  }, [leafletMap, setGeoJson]);

  useEffect(() => {
    if (!leafletMap || !tiffBuffer) return;

    (async () => {
      try {
        const georaster = await parseGeoraster(tiffBuffer);

        if (rasterLayer) {
          leafletMap.removeLayer(rasterLayer);
        }

        const newLayer = new GeoRasterLayer({
          georaster,
          opacity: 0.7,
          //pixelValuesToColorFn: values => values[0] === 42 ? '#ffffff' : '#000000',
          resolution: 64,
        });

        newLayer.addTo(leafletMap);
        leafletMap.fitBounds(newLayer.getBounds());
        setRasterLayer(newLayer);
      } catch (error) {
        console.error('Error parsing or rendering GeoTIFF:', error);
      }
    })();
  }, [tiffBuffer, leafletMap, rasterLayer]);

  return <div id="map" ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}