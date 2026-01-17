import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * FABRICA DE ESTADO PADRÃO
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
 * Mapeador de Banco para App
 */
function mapFromDb<T>(data: any[] | null): T[] {
  if (!data || !Array.isArray(data)) return [] as T[];
  
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
 * CARREGAMENTO DE ESTADO
 */
export const loadState = async (): Promise<AppState> => {
  const defaultState = createDefaultState();
  if (!supabase) return defaultState;

  try {
    const { data: { session } } = await supabase.auth.getSession();

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

    const membersList = mapFromDb<Member>(resMem.data);

    // Objeto construído de forma atômica para evitar erro TS2741
    const finalState: AppState = {
      currentUser: null,
      members: membersList,
      hospitals: mapFromDb<Hospital>(resHos.data),
      routes: mapFromDb<VisitRoute>(resRou.data),
      visits: mapFromDb<VisitSlot>(resVis.data),
      socialWorkerVisits: mapFromDb<SocialWorkerVisit>(resSoc.data),
      patients: mapFromDb<Patient>(resPat.data),
      logs: mapFromDb<LogEntry>(resLog.data),
      notifications: mapFromDb<Notification>(resNot.data)
    };

    if (session?.user) {
      finalState.currentUser = membersList.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[StorageService] Falha crítica no carregamento:", error);
    return defaultState;
  }
};

/**
 * Utilitário de Sanitização
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
  // A persistência agora é atômica via atomicUpdate por evento
  return Promise.resolve();
};
