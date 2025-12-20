
import React, { useEffect, useRef } from 'react';
import { AppState, UserRole } from '../types';

interface MapPageProps {
  state: AppState;
  isHospitalMode?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

export const MapPage: React.FC<MapPageProps> = ({ state, isHospitalMode }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapContainerRef.current, {
        zoomControl: true,
        fadeAnimation: true
      }).setView([-23.9608, -46.3331], 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstanceRef.current);
    }
    
    const map = mapInstanceRef.current;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    map.eachLayer((layer: any) => {
      if (layer instanceof window.L.Marker || layer instanceof window.L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const today = new Date();

    // Renderizar Hospitais
    state.hospitals.forEach(h => {
      const hospitalVisits = state.visits.filter(v => 
        state.routes.find(r => r.id === v.routeId)?.hospitals.includes(h.name)
      );
      
      const lastVisit = hospitalVisits
        .sort((a,b) => b.date.localeCompare(a.date))[0];
      
      let color = 'blue'; 
      let statusText = 'Sem registros recentes';

      if (lastVisit) {
        const lastDate = new Date(lastVisit.date + 'T12:00:00');
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        
        if (diffDays > 5) {
          color = 'red';
          statusText = `Atenção: ${diffDays} dias sem visitas!`;
        } else if (diffDays > 3) {
          color = 'orange';
          statusText = `${diffDays} dias desde a última visita.`;
        } else {
          color = 'green';
          statusText = `Visitado recentemente (${diffDays} dias).`;
        }
      }

      const icon = window.L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      window.L.marker([h.lat, h.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1">
            <h4 class="font-bold text-sm mb-0 ${color === 'red' ? 'text-red-600' : 'text-gray-800'}">${h.name}</h4>
            <p class="text-[10px] text-gray-500 leading-tight mb-2">${h.address}</p>
            <div class="pt-2 border-t flex items-center gap-1.5">
               <div class="w-2 h-2 rounded-full bg-${color}-500"></div>
               <p class="text-[10px] font-bold uppercase tracking-tight text-gray-700">${statusText}</p>
            </div>
          </div>
        `);
    });

    // Renderizar Membros (Ativos e Pendentes para Admins)
    const isAdmin = state.currentUser?.role === UserRole.ADMIN;
    
    state.members.filter(m => m.lat && m.lng).forEach(m => {
      // Se não for admin, só vê membros ativos
      if (!m.active && !isAdmin) return;

      const markerColor = m.active ? '#2563eb' : '#94a3b8'; // Azul para ativo, cinza para pendente
      const shadowColor = m.active ? 'rgba(59, 130, 246, 0.4)' : 'rgba(148, 163, 184, 0.2)';

      window.L.circleMarker([m.lat, m.lng], {
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.6,
        radius: 8,
        weight: 2
      })
      .addTo(map)
      .bindPopup(`
        <div class="p-1 text-center">
          <h4 class="font-bold text-sm mb-0 ${m.active ? 'text-blue-700' : 'text-gray-500'}">${m.name}</h4>
          <p class="text-[9px] uppercase font-black tracking-widest mt-1 ${m.active ? 'text-blue-500' : 'text-gray-400'}">
            ${m.active ? 'Voluntário Ativo' : 'Solicitação Pendente'}
          </p>
          <p class="text-[10px] text-gray-400 mt-2">${m.congregation || 'GVP Litoral'}</p>
        </div>
      `);
    });

    return () => {
      clearTimeout(timer);
    };

  }, [state.hospitals, state.members, state.visits, state.routes, state.currentUser]);

  return (
    <div className="space-y-6 h-[calc(100vh-160px)] flex flex-col animate-fade-in">
      <div className={`p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
          isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'
      }`}>
        <div>
           <h2 className={`text-xl font-bold tracking-tight ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Mapa de Cobertura</h2>
           <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Identifique a proximidade dos membros em relação aos hospitais.</p>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 rounded-full bg-blue-600 shadow-sm"></span> Equipe
           </div>
           {state.currentUser?.role === UserRole.ADMIN && (
               <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-gray-400 shadow-sm"></span> Pendente
               </div>
           )}
           <div className="flex items-center gap-2">
             <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span> Prioridade Visita
           </div>
        </div>
      </div>

      <div className={`flex-grow rounded-xl shadow-inner border overflow-hidden relative ${
          isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 shadow-black' : 'bg-white border-gray-200 shadow-inner'
      }`}>
         <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
      </div>
    </div>
  );
};
