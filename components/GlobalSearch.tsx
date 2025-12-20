
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Member, Patient, VisitRoute, Hospital } from '../types';

interface GlobalSearchProps {
  state: AppState;
  isHospitalMode?: boolean;
}

type SearchResultType = 'member' | 'patient' | 'hospital' | 'route';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  data?: any;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ state, isHospitalMode }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const newResults: SearchResult[] = [];

    state.members.forEach(m => {
      if (m.name.toLowerCase().includes(lowerQuery)) {
        newResults.push({
          id: m.id,
          type: 'member',
          title: m.name,
          subtitle: m.active ? 'Membro Ativo' : 'Membro Inativo',
          data: m
        });
      }
    });

    state.patients.forEach(p => {
      if (p.name.toLowerCase().includes(lowerQuery)) {
        newResults.push({
          id: p.id,
          type: 'patient',
          title: p.name,
          subtitle: p.active ? `Internado: ${p.hospitalName}` : 'Histórico (Alta)',
          data: p
        });
      }
    });

    state.routes.forEach(r => {
      if (r.name.toLowerCase().includes(lowerQuery)) {
        newResults.push({
          id: r.id,
          type: 'route',
          title: r.name,
          subtitle: 'Rota de Visita',
          data: r
        });
      }
    });
    
    state.hospitals.forEach(h => {
        if (h.name.toLowerCase().includes(lowerQuery)) {
            newResults.push({
                id: h.id,
                type: 'hospital',
                title: h.name,
                subtitle: 'Hospital (Localização)',
                data: h
            });
        }
    });

    setResults(newResults.slice(0, 8));
    setIsOpen(true);
  }, [query, state]);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);

    if (result.type === 'member') {
      navigate('/dashboard', { state: { filterMemberId: result.id } });
    } else if (result.type === 'patient') {
      if (result.data.active) {
          navigate('/patients', { state: { searchQuery: result.title } });
      } else {
          navigate('/history', { state: { searchQuery: result.title } });
      }
    } else if (result.type === 'hospital') {
      navigate('/map');
    } else if (result.type === 'route') {
      navigate('/dashboard');
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md hidden md:block mx-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className={`h-5 w-5 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm transition duration-150 ease-in-out ${
              isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-300'
          }`}
          placeholder="Buscar pacientes, membros, hospitais..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className={`absolute z-50 mt-1 w-full shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto max-h-96 focus:outline-none sm:text-sm ${
            isHospitalMode ? 'bg-[#212327]' : 'bg-white'
        }`}>
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center gap-3 transition-colors ${
                  isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-blue-50'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white
                ${result.type === 'member' ? 'bg-blue-500' : 
                  result.type === 'patient' ? 'bg-green-500' : 
                  'bg-gray-400'}`
              }>
                 {result.type === 'member' && 'M'}
                 {result.type === 'patient' && 'P'}
                 {result.type === 'hospital' && 'H'}
                 {result.type === 'route' && 'R'}
              </div>
              <div>
                 <p className={`font-medium truncate ${isHospitalMode ? 'text-gray-100' : 'text-gray-900'}`}>{result.title}</p>
                 <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isOpen && results.length === 0 && query.length >= 2 && (
          <div className={`absolute z-50 mt-1 w-full shadow-lg rounded-md py-4 text-center text-sm ring-1 ring-black ring-opacity-5 ${
              isHospitalMode ? 'bg-[#212327] text-gray-400' : 'bg-white text-gray-500'
          }`}>
              Nenhum resultado encontrado.
          </div>
      )}
    </div>
  );
};
