
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * Retorna o estado inicial completo e tipado.
 * Isso garante que todas as propriedades exigidas pela interface AppState estejam presentes.
 */
export const createDefaultState = (): AppState => {
  return {
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
};

/**
 * Sanitização para o banco de dados (converte camelCase para snake_case).
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
 * Mapeamento do banco (snake_case) para o App (camelCase).
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
 * Atualização Atômica no Supabase.
 */
export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) throw error;
};

/**
 * Exclusão Atômica no Supabase.
 */
export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

/**
 * Carrega o estado completo do banco de dados.
 * Garante que o retorno seja um AppState válido com todas as propriedades inicializadas.
 */
export const loadState = async (): Promise<AppState> => {
  const state = createDefaultState();
  if (!supabase) return state;

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
      // Converte nome da tabela para chave do estado (ex: social_worker_visits -> socialWorkerVisits)
      const stateKey = t.replace(/(_\w)/g, m => m[1].toUpperCase());
      loadedData[stateKey] = camelData;
    });

    // Construção explícita da resposta para evitar erro de propriedade ausente
    const finalState: AppState = {
      currentUser: null,
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
    console.error("[Storage] Erro ao carregar estado:", e);
    return state;
  }
};

/**
 * SaveState depreciado, mantido apenas para compatibilidade de interface se necessário.
 */
export const saveState = async (state: AppState) => {
  return Promise.resolve();
};
