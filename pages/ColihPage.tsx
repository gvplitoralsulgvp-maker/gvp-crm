
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
    const v1y = getCount(365);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
             <div className={`p-4 rounded-2xl border flex flex-col justify-center h-28 ${isHospitalMode ? 'bg-teal-900/10 border-teal-900/30' : 'bg-teal-50 border-teal-100'}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-500 rounded-xl text-white shadow-lg shadow-teal-500/30">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-teal-400' : 'text-teal-700'}`}>Total Médicos</p>
                        <p className={`text-2xl font-black ${isHospitalMode ? 'text-white' : 'text-teal-900'}`}>{total}</p>
                    </div>
                </div>
             </div>
             
             {/* 3 Months */}
             <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Últimos 3 Meses</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHospitalMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                        {total > 0 ? Math.round((v3m / total) * 100) : 0}%
                    </span>
                </div>
                <div>
                    <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{v3m}</p>
                    <div className={`w-full h-1.5 mt-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${total > 0 ? (v3m / total) * 100 : 0}%` }}></div>
                    </div>
                </div>
             </div>

             {/* 6 Months */}
             <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Últimos 6 Meses</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                        {total > 0 ? Math.round((v6m / total) * 100) : 0}%
                    </span>
                </div>
                <div>
                    <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{v6m}</p>
                    <div className={`w-full h-1.5 mt-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${total > 0 ? (v6m / total) * 100 : 0}%` }}></div>
                    </div>
                </div>
             </div>

             {/* 1 Year */}
             <div className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex justify-between items-start">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Últimos 12 Meses</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHospitalMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                        {total > 0 ? Math.round((v1y / total) * 100) : 0}%
                    </span>
                </div>
                <div>
                    <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{v1y}</p>
                    <div className={`w-full h-1.5 mt-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full bg-purple-500" style={{ width: `${total > 0 ? (v1y / total) * 100 : 0}%` }}></div>
                    </div>
                </div>
             </div>
        </div>
    )
};

// ... MODAIS AUXILIARES ...
const DoctorModal: React.FC<{ isOpen: boolean; onClose: () => void; doctor?: Doctor; hospitals: Hospital[]; cityMappings: CityMapping[]; onSave: (d: Doctor) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, doctor, cityMappings, onSave, isHospitalMode }) => {
    const [formData, setFormData] = useState<Partial<Doctor>>({});
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
                        <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Regional</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}><option value="">Automática / Selecione</option>{ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
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
    const [formData, setFormData] = useState<Partial<Member>>({});
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
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Regional</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}><option value="">Selecione...</option>{ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({...formData} as Member)}>Salvar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const HospitalRegionalModal: React.FC<{ isOpen: boolean; onClose: () => void; hospital?: Hospital; members: Member[]; cityMappings: CityMapping[]; onSave: (h: Hospital) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, hospital, members, cityMappings, onSave, isHospitalMode }) => {
    const [formData, setFormData] = useState<Partial<Hospital>>({});
    useEffect(() => { if (hospital) setFormData(hospital); }, [hospital, isOpen]);
    const handleCityChange = (city: string) => { const detected = getRegionalByCity(city, cityMappings); setFormData(prev => ({ ...prev, city, regional: detected || prev.regional })); };
    const toggleResponsible = (memberId: string) => { const current = formData.responsibleMemberIds || []; if (current.includes(memberId)) { setFormData({ ...formData, responsibleMemberIds: current.filter(id => id !== memberId) }); } else { setFormData({ ...formData, responsibleMemberIds: [...current, memberId] }); } };
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0"><h3 className="text-white font-bold text-lg">Dados da Unidade</h3><button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button></div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nome</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Cidade</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.city || ''} onChange={e => handleCityChange(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Regional</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}><option value="">Selecione...</option>{ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="space-y-2 pt-2 border-t border-gray-200/20"><label className="text-[10px] font-bold uppercase text-gray-500">Membros Responsáveis (COLIH)</label><div className={`border rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50'}`}>{members.filter(m => m.isColih && m.active && m.colihClassification !== 'Facilitator').sort((a,b) => a.name.localeCompare(b.name)).map(m => (<label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-all ${formData.responsibleMemberIds?.includes(m.id) ? 'bg-teal-100' : ''}`}><input type="checkbox" className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500" checked={formData.responsibleMemberIds?.includes(m.id) || false} onChange={() => toggleResponsible(m.id)} /><div><span className={`text-xs font-bold block ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span><span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">{m.colihClassification || 'Membro'}</span></div></label>))}</div><p className="text-[10px] text-gray-400 italic">Selecione ao menos 2 membros.</p></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({ ...hospital, ...formData } as Hospital)}>Salvar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const VisitModal: React.FC<{ isOpen: boolean; onClose: () => void; doctor: Doctor; currentUserId?: string; onSave: (notes: string, date: string, memberIds: string[], type: ColihInteractionType) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, doctor, currentUserId, onSave, isHospitalMode }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [type, setType] = useState<ColihInteractionType>('visit');
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
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Resumo</label><textarea rows={3} className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={notes} onChange={e => setNotes(e.target.value)} /></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave(notes, date, currentUserId ? [currentUserId] : [], type)}>Registrar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

const PresentationModal: React.FC<{ isOpen: boolean; onClose: () => void; presentationToEdit?: ColihVisit; doctors: Doctor[]; hospitals: Hospital[]; members: Member[]; onSave: (data: Partial<ColihVisit>) => void; onAddNew: (type: 'hospital' | 'doctor') => void; isHospitalMode?: boolean; autoSelectId?: string | null; onClearAutoSelect?: () => void; }> = ({ isOpen, onClose, presentationToEdit, doctors, hospitals, members, onSave, onAddNew, isHospitalMode, autoSelectId, onClearAutoSelect }) => {
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
        onSave({ id: presentationToEdit?.id, date, memberIds: selectedMembers, notes, interactionType: 'presentation', hlc38Presented: hlc38, collaboratorInterest: interest, status: status, hospitalId: targetType === 'hospital' ? selectedId : undefined, doctorId: targetType === 'doctor' ? selectedId : undefined });
    };

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) setSelectedMembers(prev => prev.filter(m => m !== id));
        else setSelectedMembers(prev => [...prev, id]);
    };

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
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Equipe Designada (Membros COLIH)</label>
                        <div className={`border rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50'}`}>{members.filter(m => m.active && (m.isColih || m.role === UserRole.COORDINATOR || m.colihClassification === 'Coordinator')).sort((a, b) => a.name.localeCompare(b.name)).map(m => (<label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-all ${selectedMembers.includes(m.id) ? 'bg-purple-100' : ''}`}><input type="checkbox" className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} /><div><span className={`text-xs font-bold block ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span><span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">{m.colihClassification || 'Membro'}</span></div></label>))}</div>
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
    // State for modals
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
    
    // Auto-select for presentation from doctor/hospital list
    const [autoSelectForPresentation, setAutoSelectForPresentation] = useState<string | null>(null);

    // Confirm Modal
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, onConfirm: () => void} | null>(null);

    // Handlers
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

    const handleSaveVisit = async (notes: string, date: string, memberIds: string[], type: ColihInteractionType) => {
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
            // Update last visit date on doctor
            if (type === 'visit' || type === 'presentation') {
                const updatedDoc = { ...visitDoctor, lastVisitDate: date };
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
            // Importante: Enviar null para o ID que não está sendo usado
            hospitalId: data.hospitalId || null as any,
            doctorId: data.doctorId || null as any
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
        // Goal is stored in AppState but ideally should be persisted. For now assuming it's part of settings or handled implicitly.
        // Assuming we persist it if we had a settings table, but atomicUpdate supports generic tables.
        // For simplicity, just update local state.
        onUpdateState({ ...state, presentationGoal: newGoal });
    };

    const isCoordinator = state.currentUser?.role === UserRole.COORDINATOR;
    const userRegional = state.currentUser?.regional;

    const colihMembers = useMemo(() => {
        let list = state.members.filter(m => m.isColih);
        if (isCoordinator && userRegional) {
            // Coordinator sees members of their regional OR unassigned (permissive)
            list = list.filter(m => !m.regional || m.regional === userRegional);
        }
        return list;
    }, [state.members, isCoordinator, userRegional]);
    
    const sortedDoctors = useMemo(() => {
        let list = [...state.doctors];
        if (isCoordinator && userRegional) {
            // Coordinator sees doctors of their regional OR unassigned (permissive)
            list = list.filter(d => !d.regional || d.regional === userRegional);
        }
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [state.doctors, isCoordinator, userRegional]);

    const sortedHospitals = useMemo(() => {
        let list = [...state.hospitals];
        if (isCoordinator && userRegional) {
            // Coordinator sees hospitals of their regional OR unassigned (permissive)
            list = list.filter(h => !h.regional || h.regional === userRegional);
        }
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [state.hospitals, isCoordinator, userRegional]);

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Header / Nav handled by App Layout mostly, but we can add title/actions */}
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
                    {view === 'doctors' && <Button onClick={() => { setEditingDoctor(undefined); setIsDoctorModalOpen(true); }} className="rounded-xl shadow-lg bg-teal-600 hover:bg-teal-700 text-white">+ Novo Médico</Button>}
                    {view === 'presentations' && <Button onClick={() => { setEditingPresentation(undefined); setIsPresentationModalOpen(true); }} className="rounded-xl shadow-lg bg-purple-600 hover:bg-purple-700 text-white">+ Nova Apresentação</Button>}
                </div>
            </div>

            {view === 'doctors' && (
                <>
                    <DoctorStats doctors={state.doctors} isHospitalMode={isHospitalMode} />
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
                                        <p>{doc.hospitalIds ? state.hospitals.filter(h => doc.hospitalIds?.includes(h.id)).map(h => h.name).join(', ') : ''}</p>
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
                                {colihMembers.map(m => (
                                    <tr key={m.id} className={`${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                        <td className="px-6 py-4 font-bold">{m.name}</td>
                                        <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${m.colihClassification === 'Coordinator' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>{m.colihClassification || 'Membro'}</span></td>
                                        <td className="px-6 py-4 text-xs">{m.regional || '-'} - {m.city}</td>
                                        <td className="px-6 py-4 text-right"><button onClick={() => { setEditingFacilitator(m); setIsFacilitatorModalOpen(true); }} className="text-blue-500 font-bold text-xs uppercase hover:underline">Editar</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'hospitals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedHospitals.map(h => {
                        const responsibleNames = h.responsibleMemberIds?.map(id => state.members.find(m => m.id === id)?.name).filter(Boolean).join(', ');
                        return (
                            <div key={h.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <div>
                                    <h3 className={`font-bold text-lg ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{h.name}</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">{h.city}</p>
                                    <div className={`p-3 rounded-xl mb-3 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Responsáveis COLIH</p>
                                        <p className={`text-xs font-medium ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{responsibleNames || 'Nenhum designado'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" variant="secondary" className="flex-1 text-[10px] uppercase font-bold" onClick={() => { setEditingHospital(h); setIsHospitalModalOpen(true); }}>Editar Dados</Button>
                                    <Button size="sm" className={`flex-1 text-[10px] uppercase font-bold bg-purple-600 hover:bg-purple-700 text-white`} onClick={() => { setAutoSelectForPresentation(h.id); setIsPresentationModalOpen(true); }}>Apresentação</Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {view === 'presentations' && (
                <PresentationsTab 
                    visits={state.colihVisits.filter(v => v.interactionType === 'presentation')} 
                    doctors={state.doctors} 
                    hospitals={state.hospitals} 
                    members={state.members} 
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
                hospitals={state.hospitals} 
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
                members={state.members} 
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
                doctors={state.doctors} 
                hospitals={state.hospitals} 
                members={state.members} 
                onSave={handleSavePresentation} 
                onAddNew={(type) => { if (type === 'doctor') { setIsPresentationModalOpen(false); setIsDoctorModalOpen(true); } else { /* Can implement add hospital if needed or just alert */ alert("Adicione hospitais na aba Hospitais."); } }}
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
