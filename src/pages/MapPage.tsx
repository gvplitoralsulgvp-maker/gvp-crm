
import React, { useEffect, useRef } from 'react';
import { AppState } from '../types';

interface MapPageProps {
  state: AppState;
}

declare global {
  interface Window {
    L: any;
  }
}

export const MapPage: React.FC<MapPageProps> = ({ state }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    // Initialize Map if not already initialized
    if (!mapInstanceRef.current) {
      // Centered on Santos/Baixada
      mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([-23.9608, -46.3331], 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
    }
    
    const map = mapInstanceRef.current;

    // Clear existing layers (simple way for this demo)
    map.eachLayer((layer: any) => {
      if (!!layer.toGeoJSON) { // Don't remove tiles
        map.removeLayer(layer);
      }
    });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // --- Add Hospital Markers (Red Icons) ---
    const hospitalIcon = window.L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    state.hospitals.forEach(h => {
      window.L.marker([h.lat, h.lng], { icon: hospitalIcon })
        .addTo(map)
        .bindPopup(`
          <div class="font-sans">
            <strong class="text-red-700 text-sm">${h.name}</strong><br/>
            <span class="text-xs text-gray-600">${h.address}</span><br/>
            <span class="text-xs text-gray-500">${h.city}</span>
          </div>
        `);
    });

    // --- Add Member Markers (Blue Circles) ---
    state.members.filter(m => m.active && m.lat && m.lng).forEach(m => {
      window.L.circleMarker([m.lat, m.lng], {
        color: '#2563eb', // Blue 600
        fillColor: '#3b82f6', // Blue 500
        fillOpacity: 0.5,
        radius: 8
      })
      .addTo(map)
      .bindPopup(`
        <div class="font-sans">
          <strong class="text-blue-700 text-sm">${m.name}</strong><br/>
          <span class="text-xs text-gray-600">Membro GVP</span>
        </div>
      `);
    });

    // Cleanup not strictly necessary for single page app view but good practice
    return () => {
      // map.remove(); // Can cause issues with React StrictMode re-renders in some cases
    };

  }, [state.hospitals, state.members]);

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Mapa Inteligente</h2>
           <p className="text-sm text-gray-500">Visualização de Hospitais (Vermelho) e Membros (Azul) na Baixada Santista.</p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
           <div className="flex items-center gap-1">
             <span className="w-3 h-3 rounded-full bg-red-600"></span> Hospitais
           </div>
           <div className="flex items-center gap-1">
             <span className="w-3 h-3 rounded-full bg-blue-500"></span> Membros
           </div>
        </div>
      </div>

      <div className="flex-grow bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden relative z-0">
         <div ref={mapContainerRef} className="w-full h-full" id="map"></div>
      </div>
    </div>
  );
};