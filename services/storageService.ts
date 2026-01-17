
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

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
 * Converte nomes de campos de camelCase para snake_case para o PostgreSQL
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };

  // Remover campos virtuais de UI que não existem no banco
  if (tableName === 'members') delete cleanData.password;
  if (tableName === 'patients') delete cleanData.hospitalName;
  if (tableName === 'routes') delete cleanData.hospitals;

  const snakeCaseData: any = {};
  Object.keys(cleanData).forEach(key => {
    // Converte camelCase para snake_case (ex: hospitalId -> hospital_id)
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseData[snakeKey] = cleanData[key];
  });

  return snakeCaseData;
};

/**
 * Converte nomes de campos de snake_case para camelCase para o React
 */
const mapFromDb = (data: any[]) => {
  return data.map((item: any) => {
    const camelItem: any = {};
    Object.keys(item).forEach(key => {
      // Converte snake_case para camelCase (ex: hospital_id -> hospitalId)
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
  if (error) {
    console.error(`[Storage] Erro no upsert em ${tableName}:`, error);
    throw error;
  }
};

export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

export const loadState = async (): Promise<AppState> => {
  const baseState = createDefaultState();
  if (!supabase) return baseState;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Lista completa de tabelas sincronizadas
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
    
    const finalState: AppState = { ...baseState };
    
    tables.forEach((t, idx) => {
      const dbData = results[idx].data || [];
      const camelData = mapFromDb(dbData);
      
      // Mapeia para a chave correta no AppState (camelCase)
      const stateKey = t.replace(/(_\w)/g, m => m[1].toUpperCase());
      
      // Special handling for social_worker_visits -> socialWorkerVisits
      const actualKey = stateKey === 'socialWorkerVisits' ? 'socialWorkerVisits' : stateKey;
      (finalState as any)[actualKey] = camelData;
    });

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (e) {
    console.error("[Storage] Falha crítica ao carregar estado:", e);
    return baseState;
  }
};

export const saveState = async (state: AppState) => {
  // saveState está depreciado em favor de atomicUpdate por performance
  console.warn("saveState depreciado. Use atomicUpdate.");
};
