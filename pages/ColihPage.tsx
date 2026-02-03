
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

const DoctorActivitySummary: React.FC<{ doctors: Doctor[], isHospitalMode?: boolean }> = ({ doctors, isHospitalMode }) => {
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

    const getPercent = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

    const cards = [
        { 
            label: 'Total Cadastrado', 
            value: total, 
            subLabel: 'Base de Dados', 
            color: 'gray',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        { 
            label: 'Ativos (3 Meses)', 
            value: v3m, 
            subLabel: `${getPercent(v3m)}% da base`, 
            color: 'teal',
            percent: getPercent(v3m),
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        { 
            label: 'Regulares (6 Meses)', 
            value: v6m, 
            subLabel: `${getPercent(v6m)}% da base`, 
            color: 'blue',
            percent: getPercent(v6m),
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        { 
            label: 'Cobertura Anual', 
            value: v12m, 
            subLabel: `${getPercent(v12m)}% da base`, 
            color: 'indigo',
            percent: getPercent(v12m),
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, idx) => {
                const colorStyles = {
                    gray: isHospitalMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500',
                    teal: isHospitalMode ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-50 text-teal-600',
                    blue: isHospitalMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600',
                    indigo: isHospitalMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
                };
                
                const barColors = {
                    teal: 'bg-teal-500',
                    blue: 'bg-blue-500',
                    indigo: 'bg-indigo-500',
                    gray: 'bg-gray-400'
                };

                return (
                    <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>{card.label}</p>
                                <p className={`text-2xl font-black mt-1 ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{card.value}</p>
                            </div>
                            <div className={`p-2 rounded-xl ${colorStyles[card.color as keyof typeof colorStyles]}`}>
                                {card.icon}
                            </div>
                        </div>
                        
                        {card.percent !== undefined ? (
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className={isHospitalMode ? 'text-gray-400' : 'text-gray-500'}>{card.subLabel}</span>
                                </div>
                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${barColors[card.color as keyof typeof barColors]}`} 
                                        style={{ width: `${card.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-gray-400 mt-auto">{card.subLabel}</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const PresentationsChart: React.FC<{ data: { label: string, value: number }[], isHospitalMode?: boolean }> = ({ data, isHospitalMode }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className={`p-6 rounded-3xl border mb-6 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>Apresentações por Regional</h3>
            <div className="space-y-4">
                {data.map((item, idx) => (
                    <div key={item.label} className="relative group">
                        <div className="flex justify-between items-end mb-1.5 z-10 relative">
                            <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                            <span className={`text-xs font-black ${isHospitalMode ? 'text-teal-400' : 'text-teal-600'}`}>{item.value}</span>
                        </div>
                        <div className={`w-full h-3 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${idx === 0 ? 'bg-teal-500' : 'bg-teal-400/70'}`} 
                                style={{ width: `${(item.value / max) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
                {data.length === 0 && <p className="text-xs text-gray-500 italic text-center">Nenhuma apresentação registrada.</p>}
            </div>
        </div>
    );
};

const HospitalStats: React.FC<{ hospitals: Hospital[], visits: ColihVisit[], isHospitalMode?: boolean }> = ({ hospitals, visits, isHospitalMode }) => {
    const total = hospitals.length;
    const now = new Date();

    let countFresh = 0;   // < 90 dias
    let countWarning = 0; // 90 - 180 dias
    let countCritical = 0; // > 180 dias ou nunca

    hospitals.forEach(h => {
        const hospitalVisits = visits.filter(v => v.hospitalId === h.id && v.status === 'COMPLETED');
        if (hospitalVisits.length === 0) {
            countCritical++;
            return;
        }
        const lastVisit = hospitalVisits.sort((a,b) => b.date.localeCompare(a.date))[0];
        const lastDate = new Date(lastVisit.date + 'T12:00:00');
        const diffTime = Math.abs(now.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 90) countFresh++;
        else if (diffDays <= 180) countWarning++;
        else countCritical++;
    });

    const getPercent = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
             
             {[{ label: 'Em Dia (3 Meses)', count: countFresh, color: 'green' }, { label: 'Atenção (3-6 M)', count: countWarning, color: 'yellow' }, { label: 'Crítico (+6 M)', count: countCritical, color: 'red' }].map((stat, idx) => (
                 <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-start">
                        <p className={`text-[9px] font-black uppercase tracking-widest ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>{stat.label}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stat.color === 'green' ? (isHospitalMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : stat.color === 'yellow' ? (isHospitalMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700') : (isHospitalMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}`}>
                            {getPercent(stat.count)}%
                        </span>
                    </div>
                    <div>
                        <div className="flex items-end gap-1">
                            <p className={`text-3xl font-black ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>{stat.count}</p>
                            <p className={`text-sm font-bold mb-1.5 ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>/ {total}</p>
                        </div>
                        <div className={`w-full h-1.5 mt-2 rounded-full overflow-hidden ${isHospitalMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            <div className={`h-full rounded-full ${stat.color === 'green' ? 'bg-green-500' : stat.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${getPercent(stat.count)}%` }}></div>
                        </div>
                    </div>
                 </div>
             ))}
        </div>
    );
};

// Componente "Minha Carteira" isolado para reutilização e clareza
const MyDoctorsWallet: React.FC<{ doctors: Doctor[], currentUser: Member | null, isHospitalMode?: boolean }> = ({ doctors, currentUser, isHospitalMode }) => {
    // Filtra médicos designados ao usuário logado
    const myDoctors = useMemo(() => {
        if (!currentUser) return [];
        return doctors.filter(d => d.assignedMemberIds?.includes(currentUser.id));
    }, [doctors, currentUser]);

    if (!currentUser || myDoctors.length === 0) return null;

    return (
        <div className={`mb-6 p-6 rounded-3xl border flex flex-col ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-500 p-1.5 rounded-lg text-white">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                    <h3 className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Minha Carteira de Médicos</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Você é responsável por {myDoctors.length} médicos</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {myDoctors.map(doc => {
                    const lastVisit = doc.lastVisitDate ? new Date(doc.lastVisitDate) : null;
                    const daysSince = lastVisit ? Math.ceil((new Date().getTime() - lastVisit.getTime()) / (1000 * 3600 * 24)) : 999;
                    const isLate = daysSince > 365;
                    const isWarning = daysSince > 180;

                    return (
                        <div key={doc.id} className={`p-3 rounded-xl border flex justify-between items-center ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                            <div>
                                <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{doc.name}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{doc.specialty || 'Especialidade N/A'}</p>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    isLate ? 'bg-red-100 text-red-600' : isWarning ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'
                                }`}>
                                    {daysSince === 999 ? 'Nunca' : `${daysSince} dias`}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const ColihPage: React.FC<{ 
    state: AppState, 
    onUpdateState: (newState: AppState) => void, 
    isHospitalMode?: boolean,
    view: 'doctors' | 'facilitators' | 'hospitals' | 'presentations' 
}> = ({ state, onUpdateState, isHospitalMode, view }) => {
    const [editingDoctor, setEditingDoctor] = useState<Partial<Doctor> | null>(null);
    const [editingVisit, setEditingVisit] = useState<Partial<ColihVisit> | null>(null);
    const [selectedFacilitator, setSelectedFacilitator] = useState<Member | null>(null);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [filterDoctor, setFilterDoctor] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, description: string, onConfirm: () => void} | null>(null);
    
    // Estado para controlar se a visita é em local externo
    const [isExternalVisit, setIsExternalVisit] = useState(false);
    const [customLocationName, setCustomLocationName] = useState('');

    // --- DATA ---
    const filteredDoctors = useMemo(() => {
        let list = state.doctors;
        if (filterDoctor === 'VISITED') {
            const cutoff = new Date();
            cutoff.setFullYear(cutoff.getFullYear() - 1);
            list = list.filter(d => d.lastVisitDate && new Date(d.lastVisitDate) >= cutoff);
        }
        if (searchTerm) {
            list = list.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.specialty?.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [state.doctors, filterDoctor, searchTerm]);

    const facilitators = useMemo(() => {
        return state.members
            .filter(m => m.isColih && m.colihClassification === 'Facilitator')
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [state.members]);

    const colihMembers = useMemo(() => {
        return state.members.filter(m => m.isColih && m.active).sort((a,b) => a.name.localeCompare(b.name));
    }, [state.members]);

    // FILTRO ATUALIZADO: Apenas Apresentações, Entregas ou Externas
    const presentations = useMemo(() => {
        return state.colihVisits.filter(v => {
            const isExternal = v.notes && v.notes.startsWith('[EXTERNO:');
            // REGRA: Mostrar apenas Apresentações Formais, Entregas de Material ou Atividades Externas.
            // Visitas de Rotina ('visit') e Contatos ('email_phone') vinculados a médicos/hospitais
            // devem aparecer apenas no histórico individual daquele cadastro (DoctorStats/HospitalStats).
            return v.interactionType === 'presentation' || 
                   v.interactionType === 'material_delivery' || 
                   isExternal;
        }).sort((a,b) => b.date.localeCompare(a.date));
    }, [state.colihVisits]);

    // CALCULAR DADOS PARA O GRÁFICO (AGRUPAR POR REGIONAL)
    const presentationsByRegional = useMemo(() => {
        const counts: Record<string, number> = {};
        
        state.colihVisits.forEach(v => {
            // Apenas tipos relevantes para apresentações
            if (v.interactionType !== 'presentation' && v.interactionType !== 'material_delivery') return;

            let regional = 'Indefinido';
            if (v.hospitalId) {
                const h = state.hospitals.find(hos => hos.id === v.hospitalId);
                if (h?.regional) regional = h.regional;
            } else if (v.notes && v.notes.startsWith('[EXTERNO:')) {
                regional = 'Outros / Externo';
            }

            counts[regional] = (counts[regional] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value); // Sort descending
    }, [state.colihVisits, state.hospitals]);

    // --- ACTIONS ---
    const handleSaveDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDoctor?.name) return;

        // Garante que assignedMemberIds seja um array
        const assignedIds = editingDoctor.assignedMemberIds || [];
        
        // Gera string legada para compatibilidade
        const assignedNames = state.members
            .filter(m => assignedIds.includes(m.id))
            .map(m => m.name)
            .join(', ');

        const newDoc: Doctor = {
            id: editingDoctor.id || crypto.randomUUID(),
            name: editingDoctor.name,
            specialty: editingDoctor.specialty || '',
            hospitalIds: editingDoctor.hospitalIds || [],
            city: editingDoctor.city || '',
            address: editingDoctor.address || '',
            phone: editingDoctor.phone || '',
            email: editingDoctor.email || '',
            cooperationLevel: editingDoctor.cooperationLevel || 'Unknown',
            isConsultant: editingDoctor.isConsultant || false,
            treatsPediatric: editingDoctor.treatsPediatric || false,
            assignedMemberIds: assignedIds,
            responsibleMemberName: assignedNames // Fallback para compatibilidade
        };

        try {
            await atomicUpdate('doctors', newDoc);
            const updated = editingDoctor.id 
                ? state.doctors.map(d => d.id === newDoc.id ? newDoc : d) 
                : [...state.doctors, newDoc];
            
            onUpdateState({ ...state, doctors: updated });
            setEditingDoctor(null);
        } catch (err: any) { 
            console.error("Erro ao salvar médico:", err);
            alert(`Erro ao salvar médico: ${err.message || 'Erro desconhecido'}`); 
        }
    };

    const handleDeleteDoctor = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Excluir Médico',
            description: 'Tem certeza? O histórico de visitas será mantido mas o cadastro será removido.',
            onConfirm: async () => {
                try {
                    await atomicDelete('doctors', id);
                    onUpdateState({ ...state, doctors: state.doctors.filter(d => d.id !== id) });
                } catch (e) { alert("Erro ao excluir."); }
            }
        });
    };

    const handleSaveVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVisit?.date || !editingVisit.interactionType) return;
        
        // Se for externo, prefixa o nome do local nas notas para exibição
        let finalNotes = editingVisit.notes || '';
        if (isExternalVisit && customLocationName) {
            finalNotes = `[EXTERNO: ${customLocationName}] \n${finalNotes}`;
        }

        const newVisit: ColihVisit = {
            id: editingVisit.id || crypto.randomUUID(),
            date: editingVisit.date,
            doctorId: editingVisit.doctorId,
            hospitalId: isExternalVisit ? undefined : editingVisit.hospitalId,
            memberIds: editingVisit.memberIds || [],
            notes: finalNotes,
            interactionType: editingVisit.interactionType,
            status: editingVisit.status || 'COMPLETED',
            createdAt: editingVisit.createdAt || new Date().toISOString(),
            hlc38Presented: editingVisit.hlc38Presented || false,
            collaboratorInterest: editingVisit.collaboratorInterest || false
        };
        
        try {
            await atomicUpdate('colih_visits', newVisit);
            // Update last visit date if doctor visit
            if (newVisit.doctorId && newVisit.status === 'COMPLETED') {
                const doctor = state.doctors.find(d => d.id === newVisit.doctorId);
                if (doctor) {
                    const updatedDoc = { ...doctor, lastVisitDate: newVisit.date };
                    await atomicUpdate('doctors', updatedDoc);
                    const updatedDocs = state.doctors.map(d => d.id === doctor.id ? updatedDoc : d);
                    // FIX: Pass object directly instead of callback function
                    onUpdateState({ ...state, doctors: updatedDocs });
                }
            }
            const updatedVisits = editingVisit.id ? state.colihVisits.map(v => v.id === newVisit.id ? newVisit : v) : [...state.colihVisits, newVisit];
            // FIX: Pass object directly instead of callback function
            onUpdateState({ ...state, colihVisits: updatedVisits });
            setEditingVisit(null);
            setIsExternalVisit(false);
            setCustomLocationName('');
        } catch (err) { alert("Erro ao salvar visita."); }
    };

    const handleEditPresentation = (v: ColihVisit) => {
        const isExt = v.notes?.startsWith('[EXTERNO:');
        let locName = '';
        let cleanNotes = v.notes || '';

        if (isExt) {
            const match = v.notes.match(/\[EXTERNO: (.*?)\]/);
            locName = match ? match[1] : '';
            // Remove a tag do texto para edição limpa
            cleanNotes = v.notes.replace(/\[EXTERNO: .*?\] \n?/, '');
        }

        setIsExternalVisit(!!isExt);
        setCustomLocationName(locName);
        setEditingVisit({
            ...v,
            notes: cleanNotes
        });
    };

    const handleDeletePresentation = (id: string) => {
         setConfirmConfig({
            isOpen: true,
            title: 'Excluir Atividade',
            description: 'Tem certeza que deseja excluir este registro de atividade?',
            onConfirm: async () => {
                try {
                    await atomicDelete('colih_visits', id);
                    onUpdateState({ ...state, colihVisits: state.colihVisits.filter(v => v.id !== id) });
                } catch (e) { alert("Erro ao excluir."); }
            }
        });
    };

    const handleSaveHospitalResponsibles = async (hospitalId: string, responsibleIds: string[]) => {
        const hospital = state.hospitals.find(h => h.id === hospitalId);
        if (!hospital) return;

        const updatedHospital = { ...hospital, responsibleMemberIds: responsibleIds };
        
        try {
            await atomicUpdate('hospitals', updatedHospital);
            onUpdateState({ 
                ...state, 
                hospitals: state.hospitals.map(h => h.id === hospitalId ? updatedHospital : h) 
            });
            // Otimistic update
            if (selectedHospital && selectedHospital.id === hospitalId) {
                setSelectedHospital(updatedHospital);
            }
        } catch (err) {
            alert("Erro ao atualizar responsáveis.");
        }
    };

    // --- VIEWS ---

    const renderDoctors = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Cadastro de Médicos</h3>
                <Button onClick={() => setEditingDoctor({ assignedMemberIds: [] })} className="bg-teal-600 text-white rounded-xl shadow-lg">+ Novo Médico</Button>
            </div>
            
            {/* NOVO DASHBOARD DE MÉDICOS */}
            <DoctorActivitySummary doctors={state.doctors} isHospitalMode={isHospitalMode} />
            
            {/* CARTEIRA PESSOAL (ISOLADA) */}
            <MyDoctorsWallet doctors={state.doctors} currentUser={state.currentUser} isHospitalMode={isHospitalMode} />
            
            <input type="text" placeholder="Buscar médico..." className={`w-full p-3 rounded-xl border mb-4 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-800 text-white' : 'bg-white border-gray-200'}`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDoctors.map(doc => (
                    <div key={doc.id} className={`p-4 rounded-2xl border shadow-sm ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{doc.name}</h4>
                                <p className="text-xs text-teal-500 font-bold uppercase">{doc.specialty}</p>
                            </div>
                            {doc.isConsultant && <span className="bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-1 rounded">Consultor</span>}
                        </div>
                        <div className={`mt-3 pt-3 border-t text-xs space-y-1 ${isHospitalMode ? 'border-gray-800 text-gray-400' : 'border-gray-100 text-gray-600'}`}>
                            <p>🏥 {doc.hospitalIds?.map(hid => state.hospitals.find(h => h.id === hid)?.name).join(', ') || 'Sem vínculo'}</p>
                            <p>📍 {doc.city || 'Cidade não inf.'}</p>
                            <p>📅 Última Visita: {doc.lastVisitDate ? new Date(doc.lastVisitDate + 'T12:00:00').toLocaleDateString() : 'Nunca'}</p>
                            
                            {/* Mostra responsáveis se existirem */}
                            {doc.assignedMemberIds && doc.assignedMemberIds.length > 0 ? (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                                    <p className="font-bold text-teal-600 mb-1">🤝 Responsáveis:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {doc.assignedMemberIds.map(mid => {
                                            const mName = state.members.find(m => m.id === mid)?.name;
                                            return mName ? (
                                                <span key={mid} className="px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-100 text-[9px] uppercase font-bold">{mName.split(' ')[0]}</span>
                                            ) : null;
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button 
                                onClick={() => {
                                    setEditingVisit({ doctorId: doc.id, interactionType: 'visit' });
                                    setIsExternalVisit(false);
                                }}
                                className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-teal-700 shadow-sm transition-all"
                            >
                                Registrar Visita
                            </button>
                            <button 
                                onClick={() => setEditingDoctor(doc)} 
                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold uppercase hover:bg-gray-200 border border-gray-200"
                            >
                                Editar / Designar
                            </button>
                            <button 
                                onClick={() => handleDeleteDoctor(doc.id)} 
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFacilitators = () => (
        <div className="space-y-6">
            <h3 className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Membros COLIH - Facilitadores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {facilitators.length === 0 ? (
                    <p className={`col-span-full py-8 text-center text-sm ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Nenhum facilitador designado encontrado.</p>
                ) : (
                    facilitators.map(m => (
                        <div 
                            key={m.id} 
                            onClick={() => setSelectedFacilitator(m)}
                            className={`p-4 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all hover:shadow-lg active:scale-95 ${isHospitalMode ? 'bg-[#212327] border-gray-800 hover:bg-white/5' : 'bg-white border-gray-100 hover:border-teal-200'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
                                {m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h4 className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{m.name}</h4>
                                <p className="text-xs text-teal-500 uppercase font-bold">Facilitador</p>
                                <p className="text-[10px] text-gray-400">{m.phone || 'Sem telefone'}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderHospitals = () => (
        <div className="space-y-6">
            <h3 className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Hospitais & Cobertura</h3>
            <HospitalStats hospitals={state.hospitals} visits={state.colihVisits} isHospitalMode={isHospitalMode} />
            <div className="grid grid-cols-1 gap-3">
                {state.hospitals.map(h => (
                    <div 
                        key={h.id} 
                        onClick={() => setSelectedHospital(h)}
                        className={`p-4 rounded-xl border flex justify-between items-center cursor-pointer transition-all hover:shadow-lg active:scale-95 ${isHospitalMode ? 'bg-[#212327] border-gray-800 hover:border-teal-700' : 'bg-white border-gray-100 hover:border-teal-200'}`}
                    >
                        <div>
                            <h4 className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{h.name}</h4>
                            <p className="text-xs text-gray-500">{h.city} • {h.regional}</p>
                            {/* Mostra contagem de responsáveis */}
                            <div className="mt-1 flex items-center gap-1">
                                <span className={`text-[9px] font-bold uppercase ${isHospitalMode ? 'text-gray-600' : 'text-gray-400'}`}>Resp:</span>
                                {h.responsibleMemberIds && h.responsibleMemberIds.length > 0 ? (
                                    <div className="flex -space-x-1">
                                        {h.responsibleMemberIds.slice(0,4).map(mid => (
                                            <div key={mid} className="w-4 h-4 rounded-full bg-teal-100 border border-white flex items-center justify-center text-[8px] text-teal-700 font-bold" title={state.members.find(m => m.id === mid)?.name}>
                                                {state.members.find(m => m.id === mid)?.name.substring(0,1)}
                                            </div>
                                        ))}
                                        {h.responsibleMemberIds.length > 4 && <div className="w-4 h-4 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] text-gray-500">+</div>}
                                    </div>
                                ) : (
                                    <span className="text-[9px] text-red-400 font-bold">Nenhum</span>
                                )}
                            </div>
                        </div>
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingVisit({ hospitalId: h.id, interactionType: 'visit' });
                                setIsExternalVisit(false);
                            }}
                        >
                            Registrar Visita
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderPresentations = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className={`text-lg font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>Registro de Atividades</h3>
                <Button onClick={() => { setEditingVisit({}); setIsExternalVisit(false); setCustomLocationName(''); }} className="bg-teal-600 text-white rounded-xl shadow-lg">+ Registrar Atividade</Button>
            </div>

            {/* GRÁFICO DE APRESENTAÇÕES POR REGIONAL */}
            <PresentationsChart data={presentationsByRegional} isHospitalMode={isHospitalMode} />

            <div className="space-y-3">
                {presentations.map(v => {
                    const isExternal = v.notes?.startsWith('[EXTERNO:');
                    let displayTitle = '';
                    let cleanNotes = v.notes;

                    if (isExternal) {
                        const match = v.notes.match(/\[EXTERNO: (.*?)\]/);
                        displayTitle = match ? match[1] : 'Instituição Externa';
                        cleanNotes = v.notes.replace(/\[EXTERNO: .*?\] \n?/, '');
                    } else {
                        displayTitle = v.doctorId 
                            ? `Dr(a). ${state.doctors.find(d => d.id === v.doctorId)?.name}` 
                            : v.hospitalId 
                                ? state.hospitals.find(h => h.id === v.hospitalId)?.name || 'Hospital Desconhecido'
                                : 'Atividade Avulsa';
                    }

                    return (
                        <div key={v.id} className={`p-4 rounded-xl border relative group ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className="flex justify-between items-start pr-12">
                                <span className="text-teal-600 font-bold text-xs uppercase tracking-widest">{INTERACTION_TYPES.find(t => t.id === v.interactionType)?.label}</span>
                                <span className={`text-xs font-bold ${isHospitalMode ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(v.date + 'T12:00:00').toLocaleDateString()}</span>
                            </div>
                            <p className={`mt-2 font-bold ${isHospitalMode ? 'text-white' : 'text-gray-800'}`}>
                                {displayTitle}
                            </p>
                            {isExternal && <span className="inline-block mt-1 px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-tight">Externo / Outro</span>}
                            <p className={`text-sm mt-1 ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{cleanNotes}</p>
                            <div className="mt-3 flex gap-2">
                                {v.memberIds.map(mid => <span key={mid} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-bold">{state.members.find(m => m.id === mid)?.name}</span>)}
                            </div>

                            {/* Botões de Ação (Editar/Excluir) */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button 
                                    onClick={() => handleEditPresentation(v)}
                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button 
                                    onClick={() => handleDeletePresentation(v.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in pb-20">
            {view === 'doctors' && renderDoctors()}
            {view === 'facilitators' && renderFacilitators()}
            {view === 'hospitals' && renderHospitals()}
            {view === 'presentations' && renderPresentations()}

            {/* MODAL DETALHES HOSPITAL & DESIGNAÇÃO */}
            {selectedHospital && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                        <div className="bg-teal-600 px-6 py-5 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">{selectedHospital.name}</h3>
                                <p className="text-teal-100 text-xs uppercase tracking-widest font-medium">Dados e Responsáveis</p>
                            </div>
                            <button onClick={() => setSelectedHospital(null)} className="text-2xl leading-none hover:text-teal-200 transition-colors">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Info Básica */}
                            <div className={`p-4 rounded-2xl border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                <p className="text-[9px] font-bold uppercase text-gray-500 mb-1">Localização</p>
                                <p className={`font-bold ${isHospitalMode ? 'text-white' : 'text-gray-900'}`}>{selectedHospital.address}</p>
                                <div className="flex gap-4 mt-2">
                                    <p className={`text-xs ${isHospitalMode ? 'text-gray-400' : 'text-gray-600'}`}>{selectedHospital.city}</p>
                                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 rounded uppercase border border-teal-100">{selectedHospital.regional}</span>
                                </div>
                            </div>

                            {/* Designação de Responsáveis */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isHospitalMode ? 'text-teal-400' : 'text-teal-700'}`}>
                                        Designar Membros COLIH
                                    </h4>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                        (selectedHospital.responsibleMemberIds?.length || 0) >= 2 && (selectedHospital.responsibleMemberIds?.length || 0) <= 4
                                        ? 'bg-green-100 text-green-700 border-green-200' 
                                        : 'bg-red-100 text-red-700 border-red-200'
                                    }`}>
                                        Meta: 2 a 4 ({selectedHospital.responsibleMemberIds?.length || 0} selecionados)
                                    </span>
                                </div>
                                
                                <div className={`border rounded-xl p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-1 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    {colihMembers.map(m => (
                                        <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-white hover:shadow-sm'}`}>
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-transparent border-gray-400"
                                                checked={selectedHospital.responsibleMemberIds?.includes(m.id) || false}
                                                onChange={(e) => {
                                                    const current = selectedHospital.responsibleMemberIds || [];
                                                    const newIds = e.target.checked 
                                                        ? [...current, m.id]
                                                        : current.filter(id => id !== m.id);
                                                    
                                                    handleSaveHospitalResponsibles(selectedHospital.id, newIds);
                                                }}
                                            />
                                            <div className="flex-grow">
                                                <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</p>
                                                {m.colihClassification && <p className="text-[9px] text-gray-500 uppercase">{m.colihClassification}</p>}
                                            </div>
                                        </label>
                                    ))}
                                    {colihMembers.length === 0 && <p className="text-xs text-gray-500 p-2 italic">Nenhum membro COLIH ativo.</p>}
                                </div>
                            </div>
                        </div>
                        
                        <div className={`p-4 border-t flex gap-3 ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <Button 
                                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white shadow-lg"
                                onClick={() => {
                                    setEditingVisit({ hospitalId: selectedHospital.id, interactionType: 'visit' });
                                    setIsExternalVisit(false);
                                    setSelectedHospital(null);
                                }}
                            >
                                Registrar Visita Agora
                            </Button>
                            <Button variant="secondary" onClick={() => setSelectedHospital(null)}>Fechar</Button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* MODAL DETALHES FACILITADOR */}
            {selectedFacilitator && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                        <div className="bg-teal-600 px-6 py-5 flex justify-between items-center text-white shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">{selectedFacilitator.name}</h3>
                                <p className="text-teal-100 text-xs uppercase tracking-widest font-medium">Ficha do Facilitador</p>
                            </div>
                            <button onClick={() => setSelectedFacilitator(null)} className="text-2xl leading-none hover:text-teal-200 transition-colors">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Info Básica */}
                            <div className={`p-4 rounded-2xl border ${isHospitalMode ? 'bg-black/20 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase text-gray-500">Telefone</p>
                                        <p className={`font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedFacilitator.phone || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase text-gray-500">Regional</p>
                                        <p className={`font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedFacilitator.regional || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[9px] font-bold uppercase text-gray-500">Email</p>
                                        <p className={`font-medium truncate ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedFacilitator.email}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[9px] font-bold uppercase text-gray-500">Congregação</p>
                                        <p className={`font-medium ${isHospitalMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedFacilitator.congregation || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Carteira de Hospitais */}
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isHospitalMode ? 'text-teal-400' : 'text-teal-700'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    Hospitais Responsável
                                </h4>
                                <div className="space-y-2">
                                    {state.hospitals.filter(h => h.responsibleMemberIds?.includes(selectedFacilitator.id)).length === 0 ? (
                                        <p className="text-xs text-gray-500 italic">Nenhum hospital designado.</p>
                                    ) : (
                                        state.hospitals.filter(h => h.responsibleMemberIds?.includes(selectedFacilitator.id)).map(h => (
                                            <div key={h.id} className={`p-3 rounded-xl border flex justify-between items-center ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                <span className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{h.name}</span>
                                                <span className="text-[9px] font-bold uppercase text-gray-400">{h.city}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Carteira de Médicos */}
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${isHospitalMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    Médicos Responsável
                                </h4>
                                <div className="space-y-2">
                                    {state.doctors.filter(d => d.assignedMemberIds?.includes(selectedFacilitator.id)).length === 0 ? (
                                        <p className="text-xs text-gray-500 italic">Nenhum médico designado.</p>
                                    ) : (
                                        state.doctors.filter(d => d.assignedMemberIds?.includes(selectedFacilitator.id)).map(d => (
                                            <div key={d.id} className={`p-3 rounded-xl border ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                <p className={`text-sm font-bold ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{d.name}</p>
                                                <p className="text-[10px] text-gray-500">{d.specialty || 'Especialidade não inf.'}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className={`p-4 border-t flex justify-end ${isHospitalMode ? 'bg-[#212327] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <Button onClick={() => setSelectedFacilitator(null)} className="w-full">Fechar Ficha</Button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* MODAL EDIT DOCTOR */}
            {editingDoctor && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                        <div className="bg-teal-600 px-6 py-5 flex justify-between items-center text-white font-bold">
                            <h3>{editingDoctor.id ? 'Editar Médico' : 'Novo Médico'}</h3>
                            <button onClick={() => setEditingDoctor(null)} className="text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSaveDoctor} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            <input required placeholder="Nome Completo" className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingDoctor.name || ''} onChange={e => setEditingDoctor({...editingDoctor, name: e.target.value})} />
                            <input placeholder="Especialidade" className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingDoctor.specialty || ''} onChange={e => setEditingDoctor({...editingDoctor, specialty: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Cidade" className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingDoctor.city || ''} onChange={e => setEditingDoctor({...editingDoctor, city: e.target.value})} />
                                <input placeholder="Telefone" className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingDoctor.phone || ''} onChange={e => setEditingDoctor({...editingDoctor, phone: e.target.value})} />
                            </div>
                            
                            {/* Member Selection */}
                            <div className="space-y-1">
                                <label className={`text-[10px] font-bold uppercase tracking-widest px-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Designar Membros Responsáveis (COLIH)</label>
                                <div className={`border rounded-xl p-2 max-h-40 overflow-y-auto custom-scrollbar space-y-1 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    {colihMembers.map(m => (
                                        <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-white hover:shadow-sm'}`}>
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-transparent border-gray-400"
                                                checked={editingDoctor.assignedMemberIds?.includes(m.id) || false}
                                                onChange={(e) => {
                                                    const current = editingDoctor.assignedMemberIds || [];
                                                    if (e.target.checked) setEditingDoctor({...editingDoctor, assignedMemberIds: [...current, m.id]});
                                                    else setEditingDoctor({...editingDoctor, assignedMemberIds: current.filter(id => id !== m.id)});
                                                }}
                                            />
                                            <span className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                                        </label>
                                    ))}
                                    {colihMembers.length === 0 && <p className="text-xs text-gray-500 p-2 italic">Nenhum membro COLIH ativo.</p>}
                                </div>
                            </div>

                            <select className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingDoctor.cooperationLevel || 'Unknown'} onChange={e => setEditingDoctor({...editingDoctor, cooperationLevel: e.target.value as any})}>
                                <option value="Unknown">Nível de Cooperação Desconhecido</option>
                                <option value="Low">Baixo</option>
                                <option value="Medium">Médio</option>
                                <option value="High">Alto (Cooperador)</option>
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editingDoctor.isConsultant || false} onChange={e => setEditingDoctor({...editingDoctor, isConsultant: e.target.checked})} />
                                <span className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>Médico Consultor</span>
                            </label>
                            <div className="pt-4"><Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white">Salvar Dados</Button></div>
                        </form>
                    </div>
                </div>, document.body
            )}

            {/* MODAL EDIT VISIT */}
            {editingVisit && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${isHospitalMode ? 'bg-[#212327] border border-gray-800' : 'bg-white'}`}>
                        <div className="bg-teal-600 px-6 py-5 flex justify-between items-center text-white font-bold">
                            <h3>Registrar Atividade</h3>
                            <button onClick={() => setEditingVisit(null)} className="text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSaveVisit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                            
                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" required className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingVisit.date || ''} onChange={e => setEditingVisit({...editingVisit, date: e.target.value})} />
                                <select className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingVisit.interactionType || ''} onChange={e => setEditingVisit({...editingVisit, interactionType: e.target.value as any})}>
                                    <option value="">Tipo de Interação</option>
                                    {INTERACTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>

                            {/* SELEÇÃO DE TIPO DE LOCAL */}
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button type="button" onClick={() => setIsExternalVisit(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${!isExternalVisit ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}>Hospital Cadastrado</button>
                                <button type="button" onClick={() => setIsExternalVisit(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${isExternalVisit ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}>Outro / Externo</button>
                            </div>

                            {isExternalVisit ? (
                                <input 
                                    type="text" 
                                    placeholder="Nome da Instituição ou Profissional (Externo)" 
                                    className={`w-full p-3 border rounded-xl font-bold ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50 border-gray-300'}`}
                                    value={customLocationName}
                                    onChange={e => setCustomLocationName(e.target.value)}
                                />
                            ) : (
                                <>
                                    <select className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingVisit.doctorId || ''} onChange={e => setEditingVisit({...editingVisit, doctorId: e.target.value, hospitalId: undefined})}>
                                        <option value="">Selecione o Médico (Opcional)</option>
                                        {state.doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <select className={`w-full p-3 border rounded-xl ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingVisit.hospitalId || ''} onChange={e => setEditingVisit({...editingVisit, hospitalId: e.target.value, doctorId: undefined})}>
                                        <option value="">Selecione o Hospital (Opcional)</option>
                                        {state.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                </>
                            )}

                            {/* PARTICIPANTES MULTIPLOS */}
                            <div className="space-y-1">
                                <label className={`text-[10px] font-bold uppercase tracking-widest px-1 ${isHospitalMode ? 'text-gray-500' : 'text-gray-400'}`}>Membros Participantes (Checklist)</label>
                                <div className={`border rounded-xl p-2 max-h-32 overflow-y-auto custom-scrollbar space-y-1 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    {colihMembers.map(m => (
                                        <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${isHospitalMode ? 'hover:bg-white/5' : 'hover:bg-white hover:shadow-sm'}`}>
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-transparent border-gray-400"
                                                checked={editingVisit.memberIds?.includes(m.id) || false}
                                                onChange={(e) => {
                                                    const current = editingVisit.memberIds || [];
                                                    if (e.target.checked) setEditingVisit({...editingVisit, memberIds: [...current, m.id]});
                                                    else setEditingVisit({...editingVisit, memberIds: current.filter(id => id !== m.id)});
                                                }}
                                            />
                                            <span className={`text-sm ${isHospitalMode ? 'text-gray-300' : 'text-gray-700'}`}>{m.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <textarea placeholder="Relatório da atividade..." className={`w-full p-3 border rounded-xl h-24 ${isHospitalMode ? 'bg-[#1a1c1e] border-gray-700 text-white' : 'bg-gray-50'}`} value={editingVisit.notes || ''} onChange={e => setEditingVisit({...editingVisit, notes: e.target.value})} />
                            <div className="pt-4"><Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white">Salvar Registro</Button></div>
                        </form>
                    </div>
                </div>, document.body
            )}

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
