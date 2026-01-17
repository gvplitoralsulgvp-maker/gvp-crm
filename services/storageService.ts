
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * FABRICA DE ESTADO PADRÃO
 * Retorna um objeto AppState completo com todas as propriedades obrigatórias tipadas.
 */
export const createDefaultState = (): AppState => {
  return {
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
};

/**
 * Mapeador de Banco (Snake Case) para App (Camel Case)
 * Retorna explicitamente T[] para evitar inferência de never[]
 */
function mapFromDb<T>(data: any[] | null): T[] {
  if (!data || !Array.isArray(data)) return [] as T[];
  
  return data.map((item: any) => {
    const camelItem: any = {};
    Object.keys(item).forEach(key => {
      // Converte snake_case para camelCase
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      camelItem[camelKey] = item[key];
    });
    return camelItem as T;
  });
}

/**
 * Carregamento do Estado Principal
 * Resolve o erro TS2741 ao montar o objeto AppState de forma atômica e explícita.
 */
export const loadState = async (): Promise<AppState> => {
  const defaultState = createDefaultState();
  if (!supabase) return defaultState;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Consultas paralelas ao banco para performance
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

    // Extração segura dos dados com tipagem forçada
    const membersList = mapFromDb<Member>(resMem.data);
    const hospitalsList = mapFromDb<Hospital>(resHos.data);
    const routesList = mapFromDb<VisitRoute>(resRou.data);
    const visitsList = mapFromDb<VisitSlot>(resVis.data);
    const socialVisitsList = mapFromDb<SocialWorkerVisit>(resSoc.data);
    const patientsList = mapFromDb<Patient>(resPat.data);
    const logsList = mapFromDb<LogEntry>(resLog.data);
    const notificationsList = mapFromDb<Notification>(resNot.data);

    // Montagem do Estado Final - Garante que nenhuma propriedade falte
    const finalState: AppState = {
      currentUser: null,
      members: membersList,
      hospitals: hospitalsList,
      routes: routesList,
      visits: visitsList,
      socialWorkerVisits: socialVisitsList,
      patients: patientsList,
      logs: logsList,
      notifications: notificationsList
    };

    // Identifica o usuário logado no contexto da sessão
    if (session?.user) {
      finalState.currentUser = membersList.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[StorageService] Falha crítica ao carregar estado do Supabase:", error);
    return defaultState;
  }
};

/**
 * Sanitização e Conversão para Banco de Dados (Camel -> Snake)
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };
  
  // Limpeza de campos calculados ou sensíveis
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

/**
 * Atualização Atômica de Registro
 */
export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) {
    console.error(`[Supabase] Erro ao atualizar ${tableName}:`, error);
    throw error;
  }
};

/**
 * Deleção Atômica de Registro
 */
export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) {
    console.error(`[Supabase] Erro ao deletar em ${tableName}:`, error);
    throw error;
  }
};

/**
 * Função de Salvamento (Mantida para compatibilidade)
 */
export const saveState = async (state: AppState) => {
  // A persistência é feita via atomicUpdate para garantir integridade.
  return Promise.resolve();
};
