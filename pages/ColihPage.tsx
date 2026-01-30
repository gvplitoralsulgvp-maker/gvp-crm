
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Doctor, ColihVisit, ColihInteractionType, Member, Hospital, ALL_REGIONALS, CityMapping, UserRole } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate, atomicDelete } from '../services/storageService';
import { getRegionalByCity } from '../services/geoService';
import { ConfirmModal } from '../components/ConfirmModal';

const INTERACTION_TYPES: { id: ColihInteractionType, label: string }[] = [
    { id: 'visit', label: 'Visita de Rotina' },
    { id: 'presentation', label: 'Apresentação Formal' },
    { id: 'material_delivery', label: 'Entrega de Material' },
    { id: 'email_phone', label: 'Contato Tel/Email' }
];

// --- COMPONENTES VISUAIS ---

const HospitalStats: React.FC<{ hospitals: Hospital[], visits: ColihVisit[], isHospitalMode?: boolean }> = ({ hospitals, visits, isHospitalMode }) => {
    const total = hospitals.length;
    const now = new Date();

    let countFresh = 0;   // < 90 dias (Verde)
    let countWarning = 0; // 90 - 180 dias (Laranja)
    let countCritical = 0; // > 180 dias ou nunca (Vermelho)

    hospitals.forEach(h => {
        // Encontra visitas completas para este hospital
        const hospitalVisits = visits.filter(v => v.hospitalId === h.id && v.status === 'COMPLETED');
        
        if (hospitalVisits.length === 0) {
            countCritical++; // Nunca visitado
            return;
        }

        // Pega a mais recente
        const lastVisit = hospitalVisits.sort((a,b) => b.date.localeCompare(a.date))[0];
        const lastDate = new Date(lastVisit.date + 'T12:00:00');
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 90) {
            countFresh++;
        } else if (diffDays <= 180) {
            countWarning++;
        } else {
            countCritical++;
        }
    });

    const getPercent = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
             <div className={`p-4 rounded-2xl border flex flex-col justify-center h-28 ${isHospitalMode ? 'bg-indigo-900/10 border-indigo-900/30' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-indigo-400' : 'text-indigo-700'}`}>Total Unidades</p>
                        <p className={`text-2xl font-black ${isHospitalMode ? 'text-white' : 'text-indigo-900'}`}>{total}</p>
                    </div>
                </div>
             </div>
             
             {/* Em Dia (Verde) */}
             <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Em Dia (3 Meses)</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHospitalMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        {getPercent(countFresh)}%
                    </span>
                </div>
                <div>
                    <div className="flex items-end gap-1">
                        <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{countFresh}</p>
                        <p className={`text-sm font-bold mb-1.5 ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>/ {total}</p>
                    </div>
                    <div className={`w-full h-1.5 mt-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${getPercent(countFresh)}%` }}></div>
                    </div>
                </div>
             </div>

             {/* Atenção (Laranja) */}
             <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Atenção (3-6 Meses)</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHospitalMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                        {getPercent(countWarning)}%
                    </span>
                </div>
                <div>
                    <div className="flex items-end gap-1">
                        <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{countWarning}</p>
                        <p className={`text-sm font-bold mb-1.5 ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>/ {total}</p>
                    </div>
                    <div className={`w-full h-1.5 mt-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full bg-yellow-500" style={{ width: `${getPercent(countWarning)}%` }}></div>
                    </div>
                </div>
             </div>

             {/* Crítico (Vermelho) */}
             <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-red-400' : 'text-red-500'}`}>Crítico (+6 Meses)</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHospitalMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                        {getPercent(countCritical)}%
                    </span>
                </div>
                <div>
                    <div className="flex items-end gap-1">
                        <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{countCritical}</p>
                        <p className={`text-sm font-bold mb-1.5 ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>/ {total}</p>
                    </div>
                    <div className={`w-full h-1.5 mt-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${getPercent(countCritical)}%` }}></div>
                    </div>
                </div>
             </div>
        </div>
    );
};

const DoctorStats: React.FC<{ doctors: Doctor[], isHospitalMode?: boolean }> = ({ doctors, isHospitalMode }) => {
    const total = doctors.length;
    const now = new Date();
    
    const getCount = (days: number) => {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - days);
        return doctors.filter(d => d.lastVisitDate && new Date(d.lastVisitDate) >= cutoff).length;
    };

    const v3m = getCount(90);
    const v6m = getCount(180);
    const v12m = getCount(365);
    
    // Porcentagem para o gráfico de donut (Cobertura Anual)
    const activePct = total > 0 ? Math.round((v12m / total) * 100) : 0;
    const dashArray = `${activePct}, 100`;

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Gráfico de Cobertura */}
            <div className={`flex-shrink-0 p-6 rounded-3xl border flex flex-col items-center justify-center w-full md:w-64 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="relative w-32 h-32">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path className={isHospitalMode ? 'text-gray-800' : 'text-gray-100'} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-teal-500 transition-all duration-1000 ease-out" strokeDasharray={dashArray} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{activePct}%</span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Cobertura</span>
                    </div>
                </div>
                <p className={`mt-4 text-xs font-bold text-center ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {v12m} de {total} médicos<br/>visitados no ano
                </p>
            </div>

            {/* Cards de Métricas */}
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isHospitalMode ? 'bg-teal-900/10 border-teal-900/30' : 'bg-teal-50 border-teal-100'}`}>
                    <div className="flex justify-between items-start">
                        <span className={`p-2 rounded-xl ${isHospitalMode ? 'bg-teal-500/20 text-teal-400' : 'bg-teal-100 text-teal-600'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isHospitalMode ? 'text-teal-400' : 'text-teal-700'}`}>3 Meses</span>
                    </div>
                    <div>
                        <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-teal-900'}`}>{v3m}</p>
                        <p className={`text-xs font-medium ${isHospitalMode ? 'text-teal-400/70' : 'text-teal-700/70'}`}>Médicos Recentes</p>
                    </div>
                 </div>

                 <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                        <span className={`p-2 rounded-xl ${isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>6 Meses</span>
                    </div>
                    <div>
                        <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{v6m}</p>
                        <p className={`text-xs font-medium ${isHospitalMode ? 'text-gray-500' : 'text-gray-500'}`}>Total Semestral</p>
                    </div>
                 </div>

                 <div className={`p-5 rounded-3xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                        <span className={`p-2 rounded-xl ${isHospitalMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>12 Meses</span>
                    </div>
                    <div>
                        <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{v12m}</p>
                        <p className={`text-xs font-medium ${isHospitalMode ? 'text-gray-500' : 'text-gray-500'}`}>Total Anual</p>
                    </div>
                 </div>
            </div>
        </div>
    )
};

// ... MODAIS AUXILIARES ...
const DoctorModal: React.FC<{ isOpen: boolean; onClose: () => void; doctor?: Doctor; hospitals: Hospital[]; cityMappings: CityMapping[]; onSave: (d: Doctor) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, doctor, hospitals, cityMappings, onSave, isHospitalMode }) => {
    // ... same as before
    const [formData, setFormData] = useState<Partial<Doctor>>({});
    const availableRegionals = useMemo(() => {
        const dynamicRegs = cityMappings.map(m => m.regional);
        return Array.from(new Set([...ALL_REGIONALS, ...dynamicRegs])).sort();
    }, [cityMappings]);
    useEffect(() => { if (doctor) { setFormData(doctor); } else { setFormData({ cooperationLevel: 'Unknown', isConsultant: false, treatsPediatric: false }); } }, [doctor, isOpen]);
    const handleCityChange = (city: string) => { const detected = getRegionalByCity(city, cityMappings); setFormData(prev => ({ ...prev, city, regional: detected || prev.regional })); };
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0"><h3 className="text-white font-bold text-lg">{doctor ? 'Editar Médico' : 'Novo Médico'}</h3><button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button></div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nome</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Especialidade</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.specialty || ''} onChange={e => setFormData({...formData, specialty: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Cidade</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.city || ''} onChange={e => handleCityChange(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Regional</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}><option value="">Automática / Selecione</option>{availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Endereço</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nível</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.cooperationLevel || 'Unknown'} onChange={e => setFormData({...formData, cooperationLevel: e.target.value as any})}><option value="Unknown">Desconhecido</option><option value="Low">Baixo</option><option value="Medium">Médio</option><option value="High">Alto (Excelente)</option></select></div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Responsável GVP</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.responsibleMemberName || ''} onChange={e => setFormData({...formData, responsibleMemberName: e.target.value})} /></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({ ...formData, id: formData.id || crypto.randomUUID() } as Doctor)}>Salvar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const FacilitatorModal: React.FC<{ isOpen: boolean; onClose: () => void; member?: Member; cityMappings: CityMapping[]; onSave: (m: Member) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, member, cityMappings, onSave, isHospitalMode }) => {
    // ... same as before
    const [formData, setFormData] = useState<Partial<Member>>({});
    const availableRegionals = useMemo(() => {
        const dynamicRegs = cityMappings.map(m => m.regional);
        return Array.from(new Set([...ALL_REGIONALS, ...dynamicRegs])).sort();
    }, [cityMappings]);
    useEffect(() => { if (member) setFormData(member); }, [member, isOpen]);
    const handleCityChange = (city: string) => { const detected = getRegionalByCity(city, cityMappings); setFormData(prev => ({ ...prev, city, regional: detected || prev.regional })); };
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0"><h3 className="text-white font-bold text-lg">Editar Membro COLIH</h3><button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button></div>
                <div className="p-6 space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nome</label><input disabled className={`w-full p-3 border rounded-xl outline-none opacity-60 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-100'}`} value={formData.name || ''} /></div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Classificação</label>
                        <select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.colihClassification || 'Member'} onChange={e => setFormData({...formData, colihClassification: e.target.value as any})}>
                            <option value="Member">Membro Regular</option>
                            <option value="Facilitator">Facilitador</option>
                            <option value="Assistant">Ajudante/Assistente</option>
                            <option value="Secretary">Secretário</option>
                            <option value="Coordinator">Coordenador Regional</option>
                            <option value="President">Presidente</option>
                        </select>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Cidade</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.city || ''} onChange={e => handleCityChange(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Regional</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}><option value="">Selecione...</option>{availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({...formData} as Member)}>Salvar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const HospitalRegionalModal: React.FC<{ isOpen: boolean; onClose: () => void; hospital?: Hospital; members: Member[]; cityMappings: CityMapping[]; onSave: (h: Hospital) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, hospital, members, cityMappings, onSave, isHospitalMode }) => {
    // ... same as before
    const [formData, setFormData] = useState<Partial<Hospital>>({});
    const availableRegionals = useMemo(() => {
        const dynamicRegs = cityMappings.map(m => m.regional);
        return Array.from(new Set([...ALL_REGIONALS, ...dynamicRegs])).sort();
    }, [cityMappings]);
    useEffect(() => { if (hospital) setFormData(hospital); }, [hospital, isOpen]);
    const handleCityChange = (city: string) => { 
        const detected = getRegionalByCity(city, cityMappings); 
        setFormData(prev => ({ ...prev, city, regional: detected || prev.regional })); 
    };
    const toggleResponsible = (memberId: string) => { const current = formData.responsibleMemberIds || []; if (current.includes(memberId)) { setFormData({ ...formData, responsibleMemberIds: current.filter(id => id !== memberId) }); } else { setFormData({ ...formData, responsibleMemberIds: [...current, memberId] }); } };
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0"><h3 className="text-white font-bold text-lg">Dados da Unidade</h3><button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button></div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nome</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Cidade</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.city || ''} onChange={e => handleCityChange(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Regional</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}><option value="">Selecione...</option>{availableRegionals.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="space-y-2 pt-2 border-t border-gray-200/20"><label className="text-[10px] font-bold uppercase text-gray-500">Membros Responsáveis (COLIH)</label><div className={`border rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50'}`}>{members.filter(m => m.isColih && m.active && m.colihClassification !== 'Facilitator').sort((a,b) => a.name.localeCompare(b.name)).map(m => (<label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-all ${formData.responsibleMemberIds?.includes(m.id) ? 'bg-teal-100' : ''}`}><input type="checkbox" className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" checked={formData.responsibleMemberIds?.includes(m.id) || false} onChange={() => toggleResponsible(m.id)} /><div><span className={`text-xs font-bold block ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span><span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">{m.colihClassification || 'Membro'}</span></div></label>))}</div><p className="text-[10px] text-gray-400 italic">Selecione ao menos 2 membros.</p></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({ ...hospital, ...formData } as Hospital)}>Salvar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const VisitModal: React.FC<{ isOpen: boolean; onClose: () => void; doctor: Doctor; currentUserId?: string; onSave: (notes: string, date: string, memberIds: string[], type: ColihInteractionType, level: Doctor['cooperationLevel']) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, doctor, currentUserId, onSave, isHospitalMode }) => {
    // ... same as before
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [type, setType] = useState<ColihInteractionType>('visit');
    const [level, setLevel] = useState<Doctor['cooperationLevel']>(doctor.cooperationLevel || 'Unknown');
    useEffect(() => {
        if(isOpen) {
            setDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setType('visit');
            setLevel(doctor.cooperationLevel || 'Unknown');
        }
    }, [isOpen, doctor]);
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
             <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0"><h3 className="text-white font-bold text-lg">Registrar Visita</h3><button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button></div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Data</label><input type="date" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={date} onChange={e => setDate(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Tipo</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={type} onChange={e => setType(e.target.value as any)}>{INTERACTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-gray-500">Nível de Colaboração (Atual)</label>
                        <select 
                            className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} 
                            value={level} 
                            onChange={e => setLevel(e.target.value as any)}
                        >
                            <option value="Unknown">Desconhecido</option>
                            <option value="Low">Baixo</option>
                            <option value="Medium">Médio</option>
                            <option value="High">Alto (Excelente)</option>
                        </select>
                        <p className="text-[9px] text-gray-400">Atualize se a disposição do médico mudou.</p>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Resumo</label><textarea rows={3} className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={notes} onChange={e => setNotes(e.target.value)} /></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave(notes, date, currentUserId ? [currentUserId] : [], type, level)}>Registrar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const PresentationModal: React.FC<{ isOpen: boolean; onClose: () => void; presentationToEdit?: ColihVisit; doctors: Doctor[]; hospitals: Hospital[]; members: Member[]; onSave: (data: Partial<ColihVisit>) => void; onAddNew: (type: 'hospital' | 'doctor') => void; isHospitalMode?: boolean; autoSelectId?: string | null; onClearAutoSelect?: () => void; }> = ({ isOpen, onClose, presentationToEdit, doctors, hospitals, members, onSave, onAddNew, isHospitalMode, autoSelectId, onClearAutoSelect }) => {
    // ... same as before
    const [targetType, setTargetType] = useState<'hospital' | 'doctor'>('hospital');
    const [selectedId, setSelectedId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [hlc38, setHlc38] = useState(false);
    const [interest, setInterest] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [status, setStatus] = useState<'SCHEDULED' | 'COMPLETED'>('SCHEDULED');
    
    useEffect(() => {
        if (isOpen) {
            if (presentationToEdit) {
                if (presentationToEdit.hospitalId) { setTargetType('hospital'); setSelectedId(presentationToEdit.hospitalId); } 
                else if (presentationToEdit.doctorId) { setTargetType('doctor'); setSelectedId(presentationToEdit.doctorId); }
                setDate(presentationToEdit.date);
                setNotes(presentationToEdit.notes || '');
                setHlc38(presentationToEdit.hlc38Presented || false);
                setInterest(presentationToEdit.collaboratorInterest || false);
                setSelectedMembers(presentationToEdit.memberIds || []);
                setStatus(presentationToEdit.status || 'SCHEDULED');
            } else {
                if (!autoSelectId) { setNotes(''); setHlc38(false); setInterest(false); setSelectedMembers([]); setSelectedId(''); setStatus('SCHEDULED'); setTargetType('hospital'); }
            }
        }
    }, [isOpen, presentationToEdit]);

    useEffect(() => {
        if (autoSelectId && onClearAutoSelect) {
            const isDoc = doctors.find(d => d.id === autoSelectId);
            const isHosp = hospitals.find(h => h.id === autoSelectId);
            if (isDoc) { setTargetType('doctor'); setSelectedId(autoSelectId); } else if (isHosp) { setTargetType('hospital'); setSelectedId(autoSelectId); }
            onClearAutoSelect();
        }
    }, [autoSelectId, doctors, hospitals, onClearAutoSelect]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!selectedId) return alert("Selecione o destino da apresentação.");
        if (selectedMembers.length === 0) return alert("Selecione quem realizou/realizará a apresentação.");
        onSave({ 
            id: presentationToEdit?.id, 
            date, 
            memberIds: selectedMembers, 
            notes, 
            interactionType: 'presentation', 
            hlc38Presented: hlc38, 
            collaboratorInterest: interest, 
            status: status, 
            hospitalId: targetType === 'hospital' ? selectedId : undefined, 
            doctorId: targetType === 'doctor' ? selectedId : undefined 
        });
    };

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) setSelectedMembers(prev => prev.filter(m => m !== id));
        else setSelectedMembers(prev => [...prev, id]);
    };

    const assignableMembers = members.filter(m => 
        m.active && 
        (m.isColih || m.role === UserRole.COORDINATOR || m.colihClassification === 'Coordinator' || m.role === UserRole.ADMIN)
    );

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
             <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-purple-600 px-6 py-5 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-bold text-lg">{presentationToEdit ? (status === 'COMPLETED' ? 'Detalhes da Apresentação' : 'Concluir Apresentação') : 'Agendar Apresentação'}</h3>
                    <button onClick={onClose} className="text-white hover:text-purple-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    {!presentationToEdit && (
                        <div className={`p-3 rounded-xl border flex items-center justify-between ${status === 'COMPLETED' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <span className="text-xs font-bold uppercase text-gray-600">Já foi realizada?</span>
                            <button onClick={() => setStatus(prev => prev === 'SCHEDULED' ? 'COMPLETED' : 'SCHEDULED')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${status === 'COMPLETED' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{status === 'COMPLETED' ? 'SIM, CONCLUÍDA' : 'NÃO, APENAS AGENDAR'}</button>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Público Alvo</label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => { setTargetType('hospital'); setSelectedId(''); }} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase border-2 transition-all ${targetType === 'hospital' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Instituição / Grupo</button>
                            <button onClick={() => { setTargetType('doctor'); setSelectedId(''); }} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase border-2 transition-all ${targetType === 'doctor' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Médico Profissional</button>
                        </div>
                        <div className="flex gap-2">
                            <select className={`flex-grow p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={selectedId} onChange={e => setSelectedId(e.target.value)} disabled={!!presentationToEdit}><option value="">{targetType === 'hospital' ? 'Selecione a Instituição...' : 'Selecione o Médico...'}</option>{targetType === 'hospital' ? hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>) : doctors.sort((a,b) => a.name.localeCompare(b.name)).map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>)}</select>
                            {!presentationToEdit && <button onClick={() => onAddNew(targetType)} className={`px-4 rounded-xl font-bold text-lg border leading-none transition-all flex items-center justify-center ${isHospitalMode ? 'bg-purple-900/30 border-purple-800 text-purple-300 hover:bg-purple-900/50' : 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100'}`} title={`Adicionar novo ${targetType === 'hospital' ? 'Hospital' : 'Médico'}`}>+</button>}
                        </div>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Data {status === 'SCHEDULED' ? 'Prevista' : 'Realizada'}</label><input type="date" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={date} onChange={e => setDate(e.target.value)} /></div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Equipe Designada (Apenas COLIH/Coord)</label>
                        <div className={`border rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50'}`}>
                            {assignableMembers.sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                                <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-all ${selectedMembers.includes(m.id) ? 'bg-purple-100' : ''}`}>
                                    <input type="checkbox" className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} />
                                    <div>
                                        <span className={`text-xs font-bold block ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                                        <span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">
                                            {m.colihClassification || (m.role === 'ADMIN' ? 'Admin' : m.role === 'COORDINATOR' ? 'Coord' : 'Membro')}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    {(status === 'COMPLETED' || presentationToEdit) && (
                        <div className="animate-fade-in space-y-5 pt-4 border-t border-dashed border-gray-300">
                            {presentationToEdit && presentationToEdit.status === 'SCHEDULED' && (<div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-4"><p className="text-xs text-yellow-800 font-bold mb-2">Este agendamento está pendente.</p><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-5 h-5 text-green-600 rounded" checked={status === 'COMPLETED'} onChange={e => setStatus(e.target.checked ? 'COMPLETED' : 'SCHEDULED')} /><span className="text-sm font-bold text-gray-800">Marcar como REALIZADA agora?</span></label></div>)}
                            {(status === 'COMPLETED') && (<><div className="grid grid-cols-1 gap-3 p-4 rounded-xl border border-purple-200 bg-purple-50/50"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={hlc38} onChange={e => setHlc38(e.target.checked)} className="w-5 h-5 text-purple-600 rounded" /><div><span className="text-sm font-bold text-gray-800 block">Apresentou HLC-38?</span><span className="text-[10px] text-gray-500">Vídeo/Documento sobre estratégias</span></div></label><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={interest} onChange={e => setInterest(e.target.checked)} className="w-5 h-5 text-purple-600 rounded" /><div><span className="text-sm font-bold text-gray-800 block">Interesse em Colaborar?</span><span className="text-[10px] text-gray-500">Médico demonstrou disposição</span></div></label></div><div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Resumo / Feedback</label><textarea rows={3} className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} placeholder="Como foi a receptividade?" value={notes} onChange={e => setNotes(e.target.value)} /></div></>)}
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700 text-white">{presentationToEdit ? 'Salvar Alterações' : (status === 'COMPLETED' ? 'Registrar Conclusão' : 'Confirmar Agendamento')}</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const PresentationsTab: React.FC<{ visits: ColihVisit[]; doctors: Doctor[]; hospitals: Hospital[]; members: Member[]; goal: number; isHospitalMode?: boolean; onEdit: (v: ColihVisit) => void; onDelete: (id: string) => void; onUpdateGoal: (newGoal: number) => void; }> = ({ visits, doctors, hospitals, members, goal, isHospitalMode, onEdit, onDelete, onUpdateGoal }) => {
    // ... same as before
    const currentYear = new Date().getFullYear();
    const thisYearVisits = visits.filter(v => new Date(v.date).getFullYear() === currentYear && v.status === 'COMPLETED');
    const progress = Math.min((thisYearVisits.length / (goal || 1)) * 100, 100);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(goal);
    const handleSaveGoal = () => { onUpdateGoal(tempGoal); setIsEditingGoal(false); };
    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center gap-6 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800' : 'bg-white border-gray-100'}`}>
                {/* Content for Goal Progress */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <h4 className={`text-sm font-bold uppercase tracking-widest ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Meta Anual de Apresentações</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{thisYearVisits.length}</span>
                                <span className="text-sm font-medium text-gray-500">/ {goal}</span>
                                {isEditingGoal ? (
                                    <div className="flex items-center gap-1 ml-2">
                                        <input type="number" className={`w-16 p-1 text-sm border rounded ${isHospitalMode ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-300'}`} value={tempGoal} onChange={e => setTempGoal(Number(e.target.value))} />
                                        <button onClick={handleSaveGoal} className="text-green-500 font-bold text-xs uppercase">OK</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingGoal(true)} className="text-[10px] text-blue-500 font-bold uppercase underline ml-2">Alterar Meta</button>
                                )}
                            </div>
                        </div>
                        <span className={`text-xl font-black ${progress >= 100 ? 'text-green-500' : 'text-purple-500'}`}>{Math.round(progress)}%</span>
                    </div>
                    <div className={`w-full h-3 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-purple-600'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            {/* List of Presentations */}
            <div className={`rounded-2xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-800/10">
                        <thead className={`text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-500' : 'bg-gray-50/50 text-gray-400'}`}>
                            <tr><th className="px-6 py-4 text-left">Data</th><th className="px-6 py-4 text-left">Destinatário</th><th className="px-6 py-4 text-left">Equipe</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-right">Ação</th></tr>
                        </thead>
                        <tbody className={`divide-y text-sm ${isHospitalMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-100 text-gray-700'}`}>
                            {visits.sort((a,b) => b.date.localeCompare(a.date)).map(visit => {
                                const targetName = visit.hospitalId ? hospitals.find(h => h.id === visit.hospitalId)?.name : doctors.find(d => d.id === visit.doctorId)?.name;
                                const teamNames = visit.memberIds.map(id => members.find(m => m.id === id)?.name.split(' ')[0]).join(', ');
                                return (
                                    <tr key={visit.id} className={`${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                        <td className="px-6 py-4 font-mono font-bold text-xs">{new Date(visit.date + 'T12:00:00').toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold">{targetName || 'Desconhecido'}</td>
                                        <td className="px-6 py-4 text-xs">{teamNames}</td>
                                        <td className="px-6 py-4">
                                            {visit.status === 'COMPLETED' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase bg-green-100 text-green-700">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Concluída
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase bg-yellow-100 text-yellow-700">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Agendada
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => onEdit(visit)} className="text-blue-500 hover:text-blue-600 font-bold text-xs uppercase">Editar</button>
                                            <button onClick={() => onDelete(visit.id)} className="text-red-500 hover:text-red-600 p-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </td>
                                    </tr>
                                )
                            })}
                            {visits.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-xs opacity-50">Nenhuma apresentação registrada.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const ColihPage: React.FC<{ state: AppState, onUpdateState: (s: AppState) => void, isHospitalMode?: boolean, view: 'doctors' | 'facilitators' | 'hospitals' | 'presentations' }> = ({ state, onUpdateState, isHospitalMode, view }) => {
    // ... keep existing state
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<Doctor | undefined>(undefined);
    const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
    const [editingFacilitator, setEditingFacilitator] = useState<Member | undefined>(undefined);
    const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<Hospital | undefined>(undefined);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [visitDoctor, setVisitDoctor] = useState<Doctor | undefined>(undefined);
    const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
    const [editingPresentation, setEditingPresentation] = useState<ColihVisit | undefined>(undefined);
    
    // Filters
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
    const [roleFilter, setRoleFilter] = useState<string>('Facilitator'); // Default strictly to Facilitator for that tab

    // Auto-select for presentation from doctor/hospital list
    const [autoSelectForPresentation, setAutoSelectForPresentation] = useState<string | null>(null);

    // Confirm Modal
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, onConfirm: () => void} | null>(null);

    // Handlers
    // ... (Keep ALL handlers identical: handleSaveDoctor, handleDeleteDoctor, handleSaveFacilitator, handleSaveHospital, handleSaveVisit, handleSavePresentation, handleDeleteVisit, handleUpdateGoal)
    const handleSaveDoctor = async (doc: Doctor) => {
        try {
            await atomicUpdate('doctors', doc);
            const updated = state.doctors.some(d => d.id === doc.id) ? state.doctors.map(d => d.id === doc.id ? doc : d) : [...state.doctors, doc];
            onUpdateState({ ...state, doctors: updated });
            setIsDoctorModalOpen(false);
            setEditingDoctor(undefined);
        } catch (e) { alert("Erro ao salvar médico."); }
    };

    const handleDeleteDoctor = (id: string) => {
        setConfirmConfig({
            isOpen: true, title: 'Excluir Médico', description: 'Tem certeza?',
            onConfirm: async () => {
                await atomicDelete('doctors', id);
                onUpdateState({ ...state, doctors: state.doctors.filter(d => d.id !== id) });
            }
        });
    };

    const handleSaveFacilitator = async (member: Member) => {
        try {
            await atomicUpdate('members', member);
            onUpdateState({ ...state, members: state.members.map(m => m.id === member.id ? member : m) });
            setIsFacilitatorModalOpen(false);
            setEditingFacilitator(undefined);
        } catch (e) { alert("Erro ao salvar facilitador."); }
    };

    const handleSaveHospital = async (h: Hospital) => {
        try {
            await atomicUpdate('hospitals', h);
            onUpdateState({ ...state, hospitals: state.hospitals.map(ho => ho.id === h.id ? h : ho) });
            setIsHospitalModalOpen(false);
            setEditingHospital(undefined);
        } catch (e) { alert("Erro ao salvar hospital."); }
    };

    const handleSaveVisit = async (notes: string, date: string, memberIds: string[], type: ColihInteractionType, newLevel?: Doctor['cooperationLevel']) => {
        if (!visitDoctor) return;
        const newVisit: ColihVisit = {
            id: crypto.randomUUID(),
            doctorId: visitDoctor.id,
            date,
            memberIds,
            notes,
            interactionType: type,
            status: 'COMPLETED',
            createdAt: new Date().toISOString()
        };
        try {
            await atomicUpdate('colih_visits', newVisit);
            if (type === 'visit' || type === 'presentation') {
                const updatedDoc = { 
                    ...visitDoctor, 
                    lastVisitDate: date,
                    cooperationLevel: newLevel || visitDoctor.cooperationLevel 
                };
                await atomicUpdate('doctors', updatedDoc);
                onUpdateState({
                    ...state,
                    colihVisits: [...state.colihVisits, newVisit],
                    doctors: state.doctors.map(d => d.id === visitDoctor.id ? updatedDoc : d)
                });
            } else {
                onUpdateState({ ...state, colihVisits: [...state.colihVisits, newVisit] });
            }
            setIsVisitModalOpen(false);
            setVisitDoctor(undefined);
        } catch (e) { alert("Erro ao registrar visita."); }
    };

    const handleSavePresentation = async (data: Partial<ColihVisit>) => {
        const isNew = !data.id;
        const visit: ColihVisit = {
            id: data.id || crypto.randomUUID(),
            date: data.date!,
            memberIds: data.memberIds || [],
            notes: data.notes || '',
            interactionType: 'presentation',
            status: data.status || 'SCHEDULED',
            createdAt: data.createdAt || new Date().toISOString(),
            hlc38Presented: data.hlc38Presented,
            collaboratorInterest: data.collaboratorInterest,
            hospitalId: data.hospitalId || undefined,
            doctorId: data.doctorId || undefined
        };

        try {
            await atomicUpdate('colih_visits', visit);
            let updatedVisits = isNew ? [...state.colihVisits, visit] : state.colihVisits.map(v => v.id === visit.id ? visit : v);
            onUpdateState({ ...state, colihVisits: updatedVisits });
            setIsPresentationModalOpen(false);
            setEditingPresentation(undefined);
        } catch (e: any) { 
            console.error("Erro presentation:", e);
            alert(`Erro ao salvar apresentação: ${e.message || "Verifique conexão"}`); 
        }
    };

    const handleDeleteVisit = (id: string) => {
        setConfirmConfig({
            isOpen: true, title: 'Excluir Registro', description: 'Tem certeza?',
            onConfirm: async () => {
                await atomicDelete('colih_visits', id);
                onUpdateState({ ...state, colihVisits: state.colihVisits.filter(v => v.id !== id) });
            }
        });
    };

    const handleUpdateGoal = async (newGoal: number) => {
        onUpdateState({ ...state, presentationGoal: newGoal });
    };

    const isCoordinator = state.currentUser?.role === UserRole.COORDINATOR;
    const userRegional = state.currentUser?.regional;

    // --- REGIONAL FILTERING ---
    const filteredDoctors = useMemo(() => {
        let list = [...state.doctors];
        if (isCoordinator && userRegional) {
            list = list.filter(d => !d.regional || d.regional === userRegional);
        }
        return list;
    }, [state.doctors, isCoordinator, userRegional]);

    const filteredHospitals = useMemo(() => {
        let list = [...state.hospitals];
        if (isCoordinator && userRegional) {
            list = list.filter(h => !h.regional || h.regional === userRegional);
        }
        return list;
    }, [state.hospitals, isCoordinator, userRegional]);

    const filteredMembers = useMemo(() => {
        let list = state.members.filter(m => m.isColih);
        if (isCoordinator && userRegional) {
            list = list.filter(m => !m.regional || m.regional === userRegional);
        }
        return list;
    }, [state.members, isCoordinator, userRegional]);

    const filteredVisits = useMemo(() => {
        let list = [...state.colihVisits];
        if (isCoordinator && userRegional) {
            // Filter by hospital region OR doctor region
            list = list.filter(v => {
                if (v.hospitalId) {
                    const h = state.hospitals.find(h => h.id === v.hospitalId);
                    return h && (!h.regional || h.regional === userRegional);
                }
                if (v.doctorId) {
                    const d = state.doctors.find(d => d.id === v.doctorId);
                    return d && (!d.regional || d.regional === userRegional);
                }
                return false; 
            });
        }
        return list;
    }, [state.colihVisits, state.hospitals, state.doctors, isCoordinator, userRegional]);

    // --- VIEW SPECIFIC SORTING ---

    const colihFacilitators = useMemo(() => {
        let list = filteredMembers; // Already filtered by regional
        if (view === 'facilitators') {
            if (roleFilter !== 'ALL') {
                list = list.filter(m => m.colihClassification === roleFilter);
            }
        }
        return list;
    }, [filteredMembers, view, roleFilter]);
    
    const availableSpecialties = useMemo(() => {
        const specs = new Set(filteredDoctors.map(d => d.specialty).filter(Boolean));
        return Array.from(specs).sort();
    }, [filteredDoctors]);

    const sortedDoctors = useMemo(() => {
        let list = [...filteredDoctors];
        if (selectedSpecialty !== 'ALL') {
            list = list.filter(d => d.specialty === selectedSpecialty);
        }
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [filteredDoctors, selectedSpecialty]);

    const sortedHospitals = useMemo(() => {
        return [...filteredHospitals].sort((a,b) => a.name.localeCompare(b.name));
    }, [filteredHospitals]);

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Header ... */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl border ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div>
                    <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>
                        {view === 'doctors' && 'Médicos & Contatos'}
                        {view === 'facilitators' && 'Membros COLIH'}
                        {view === 'hospitals' && 'Hospitais (Institucional)'}
                        {view === 'presentations' && 'Apresentações & Metas'}
                    </h2>
                    <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Gestão da Comissão de Ligação com Hospitais
                        {isCoordinator && userRegional && <span className="ml-2 bg-purple-100 text-purple-700 px-2 rounded font-bold text-xs uppercase">{userRegional}</span>}
                    </p>
                </div>
                <div>
                    {view === 'doctors' && (
                        <div className="flex gap-2">
                            <select 
                                className={`p-2.5 rounded-xl text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                                value={selectedSpecialty}
                                onChange={e => setSelectedSpecialty(e.target.value)}
                            >
                                <option value="ALL">Todas Especialidades</option>
                                {availableSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <Button onClick={() => { setEditingDoctor(undefined); setIsDoctorModalOpen(true); }} className="rounded-xl shadow-lg bg-teal-600 hover:bg-teal-700 text-white">+ Novo Médico</Button>
                        </div>
                    )}
                    {view === 'facilitators' && (
                        <select 
                            className={`p-2.5 rounded-xl text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                        >
                            <option value="Facilitator">Apenas Facilitadores</option>
                            <option value="Assistant">Ajudantes</option>
                            <option value="Secretary">Secretários</option>
                            <option value="Coordinator">Coordenadores</option>
                            <option value="President">Presidentes</option>
                            <option value="ALL">Todos os Membros</option>
                        </select>
                    )}
                    {view === 'presentations' && <Button onClick={() => { setEditingPresentation(undefined); setIsPresentationModalOpen(true); }} className="rounded-xl shadow-lg bg-purple-600 hover:bg-purple-700 text-white">+ Nova Apresentação</Button>}
                </div>
            </div>

            {view === 'doctors' && (
                <>
                    <DoctorStats doctors={filteredDoctors} isHospitalMode={isHospitalMode} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedDoctors.map(doc => (
                            <div key={doc.id} className={`p-5 rounded-2xl border flex flex-col justify-between group ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className={`font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{doc.name}</h3>
                                        <button onClick={() => { setEditingDoctor(doc); setIsDoctorModalOpen(true); }} className="text-teal-500 hover:text-teal-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                    </div>
                                    <p className="text-xs text-teal-600 font-bold uppercase tracking-wider mb-2">{doc.specialty || 'Clínico Geral'}</p>
                                    <div className="space-y-1 text-xs text-gray-500">
                                        <p>{doc.hospitalIds ? filteredHospitals.filter(h => doc.hospitalIds?.includes(h.id)).map(h => h.name).join(', ') : ''}</p>
                                        <p>{doc.city} {doc.regional ? `(${doc.regional})` : ''}</p>
                                        {doc.phone && <p>📞 {doc.phone}</p>}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-200/10 flex justify-between items-center">
                                    <button onClick={() => { setVisitDoctor(doc); setIsVisitModalOpen(true); }} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-all ${isHospitalMode ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-teal-50 hover:text-teal-600'}`}>Registrar Visita</button>
                                    <button onClick={() => { setAutoSelectForPresentation(doc.id); setIsPresentationModalOpen(true); }} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg border transition-all ${isHospitalMode ? 'bg-purple-900/20 border-purple-800 text-purple-300' : 'bg-purple-50 border-purple-100 text-purple-600'}`}>Apresentação</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {view === 'facilitators' && (
                <div className={`rounded-2xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-800/10">
                            <thead className={`text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'bg-[#1a1c1e] text-gray-500' : 'bg-gray-50/50 text-gray-400'}`}>
                                <tr><th className="px-6 py-4 text-left">Nome</th><th className="px-6 py-4 text-left">Função</th><th className="px-6 py-4 text-left">Regional</th><th className="px-6 py-4 text-right">Ação</th></tr>
                            </thead>
                            <tbody className={`divide-y text-sm ${isHospitalMode ? 'divide-gray-800 text-gray-300' : 'divide-gray-100 text-gray-700'}`}>
                                {colihFacilitators.map(m => (
                                    <tr key={m.id} className={`${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                        <td className="px-6 py-4 font-bold">{m.name}</td>
                                        <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${m.colihClassification === 'Coordinator' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>{m.colihClassification || 'Membro'}</span></td>
                                        <td className="px-6 py-4 text-xs">{m.regional || '-'} - {m.city}</td>
                                        <td className="px-6 py-4 text-right"><button onClick={() => { setEditingFacilitator(m); setIsFacilitatorModalOpen(true); }} className="text-blue-500 font-bold text-xs uppercase hover:underline">Editar</button></td>
                                    </tr>
                                ))}
                                {colihFacilitators.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-xs opacity-50">
                                            Nenhum membro encontrado com a função "{roleFilter}" nesta regional.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'hospitals' && (
                <>
                    <HospitalStats hospitals={sortedHospitals} visits={filteredVisits} isHospitalMode={isHospitalMode} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sortedHospitals.map(h => {
                            const responsibleNames = h.responsibleMemberIds?.map(id => filteredMembers.find(m => m.id === id)?.name).filter(Boolean).join(', ');
                            
                            // Lógica de Última Visita Institucional (usando visitas filtradas)
                            const hospitalVisits = filteredVisits.filter(v => v.hospitalId === h.id && v.status === 'COMPLETED');
                            const lastVisit = hospitalVisits.sort((a,b) => b.date.localeCompare(a.date))[0];
                            const lastVisitDate = lastVisit ? new Date(lastVisit.date + 'T12:00:00') : null;
                            const daysSince = lastVisitDate ? Math.floor((new Date().getTime() - lastVisitDate.getTime()) / (1000 * 3600 * 24)) : 999;
                            
                            let statusColor = isHospitalMode ? 'text-gray-500' : 'text-gray-400';
                            if (daysSince <= 90) statusColor = 'text-green-500';
                            else if (daysSince <= 180) statusColor = 'text-yellow-500';
                            else if (daysSince < 999) statusColor = 'text-red-500';

                            return (
                                <div key={h.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div>
                                        <h3 className={`font-bold text-lg ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{h.name}</h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">{h.city}</p>
                                        
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-bold uppercase text-gray-500">Última Interação</span>
                                            <span className={`text-xs font-bold ${statusColor}`}>
                                                {lastVisitDate ? lastVisitDate.toLocaleDateString() : 'Nunca visitado'}
                                            </span>
                                        </div>

                                        <div className={`p-3 rounded-xl mb-3 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Responsáveis COLIH</p>
                                            <p className={`text-xs font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{responsibleNames || 'Nenhum designado'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <Button size="sm" variant="secondary" className="flex-1 text-[10px] uppercase font-bold" onClick={() => { setEditingHospital(h); setIsHospitalModalOpen(true); }}>Dados</Button>
                                        <Button size="sm" className={`flex-1 text-[10px] uppercase font-bold bg-purple-600 hover:bg-purple-700 text-white`} onClick={() => { setAutoSelectForPresentation(h.id); setIsPresentationModalOpen(true); }}>Registrar Interação</Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {view === 'presentations' && (
                <PresentationsTab 
                    visits={filteredVisits.filter(v => v.interactionType === 'presentation')} 
                    doctors={filteredDoctors} 
                    hospitals={filteredHospitals} 
                    members={state.members} // Allow seeing all members for team display, but filter for assignment inside modal
                    goal={state.presentationGoal} 
                    isHospitalMode={isHospitalMode}
                    onEdit={(v) => { setEditingPresentation(v); setIsPresentationModalOpen(true); }}
                    onDelete={handleDeleteVisit}
                    onUpdateGoal={handleUpdateGoal}
                />
            )}

            {/* MODAIS */}
            <DoctorModal 
                isOpen={isDoctorModalOpen} 
                onClose={() => setIsDoctorModalOpen(false)} 
                doctor={editingDoctor} 
                hospitals={filteredHospitals} 
                cityMappings={state.cityMappings}
                onSave={handleSaveDoctor} 
                isHospitalMode={isHospitalMode} 
            />
            <FacilitatorModal 
                isOpen={isFacilitatorModalOpen} 
                onClose={() => setIsFacilitatorModalOpen(false)} 
                member={editingFacilitator} 
                cityMappings={state.cityMappings}
                onSave={handleSaveFacilitator} 
                isHospitalMode={isHospitalMode} 
            />
            <HospitalRegionalModal 
                isOpen={isHospitalModalOpen} 
                onClose={() => setIsHospitalModalOpen(false)} 
                hospital={editingHospital} 
                members={state.members} // All members are visible for assignment selection usually, or filter if strict
                cityMappings={state.cityMappings}
                onSave={handleSaveHospital} 
                isHospitalMode={isHospitalMode} 
            />
            {visitDoctor && (
                <VisitModal 
                    isOpen={isVisitModalOpen} 
                    onClose={() => setIsVisitModalOpen(false)} 
                    doctor={visitDoctor} 
                    currentUserId={state.currentUser?.id}
                    onSave={handleSaveVisit} 
                    isHospitalMode={isHospitalMode} 
                />
            )}
            <PresentationModal 
                isOpen={isPresentationModalOpen} 
                onClose={() => setIsPresentationModalOpen(false)} 
                presentationToEdit={editingPresentation} 
                doctors={filteredDoctors} 
                hospitals={filteredHospitals} 
                members={state.members} 
                onSave={handleSavePresentation} 
                onAddNew={(type) => { if (type === 'doctor') { setIsPresentationModalOpen(false); setIsDoctorModalOpen(true); } else { alert("Adicione hospitais na aba Hospitais."); } }}
                isHospitalMode={isHospitalMode} 
                autoSelectId={autoSelectForPresentation}
                onClearAutoSelect={() => setAutoSelectForPresentation(null)}
            />
            {confirmConfig && (
                <ConfirmModal 
                    isOpen={confirmConfig.isOpen} 
                    onClose={() => setConfirmConfig(null)} 
                    onConfirm={confirmConfig.onConfirm} 
                    title={confirmConfig.title} 
                    description={confirmConfig.description} 
                    isHospitalMode={isHospitalMode} 
                />
            )}
        </div>
    );
};
