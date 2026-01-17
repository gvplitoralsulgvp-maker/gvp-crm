
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * Estado inicial seguro e completo.
 */
export const createDefaultState = (): AppState => ({
  currentUser: null,
  members: [],
  hospitals: [],
  routes: [],
  visits: [],
  socialWorkerVisits: [],
  patients: [],
  logs: [],
  notifications: []
});

/**
 * Sanitização rigorosa para o banco de dados.
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };

  if (tableName === 'members') {
    delete cleanData.password;
    if ('circuit' in cleanData) delete cleanData.circuit;
  }
  
  if (tableName === 'patients') {
    delete cleanData.hospitalName;
  }
  
  if (tableName === 'routes') {
    delete cleanData.hospitals;
    if (!cleanData.hospitalIds) cleanData.hospitalIds = [];
  }

  const snakeCaseData: any = {};
  Object.keys(cleanData).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseData[snakeKey] = cleanData[key];
  });

  return snakeCaseData;
};

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

export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) throw error;
};

export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

/**
 * Carregamento de estado com casting forçado para evitar erro de propriedade faltante no build.
 */
export const loadState = async (): Promise<AppState> => {
  const defaultState = createDefaultState();
  if (!supabase) return defaultState;

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
    
    // Objeto temporário para montagem
    const loadedData: any = {};
    
    tables.forEach((t, idx) => {
      const dbData = results[idx].data || [];
      const camelData = mapFromDb(dbData);
      
      let stateKey = t.replace(/(_\w)/g, m => m[1].toUpperCase());
      if (stateKey === 'socialWorkerVisits') {
          loadedData.socialWorkerVisits = camelData;
      } else {
          loadedData[stateKey] = camelData;
      }
    });

    // Garantimos que TODAS as chaves de AppState existam antes do cast
    const finalState: AppState = {
      currentUser: null,
      members: loadedData.members || [],
      hospitals: loadedData.hospitals || [],
      routes: loadedData.routes || [],
      visits: loadedData.visits || [],
      socialWorkerVisits: loadedData.socialWorkerVisits || [],
      patients: loadedData.patients || [],
      logs: loadedData.logs || [],
      notifications: loadedData.notifications || []
    };

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (e) {
    console.error("[Storage] Erro no loadState:", e);
    return defaultState;
  }
};

export const saveState = async (state: AppState) => {
  return Promise.resolve();
};
