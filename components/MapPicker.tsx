
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

  // Default to Baixada Santista center if no initial prop
  const defaultLat = -23.9608;
  const defaultLng = -46.3331;

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const startLat = initialLat || defaultLat;
      const startLng = initialLng || defaultLng;

      mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([startLat, startLng], 13);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Click Event
      mapInstanceRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        updateMarker(lat, lng);
        onLocationSelect(lat, lng);
      });
    }

    // Initial Marker
    if (initialLat && initialLng) {
      updateMarker(initialLat, initialLng);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Update marker position logic
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
    <div className="relative w-full h-64 bg-gray-100 rounded-md border border-gray-300 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-2 right-2 z-[400] bg-white px-2 py-1 text-xs shadow-md rounded border border-gray-200 opacity-90">
        Clique no mapa para marcar o local
      </div>
    </div>
  );
};
