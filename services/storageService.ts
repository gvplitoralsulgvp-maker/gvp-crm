
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * Constante de Estado Inicial (Molde).
 * GARANTE que todas as propriedades obrigatórias da interface AppState estejam presentes.
 * Isso evita o erro TS2741 durante o build.
 */
const EMPTY_STATE: AppState = {
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
 * Cria um estado padrão limpo.
 */
export const createDefaultState = (): AppState => ({
  ...EMPTY_STATE
});

/**
 * Converte camelCase para snake_case para o banco de dados.
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
 * Converte snake_case para camelCase vindo do banco.
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
 * Carrega o estado completo.
 * Implementação Robusta: Começa com o EMPTY_STATE e preenche os dados.
 */
export const loadState = async (): Promise<AppState> => {
  if (!supabase) return createDefaultState();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Lista de tabelas para consulta
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
    const rawData: Record<string, any[]> = {};
    
    tables.forEach((t, idx) => {
      rawData[t] = mapFromDb(results[idx].data || []);
    });

    // Montagem do estado final garantindo tipagem de arrays para evitar never[]
    const finalState: AppState = {
      currentUser: null,
      members: (rawData['members'] || []) as Member[],
      hospitals: (rawData['hospitals'] || []) as Hospital[],
      routes: (rawData['routes'] || []) as VisitRoute[],
      visits: (rawData['visits'] || []) as VisitSlot[],
      socialWorkerVisits: (rawData['social_worker_visits'] || []) as SocialWorkerVisit[],
      patients: (rawData['patients'] || []) as Patient[],
      logs: (rawData['logs'] || []) as LogEntry[],
      notifications: (rawData['notifications'] || []) as Notification[]
    };

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (e) {
    console.error("[Storage] Erro ao carregar estado do Supabase:", e);
    return createDefaultState();
  }
};

/**
 * Função mantida apenas para compatibilidade, o salvamento agora é atômico.
 */
export const saveState = async (state: AppState) => {
  return Promise.resolve();
};
