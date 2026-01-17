
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * Retorna o estado inicial limpo e tipado para a aplicação.
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
 * Converte nomes de campos de camelCase para snake_case para o PostgreSQL.
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };

  if (tableName === 'members') {
    delete cleanData.password;
    // Removendo campos que não existem no banco de dados físico
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

/**
 * Converte nomes de campos de snake_case do banco para camelCase do React.
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
 * Executa um Upsert atômico em uma tabela do Supabase.
 */
export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) {
    console.error(`[Storage] Erro no upsert em ${tableName}:`, error);
    throw error;
  }
};

/**
 * Remove um registro pelo ID.
 */
export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

/**
 * Carrega todo o estado da aplicação do Supabase.
 */
export const loadState = async (): Promise<AppState> => {
  const baseState = createDefaultState();
  if (!supabase) return baseState;

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
    
    // Explicitly typed finalState to avoid inference issues with spread
    const finalState: AppState = {
      currentUser: baseState.currentUser,
      members: baseState.members,
      hospitals: baseState.hospitals,
      routes: baseState.routes,
      visits: baseState.visits,
      socialWorkerVisits: baseState.socialWorkerVisits,
      patients: baseState.patients,
      logs: baseState.logs,
      notifications: baseState.notifications
    };
    
    tables.forEach((t, idx) => {
      const dbData = results[idx].data || [];
      const camelData = mapFromDb(dbData);
      const stateKey = t.replace(/(_\w)/g, m => m[1].toUpperCase());
      
      if (stateKey === 'socialWorkerVisits') {
          finalState.socialWorkerVisits = camelData as SocialWorkerVisit[];
      } else if (stateKey in finalState) {
          (finalState as any)[stateKey] = camelData;
      }
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
  // saveState depreciado, mantido apenas para compatibilidade de assinatura se necessário.
  return Promise.resolve();
};
