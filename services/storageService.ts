
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit, UserRole } from '../types';
import { supabase } from './supabaseClient';

/**
 * ESTADO PADRÃO ABSOLUTO
 * Explicitamente definido para que o TS nunca veja um objeto incompleto.
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
 * Função utilitária de mapeamento manual (Snake -> Camel)
 * Trabalhar com tipos genéricos aqui ajuda na tipagem individual depois.
 */
function mapCollection<T>(data: any[] | null): T[] {
  if (!data) return [];
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
 * Carregamento do Estado usando Variáveis Explícitas.
 * Esta é a "outra saída": evitar loops na construção do objeto final.
 */
export const loadState = async (): Promise<AppState> => {
  // Começamos com um estado limpo e garantido
  const state = createDefaultState();
  
  if (!supabase) return state;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Buscas individuais (mais verboso, porém 100% seguro para o compilador)
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

    // Montagem MANUAL do objeto AppState
    // Aqui não há como o TS reclamar de propriedade ausente pois estamos declarando todas.
    const loadedState: AppState = {
      currentUser: null,
      members: mapCollection<Member>(resMembers.data),
      hospitals: mapCollection<Hospital>(resHospitals.data),
      routes: mapCollection<VisitRoute>(resRoutes.data),
      visits: mapCollection<VisitSlot>(resVisits.data),
      socialWorkerVisits: mapCollection<SocialWorkerVisit>(resSocial.data),
      patients: mapCollection<Patient>(resPatients.data),
      logs: mapCollection<LogEntry>(resLogs.data),
      notifications: mapCollection<Notification>(resNotifs.data)
    };

    // Vincular usuário logado
    if (session?.user) {
      loadedState.currentUser = loadedState.members.find(m => m.id === session.user.id) || null;
    }

    return loadedState;
  } catch (error) {
    console.error("[Storage] Falha crítica no carregamento:", error);
    return state; // Retorna o default garantido
  }
};

/**
 * Sanitização para o banco de dados (converte camelCase para snake_case).
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };

  // Remove campos virtuais ou sensíveis antes de enviar ao Supabase
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
