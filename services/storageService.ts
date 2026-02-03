
import { AppState, Member, VisitSlot, Patient, LogEntry, AppNotification, Hospital, VisitRoute, SocialWorkerVisit, Doctor, ColihVisit, CityMapping, AppDocument, AppEvent } from '../types';
import { supabase } from './supabaseClient';

export const createDefaultState = (): AppState => ({
  currentUser: null,
  members: [],
  hospitals: [],
  routes: [] as VisitRoute[],
  visits: [] as VisitSlot[],
  socialWorkerVisits: [] as SocialWorkerVisit[],
  patients: [] as Patient[],
  logs: [] as LogEntry[],
  notifications: [] as AppNotification[],
  doctors: [] as Doctor[],
  colihVisits: [] as ColihVisit[],
  presentationGoal: 12,
  cityMappings: [] as CityMapping[],
  documents: [] as AppDocument[],
  events: [] as AppEvent[]
});

export function mapFromDb<T>(data: any[] | null): T[] {
  if (!data) return [];
  return data as T[];
}

// Helper to ensure arrays are defined (handles potential snake_case from DB)
const ensureArray = (val: any, altVal?: any): any[] => {
    if (Array.isArray(val)) return val;
    if (Array.isArray(altVal)) return altVal;
    return [];
};

export const loadState = async (): Promise<AppState> => {
  const defaultState = createDefaultState();
  if (!supabase) return defaultState;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // PERFORMANCE OPTIMIZATION:
    // Limitar carregamento de visitas, logs e histórico antigo
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const dateLimit = sixMonthsAgo.toISOString().split('T')[0];

    const fetchAll = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('hospitals').select('*'),
      supabase.from('routes').select('*'),
      supabase.from('visits').select('*').gte('date', dateLimit), // Load only recent visits
      supabase.from('social_worker_visits').select('*').gte('date', dateLimit),
      supabase.from('patients').select('*'), // Patients must load all to handle history correctly
      supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(200), // Limit logs
      supabase.from('notifications').select('*'),
      supabase.from('doctors').select('*'),
      supabase.from('colih_visits').select('*').gte('date', dateLimit),
      supabase.from('city_mappings').select('*'),
      supabase.from('documents').select('*'),
      supabase.from('events').select('*')
    ]);

    const finalState: AppState = {
      currentUser: null,
      
      // Mapeamento Explícito para MEMBROS (Snake -> Camel)
      members: mapFromDb<any>(fetchAll[0].data).map(m => ({
          ...m,
          isColih: m.is_colih ?? m.isColih ?? false,
          colihClassification: m.colih_classification ?? m.colihClassification,
          hasSeenOnboarding: m.has_seen_onboarding ?? m.hasSeenOnboarding ?? false,
          isTrainer: m.is_trainer ?? m.isTrainer ?? false
      }) as Member),

      // Mapeamento para Hospitais
      hospitals: mapFromDb<Hospital>(fetchAll[1].data).map(h => ({
          ...h,
          responsibleMemberIds: ensureArray(h.responsibleMemberIds, (h as any).responsible_member_ids)
      })),

      routes: mapFromDb<VisitRoute>(fetchAll[2].data).map(r => ({
          ...r,
          hospitals: ensureArray(r.hospitals)
      })),

      visits: mapFromDb<any>(fetchAll[3].data).map(v => ({
          ...v,
          routeId: v.route_id ?? v.routeId,
          memberIds: ensureArray(v.memberIds, (v as any).member_ids),
          onTheWayMemberIds: ensureArray(v.onTheWayMemberIds, (v as any).on_the_way_member_ids)
      }) as VisitSlot),

      socialWorkerVisits: mapFromDb<any>(fetchAll[4].data).map(v => ({
          ...v,
          hospitalId: v.hospital_id ?? v.hospitalId,
          memberIds: ensureArray(v.memberIds, (v as any).member_ids),
          createdAt: v.created_at ?? v.createdAt
      }) as SocialWorkerVisit),

      // Mapeamento Explícito para PACIENTES (Snake -> Camel)
      patients: mapFromDb<any>(fetchAll[5].data).map(p => ({
          ...p,
          admissionDate: p.admission_date ?? p.admissionDate,
          hospitalId: p.hospital_id ?? p.hospitalId,
          hospitalName: p.hospital_name ?? p.hospitalName,
          companionName: p.companion_name ?? p.companionName,
          companionPhone: p.companion_phone ?? p.companionPhone,
          localElder: p.local_elder ?? p.localElder,
          spiritualStatus: p.spiritual_status ?? p.spiritualStatus,
          hasDirectivesCard: p.has_directives_card ?? p.hasDirectivesCard ?? false,
          hasS55: p.has_s55 ?? p.hasS55 ?? false,
          formsConsidered: p.forms_considered ?? p.formsConsidered ?? false,
          agentsNotified: p.agents_notified ?? p.agentsNotified ?? false,
          visitTime: p.visit_time ?? p.visitTime,
          isSurgical: p.is_surgical ?? p.isSurgical ?? false,
          surgeryDate: p.surgery_date ?? p.surgeryDate,
          clinicalStatus: p.clinical_status ?? p.clinicalStatus,
          estimatedDischargeDate: p.estimated_discharge_date ?? p.estimatedDischargeDate,
          needsAccommodation: p.needs_accommodation ?? p.needsAccommodation ?? false,
          isIsolation: p.is_isolation ?? p.isIsolation ?? false,
          isolationType: p.isolation_type ?? p.isolationType,
          
          assignedColihIds: ensureArray(p.assignedColihIds, p.assigned_colih_ids),
          isMedicalDischarge: p.is_medical_discharge ?? p.isMedicalDischarge ?? false,
          pendingHlc7: p.pending_hlc7 ?? p.pendingHlc7 ?? false,
          gvpRequestPending: p.gvp_request_pending ?? p.gvpRequestPending ?? false,
          nonWitnessFamily: p.non_witness_family ?? p.nonWitnessFamily ?? false,
          elderPhone: p.elder_phone ?? p.elderPhone,
          isExternalRequest: p.is_external_request ?? p.isExternalRequest ?? false,
          requestDate: p.request_date ?? p.requestDate
      }) as Patient),

      // Mapeamento LOGS (Snake -> Camel)
      logs: mapFromDb<any>(fetchAll[6].data).map(l => ({
          ...l,
          userId: l.user_id ?? l.userId,
          userName: l.user_name ?? l.userName
      }) as LogEntry),

      // Mapeamento NOTIFICATIONS (Snake -> Camel)
      notifications: mapFromDb<any>(fetchAll[7].data).map(n => ({
          ...n,
          userId: n.user_id ?? n.userId
      }) as AppNotification),
      
      // Mapeamento DOCTORS (Snake -> Camel)
      doctors: mapFromDb<any>(fetchAll[8].data).map(d => ({
          ...d,
          hospitalIds: ensureArray(d.hospitalIds, d.hospital_ids),
          cooperationLevel: d.cooperation_level ?? d.cooperationLevel,
          isConsultant: d.is_consultant ?? d.isConsultant,
          treatsPediatric: d.treats_pediatric ?? d.treatsPediatric,
          responsibleMemberName: d.responsible_member_name ?? d.responsibleMemberName,
          lastVisitDate: d.last_visit_date ?? d.lastVisitDate,
          assignedMemberIds: ensureArray(d.assignedMemberIds, d.assigned_member_ids)
      }) as Doctor),

      colihVisits: mapFromDb<any>(fetchAll[9].data).map(v => ({
          ...v,
          doctorId: v.doctor_id ?? v.doctorId,
          hospitalId: v.hospital_id ?? v.hospitalId,
          interactionType: v.interaction_type ?? v.interactionType,
          hlc38Presented: v.hlc38_presented ?? v.hlc38Presented,
          collaboratorInterest: v.collaborator_interest ?? v.collaboratorInterest,
          memberIds: ensureArray(v.memberIds, (v as any).member_ids),
          createdAt: v.created_at ?? v.createdAt
      }) as ColihVisit),

      presentationGoal: 12,
      cityMappings: mapFromDb<CityMapping>(fetchAll[10].data),
      
      // Mapeamento DOCUMENTOS (Snake -> Camel)
      documents: mapFromDb<any>(fetchAll[11].data).map(d => ({
          ...d,
          filePath: d.file_path ?? d.filePath,
          contentType: d.content_type ?? d.contentType,
          createdAt: d.created_at ?? d.createdAt
      }) as AppDocument),

      // Mapeamento EVENTOS (Snake -> Camel)
      events: mapFromDb<any>(fetchAll[12].data).map(e => ({
          ...e,
          targetGroup: e.target_group ?? e.targetGroup ?? 'ALL',
          createdAt: e.created_at ?? e.createdAt,
          attendees: ensureArray(e.attendees)
      }) as AppEvent)
    };

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[StorageService] Erro no loadState:", error);
    return defaultState;
  }
};

// Prepara o objeto para salvar no banco (Camel -> Snake)
const sanitizeForDb = (table: string, data: any) => {
    const copy = JSON.parse(JSON.stringify(data));

    if (table === 'members') {
        if (copy.isColih !== undefined) { copy.is_colih = copy.isColih; delete copy.isColih; }
        if (copy.colihClassification !== undefined) { copy.colih_classification = copy.colihClassification; delete copy.colihClassification; }
        if (copy.hasSeenOnboarding !== undefined) { copy.has_seen_onboarding = copy.hasSeenOnboarding; delete copy.hasSeenOnboarding; }
        if (copy.isTrainer !== undefined) { copy.is_trainer = copy.isTrainer; delete copy.isTrainer; }
    }

    if (table === 'patients') {
        if (copy.assignedColihIds !== undefined) { copy.assigned_colih_ids = copy.assignedColihIds; delete copy.assignedColihIds; }
        if (copy.isMedicalDischarge !== undefined) { copy.is_medical_discharge = copy.isMedicalDischarge; delete copy.isMedicalDischarge; }
        if (copy.pendingHlc7 !== undefined) { copy.pending_hlc7 = copy.pendingHlc7; delete copy.pendingHlc7; }
        if (copy.gvpRequestPending !== undefined) { copy.gvp_request_pending = copy.gvpRequestPending; delete copy.gvpRequestPending; }
        if (copy.nonWitnessFamily !== undefined) { copy.non_witness_family = copy.nonWitnessFamily; delete copy.nonWitnessFamily; }
        if (copy.elderPhone !== undefined) { copy.elder_phone = copy.elderPhone; delete copy.elderPhone; }
        if (copy.isExternalRequest !== undefined) { copy.is_external_request = copy.isExternalRequest; delete copy.isExternalRequest; }
        if (copy.requestDate !== undefined) { copy.request_date = copy.requestDate; delete copy.requestDate; }
        
        // Mapeamentos adicionais para evitar PGRST204 e erros de data vazia (22007)
        if (copy.admissionDate !== undefined) { 
            copy.admission_date = copy.admissionDate === '' ? null : copy.admissionDate; 
            delete copy.admissionDate; 
        }
        if (copy.hospitalId !== undefined) { copy.hospital_id = copy.hospitalId; delete copy.hospitalId; }
        if (copy.hospitalName !== undefined) { copy.hospital_name = copy.hospitalName; delete copy.hospitalName; }
        if (copy.companionName !== undefined) { copy.companion_name = copy.companionName; delete copy.companionName; }
        if (copy.companionPhone !== undefined) { copy.companion_phone = copy.companionPhone; delete copy.companionPhone; }
        if (copy.localElder !== undefined) { copy.local_elder = copy.localElder; delete copy.localElder; }
        if (copy.spiritualStatus !== undefined) { copy.spiritual_status = copy.spiritualStatus; delete copy.spiritualStatus; }
        if (copy.hasDirectivesCard !== undefined) { copy.has_directives_card = copy.hasDirectivesCard; delete copy.hasDirectivesCard; }
        if (copy.hasS55 !== undefined) { copy.has_s55 = copy.hasS55; delete copy.hasS55; }
        if (copy.formsConsidered !== undefined) { copy.forms_considered = copy.formsConsidered; delete copy.formsConsidered; }
        if (copy.agentsNotified !== undefined) { copy.agents_notified = copy.agentsNotified; delete copy.agentsNotified; }
        if (copy.visitTime !== undefined) { copy.visit_time = copy.visitTime; delete copy.visitTime; }
        if (copy.isSurgical !== undefined) { copy.is_surgical = copy.isSurgical; delete copy.isSurgical; }
        if (copy.surgeryDate !== undefined) { 
            copy.surgery_date = copy.surgeryDate === '' ? null : copy.surgeryDate; 
            delete copy.surgeryDate; 
        }
        if (copy.clinicalStatus !== undefined) { copy.clinical_status = copy.clinicalStatus; delete copy.clinicalStatus; }
        if (copy.estimatedDischargeDate !== undefined) { 
            copy.estimated_discharge_date = copy.estimatedDischargeDate === '' ? null : copy.estimatedDischargeDate; 
            delete copy.estimatedDischargeDate; 
        }
        if (copy.needsAccommodation !== undefined) { copy.needs_accommodation = copy.needsAccommodation; delete copy.needsAccommodation; }
        if (copy.isIsolation !== undefined) { copy.is_isolation = copy.isIsolation; delete copy.isIsolation; }
        if (copy.isolationType !== undefined) { copy.isolation_type = copy.isolationType; delete copy.isolationType; }
    }

    if (table === 'hospitals') {
        if (copy.responsibleMemberIds !== undefined) { copy.responsible_member_ids = copy.responsibleMemberIds; delete copy.responsibleMemberIds; }
    }

    if (table === 'visits') {
        if (copy.memberIds !== undefined) { copy.member_ids = copy.memberIds; delete copy.memberIds; }
        if (copy.routeId !== undefined) { copy.route_id = copy.routeId; delete copy.routeId; }
        if (copy.onTheWayMemberIds !== undefined) { copy.on_the_way_member_ids = copy.onTheWayMemberIds; delete copy.onTheWayMemberIds; }
    }

    if (table === 'colih_visits') {
        if (copy.memberIds !== undefined) { copy.member_ids = copy.memberIds; delete copy.memberIds; }
        if (copy.doctorId !== undefined) { copy.doctor_id = copy.doctorId; delete copy.doctorId; }
        if (copy.hospitalId !== undefined) { copy.hospital_id = copy.hospitalId; delete copy.hospitalId; }
        if (copy.interactionType !== undefined) { copy.interaction_type = copy.interactionType; delete copy.interactionType; }
        if (copy.hlc38Presented !== undefined) { copy.hlc38_presented = copy.hlc38Presented; delete copy.hlc38Presented; }
        if (copy.collaboratorInterest !== undefined) { copy.collaborator_interest = copy.collaboratorInterest; delete copy.collaboratorInterest; }
        if (copy.createdAt !== undefined) { copy.created_at = copy.createdAt; delete copy.createdAt; }
    }

    if (table === 'social_worker_visits') {
        if (copy.memberIds !== undefined) { copy.member_ids = copy.memberIds; delete copy.memberIds; }
        if (copy.hospitalId !== undefined) { copy.hospital_id = copy.hospitalId; delete copy.hospitalId; }
        if (copy.createdAt !== undefined) { copy.created_at = copy.createdAt; delete copy.createdAt; }
    }

    if (table === 'doctors') {
        if (copy.hospitalIds !== undefined) { copy.hospital_ids = copy.hospitalIds; delete copy.hospitalIds; }
        if (copy.cooperationLevel !== undefined) { copy.cooperation_level = copy.cooperationLevel; delete copy.cooperationLevel; }
        if (copy.isConsultant !== undefined) { copy.is_consultant = copy.isConsultant; delete copy.isConsultant; }
        if (copy.treatsPediatric !== undefined) { copy.treats_pediatric = copy.treatsPediatric; delete copy.treatsPediatric; }
        if (copy.responsibleMemberName !== undefined) { copy.responsible_member_name = copy.responsibleMemberName; delete copy.responsibleMemberName; }
        if (copy.lastVisitDate !== undefined) { copy.last_visit_date = copy.lastVisitDate; delete copy.lastVisitDate; }
        if (copy.assignedMemberIds !== undefined) { copy.assigned_member_ids = copy.assignedMemberIds; delete copy.assignedMemberIds; }
    }

    // Mapeamento LOGS (Camel -> Snake)
    if (table === 'logs') {
        if (copy.userId !== undefined) { copy.user_id = copy.userId; delete copy.userId; }
        if (copy.userName !== undefined) { copy.user_name = copy.userName; delete copy.userName; }
    }

    // Mapeamento NOTIFICATIONS (Camel -> Snake)
    if (table === 'notifications') {
        if (copy.userId !== undefined) { copy.user_id = copy.userId; delete copy.userId; }
    }

    // Mapeamento DOCUMENTOS (Camel -> Snake)
    if (table === 'documents') {
        if (copy.filePath !== undefined) { copy.file_path = copy.filePath; delete copy.filePath; }
        if (copy.contentType !== undefined) { copy.content_type = copy.contentType; delete copy.contentType; }
        if (copy.createdAt !== undefined) { copy.created_at = copy.createdAt; delete copy.createdAt; }
    }

    // Mapeamento EVENTOS (Camel -> Snake)
    if (table === 'events') {
        if (copy.targetGroup !== undefined) { copy.target_group = copy.targetGroup; delete copy.targetGroup; }
        if (copy.createdAt !== undefined) { copy.created_at = copy.createdAt; delete copy.createdAt; }
    }

    return copy;
};

// Retry logic to handle Schema Drift (Missing Columns)
const attemptSaveWithFallback = async (table: string, payload: any, operation: 'insert' | 'upsert') => {
    if (!supabase) return { error: { message: "Supabase not configured" } };

    const { error } = await supabase.from(table)[operation](payload);

    if (error) {
        // Fallback para colunas novas que podem não existir no banco (Erro PGRST204 ou mensagem de schema cache)
        if (error.code === 'PGRST204' || error.message?.includes('Could not find the') || error.message?.includes('schema cache')) {
             console.warn(`[Storage] Schema desatualizado detectado para tabela '${table}'. Tentando salvar em modo de compatibilidade...`);
             
             // Lista de colunas recentes para remover do payload
             const problemFields = [
                 'pending_hlc7', 'is_medical_discharge', 'gvp_request_pending', 
                 'request_date', 'is_external_request', 'regional', 
                 'is_trainer', 'has_seen_onboarding', 'colih_classification',
                 'attendees', 'hlc38_presented', 'collaborator_interest'
             ];
             
             const legacyPayload = { ...payload };
             problemFields.forEach(f => delete legacyPayload[f]);
             
             // Tenta novamente sem as colunas novas
             return await supabase.from(table)[operation](legacyPayload);
        }
        return { error };
    }
    return { error: null };
};

export const atomicUpdate = async (table: string, record: any) => {
    const sanitized = sanitizeForDb(table, record);
    const { error } = await attemptSaveWithFallback(table, sanitized, 'upsert');
    if (error) throw error;
};

export const atomicInsert = async (table: string, record: any) => {
    const sanitized = sanitizeForDb(table, record);
    const { error } = await attemptSaveWithFallback(table, sanitized, 'insert');
    if (error) throw error;
};

export const atomicDelete = async (table: string, id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
};

export const uploadFile = async (file: File, category: string): Promise<{ path: string, url: string }> => {
    if (!supabase) throw new Error("Supabase off");
    
    // Sanitizar nome do arquivo para evitar caracteres especiais que quebrem URLs
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${category}_${Math.random().toString(36).substring(2)}_${Date.now()}_${sanitizedName}`;
    const filePath = `${fileName}`;

    // Tentativa inicial de upload
    let { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

    // Tratamento de erro 403 (Permission) ou 404 (Bucket Missing)
    if (uploadError) {
        console.warn("Erro upload inicial:", uploadError);
        console.error("Full Upload Error:", uploadError);
        
        // Se erro for 403 (RLS Policy Violation)
        if ((uploadError as any).statusCode === '403' || (uploadError as any).message?.includes('row-level security')) {
             throw new Error("⛔ ERRO DE PERMISSÃO (403): O Supabase bloqueou o upload. Isso é normal na primeira vez. Clique em 'Configurar Storage' acima e rode o SQL.");
        }

        // Se erro for 404, tenta criar automaticamente
        if ((uploadError as any).message?.includes('Bucket not found') || (uploadError as any).statusCode === '404') {
            console.log("Bucket 'resources' não encontrado. Tentando criar...");
            const { error: createError } = await supabase.storage.createBucket('resources', {
                public: true
            });
            
            if (!createError) {
                const retry = await supabase.storage.from('resources').upload(filePath, file);
                uploadError = retry.error;
            } else {
                console.error("Falha ao criar bucket:", createError);
                throw new Error("Erro: Bucket 'resources' não existe. Clique em 'Configurar Storage' na página de Materiais para corrigir.");
            }
        }
    }

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

    return { path: filePath, url: publicUrl };
};

export const deleteFile = async (path: string) => {
    if (!supabase) return;
    await supabase.storage.from('resources').remove([path]);
};
