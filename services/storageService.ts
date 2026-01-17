
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * FABRICA DE ESTADO PADRÃO
 * Garante que o objeto retornado tenha TODAS as chaves da interface AppState.
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
 * Mapeador de Banco (Snake Case) para App (Camel Case)
 * Retorna explicitamente T[] para evitar inferência de never[]
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
 * Carregamento do Estado Principal
 */
export const loadState = async (): Promise<AppState> => {
  if (!supabase) return createDefaultState();

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Consultas paralelas ao banco
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

    const members = mapFromDb<Member>(resMem.data);

    // MONTAGEM EXPLÍCITA: O TypeScript validará se falta alguma chave aqui
    const finalState: AppState = {
      currentUser: null,
      members: members,
      hospitals: mapFromDb<Hospital>(resHos.data),
      routes: mapFromDb<VisitRoute>(resRou.data),
      visits: mapFromDb<VisitSlot>(resVis.data),
      socialWorkerVisits: mapFromDb<SocialWorkerVisit>(resSoc.data),
      patients: mapFromDb<Patient>(resPat.data),
      logs: mapFromDb<LogEntry>(resLog.data),
      notifications: mapFromDb<Notification>(resNot.data)
    };

    // Define usuário logado
    if (session?.user) {
      finalState.currentUser = members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[StorageService] Falha crítica no carregamento:", error);
    return createDefaultState();
  }
};

/**
 * Sanitização para o banco (Camel -> Snake)
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
  // Mantido para compatibilidade de interface
  return Promise.resolve();
};
