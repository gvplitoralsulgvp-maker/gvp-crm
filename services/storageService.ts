
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit, UserRole } from '../types';
import { supabase } from './supabaseClient';

/** 
 * GVP STORAGE SERVICE - V11
 * Responsável pela persistência e carregamento do estado global via Supabase.
 */

export const createDefaultState = (): AppState => ({
  currentUser: null,
  members: [
    { id: 'm1', name: 'Francisco Chagas', email: 'francisco.chagas@gvp.com', phone: '11 95772-3539', role: UserRole.MEMBER, active: true },
    { id: 'm2', name: 'Abel Farias', email: 'abel.farias@gvp.com', phone: '13 99666-1025', role: UserRole.MEMBER, active: true },
    { id: 'm75', name: 'Andrews Luiz Santos', email: 'andrews.santos@gvp.com', phone: '1398171-4532', role: UserRole.MEMBER, active: true }
  ] as Member[],
  hospitals: [
    { id: 'h1', name: 'Santa Casa de Santos', city: 'Santos', address: 'Av. Dr. Cláudio Luís da Costa, 50', lat: -23.9452, lng: -46.3345 }
  ] as Hospital[],
  routes: [] as VisitRoute[],
  visits: [] as VisitSlot[],
  socialWorkerVisits: [] as SocialWorkerVisit[],
  patients: [] as Patient[],
  logs: [] as LogEntry[],
  notifications: [] as Notification[]
});

/**
 * Converte dados do banco (snake_case) para o app (camelCase)
 */
export function mapFromDb<T>(data: any[] | null): T[] {
  if (!data || !Array.isArray(data)) return [] as T[];
  return data.map((item: any) => {
    const camelItem: any = {};
    Object.keys(item).forEach(key => {
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      let val = item[key];
      
      if ((camelKey === 'lat' || camelKey === 'lng')) {
          if (val === null || val === "" || val === undefined) {
              val = undefined;
          } else {
              val = parseFloat(val);
              if (isNaN(val)) val = undefined;
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
      members: mapFromDb<Member>(fetchAll[0].data).length > 0 ? mapFromDb<Member>(fetchAll[0].data) : defaultState.members,
      hospitals: mapFromDb<Hospital>(fetchAll[1].data).length > 0 ? mapFromDb<Hospital>(fetchAll[1].data) : defaultState.hospitals,
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
    if ((key === 'lat' || key === 'lng') && (val == null || isNaN(val))) {
        val = null;
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
