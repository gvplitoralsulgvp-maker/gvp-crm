
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * ESTADO BASE GARANTIDO
 * Criamos uma função que retorna um objeto AppState completo com tipos explícitos.
 */
export const createDefaultState = (): AppState => {
  const state: AppState = {
    currentUser: null,
    members: [] as Member[],
    hospitals: [] as Hospital[],
    routes: [] as VisitRoute[],
    visits: [] as VisitSlot[],
    socialWorkerVisits: [] as SocialWorkerVisit[],
    patients: [] as Patient[],
    logs: [] as LogEntry[],
    notifications: [] as Notification[]
  };
  return state;
};

/**
 * Função utilitária de mapeamento (Snake -> Camel)
 */
function mapCollection<T>(data: any[] | null): T[] {
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
 * Carregamento do Estado.
 */
export const loadState = async (): Promise<AppState> => {
  // Inicializa com o default garantido
  const finalState: AppState = createDefaultState();
  
  if (!supabase) return finalState;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Consultas individuais
    const [
      resMembers,
      resHospitals,
      resRoutes,
      resVisits,
      resSocial,
      resPatients,
      resLogs,
      resNotifs
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

    // Preenchimento manual garantindo a tipagem de cada campo
    finalState.members = mapCollection<Member>(resMembers.data);
    finalState.hospitals = mapCollection<Hospital>(resHospitals.data);
    finalState.routes = mapCollection<VisitRoute>(resRoutes.data);
    finalState.visits = mapCollection<VisitSlot>(resVisits.data);
    finalState.socialWorkerVisits = mapCollection<SocialWorkerVisit>(resSocial.data);
    finalState.patients = mapCollection<Patient>(resPatients.data);
    finalState.logs = mapCollection<LogEntry>(resLogs.data);
    finalState.notifications = mapCollection<Notification>(resNotifs.data);

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[Storage] Erro no carregamento:", error);
    return createDefaultState();
  }
};

/**
 * Sanitização para o banco de dados.
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
  return Promise.resolve();
};
