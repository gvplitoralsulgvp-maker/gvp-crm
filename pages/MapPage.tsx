
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AppState, Member, Hospital } from '../types';

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
  const [showMembers, setShowMembers] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchMember, setSearchMember] = useState('');

  // Filtro robusto para membros com localização válida (garantindo que sejam números)
  const membersWithLocation = useMemo(() => {
    return state.members.filter(m => 
      m.lat != null && 
      m.lng != null && 
      !isNaN(Number(m.lat)) && 
      !isNaN(Number(m.lng)) && 
      (
        m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
        m.congregation?.toLowerCase().includes(searchMember.toLowerCase())
      )
    );
  }, [state.members, searchMember]);

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        fadeAnimation: true
      }).setView([-23.9608, -46.3331], 12);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstanceRef.current);

      window.L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
    }
    
    const map = mapInstanceRef.current;
    
    // Invalida o tamanho para corrigir problemas de renderização em containers dinâmicos
    setTimeout(() => { map.invalidateSize(); }, 250);

    // Limpeza rigorosa de camadas antes de renderizar (exceto os tiles)
    map.eachLayer((layer: any) => {
      if (!!layer.toGeoJSON || layer instanceof window.L.Marker || layer instanceof window.L.CircleMarker || layer instanceof window.L.Circle) {
        map.removeLayer(layer);
      }
    });

    const today = new Date();

    // 1. Renderizar Hospitais
    state.hospitals.forEach(h => {
      const hospitalVisits = state.visits.filter(v => {
        const route = state.routes.find(r => r.id === v.routeId);
        return route?.hospitals?.includes(h.name);
      });
      
      const lastVisit = hospitalVisits.sort((a,b) => b.date.localeCompare(a.date))[0];
      let color = 'blue'; 
      let statusText = 'Sem registros recentes';

      if (lastVisit) {
        const lastDate = new Date(lastVisit.date + 'T12:00:00');
        const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 5) { color = 'red'; statusText = `URGENTE: ${diffDays} dias sem visitas!`; }
        else if (diffDays > 3) { color = 'orange'; statusText = `${diffDays} dias desde a última visita.`; }
        else { color = 'green'; statusText = `Visitado há ${diffDays} dias.`; }
      }

      const icon = window.L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
      });

      window.L.marker([h.lat, h.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div class="p-1">
            <h4 class="font-bold text-sm mb-0 ${color === 'red' ? 'text-red-600' : 'text-gray-800'}">${h.name}</h4>
            <p class="text-[10px] text-gray-500 leading-tight mb-2">${h.address}</p>
            <div class="pt-2 border-t flex flex-col gap-1">
               <p class="text-[10px] font-black uppercase text-gray-700">${statusText}</p>
               <a href="https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}" target="_blank" class="text-[9px] text-blue-600 font-bold underline">Ver no Google Maps</a>
            </div>
          </div>
        `);
    });

    // 2. Renderizar Membros (Visual Demonstrativo)
    if (showMembers) {
      membersWithLocation.forEach(m => {
        const markerColor = m.active ? '#2563eb' : '#94a3b8';
        const lat = Number(m.lat);
        const lng = Number(m.lng);
        
        // Círculo de Cobertura Logística
        window.L.circle([lat, lng], {
          color: markerColor,
          fillColor: markerColor,
          fillOpacity: 0.12,
          radius: 350,
          weight: 1,
          dashArray: '4, 4'
        }).addTo(map);

        // Marcador do Membro
        window.L.circleMarker([lat, lng], {
          color: 'white',
          fillColor: markerColor,
          fillOpacity: 1,
          radius: 7,
          weight: 2
        })
        .addTo(map)
        .bindPopup(`
          <div class="p-2 min-w-[160px] text-center">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mx-auto mb-2 border-2 border-white shadow-sm">
                ${m.name.substring(0,2).toUpperCase()}
            </div>
            <h4 class="font-bold text-sm text-gray-800">${m.name}</h4>
            <p class="text-[10px] text-blue-600 font-bold mb-1">${m.congregation || 'Congregação não inf.'}</p>
            <p class="text-[9px] text-gray-400 italic">${m.address || ''}</p>
          </div>
        `);
      });
    }

  }, [state.hospitals, state.members, state.visits, state.routes, showMembers, membersWithLocation]);

  const flyToMember = (m: Member) => {
    if (m.lat == null || m.lng == null || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([Number(m.lat), Number(m.lng)], 15, { duration: 1.5 });
  };

  const resetView = () => {
    mapInstanceRef.current?.setView([-23.9608, -46.3331], 12);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 animate-fade-in overflow-hidden">
      
      {/* Sidebar de Navegação */}
      <div className={`flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-full md:w-72' : 'w-0 overflow-hidden'} flex flex-col gap-4`}>
         <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800 shadow-black' : 'bg-white border-gray-100 shadow-sm'} p-4 rounded-3xl border flex flex-col h-full overflow-hidden`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`font-black text-xs uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Voluntários no Mapa</h3>
                <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-blue-500 md:hidden">&times;</button>
            </div>
            
            <div className="relative mb-4">
                <input 
                    type="text" 
                    placeholder="Filtrar voluntários..." 
                    className={`w-full text-[10px] p-2.5 pl-8 rounded-xl border-2 outline-none focus:border-blue-500 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-gray-50 border-gray-100'}`}
                    value={searchMember}
                    onChange={e => setSearchMember(e.target.value)}
                />
                <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {membersWithLocation.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-[10px] text-gray-400 italic">Nenhum voluntário localizado.</p>
                        <p className="text-[9px] text-gray-500 mt-2 px-4">Use o Admin para validar o CEP dos membros.</p>
                    </div>
                ) : (
                    membersWithLocation.map(m => (
                        <button 
                            key={m.id} 
                            onClick={() => flyToMember(m)}
                            className={`w-full text-left p-3 rounded-2xl border-2 transition-all group flex items-center gap-3 ${
                                isHospitalMode 
                                ? 'bg-[#1a1c1e] border-gray-800 hover:border-blue-900 hover:bg-blue-900/5' 
                                : 'bg-white border-gray-50 hover:border-blue-100 hover:bg-blue-50/30'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black shadow-sm ${m.active ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'}`}>
                                {m.name.substring(0,2).toUpperCase()}
                            </div>
                            <div className="flex-grow min-w-0">
                                <p className={`text-xs font-bold truncate ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{m.name}</p>
                                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-tight truncate">{m.congregation || 'Sem Congr.'}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800/10">
                <button onClick={resetView} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Ver Visão Geral</button>
            </div>
         </div>
      </div>

      {/* Mapa Principal */}
      <div className="flex-grow flex flex-col gap-4 h-full">
        <div className={`p-4 rounded-3xl shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-4">
                {!isSidebarOpen && (
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:rotate-12 transition-transform">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                )}
                <div>
                    <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Logística de Equipe</h2>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">Visualização em tempo real</p>
                </div>
            </div>
            
            <button 
                onClick={() => setShowMembers(!showMembers)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    showMembers 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                    : isHospitalMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                }`}
            >
                {showMembers ? 'Ocultar Membros' : 'Ver Membros'}
            </button>
        </div>
        
        <div className="flex-grow rounded-[2.5rem] border border-gray-800/10 overflow-hidden relative shadow-inner">
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
            
            <div className={`absolute bottom-6 left-6 z-[400] p-5 rounded-3xl border backdrop-blur-xl shadow-2xl space-y-3 hidden md:block ${isHospitalMode ? 'bg-black/60 border-white/10' : 'bg-white/90 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#d33d2a] animate-pulse"></span>
                    <span className="text-[10px] font-bold text-red-500">HOSPITAL CRÍTICO (>5 DIAS)</span>
                </div>
                {showMembers && (
                <div className="flex items-center gap-3 pt-2 border-t border-gray-500/10">
                    <div className="relative">
                        <span className="w-3 h-3 rounded-full bg-[#2563eb] block"></span>
                        <span className="absolute inset-0 w-3 h-3 rounded-full bg-[#2563eb] animate-ping opacity-75"></span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase">VOLUNTÁRIO ATIVO</span>
                </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
