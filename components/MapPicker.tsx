
import React, { useState, useEffect, useRef } from 'react';

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

declare global {
  interface Window {
    L: any;
  }
}

export const MapPicker: React.FC<MapPickerProps> = ({ initialLat, initialLng, onLocationSelect }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const defaultLat = -23.9608;
  const defaultLng = -46.3331;

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const startLat = initialLat || defaultLat;
      const startLng = initialLng || defaultLng;

      mapInstanceRef.current = window.L.map(mapContainerRef.current, {
        zoomControl: false
      }).setView([startLat, startLng], 13);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstanceRef.current);

      mapInstanceRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        updateMarker(lat, lng);
        onLocationSelect(lat, lng);
      });
      
      // Ajuste de tamanho logo após a criação
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 100);
    }

    if (initialLat && initialLng) {
      updateMarker(initialLat, initialLng);
    }
  }, [initialLat, initialLng]);

  const updateMarker = (lat: number, lng: number) => {
    if (!window.L || !mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = window.L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
      
      markerRef.current.on('dragend', (event: any) => {
        const position = event.target.getLatLng();
        onLocationSelect(position.lat, position.lng);
      });
    }
    mapInstanceRef.current.panTo([lat, lng]);
  };

  return (
    <div className="relative w-full h-64 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shadow-inner">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
      <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm px-3 py-1.5 text-[10px] font-bold uppercase text-blue-600 shadow-sm rounded-lg border border-blue-100">
        Clique no mapa para marcar
      </div>
    </div>
  );
};
