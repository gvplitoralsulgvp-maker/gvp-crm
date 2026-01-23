
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

    const fetchAll = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('hospitals').select('*'),
      supabase.from('routes').select('*'),
      supabase.from('visits').select('*'),
      supabase.from('social_worker_visits').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('logs').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('doctors').select('*'),
      supabase.from('colih_visits').select('*'),
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

      visits: mapFromDb<VisitSlot>(fetchAll[3].data).map(v => ({
          ...v,
          memberIds: ensureArray(v.memberIds, (v as any).member_ids)
      })),

      socialWorkerVisits: mapFromDb<SocialWorkerVisit>(fetchAll[4].data).map(v => ({
          ...v,
          memberIds: ensureArray(v.memberIds, (v as any).member_ids)
      })),

      // Mapeamento Explícito para PACIENTES (Snake -> Camel)
      patients: mapFromDb<any>(fetchAll[5].data).map(p => ({
          ...p,
          assignedColihIds: ensureArray(p.assignedColihIds, p.assigned_colih_ids),
          isMedicalDischarge: p.is_medical_discharge ?? p.isMedicalDischarge ?? false,
          gvpRequestPending: p.gvp_request_pending ?? p.gvpRequestPending ?? false,
          nonWitnessFamily: p.non_witness_family ?? p.nonWitnessFamily ?? false,
          elderPhone: p.elder_phone ?? p.elderPhone,
          isExternalRequest: p.is_external_request ?? p.isExternalRequest ?? false
      }) as Patient),

      logs: mapFromDb<LogEntry>(fetchAll[6].data),
      notifications: mapFromDb<AppNotification>(fetchAll[7].data),
      
      doctors: mapFromDb<Doctor>(fetchAll[8].data).map(d => ({
          ...d,
          hospitalIds: ensureArray(d.hospitalIds, (d as any).hospital_ids)
      })),

      colihVisits: mapFromDb<ColihVisit>(fetchAll[9].data).map(v => ({
          ...v,
          memberIds: ensureArray(v.memberIds, (v as any).member_ids)
      })),

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
          createdAt: e.created_at ?? e.createdAt
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
    }

    if (table === 'patients') {
        if (copy.assignedColihIds !== undefined) { copy.assigned_colih_ids = copy.assignedColihIds; delete copy.assignedColihIds; }
        if (copy.isMedicalDischarge !== undefined) { copy.is_medical_discharge = copy.isMedicalDischarge; delete copy.isMedicalDischarge; }
        if (copy.gvpRequestPending !== undefined) { copy.gvp_request_pending = copy.gvpRequestPending; delete copy.gvpRequestPending; }
        if (copy.nonWitnessFamily !== undefined) { copy.non_witness_family = copy.nonWitnessFamily; delete copy.nonWitnessFamily; }
        if (copy.elderPhone !== undefined) { copy.elder_phone = copy.elderPhone; delete copy.elderPhone; }
        if (copy.isExternalRequest !== undefined) { copy.is_external_request = copy.isExternalRequest; delete copy.isExternalRequest; }
    }

    if (table === 'hospitals') {
        if (copy.responsibleMemberIds !== undefined) { copy.responsible_member_ids = copy.responsibleMemberIds; delete copy.responsibleMemberIds; }
    }

    if (table === 'visits' || table === 'social_worker_visits' || table === 'colih_visits') {
        if (copy.memberIds !== undefined) { copy.member_ids = copy.memberIds; delete copy.memberIds; }
    }

    if (table === 'doctors') {
        if (copy.hospitalIds !== undefined) { copy.hospital_ids = copy.hospitalIds; delete copy.hospitalIds; }
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

export const atomicUpdate = async (table: string, record: any) => {
    if (!supabase) return;
    
    // Aplica a sanitização/conversão baseada na tabela
    const sanitized = sanitizeForDb(table, record);
    
    const { error } = await supabase.from(table).upsert(sanitized);
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
