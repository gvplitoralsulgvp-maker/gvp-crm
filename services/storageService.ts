
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit } from '../types';
import { supabase } from './supabaseClient';

/**
 * FABRICA DE ESTADO PADRÃO
 * Retorna um objeto AppState completo com todas as 9 propriedades obrigatórias.
 */
export const createDefaultState = (): AppState => {
  const defaultState: AppState = {
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
  return defaultState;
};

/**
 * Função de mapeamento genérica (Snake Case -> Camel Case)
 * Garante que o array de saída seja tipado corretamente para evitar 'never[]'
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
 */
export const loadState = async (): Promise<AppState> => {
  // Inicializamos um objeto vazio que segue RIGOROSAMENTE a interface AppState
  const state: AppState = createDefaultState();
  
  if (!supabase) return state;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Buscas paralelas no banco de dados
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

    // Atribuição individual para garantir que nenhuma chave seja esquecida
    state.members = mapFromDb<Member>(resMem.data);
    state.hospitals = mapFromDb<Hospital>(resHos.data);
    state.routes = mapFromDb<VisitRoute>(resRou.data);
    state.visits = mapFromDb<VisitSlot>(resVis.data);
    state.socialWorkerVisits = mapFromDb<SocialWorkerVisit>(resSoc.data);
    state.patients = mapFromDb<Patient>(resPat.data);
    state.logs = mapFromDb<LogEntry>(resLog.data);
    state.notifications = mapFromDb<Notification>(resNot.data);

    // Contexto do usuário atual
    if (session?.user) {
      state.currentUser = state.members.find(m => m.id === session.user.id) || null;
    }

    return state;
  } catch (error) {
    console.error("[StorageService] Falha crítica ao carregar estado:", error);
    return createDefaultState(); // Retorno seguro em caso de erro
  }
};

/**
 * Sanitização e conversão para o Banco de Dados (Camel -> Snake)
 */
const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };
  
  // Regras de negócio para limpeza de campos virtuais ou sensíveis
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
 * Atualização Atômica (Persistência individual)
 */
export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) throw error;
};

/**
 * Deleção Atômica
 */
export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

/**
 * Compatibilidade com o sistema de salvamento global
 */
export const saveState = async (state: AppState) => {
  // O sistema utiliza atomicUpdate para mudanças em tempo real, 
  // mas mantemos esta função para compatibilidade de interface se necessário.
  return Promise.resolve();
};
