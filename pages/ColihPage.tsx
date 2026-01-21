
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppState, Doctor, ColihVisit, ColihInteractionType, Member, Hospital } from '../types';
import { Button } from '../components/Button';
import { atomicUpdate } from '../services/storageService';

const INTERACTION_TYPES: { id: ColihInteractionType, label: string }[] = [
    { id: 'visit', label: 'Visita de Rotina' },
    { id: 'presentation', label: 'Apresentação Formal' },
    { id: 'material_delivery', label: 'Entrega de Material' },
    { id: 'email_phone', label: 'Contato Tel/Email' }
];

const REGIONALS = ["Litoral Sul 1", "Litoral Sul 2", "Litoral Sul 3"];

const DoctorModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    doctor?: Doctor; 
    hospitals: Hospital[];
    onSave: (d: Doctor) => void; 
    isHospitalMode?: boolean 
}> = ({ isOpen, onClose, doctor, onSave, isHospitalMode }) => {
    const [formData, setFormData] = useState<Partial<Doctor>>({});

    useEffect(() => {
        if (doctor) setFormData(doctor);
        else setFormData({ cooperationLevel: 'Unknown', isConsultant: false, treatsPediatric: false });
    }, [doctor]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!formData.name || !formData.specialty) return alert("Nome e Especialidade são obrigatórios.");
        onSave({ ...formData, id: formData.id || crypto.randomUUID() } as Doctor);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-bold text-lg">{doctor ? 'Editar Médico' : 'Novo Médico'}</h3>
                    <button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nome</label>
                            <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Especialidade</label>
                            <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.specialty || ''} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nível de Cooperação</label>
                            <select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.cooperationLevel || 'Unknown'} onChange={e => setFormData({...formData, cooperationLevel: e.target.value as any})}>
                                <option value="Unknown">Desconhecido</option>
                                <option value="Low">Baixo</option>
                                <option value="Medium">Médio</option>
                                <option value="High">Alto (Excelente)</option>
                            </select>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Regional</label>
                            <select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}>
                                <option value="">Selecione...</option>
                                {REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Endereço (Consultório)</label>
                        <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Membro Responsável (GVP/COLIH)</label>
                        <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.responsibleMemberName || ''} onChange={e => setFormData({...formData, responsibleMemberName: e.target.value})} placeholder="Quem cuida deste médico?" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.isConsultant || false} onChange={e => setFormData({...formData, isConsultant: e.target.checked})} className="w-5 h-5 text-teal-600 rounded" />
                            <span className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>É Consultor?</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={formData.treatsPediatric || false} onChange={e => setFormData({...formData, treatsPediatric: e.target.checked})} className="w-5 h-5 text-teal-600 rounded" />
                            <span className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Atende Pediatria?</span>
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSubmit} className="bg-teal-600 hover:bg-teal-700">Salvar</Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const FacilitatorModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    member?: Member; 
    onSave: (m: Member) => void; 
    isHospitalMode?: boolean 
}> = ({ isOpen, onClose, member, onSave, isHospitalMode }) => {
    const [formData, setFormData] = useState<Partial<Member>>({});

    useEffect(() => {
        if (member) setFormData(member);
    }, [member]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!formData.regional || !formData.colihClassification) return alert("Preencha todos os campos.");
        onSave({ ...formData } as Member);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-bold text-lg">Editar Membro COLIH</h3>
                    <button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nome</label>
                        <input disabled className={`w-full p-3 border rounded-xl outline-none opacity-60 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-100'}`} value={formData.name || ''} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Classificação</label>
                        <select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.colihClassification || 'Member'} onChange={e => setFormData({...formData, colihClassification: e.target.value as any})}>
                            <option value="Member">Membro Regular</option>
                            <option value="Facilitator">Facilitador (Ajudante)</option>
                            <option value="Secretary">Secretário</option>
                            <option value="Coordinator">Coordenador</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Regional</label>
                        <select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.regional || ''} onChange={e => setFormData({...formData, regional: e.target.value})}>
                            <option value="">Selecione...</option>
                            {REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSubmit} className="bg-teal-600 hover:bg-teal-700">Salvar</Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const VisitModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    doctor: Doctor;
    currentUserId?: string;
    onSave: (notes: string, date: string, memberIds: string[], type: ColihInteractionType, topics?: string, material?: string, nextSteps?: string) => void;
    isHospitalMode?: boolean;
}> = ({ isOpen, onClose, doctor, currentUserId, onSave, isHospitalMode }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [type, setType] = useState<ColihInteractionType>('visit');
    const [topics, setTopics] = useState('');
    const [material, setMaterial] = useState('');
    const [nextSteps, setNextSteps] = useState('');

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
             <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-lg">Registrar Interação</h3>
                        <p className="text-teal-100 text-xs font-bold uppercase tracking-widest">{doctor.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Data</label>
                            <input type="date" className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo</label>
                            <select className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={type} onChange={e => setType(e.target.value as ColihInteractionType)}>
                                {INTERACTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Assuntos Tratados</label>
                        <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} placeholder="Ex: Protocolo de sangramento..." value={topics} onChange={e => setTopics(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Material Entregue</label>
                        <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} placeholder="Ex: Artigo científico X..." value={material} onChange={e => setMaterial(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Resumo da Conversa</label>
                        <textarea rows={3} className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} placeholder="Detalhes importantes..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Próximos Passos</label>
                        <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} placeholder="Ex: Voltar em 3 meses..." value={nextSteps} onChange={e => setNextSteps(e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={() => onSave(notes, date, currentUserId ? [currentUserId] : [], type, topics, material, nextSteps)} className="bg-teal-600 hover:bg-teal-700">Registrar</Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const ReportsTab: React.FC<{
    doctors: Doctor[];
    visits: ColihVisit[];
    members: Member[];
    isHospitalMode?: boolean;
}> = ({ doctors, visits, members, isHospitalMode }) => {
    const sortedVisits = [...visits].sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className={`rounded-xl border overflow-hidden ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200/10">
                    <thead className="bg-gray-50/5 text-[10px] font-black uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-4 text-left">Data</th>
                            <th className="px-6 py-4 text-left">Médico</th>
                            <th className="px-6 py-4 text-left">Tipo</th>
                            <th className="px-6 py-4 text-left">Resumo</th>
                            <th className="px-6 py-4 text-left">Visitantes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/10 text-xs">
                        {sortedVisits.map(v => {
                            const doc = doctors.find(d => d.id === v.doctorId);
                            const typeLabel = INTERACTION_TYPES.find(t => t.id === v.interactionType)?.label || v.interactionType;
                            return (
                                <tr key={v.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                    <td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(v.date + 'T12:00:00').toLocaleDateString()}</td>
                                    <td className={`px-6 py-4 font-bold text-teal-600`}>{doc?.name || 'Médico Removido'}</td>
                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{typeLabel}</td>
                                    <td className={`px-6 py-4 italic ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{v.notes}</td>
                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {v.memberIds.map(id => members.find(m => m.id === id)?.name.split(' ')[0]).join(', ')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const HospitalRegionalModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    hospital?: Hospital; 
    members: Member[];
    onSave: (h: Hospital) => void; 
    isHospitalMode?: boolean 
}> = ({ isOpen, onClose, hospital, members, onSave, isHospitalMode }) => {
    const [formData, setFormData] = useState<Partial<Hospital>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (hospital) {
            setFormData(hospital);
        }
    }, [hospital]);

    if (!isOpen || !hospital) return null;

    const colihMembers = members.filter(m => m.isColih && m.active && m.colihClassification !== 'Facilitator');
    const selectedMembers = formData.responsibleMemberIds || [];

    const toggleResponsible = (memberId: string) => {
        let newIds = [...selectedMembers];
        if (newIds.includes(memberId)) {
            newIds = newIds.filter(id => id !== memberId);
        } else {
            if (newIds.length >= 4) {
                alert("Máximo de 4 responsáveis por hospital.");
                return;
            }
            newIds.push(memberId);
        }
        setFormData({ ...formData, responsibleMemberIds: newIds });
    };

    const handleSave = () => {
        if (!formData.name || !formData.address) {
            alert("Nome e Endereço são obrigatórios.");
            return;
        }
        if (!formData.responsibleMemberIds || formData.responsibleMemberIds.length < 2) {
            alert("É necessário selecionar no mínimo 2 membros responsáveis.");
            return;
        }
        onSave({ ...hospital, ...formData } as Hospital);
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                <div className="bg-teal-600 px-6 py-5 flex justify-between items-center shrink-0">
                    <h3 className="text-white font-bold text-lg">Dados da Unidade</h3>
                    <button onClick={onClose} className="text-white hover:text-teal-200 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nome do Hospital</label>
                        <input className={`w-full p-3 border rounded-xl outline-none font-bold ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Endereço Completo</label>
                        <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Cidade</label>
                            <input className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Regional</label>
                            <select 
                                className={`w-full p-3 border rounded-xl outline-none ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`}
                                value={formData.regional || ''}
                                onChange={e => setFormData({...formData, regional: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-200/20">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Membros Responsáveis (2 a 4)</label>
                            <span className={`text-xs font-bold ${selectedMembers.length < 2 || selectedMembers.length > 4 ? 'text-red-500' : 'text-green-500'}`}>{selectedMembers.length} selecionados</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Filtrar membros COLIH..." 
                            className={`w-full p-2 text-xs border rounded-lg mb-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <div className={`border rounded-xl max-h-40 overflow-y-auto custom-scrollbar p-2 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50'}`}>
                            {colihMembers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
                                <label key={m.id} className={`flex items-center gap-2 p-2 rounded hover:bg-black/5 cursor-pointer ${selectedMembers.includes(m.id) ? 'bg-teal-50/50' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-teal-600 rounded"
                                        checked={selectedMembers.includes(m.id)}
                                        onChange={() => toggleResponsible(m.id)}
                                    />
                                    <span className={`text-xs ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                                </label>
                            ))}
                            {colihMembers.length === 0 && <p className="text-xs text-gray-400 p-2">Nenhum membro COLIH encontrado.</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">Salvar Alterações</Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const ColihPage: React.FC<{ state: AppState, onUpdateState: (s: AppState) => void, isHospitalMode?: boolean }> = ({ state, onUpdateState, isHospitalMode }) => {
    const [activeTab, setActiveTab] = useState<'doctors' | 'facilitators' | 'hospitals' | 'presentations' | 'reports'>('doctors');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingDoctor, setEditingDoctor] = useState<Doctor | undefined>(undefined);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
    const [isFacilitatorModalOpen, setIsFacilitatorModalOpen] = useState(false);
    const [editingHospital, setEditingHospital] = useState<Hospital | undefined>(undefined);
    const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
    const [visitingDoctor, setVisitingDoctor] = useState<Doctor | undefined>(undefined);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); 

    // --- FILTROS ---
    const [doctorFilter, setDoctorFilter] = useState({ status: 'all', sort: 'name', specialty: '', regional: '' });
    const [facilitatorFilter, setFacilitatorFilter] = useState({ regional: '', hospitalId: '' });
    const [hospitalFilter, setHospitalFilter] = useState({ city: '', regional: '' });

    const getStatusColor = (lastVisit?: string) => {
        if (!lastVisit) return 'bg-gray-400';
        const months = (new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 3600 * 24 * 30);
        if (months >= 6) return 'bg-red-500';
        if (months >= 5) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getStatusText = (lastVisit?: string) => {
        if (!lastVisit) return 'Nunca Visitado';
        const months = Math.floor((new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 3600 * 24 * 30));
        if (months >= 6) return `Atrasado (${months} meses)`;
        if (months >= 5) return `Vence em breve (${months} meses)`;
        return `Em dia (${months} meses)`;
    };

    const uniqueSpecialties = useMemo(() => Array.from(new Set(state.doctors.map(d => d.specialty).filter(Boolean))).sort(), [state.doctors]);
    const uniqueCities = useMemo(() => Array.from(new Set(state.hospitals.map(h => h.city).filter(Boolean))).sort(), [state.hospitals]);
    
    const filteredDoctors = useMemo(() => {
        let result = state.doctors.filter(d => 
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (d.responsibleMemberName && d.responsibleMemberName.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (doctorFilter.status === 'visited') result = result.filter(d => !!d.lastVisitDate);
        if (doctorFilter.status === 'not_visited') result = result.filter(d => !d.lastVisitDate);
        if (doctorFilter.specialty) result = result.filter(d => d.specialty === doctorFilter.specialty);
        if (doctorFilter.regional) result = result.filter(d => d.regional === doctorFilter.regional);

        result.sort((a, b) => {
            if (doctorFilter.sort === 'name') return a.name.localeCompare(b.name);
            if (doctorFilter.sort === 'visit_desc') {
                const valA = a.lastVisitDate || '';
                const valB = b.lastVisitDate || '';
                if (valA === valB) return 0;
                if (!valA) return 1; 
                if (!valB) return -1;
                return valB.localeCompare(valA);
            }
            if (doctorFilter.sort === 'visit_asc') {
                const valA = a.lastVisitDate || '';
                const valB = b.lastVisitDate || '';
                if (valA === valB) return 0;
                if (!valA) return -1; 
                if (!valB) return 1;
                return valA.localeCompare(valB);
            }
            return 0;
        });

        return result;
    }, [state.doctors, searchTerm, doctorFilter]);

    const filteredFacilitators = useMemo(() => {
        let result = state.members.filter(m => 
            m.isColih && 
            m.colihClassification === 'Facilitator' && 
            m.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Filtro por Regional
        if (facilitatorFilter.regional) {
            result = result.filter(m => m.regional === facilitatorFilter.regional);
        }

        // Filtro por Hospital (Responsável)
        if (facilitatorFilter.hospitalId) {
            const hospital = state.hospitals.find(h => h.id === facilitatorFilter.hospitalId);
            if (hospital && hospital.responsibleMemberIds) {
                // Se um hospital está selecionado, filtra membros que estão na lista de responsáveis dele
                result = result.filter(m => hospital.responsibleMemberIds!.includes(m.id));
            } else {
                // Se não há hospital encontrado ou não tem responsáveis, não mostra nada para esse filtro
                if (facilitatorFilter.hospitalId) result = [];
            }
        }

        return result.sort((a,b) => a.name.localeCompare(b.name));
    }, [state.members, searchTerm, facilitatorFilter, state.hospitals]);

    const filteredHospitals = useMemo(() => {
        let result = state.hospitals.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (hospitalFilter.city) result = result.filter(h => h.city === hospitalFilter.city);
        if (hospitalFilter.regional) result = result.filter(h => h.regional === hospitalFilter.regional);
        return result.sort((a,b) => a.name.localeCompare(b.name));
    }, [state.hospitals, searchTerm, hospitalFilter]);

    const handleSaveDoctor = async (doc: Doctor) => {
        try {
            await atomicUpdate('doctors', doc);
            const updated = state.doctors.some(d => d.id === doc.id) 
                ? state.doctors.map(d => d.id === doc.id ? doc : d) 
                : [...state.doctors, doc];
            onUpdateState({ ...state, doctors: updated });
            setIsDoctorModalOpen(false);
        } catch (e) { alert("Erro ao salvar médico."); }
    };

    const handleSaveMember = async (mem: Member) => {
        try {
            await atomicUpdate('members', mem);
            const updated = state.members.map(m => m.id === mem.id ? mem : m);
            onUpdateState({ ...state, members: updated });
            setIsFacilitatorModalOpen(false);
        } catch (e) { alert("Erro ao salvar membro."); }
    };

    const handleSaveHospital = async (hos: Hospital) => {
        try {
            await atomicUpdate('hospitals', hos);
            const updated = state.hospitals.map(h => h.id === hos.id ? hos : h);
            onUpdateState({ ...state, hospitals: updated });
            setIsHospitalModalOpen(false);
        } catch (e) { alert("Erro ao salvar hospital."); }
    };

    const handleSaveVisit = async (notes: string, date: string, memberIds: string[], type: ColihInteractionType, topics?: string, material?: string, nextSteps?: string) => {
        if (!visitingDoctor) return;
        const visit: ColihVisit = {
            id: crypto.randomUUID(),
            doctorId: visitingDoctor.id,
            date,
            memberIds,
            notes,
            interactionType: type,
            topicsDiscussed: topics,
            materialDelivered: material,
            nextSteps: nextSteps,
            createdAt: new Date().toISOString()
        };
        const updatedDoctor = { ...visitingDoctor, lastVisitDate: date };

        try {
            await atomicUpdate('colih_visits', visit);
            await atomicUpdate('doctors', updatedDoctor);
            
            const updatedDoctors = state.doctors.map(d => d.id === updatedDoctor.id ? updatedDoctor : d);
            const updatedVisits = [...state.colihVisits, visit];
            
            onUpdateState({ ...state, doctors: updatedDoctors, colihVisits: updatedVisits });
            setVisitingDoctor(undefined);
        } catch (e) { alert("Erro ao registrar visita."); }
    };

    return (
        <>
            <div className="space-y-6 pb-12 animate-fade-in">
                {/* Header com Navegação */}
                <div className={`${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 rounded-2xl border flex flex-col gap-4`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className={`text-xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Gestão COLIH</h2>
                            <p className={`text-sm ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Comissão de Ligação com Hospitais - Cadastro e Visitas.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <input 
                                type="text" 
                                placeholder="Buscar..." 
                                className={`flex-grow md:w-64 p-2.5 rounded-xl border-2 text-sm outline-none focus:border-teal-500 transition-all ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-100'}`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {activeTab === 'doctors' && (
                                <Button className="bg-teal-600 hover:bg-teal-700 rounded-xl" onClick={() => { setEditingDoctor(undefined); setIsDoctorModalOpen(true); }}>+ Médico</Button>
                            )}
                        </div>
                    </div>
                    
                    {/* Menu de Abas */}
                    <div className={`flex gap-6 border-b ${isHospitalMode ? 'border-gray-700' : 'border-gray-200'} overflow-x-auto custom-scrollbar`}>
                        {[
                            { id: 'doctors', label: 'Lista de Médicos' },
                            { id: 'facilitators', label: 'Facilitadores' },
                            { id: 'hospitals', label: 'Hospitais' },
                            { id: 'presentations', label: 'Apresentações' },
                            { id: 'reports', label: 'Relatórios' },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
                                    activeTab === tab.id 
                                    ? 'border-b-2 border-teal-500 text-teal-600' 
                                    : 'text-gray-400 hover:text-gray-500'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 1. MÉDICOS */}
                {activeTab === 'doctors' && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-3 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            {/* Toggle Grid/List */}
                            <div className={`flex items-center p-1 rounded-lg border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-200/50 border-gray-200'}`}>
                                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                            </div>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            {/* ... Resto dos filtros de médicos ... */}
                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={doctorFilter.status}
                                onChange={e => setDoctorFilter({...doctorFilter, status: e.target.value})}
                            >
                                <option value="all">Todos os Status</option>
                                <option value="visited">Visitados</option>
                                <option value="not_visited">Não Visitados</option>
                            </select>
                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={doctorFilter.sort}
                                onChange={e => setDoctorFilter({...doctorFilter, sort: e.target.value})}
                            >
                                <option value="name">Nome (A-Z)</option>
                                <option value="visit_desc">Recentes Primeiro</option>
                                <option value="visit_asc">Antigos Primeiro</option>
                            </select>
                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={doctorFilter.specialty}
                                onChange={e => setDoctorFilter({...doctorFilter, specialty: e.target.value})}
                            >
                                <option value="">Todas Especialidades</option>
                                {uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={doctorFilter.regional}
                                onChange={e => setDoctorFilter({...doctorFilter, regional: e.target.value})}
                            >
                                <option value="">Todas Regionais</option>
                                {REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        {/* Renderização Condicional Grid/List de Médicos */}
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {filteredDoctors.map(doc => {
                                    const statusColor = getStatusColor(doc.lastVisitDate);
                                    return (
                                        <div key={doc.id} className={`relative p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${statusColor}`} title={getStatusText(doc.lastVisitDate)}></div>
                                            <div className="mb-4">
                                                <h3 className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{doc.name}</h3>
                                                <p className="text-teal-500 font-bold text-xs uppercase tracking-widest">{doc.specialty}</p>
                                                {doc.regional && <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] font-bold border border-gray-200 uppercase">{doc.regional}</span>}
                                            </div>
                                            <div className={`p-3 rounded-xl mb-4 space-y-2 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500 font-bold uppercase">Nível</span>
                                                    <span className={`font-bold ${doc.cooperationLevel === 'High' ? 'text-green-500' : doc.cooperationLevel === 'Low' ? 'text-red-500' : 'text-yellow-500'}`}>
                                                        {doc.cooperationLevel === 'High' ? 'Excelente' : doc.cooperationLevel === 'Medium' ? 'Regular' : 'Resistente'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500 font-bold uppercase">Última Visita</span>
                                                    <span className={`font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        {doc.lastVisitDate ? new Date(doc.lastVisitDate + 'T12:00:00').toLocaleDateString() : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            {doc.responsibleMemberName && (
                                                <div className={`mb-4 px-3 py-2 rounded-lg border flex items-center gap-2 ${isHospitalMode ? 'bg-teal-900/10 border-teal-900/30' : 'bg-teal-50 border-teal-100'}`}>
                                                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-bold">
                                                        {doc.responsibleMemberName.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-teal-600 uppercase tracking-tight">Responsável</p>
                                                        <p className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'} truncate`}>{doc.responsibleMemberName}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mt-auto grid grid-cols-2 gap-2">
                                                <button onClick={() => { setEditingDoctor(doc); setIsDoctorModalOpen(true); }} className={`py-2 rounded-lg text-xs font-bold uppercase border ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Editar</button>
                                                <button onClick={() => setVisitingDoctor(doc)} className="py-2 rounded-lg text-xs font-bold uppercase bg-teal-600 text-white hover:bg-teal-700">Interagir</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={`rounded-xl border overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="min-w-full divide-y divide-gray-200/10">
                                        <thead className={`text-[10px] font-black uppercase text-gray-500 ${isHospitalMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <tr>
                                                <th className="px-6 py-4 text-left">Médico</th>
                                                <th className="px-6 py-4 text-left">Especialidade</th>
                                                <th className="px-6 py-4 text-left">Regional</th>
                                                <th className="px-6 py-4 text-left">Nível</th>
                                                <th className="px-6 py-4 text-left">Última Visita</th>
                                                <th className="px-6 py-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/10 text-xs">
                                            {filteredDoctors.map(doc => (
                                                <tr key={doc.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                                    <td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                        {doc.name}
                                                        {doc.responsibleMemberName && <div className="text-[9px] text-teal-600 mt-1 font-normal">Resp: {doc.responsibleMemberName}</div>}
                                                    </td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.specialty}</td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{doc.regional || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                            doc.cooperationLevel === 'High' ? 'bg-green-100 text-green-700' : 
                                                            doc.cooperationLevel === 'Low' ? 'bg-red-100 text-red-700' : 
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {doc.cooperationLevel === 'High' ? 'Excelente' : doc.cooperationLevel === 'Medium' ? 'Regular' : doc.cooperationLevel === 'Low' ? 'Baixo' : '?'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {doc.lastVisitDate ? new Date(doc.lastVisitDate + 'T12:00:00').toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                        <button onClick={() => { setEditingDoctor(doc); setIsDoctorModalOpen(true); }} className="text-blue-500 hover:underline">Editar</button>
                                                        <button onClick={() => setVisitingDoctor(doc)} className="text-teal-600 font-bold hover:underline">Interagir</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. FACILITADORES (Reutilizando estrutura) */}
                {activeTab === 'facilitators' && (
                    <div className="space-y-4">
                        {/* Filtros Facilitadores */}
                        <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-3 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            {/* Toggle Grid/List */}
                            <div className={`flex items-center p-1 rounded-lg border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-200/50 border-gray-200'}`}>
                                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                            </div>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            
                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={facilitatorFilter.regional}
                                onChange={e => setFacilitatorFilter({...facilitatorFilter, regional: e.target.value})}
                            >
                                <option value="">Todas Regionais</option>
                                {REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>

                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={facilitatorFilter.hospitalId}
                                onChange={e => setFacilitatorFilter({...facilitatorFilter, hospitalId: e.target.value})}
                            >
                                <option value="">Todos Hospitais</option>
                                {state.hospitals.sort((a,b) => a.name.localeCompare(b.name)).map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                                {filteredFacilitators.map(mem => (
                                    <div key={mem.id} className={`p-5 rounded-2xl border shadow-sm flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isHospitalMode ? 'bg-gray-700 text-gray-300' : 'bg-teal-100 text-teal-600'}`}>
                                                {mem.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{mem.name}</h3>
                                                <p className="text-xs text-gray-500">{mem.congregation}</p>
                                            </div>
                                        </div>
                                        <div className={`p-3 rounded-xl mb-4 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Regional</p>
                                            <p className={`font-bold text-sm ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>
                                                {mem.regional || 'Não definida'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => { setEditingMember(mem); setIsFacilitatorModalOpen(true); }}
                                            className={`w-full py-2 rounded-lg text-xs font-bold uppercase border ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            Editar Regional
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // List View Facilitators
                            <div className={`rounded-xl border overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="min-w-full divide-y divide-gray-200/10">
                                        <thead className={`text-[10px] font-black uppercase text-gray-500 ${isHospitalMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <tr>
                                                <th className="px-6 py-4 text-left">Nome</th>
                                                <th className="px-6 py-4 text-left">Congregação</th>
                                                <th className="px-6 py-4 text-left">Regional</th>
                                                <th className="px-6 py-4 text-left">Classificação</th>
                                                <th className="px-6 py-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/10 text-xs">
                                            {filteredFacilitators.map(mem => (
                                                <tr key={mem.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                                    <td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{mem.name}</td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{mem.congregation}</td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{mem.regional || '-'}</td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{mem.colihClassification}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => { setEditingMember(mem); setIsFacilitatorModalOpen(true); }} className="text-blue-500 hover:underline">Editar</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. HOSPITAIS (Reutilizando estrutura) */}
                {activeTab === 'hospitals' && (
                    <div className="space-y-4">
                        {/* Filtros Hospitais */}
                        <div className={`p-4 rounded-xl border flex flex-wrap items-center gap-3 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                            {/* Toggle Grid/List */}
                            <div className={`flex items-center p-1 rounded-lg border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-200/50 border-gray-200'}`}>
                                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" /></svg>
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                            </div>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            
                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={hospitalFilter.city}
                                onChange={e => setHospitalFilter({...hospitalFilter, city: e.target.value})}
                            >
                                <option value="">Todas Cidades</option>
                                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <select 
                                className={`p-2 rounded-lg text-xs font-bold border outline-none ${isHospitalMode ? 'bg-[#212327] border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                                value={hospitalFilter.regional}
                                onChange={e => setHospitalFilter({...hospitalFilter, regional: e.target.value})}
                            >
                                <option value="">Todas Regionais</option>
                                {REGIONALS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                {filteredHospitals.map(h => (
                                    <div key={h.id} className={`p-5 rounded-2xl border shadow-sm flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                        <div className="mb-4">
                                            <h3 className={`font-bold text-lg leading-tight ${isHospitalMode ? 'text-gray-100' : 'text-gray-800'}`}>{h.name}</h3>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{h.city}</p>
                                        </div>
                                        
                                        <div className={`p-3 rounded-xl mb-4 space-y-2 ${isHospitalMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                                            <div>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Endereço</p>
                                                <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>{h.address}</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Regional</p>
                                                    <p className={`font-bold text-xs ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>
                                                        {h.regional || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {h.responsibleMemberIds && h.responsibleMemberIds.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Responsáveis</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {h.responsibleMemberIds.map(mid => {
                                                        const mem = state.members.find(m => m.id === mid);
                                                        return mem ? (
                                                            <span key={mid} className="text-[9px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold border border-teal-200">
                                                                {mem.name.split(' ')[0]}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => { setEditingHospital(h); setIsHospitalModalOpen(true); }}
                                            className={`w-full py-2 rounded-lg text-xs font-bold uppercase border ${isHospitalMode ? 'border-gray-700 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            Editar Dados
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // List View Hospitals
                            <div className={`rounded-xl border overflow-hidden animate-fade-in ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="min-w-full divide-y divide-gray-200/10">
                                        <thead className={`text-[10px] font-black uppercase text-gray-500 ${isHospitalMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <tr>
                                                <th className="px-6 py-4 text-left">Hospital</th>
                                                <th className="px-6 py-4 text-left">Cidade</th>
                                                <th className="px-6 py-4 text-left">Regional</th>
                                                <th className="px-6 py-4 text-left">Responsáveis</th>
                                                <th className="px-6 py-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200/10 text-xs">
                                            {filteredHospitals.map(h => (
                                                <tr key={h.id} className={isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                                                    <td className={`px-6 py-4 font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{h.name}</td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{h.city}</td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{h.regional || '-'}</td>
                                                    <td className={`px-6 py-4 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {h.responsibleMemberIds?.length ? h.responsibleMemberIds.length + ' membros' : 'Nenhum'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => { setEditingHospital(h); setIsHospitalModalOpen(true); }} className="text-blue-500 hover:underline">Editar</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 4. APRESENTAÇÕES */}
                {activeTab === 'presentations' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-4 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <h3 className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>Apresentações Formais</h3>
                            <p className={`text-sm max-w-md ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Use esta seção para acompanhar as apresentações de estratégias médicas feitas a equipes ou médicos individuais.</p>
                        </div>
                        <ReportsTab doctors={state.doctors} visits={state.colihVisits.filter(v => v.interactionType === 'presentation')} members={state.members} isHospitalMode={isHospitalMode} />
                    </div>
                )}

                {/* 5. RELATÓRIOS */}
                {activeTab === 'reports' && (
                    <div className="animate-fade-in">
                        <ReportsTab doctors={state.doctors} visits={state.colihVisits} members={state.members} isHospitalMode={isHospitalMode} />
                    </div>
                )}
            </div>

            {/* MODALS */}
            <DoctorModal 
                isOpen={isDoctorModalOpen} 
                onClose={() => setIsDoctorModalOpen(false)} 
                doctor={editingDoctor} 
                hospitals={state.hospitals}
                onSave={handleSaveDoctor} 
                isHospitalMode={isHospitalMode} 
            />

            <FacilitatorModal
                isOpen={isFacilitatorModalOpen}
                onClose={() => setIsFacilitatorModalOpen(false)}
                member={editingMember}
                onSave={handleSaveMember}
                isHospitalMode={isHospitalMode}
            />

            <HospitalRegionalModal
                isOpen={isHospitalModalOpen}
                onClose={() => setIsHospitalModalOpen(false)}
                hospital={editingHospital}
                members={state.members}
                onSave={handleSaveHospital}
                isHospitalMode={isHospitalMode}
            />

            {visitingDoctor && (
                <VisitModal 
                    isOpen={true} 
                    onClose={() => setVisitingDoctor(undefined)} 
                    doctor={visitingDoctor} 
                    currentUserId={state.currentUser?.id}
                    onSave={handleSaveVisit} 
                    isHospitalMode={isHospitalMode}
                />
            )}
        </>
    );
};
