
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit, UserRole } from '../types';
import { supabase } from './supabaseClient';

/** 
 * GVP STORAGE SERVICE - V12
 * Responsável pela persistência e carregamento do estado global via Supabase.
 */

export const createDefaultState = (): AppState => ({
  currentUser: null,
  members: [],
  hospitals: [],
  routes: [] as VisitRoute[],
  visits: [] as VisitSlot[],
  socialWorkerVisits: [] as SocialWorkerVisit[],
  patients: [] as Patient[],
  logs: [] as LogEntry[],
  notifications: [] as Notification[]
});

/**
 * Converte dados do banco (snake_case) para o app (camelCase)
 * Garante que lat/lng sejam números reais.
 */
export function mapFromDb<T>(data: any[] | null): T[] {
  if (!data || !Array.isArray(data)) return [] as T[];
  return data.map((item: any) => {
    const camelItem: any = {};
    Object.keys(item).forEach(key => {
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      let val = item[key];
      
      // Tratamento especial para coordenadas
      if (camelKey === 'lat' || camelKey === 'lng') {
          if (val === null || val === "" || val === undefined) {
              val = undefined;
          } else {
              const parsed = parseFloat(val);
              val = isNaN(parsed) ? undefined : parsed;
          }
      }
      camelItem[camelKey] = val;
    });
    return camelItem as T;
  });
}

export const loadState = async (): Promise<AppState> => {
  const defaultState = createDefaultState();
  if (!supabase) return defaultState;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    const fetchAll = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('hospitals').select('*'),
      supabase.from('routes').select('*'),
      supabase.from('visits').select('*'),
      supabase.from('social_worker_visits').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('logs').select('*'),
      supabase.from('notifications').select('*')
    ]);

    const finalState: AppState = {
      currentUser: null,
      members: mapFromDb<Member>(fetchAll[0].data),
      hospitals: mapFromDb<Hospital>(fetchAll[1].data),
      routes: mapFromDb<VisitRoute>(fetchAll[2].data),
      visits: mapFromDb<VisitSlot>(fetchAll[3].data),
      socialWorkerVisits: mapFromDb<SocialWorkerVisit>(fetchAll[4].data),
      patients: mapFromDb<Patient>(fetchAll[5].data),
      logs: mapFromDb<LogEntry>(fetchAll[6].data),
      notifications: mapFromDb<Notification>(fetchAll[7].data)
    };

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[StorageService] Erro no loadState:", error);
    return defaultState;
  }
};

const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };
  if (tableName === 'members') delete (cleanData as any).password;
  
  const snakeCaseData: any = {};
  Object.keys(cleanData).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    let val = (cleanData as any)[key];
    
    // Garante que lat/lng sejam enviados como números ou nulos (não strings vazias)
    if ((key === 'lat' || key === 'lng')) {
        if (val === null || val === undefined || val === "" || isNaN(parseFloat(val))) {
            val = null;
        } else {
            val = parseFloat(val);
        }
    }
    snakeCaseData[snakeKey] = val;
  });
  return snakeCaseData;
};

export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) {
      console.error(`[StorageService] Erro ao salvar em ${tableName}:`, error);
      throw error;
  }
};

export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

export const saveState = async (state: AppState): Promise<void> => {
  return Promise.resolve();
};
