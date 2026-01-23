
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

// --- MODAIS AUXILIARES (Atualizados com Autocomplete de Regional) ---

const DoctorModal: React.FC<{ isOpen: boolean; onClose: () => void; doctor?: Doctor; hospitals: Hospital[]; cityMappings: CityMapping[]; onSave: (d: Doctor) => void; isHospitalMode?: boolean }> = ({ isOpen, onClose, doctor, cityMappings, onSave, isHospitalMode }) => {
    // ... (mesmo conteúdo, apenas imports e funções onSave chamadas pelo pai) ...
    const [formData, setFormData] = useState<Partial<Doctor>>({});
    useEffect(() => { if (doctor) setFormData(doctor); else setFormData({ cooperationLevel: 'Unknown', isConsultant: false, treatsPediatric: false }); }, [doctor]);
    
    const handleCityChange = (city: string) => {
        const detected = getRegionalByCity(city, cityMappings);
        setFormData(prev => ({ ...prev, city, regional: detected || prev.regional }));
    };

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
    useEffect(() => { if (member) setFormData(member); }, [member]);
    
    const handleCityChange = (city: string) => {
        const detected = getRegionalByCity(city, cityMappings);
        setFormData(prev => ({ ...prev, city, regional: detected || prev.regional }));
    };

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
    // ... mantido ...
    const [formData, setFormData] = useState<Partial<Hospital>>({});
    useEffect(() => { if (hospital) setFormData(hospital); }, [hospital]);
    
    const handleCityChange = (city: string) => {
        const detected = getRegionalByCity(city, cityMappings);
        setFormData(prev => ({ ...prev, city, regional: detected || prev.regional }));
    };

    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0"><h3 className="text-white font-bold text-lg">Dados da Unidade</h3><button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button></div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Nome</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Cidade</label><input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.city || ''} onChange={e => handleCityChange(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Regional</label><select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}><option value="">Selecione...</option>{ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div className="flex justify-end gap-3 pt-4"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({ ...hospital, ...formData } as Hospital)}>Salvar</Button></div>
                </div>
            </div>
        </div>, document.body
    );
};

// ... (PresentationModal e VisitModal mantidos iguais) ...
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

// ... PresentationModal ...
const PresentationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    presentationToEdit?: ColihVisit;
    doctors: Doctor[];
    hospitals: Hospital[];
    members: Member[];
    onSave: (data: Partial<ColihVisit>) => void;
    onAddNew: (type: 'hospital' | 'doctor') => void;
    isHospitalMode?: boolean;
    autoSelectId?: string | null; 
    onClearAutoSelect?: () => void; 
}> = ({ isOpen, onClose, presentationToEdit, doctors, hospitals, members, onSave, onAddNew, isHospitalMode, autoSelectId, onClearAutoSelect }) => {
    // ... mantido ...
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
                    {/* ... campos mantidos ... */}
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
                        <div className={`border rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50'}`}>{members.filter(m => m.isColih && m.active).sort((a, b) => a.name.localeCompare(b.name)).map(m => (<label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 cursor-pointer transition-all ${selectedMembers.includes(m.id) ? 'bg-purple-100' : ''}`}><input type="checkbox" className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" checked={selectedMembers.includes(m.id)} onChange={() => toggleMember(m.id)} /><div><span className={`text-xs font-bold block ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span><span className="text-[8px] font-bold uppercase text-gray-400 tracking-wider">{m.colihClassification || 'Membro'}</span></div></label>))}</div>
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

// ... PresentationsTab e ColihPage (componentes principais) ...
const PresentationsTab: React.FC<{ visits: ColihVisit[]; doctors: Doctor[]; hospitals: Hospital[]; members: Member[]; goal: number; isHospitalMode?: boolean; onEdit: (v: ColihVisit) => void; onDelete: (id: string) => void; onUpdateGoal: (newGoal: number) => void; }> = ({ visits, doctors, hospitals, members, goal, isHospitalMode, onEdit, onDelete, onUpdateGoal }) => {
    // ... mantido ...
    const currentYear = new Date().getFullYear();
    const thisYearVisits = visits.filter(v => new Date(v.date).getFullYear() === currentYear && v.status === 'COMPLETED');
    const progress = Math.min((thisYearVisits.length / (goal || 1)) * 100, 100);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(goal);
    const handleSaveGoal = () => { onUpdateGoal(tempGoal); setIsEditingGoal(false); };
    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center gap-6 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'}`}>
                {/* ... conteúdo da tab ... */}
                <div className="flex-grow">
                    <h3 className={`font-bold text-lg ${isHospitalMode ? 'text-white' : 'text-white'}`}>Meta Anual de Apresentações</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-purple-100'}`}>Realizadas em {currentYear}: <strong>{thisYearVisits.length}</strong> de</span>
                        {isEditingGoal ? (<div className="flex items-center gap-1 animate-fade-in"><input type="number" className="w-16 px-2 py-0.5 text-black font-bold rounded text-center outline-none border-2 border-purple-300 focus:border-white" value={tempGoal} onChange={(e) => setTempGoal(Number(e.target.value))} autoFocus /><button onClick={handleSaveGoal} className="bg-white/20 hover:bg-white/40 p-1 rounded text-white transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></button></div>) : (<div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setTempGoal(goal); setIsEditingGoal(true); }} title="Clique para editar a meta"><span className="font-bold text-lg border-b border-dashed border-white/40 group-hover:border-white transition-all">{goal}</span><svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></div>)}
                    </div>
                </div>
                <div className="w-full md:w-1/3"><div className="flex justify-between text-xs mb-1 font-bold opacity-80"><span>Progresso</span><span>{Math.round(progress)}%</span></div><div className="h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10"><div className="h-full bg-white/90 transition-all duration-1000 ease-out relative" style={{ width: `${progress}%` }}>{progress > 10 && <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>}</div></div></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {visits.sort((a,b) => b.date.localeCompare(a.date)).map(visit => {
                    const targetName = visit.hospitalId ? hospitals.find(h => h.id === visit.hospitalId)?.name : doctors.find(d => d.id === visit.doctorId)?.name;
                    const isCompleted = visit.status === 'COMPLETED';
                    return (<div key={visit.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}><div><div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{isCompleted ? 'Realizada' : 'Agendada'}</span><span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{new Date(visit.date + 'T12:00:00').toLocaleDateString()}</span></div><h4 className={`text-lg font-black ${isHospitalMode ? 'text-white' : 'text-purple-700'}`}>{targetName || 'Destino Desconhecido'}</h4><p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Equipe: {visit.memberIds.map(id => members.find(m => m.id === id)?.name.split(' ')[0]).join(', ')}</p></div><div className="flex items-center gap-2 self-end md:self-auto"><button onClick={() => onEdit(visit)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${isHospitalMode ? 'border-gray-700 text-gray-300 hover:bg-white/5' : 'border-purple-200 text-purple-600 hover:bg-purple-50'}`}>{isCompleted ? 'Detalhes' : 'Gerenciar'}</button><button onClick={() => onDelete(visit.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div>);
                })}
                {visits.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Nenhuma apresentação registrada.</p>}
            </div>
        </div>
    );
};

export const ColihPage: React.FC<{ 
    state: AppState, 
    onUpdateState: (s: AppState) => void, 
    isHospitalMode?: boolean,
    view: 'doctors' | 'facilitators' | 'hospitals' | 'presentations' 
}> = ({ state, onUpdateState, isHospitalMode, view }) => {
    // ... states ...
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [editingDoctor, setEditingDoctor] = useState<Doctor | undefined>(undefined);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
    const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<Hospital | undefined>(undefined);
    const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
    const [visitingDoctor, setVisitingDoctor] = useState<Doctor | undefined>(undefined);
    const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
    const [presentationToEdit, setPresentationToEdit] = useState<ColihVisit | undefined>(undefined);
    const [pendingAutoSelect, setPendingAutoSelect] = useState<string | null>(null);
    const [doctorFilter, setDoctorFilter] = useState({ status: 'all', sort: 'name', specialty: '', regional: '' });
    const [facilitatorFilter, setFacilitatorFilter] = useState({ regional: '', hospitalId: '' });
    const [hospitalFilter, setHospitalFilter] = useState({ city: '', regional: '' });

    // Modal de Confirmação
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, onConfirm: () => void} | null>(null);

    const isCoordinator = state.currentUser?.role === UserRole.COORDINATOR;
    const userRegional = state.currentUser?.regional;

    // Utils and Memos
    const getStatusColor = (lastVisit?: string) => { if (!lastVisit) return 'bg-gray-400'; const months = (new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 3600 * 24 * 30); if (months >= 6) return 'bg-red-500'; if (months >= 5) return 'bg-yellow-500'; return 'bg-green-500'; };
    const getStatusText = (lastVisit?: string) => { if (!lastVisit) return 'Nunca Visitado'; const months = Math.floor((new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 3600 * 24 * 30)); if (months >= 6) return `Atrasado (${months} meses)`; if (months >= 5) return `Vence em breve (${months} meses)`; return `Em dia (${months} meses)`; };
    const uniqueSpecialties = useMemo(() => Array.from(new Set(state.doctors.map(d => d.specialty).filter(Boolean))).sort(), [state.doctors]);
    const uniqueCities = useMemo(() => Array.from(new Set(state.hospitals.map(h => h.city).filter(Boolean))).sort(), [state.hospitals]);
    
    const filteredDoctors = useMemo(() => { 
        let result = state.doctors.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || (d.responsibleMemberName && d.responsibleMemberName.toLowerCase().includes(searchTerm.toLowerCase()))); 
        
        if (isCoordinator && userRegional) {
            result = result.filter(d => d.regional === userRegional);
        }

        if (doctorFilter.status === 'visited') result = result.filter(d => !!d.lastVisitDate); 
        if (doctorFilter.status === 'not_visited') result = result.filter(d => !d.lastVisitDate); 
        if (doctorFilter.specialty) result = result.filter(d => d.specialty === doctorFilter.specialty); 
        if (doctorFilter.regional) result = result.filter(d => d.regional === doctorFilter.regional); 
        
        result.sort((a, b) => { if (doctorFilter.sort === 'name') return a.name.localeCompare(b.name); if (doctorFilter.sort === 'visit_desc') return (b.lastVisitDate || '').localeCompare(a.lastVisitDate || ''); if (doctorFilter.sort === 'visit_asc') return (a.lastVisitDate || '').localeCompare(b.lastVisitDate || ''); return 0; }); return result; 
    }, [state.doctors, searchTerm, doctorFilter, isCoordinator, userRegional]);
    
    const filteredFacilitators = useMemo(() => { 
        let result = state.members.filter(m => m.isColih && m.colihClassification === 'Facilitator' && m.name.toLowerCase().includes(searchTerm.toLowerCase())); 
        
        if (isCoordinator && userRegional) {
            result = result.filter(m => m.regional === userRegional);
        }

        if (facilitatorFilter.regional) result = result.filter(m => m.regional === facilitatorFilter.regional); 
        if (facilitatorFilter.hospitalId) { const hospital = state.hospitals.find(h => h.id === facilitatorFilter.hospitalId); if (hospital && hospital.responsibleMemberIds) result = result.filter(m => hospital.responsibleMemberIds!.includes(m.id)); else if (facilitatorFilter.hospitalId) result = []; } return result.sort((a,b) => a.name.localeCompare(b.name)); 
    }, [state.members, searchTerm, facilitatorFilter, state.hospitals, isCoordinator, userRegional]);
    
    const filteredHospitals = useMemo(() => { 
        let result = state.hospitals.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase())); 
        
        if (isCoordinator && userRegional) {
            result = result.filter(h => h.regional === userRegional);
        }

        if (hospitalFilter.city) result = result.filter(h => h.city === hospitalFilter.city); 
        if (hospitalFilter.regional) result = result.filter(h => h.regional === hospitalFilter.regional); 
        return result.sort((a,b) => a.name.localeCompare(b.name)); 
    }, [state.hospitals, searchTerm, hospitalFilter, isCoordinator, userRegional]);

    // Handlers (Mantidos)
    const handleSaveDoctor = async (doc: Doctor) => { 
        try { 
            await atomicUpdate('doctors', doc); 
            const updated = state.doctors.some(d => d.id === doc.id) ? state.doctors.map(d => d.id === doc.id ? doc : d) : [...state.doctors, doc]; 
            onUpdateState({ ...state, doctors: updated }); 
            setPendingAutoSelect(doc.id); 
            setIsDoctorModalOpen(false); 
        } catch (e: any) { 
            console.error(e); 
            alert(`Erro ao salvar médico: ${e.message || 'Verifique o banco de dados.'}`); 
        } 
    };
    const handleSaveMember = async (mem: Member) => { 
        try { 
            await atomicUpdate('members', mem); 
            const updated = state.members.map(m => m.id === mem.id ? mem : m); 
            onUpdateState({ ...state, members: updated }); 
            setIsFacilitatorModalOpen(false); 
        } catch (e: any) { 
            console.error(e); 
            alert(`Erro ao salvar membro: ${e.message || 'Coluna ausente no DB? Rode o script de migração.'}`); 
        } 
    };
    const handleSaveHospital = async (hos: Hospital) => { 
        try { 
            await atomicUpdate('hospitals', hos); 
            const updated = state.hospitals.map(h => h.id === hos.id ? hos : h); 
            onUpdateState({ ...state, hospitals: updated }); 
            setPendingAutoSelect(hos.id); 
            setIsHospitalModalOpen(false); 
        } catch (e: any) { 
            console.error(e); 
            alert(`Erro ao salvar hospital: ${e.message}`); 
        } 
    };
    const handleSaveVisit = async (notes: string, date: string, memberIds: string[], type: ColihInteractionType) => { 
        if (!visitingDoctor) return; 
        const visit: ColihVisit = { id: crypto.randomUUID(), doctorId: visitingDoctor.id, date, memberIds, notes, interactionType: type, status: 'COMPLETED', createdAt: new Date().toISOString() }; 
        const updatedDoctor = { ...visitingDoctor, lastVisitDate: date }; 
        try { 
            await atomicUpdate('colih_visits', visit); 
            await atomicUpdate('doctors', updatedDoctor); 
            const updatedDoctors = state.doctors.map(d => d.id === updatedDoctor.id ? updatedDoctor : d); 
            const updatedVisits = [...state.colihVisits, visit]; 
            onUpdateState({ ...state, doctors: updatedDoctors, colihVisits: updatedVisits }); 
            setVisitingDoctor(undefined); 
        } catch (e: any) { alert(`Erro ao registrar visita: ${e.message}`); } 
    };
    const handleSavePresentation = async (data: Partial<ColihVisit>) => { 
        const visit: ColihVisit = { id: data.id || crypto.randomUUID(), createdAt: presentationToEdit?.createdAt || new Date().toISOString(), date: data.date || new Date().toISOString(), memberIds: data.memberIds || [], notes: data.notes || '', interactionType: 'presentation', status: data.status || 'SCHEDULED', hospitalId: data.hospitalId, doctorId: data.doctorId, hlc38Presented: data.hlc38Presented, collaboratorInterest: data.collaboratorInterest }; 
        try { 
            await atomicUpdate('colih_visits', visit); 
            const updatedVisits = data.id ? state.colihVisits.map(v => v.id === data.id ? visit : v) : [...state.colihVisits, visit]; 
            onUpdateState({ ...state, colihVisits: updatedVisits }); 
            setIsPresentationModalOpen(false); 
            setPresentationToEdit(undefined); 
        } catch (e: any) { alert(`Erro ao salvar apresentação: ${e.message}`); } 
    };
    const handleDeletePresentation = (id: string) => { 
        setConfirmConfig({
            isOpen: true,
            title: 'Excluir Apresentação',
            description: 'Tem certeza que deseja excluir este registro de apresentação? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try { 
                    await atomicDelete('colih_visits', id); 
                    const updated = state.colihVisits.filter(v => v.id !== id); 
                    onUpdateState({ ...state, colihVisits: updated }); 
                    setConfirmConfig(null);
                } catch (e) { 
                    alert("Erro ao excluir."); 
                } 
            }
        });
    };

    const getPageTitle = () => {
        switch(view) {
            case 'doctors': return 'Lista de Médicos';
            case 'facilitators': return 'Facilitadores';
            case 'hospitals': return 'Hospitais (Comissão)';
            case 'presentations': return 'Apresentações';
            default: return 'Gestão COLIH';
        }
    }

    // Filtrar listas para modais
    const availableMembers = useMemo(() => {
        if (isCoordinator && userRegional) {
            return state.members.filter(m => m.regional === userRegional);
        }
        return state.members;
    }, [state.members, isCoordinator, userRegional]);

    return (
        <>
            <div className="space-y-6 pb-12 animate-fade-in">
                {/* ... conteúdo da página mantido ... */}
                <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col gap-4`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{getPageTitle()}</h2>
                            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Gestão específica para Comissão de Ligação com Hospitais.
                                {isCoordinator && userRegional && <span className="bg-teal-100 text-teal-700 px-2 rounded font-bold ml-2 text-xs">{userRegional}</span>}
                            </p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input type="text" placeholder="Buscar..." className={`flex-grow md:w-64 p-2.5 rounded-xl border-2 text-sm outline-none focus:border-teal-500 transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            {view === 'doctors' && <Button className="bg-teal-600 hover:bg-teal-700 rounded-xl" onClick={() => { setEditingDoctor(undefined); setIsDoctorModalOpen(true); }}>+ Médico</Button>}
                            {view === 'presentations' && <Button className="bg-purple-600 hover:bg-purple-700 rounded-xl whitespace-nowrap" onClick={() => { setPresentationToEdit(undefined); setIsPresentationModalOpen(true); }}>+ Nova Apresentação</Button>}
                        </div>
                    </div>
                </div>

                {/* --- 1. LISTA DE MÉDICOS --- */}
                {view === 'doctors' && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-3 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            {/* ... filtros ... */}
                            <div className={`flex items-center p-1 rounded-lg border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-200/50 border-gray-200'}`}><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg></button><button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button></div>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={doctorFilter.status} onChange={e => setDoctorFilter({...doctorFilter, status: e.target.value})}><option value="all">Todos os Status</option><option value="visited">Visitados</option><option value="not_visited">Não Visitados</option></select>
                            <select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={doctorFilter.sort} onChange={e => setDoctorFilter({...doctorFilter, sort: e.target.value})}><option value="name">Nome (A-Z)</option><option value="visit_desc">Recentes Primeiro</option><option value="visit_asc">Antigos Primeiro</option></select>
                            <select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={doctorFilter.specialty} onChange={e => setDoctorFilter({...doctorFilter, specialty: e.target.value})}><option value="">Todas Especialidades</option>{uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}</select>
                            <select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={doctorFilter.regional} onChange={e => setDoctorFilter({...doctorFilter, regional: e.target.value})}><option value="">Todas Regionais</option>{ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}</select>
                        </div>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {filteredDoctors.map(doc => {
                                    const statusColor = getStatusColor(doc.lastVisitDate);
                                    return (
                                        <div key={doc.id} className={`relative p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${statusColor}`} title={getStatusText(doc.lastVisitDate)}></div>
                                            <div className="mb-4"><h3 className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{doc.name}</h3><p className="text-teal-500 font-bold text-xs uppercase tracking-widest">{doc.specialty}</p>{doc.regional && <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-bold border border-gray-200 uppercase">{doc.regional}</span>}</div>
                                            <div className={`p-3 rounded-xl mb-4 space-y-2 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}><div className="flex justify-between text-xs"><span className="text-gray-500 font-bold uppercase">Nível</span><span className={`font-bold ${doc.cooperationLevel === 'High' ? 'text-green-500' : doc.cooperationLevel === 'Low' ? 'text-red-500' : 'text-yellow-500'}`}>{doc.cooperationLevel === 'High' ? 'Excelente' : doc.cooperationLevel === 'Medium' ? 'Regular' : 'Resistente'}</span></div><div className="flex justify-between text-xs"><span className="text-gray-500 font-bold uppercase">Última Visita</span><span className={`font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{doc.lastVisitDate ? new Date(doc.lastVisitDate + 'T12:00:00').toLocaleDateString() : '-'}</span></div></div>
                                            <div className="mt-auto grid grid-cols-2 gap-2"><button onClick={() => { setEditingDoctor(doc); setIsDoctorModalOpen(true); }} className={`py-2 rounded-lg text-xs font-bold uppercase border ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Editar</button><button onClick={() => setVisitingDoctor(doc)} className="py-2 rounded-lg text-xs font-bold uppercase bg-teal-600 text-white hover:bg-teal-700">Interagir</button></div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={`rounded-xl border overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="min-w-full divide-y divide-gray-200/10">
                                        <thead className={`text-[10px] font-black uppercase text-gray-500 ${isHospitalMode ? 'bg-white/5' : 'bg-gray-50'}`}><tr><th className="px-6 py-4 text-left">Médico</th><th className="px-6 py-4 text-left">Especialidade</th><th className="px-6 py-4 text-left">Regional</th><th className="px-6 py-4 text-left">Nível</th><th className="px-6 py-4 text-left">Última Visita</th><th className="px-6 py-4 text-right">Ações</th></tr></thead>
                                        <tbody className="divide-y divide-gray-200/10 text-xs">
                                            {filteredDoctors.map(doc => (
                                                <tr key={doc.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}><td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{doc.name}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.specialty}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.regional || '-'}</td><td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${doc.cooperationLevel === 'High' ? 'bg-green-100 text-green-700' : doc.cooperationLevel === 'Low' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{doc.cooperationLevel === 'High' ? 'Excelente' : doc.cooperationLevel === 'Medium' ? 'Regular' : doc.cooperationLevel === 'Low' ? 'Baixo' : '?'}</span></td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.lastVisitDate ? new Date(doc.lastVisitDate + 'T12:00:00').toLocaleDateString() : '-'}</td><td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={() => { setEditingDoctor(doc); setIsDoctorModalOpen(true); }} className="text-blue-500 hover:underline">Editar</button><button onClick={() => setVisitingDoctor(doc)} className="text-teal-600 font-bold hover:underline">Interagir</button></td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 2. FACILITADORES --- */}
                {view === 'facilitators' && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-3 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            {/* ... filtros ... */}
                            <div className={`flex items-center p-1 rounded-lg border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-200/50 border-gray-200'}`}><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg></button><button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button></div>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={facilitatorFilter.regional} onChange={e => setFacilitatorFilter({...facilitatorFilter, regional: e.target.value})}><option value="">Todas Regionais</option>{ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}</select>
                            <select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={facilitatorFilter.hospitalId} onChange={e => setFacilitatorFilter({...facilitatorFilter, hospitalId: e.target.value})}><option value="">Todos Hospitais</option>{state.hospitals.sort((a,b) => a.name.localeCompare(b.name)).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
                        </div>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                                {filteredFacilitators.map(mem => (
                                    <div key={mem.id} className={`p-5 rounded-2xl border shadow-sm flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}><div className="flex items-center gap-3 mb-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isHospitalMode ? 'bg-gray-700 text-gray-300' : 'bg-teal-100 text-teal-600'}`}>{mem.name.substring(0,2).toUpperCase()}</div><div><h3 className={`font-bold ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{mem.name}</h3><p className="text-xs text-gray-500">{mem.congregation}</p></div></div><div className={`p-3 rounded-xl mb-4 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 font-bold uppercase">Regional</p><p className={`font-bold text-sm ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{mem.regional || 'Não definida'}</p></div><button onClick={() => { setEditingMember(mem); setIsFacilitatorModalOpen(true); }} className={`w-full py-2 rounded-lg text-xs font-bold uppercase border ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Editar Regional</button></div>
                                ))}
                            </div>
                        ) : (
                            <div className={`rounded-xl border overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                <div className="overflow-x-auto custom-scrollbar"><table className="min-w-full divide-y divide-gray-200/10"><thead className={`text-[10px] font-black uppercase text-gray-500 ${isHospitalMode ? 'bg-white/5' : 'bg-gray-50'}`}><tr><th className="px-6 py-4 text-left">Nome</th><th className="px-6 py-4 text-left">Congregação</th><th className="px-6 py-4 text-left">Regional</th><th className="px-6 py-4 text-left">Classificação</th><th className="px-6 py-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-200/10 text-xs">{filteredFacilitators.map(mem => <tr key={mem.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}><td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{mem.name}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{mem.congregation}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{mem.regional || '-'}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{mem.colihClassification}</td><td className="px-6 py-4 text-right"><button onClick={() => { setEditingMember(mem); setIsFacilitatorModalOpen(true); }} className="text-blue-500 hover:underline">Editar</button></td></tr>)}</tbody></table></div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 3. HOSPITAIS --- */}
                {view === 'hospitals' && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-3 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}><div className={`flex items-center p-1 rounded-lg border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-200/50 border-gray-200'}`}><button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg></button><button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button></div><div className="w-px h-6 bg-gray-300 mx-1"></div><select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={hospitalFilter.city} onChange={e => setHospitalFilter({...hospitalFilter, city: e.target.value})}><option value="">Todas Cidades</option>{uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}</select><select className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`} value={hospitalFilter.regional} onChange={e => setHospitalFilter({...hospitalFilter, regional: e.target.value})}><option value="">Todas Regionais</option>{ALL_REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {filteredHospitals.map(h => (
                                    <div key={h.id} className={`p-5 rounded-2xl border shadow-sm flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}><div className="mb-4"><h3 className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{h.name}</h3><p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{h.city}</p></div><div className={`p-3 rounded-xl mb-4 space-y-2 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}><div><p className="text-[10px] text-gray-500 font-bold uppercase">Endereço</p><p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>{h.address}</p></div><div className="flex justify-between"><div><p className="text-[10px] text-gray-500 font-bold uppercase">Regional</p><p className={`font-bold text-xs ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{h.regional || '-'}</p></div></div></div>{h.responsibleMemberIds && h.responsibleMemberIds.length > 0 && (<div className="mb-4"><p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Responsáveis</p><div className="flex flex-wrap gap-1">{h.responsibleMemberIds.map(mid => { const mem = state.members.find(m => m.id === mid); return mem ? (<span key={mid} className="text-[9px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold border border-teal-200">{mem.name.split(' ')[0]}</span>) : null; })}</div></div>)}<button onClick={() => { setEditingHospital(h); setIsHospitalModalOpen(true); }} className={`w-full py-2 rounded-lg text-xs font-bold uppercase border ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Editar Dados</button></div>
                                ))}
                            </div>
                        ) : (
                            <div className={`rounded-xl border overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                <div className="overflow-x-auto custom-scrollbar"><table className="min-w-full divide-y divide-gray-200/10"><thead className={`text-[10px] font-black uppercase text-gray-500 ${isHospitalMode ? 'bg-white/5' : 'bg-gray-50'}`}><tr><th className="px-6 py-4 text-left">Hospital</th><th className="px-6 py-4 text-left">Cidade</th><th className="px-6 py-4 text-left">Regional</th><th className="px-6 py-4 text-left">Responsáveis</th><th className="px-6 py-4 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-200/10 text-xs">{filteredHospitals.map(h => <tr key={h.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}><td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{h.name}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{h.city}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{h.regional || '-'}</td><td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{h.responsibleMemberIds?.length ? h.responsibleMemberIds.length + ' membros' : 'Nenhum'}</td><td className="px-6 py-4 text-right"><button onClick={() => { setEditingHospital(h); setIsHospitalModalOpen(true); }} className="text-blue-500 hover:underline">Editar</button></td></tr>)}</tbody></table></div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- 4. APRESENTAÇÕES --- */}
                {view === 'presentations' && (
                    <PresentationsTab 
                        visits={state.colihVisits.filter(v => v.interactionType === 'presentation')} 
                        doctors={state.doctors} 
                        hospitals={state.hospitals}
                        members={availableMembers} 
                        goal={state.presentationGoal}
                        isHospitalMode={isHospitalMode}
                        onEdit={(v) => { setPresentationToEdit(v); setIsPresentationModalOpen(true); }}
                        onDelete={handleDeletePresentation}
                        onUpdateGoal={(newGoal) => onUpdateState({...state, presentationGoal: newGoal})}
                    />
                )}
            </div>

            {/* MODALS RENDERIZADOS */}
            <DoctorModal isOpen={isDoctorModalOpen} onClose={() => setIsDoctorModalOpen(false)} doctor={editingDoctor} hospitals={state.hospitals} cityMappings={state.cityMappings} onSave={handleSaveDoctor} isHospitalMode={isHospitalMode} />
            <FacilitatorModal isOpen={isFacilitatorModalOpen} onClose={() => setIsFacilitatorModalOpen(false)} member={editingMember} cityMappings={state.cityMappings} onSave={handleSaveMember} isHospitalMode={isHospitalMode} />
            <HospitalRegionalModal isOpen={isHospitalModalOpen} onClose={() => setIsHospitalModalOpen(false)} hospital={editingHospital} members={state.members} cityMappings={state.cityMappings} onSave={handleSaveHospital} isHospitalMode={isHospitalMode} />
            {visitingDoctor && <VisitModal isOpen={true} onClose={() => setVisitingDoctor(undefined)} doctor={visitingDoctor} currentUserId={state.currentUser?.id} onSave={handleSaveVisit} isHospitalMode={isHospitalMode} />}
            
            <PresentationModal 
                isOpen={isPresentationModalOpen}
                onClose={() => setIsPresentationModalOpen(false)}
                presentationToEdit={presentationToEdit}
                doctors={state.doctors}
                hospitals={state.hospitals}
                members={state.members}
                onSave={handleSavePresentation}
                onAddNew={(type) => {
                    if (type === 'doctor') {
                        setEditingDoctor(undefined);
                        setIsDoctorModalOpen(true);
                    } else {
                        setEditingHospital(undefined);
                        setIsHospitalModalOpen(true);
                    }
                }}
                isHospitalMode={isHospitalMode}
                autoSelectId={pendingAutoSelect} 
                onClearAutoSelect={() => setPendingAutoSelect(null)} 
            />

            {/* Modal de Confirmação */}
            {confirmConfig && (
                <ConfirmModal 
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig(null)}
                    onConfirm={confirmConfig.onConfirm}
                    title={confirmConfig.title}
                    description={confirmConfig.description}
                    isDestructive={true}
                    isHospitalMode={isHospitalMode}
                />
            )}
        </>
    );
};
