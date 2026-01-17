
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * FABRICA DE ESTADO PADRÃO
 * Garante que o objeto retornado tenha TODAS as chaves da interface AppState.
 * O uso de 'as' em arrays vazios evita a inferência de 'never[]'.
 */
export const createDefaultState = (): AppState => ({
  currentUser: null,
  members: [] as Member[],
  hospitals: [] as Hospital[],
  routes: [] as VisitRoute[],
  visits: [] as VisitSlot[],
  socialWorkerVisits: [] as SocialWorkerVisit[],
  patients: [] as Patient[],
  logs: [] as LogEntry[],
  notifications: [] as Notification[]
});

/**
 * Conversor de Snake Case (DB) para Camel Case (App)
 * Usado individualmente para garantir tipagem.
 */
function toCamel<T>(data: any[] | null): T[] {
  if (!data) return [] as T[];
  return data.map((item: any) => {
    const camelItem: any = {};
    Object.keys(item).forEach(key => {
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      camelItem[camelKey] = item[key];
    });
    return camelItem as T;
  });
}

/**
 * Carregamento do Estado Principal
 */
export const loadState = async (): Promise<AppState> => {
  const state = createDefaultState();
  
  if (!supabase) return state;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Buscas paralelas no Supabase
    const [
      resMem, resHos, resRou, resVis, resSoc, resPat, resLog, resNot
    ] = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('hospitals').select('*'),
      supabase.from('routes').select('*'),
      supabase.from('visits').select('*'),
      supabase.from('social_worker_visits').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('logs').select('*'),
      supabase.from('notifications').select('*')
    ]);

    // Montagem do objeto final campo a campo para satisfazer o TypeScript
    const finalState: AppState = {
      currentUser: null,
      members: voicesToCamel<Member>(resMem.data),
      hospitals: voicesToCamel<Hospital>(resHos.data),
      routes: voicesToCamel<VisitRoute>(resRou.data),
      visits: voicesToCamel<VisitSlot>(resVis.data),
      socialWorkerVisits: voicesToCamel<SocialWorkerVisit>(resSoc.data),
      patients: voicesToCamel<Patient>(resPat.data),
      logs: voicesToCamel<LogEntry>(resLog.data),
      notifications: voicesToCamel<Notification>(resNot.data)
    };

    // Define o usuário atual se houver sessão
    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[Storage] Falha no carregamento:", error);
    return state;
  }
};

/**
 * Atalho interno para a função de mapeamento
 */
function voicesToCamel<T>(data: any): T[] {
    return toCamel<T>(data);
}

/**
 * Sanitização para o banco de dados (converte Camel para Snake)
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };
  if (tableName === 'members') delete (cleanData as any).password;
  if (tableName === 'patients') delete (cleanData as any).hospitalName;
  if (tableName === 'routes') delete (cleanData as any).hospitals;

  const snakeCaseData: any = {};
  Object.keys(cleanData).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseData[snakeKey] = (cleanData as any)[key];
  });
  return snakeCaseData;
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

export const saveState = async (state: AppState) => {
  // Implementação futura ou via atomicUpdate
  return Promise.resolve();
};
