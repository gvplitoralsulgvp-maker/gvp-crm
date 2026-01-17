
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * Constante de estado inicial para garantir que todas as propriedades 
 * obrigatórias da interface AppState estejam sempre presentes.
 */
const INITIAL_STATE: AppState = {
  currentUser: null,
  members: [],
  hospitals: [],
  routes: [],
  visits: [],
  socialWorkerVisits: [],
  patients: [],
  logs: [],
  notifications: []
};

/**
 * Retorna uma cópia limpa do estado inicial.
 */
export const createDefaultState = (): AppState => ({
  ...INITIAL_STATE
});

/**
 * Sanitização para o banco de dados (Snake Case).
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };

  if (tableName === 'members') {
    delete (cleanData as any).password;
    delete (cleanData as any).circuit;
  }
  
  if (tableName === 'patients') {
    delete (cleanData as any).hospitalName;
  }
  
  if (tableName === 'routes') {
    delete (cleanData as any).hospitals;
  }

  const snakeCaseData: any = {};
  Object.keys(cleanData).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseData[snakeKey] = (cleanData as any)[key];
  });

  return snakeCaseData;
};

/**
 * Mapeamento do banco para Camel Case.
 */
const mapFromDb = (data: any[]) => {
  return data.map((item: any) => {
    const camelItem: any = {};
    Object.keys(item).forEach(key => {
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      camelItem[camelKey] = item[key];
    });
    return camelItem;
  });
};

/**
 * Atualização Atômica.
 */
export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) throw error;
};

/**
 * Exclusão Atômica.
 */
export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

/**
 * Carregamento do Estado completo.
 */
export const loadState = async (): Promise<AppState> => {
  if (!supabase) return INITIAL_STATE;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const tables = [
      'members', 
      'hospitals', 
      'routes', 
      'visits', 
      'social_worker_visits', 
      'patients', 
      'logs', 
      'notifications'
    ];
    
    const results = await Promise.all(tables.map(t => supabase!.from(t).select('*')));
    const loadedData: Record<string, any[]> = {};
    
    tables.forEach((t, idx) => {
      const dbData = results[idx].data || [];
      const camelData = mapFromDb(dbData);
      const stateKey = t.replace(/(_\w)/g, m => m[1].toUpperCase());
      loadedData[stateKey] = camelData;
    });

    // Construção segura do estado final partindo do INITIAL_STATE
    const finalState: AppState = {
      ...INITIAL_STATE,
      members: (loadedData.members || []) as Member[],
      hospitals: (loadedData.hospitals || []) as Hospital[],
      routes: (loadedData.routes || []) as VisitRoute[],
      visits: (loadedData.visits || []) as VisitSlot[],
      socialWorkerVisits: (loadedData.socialWorkerVisits || []) as SocialWorkerVisit[],
      patients: (loadedData.patients || []) as Patient[],
      logs: (loadedData.logs || []) as LogEntry[],
      notifications: (loadedData.notifications || []) as Notification[]
    };

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (e) {
    console.error("[Storage] Erro fatal no loadState:", e);
    return INITIAL_STATE;
  }
};

/**
 * SaveState depreciado.
 */
export const saveState = async (state: AppState) => {
  return Promise.resolve();
};
