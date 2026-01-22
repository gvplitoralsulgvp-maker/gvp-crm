
import { AppState, Member, VisitSlot, Patient, LogEntry, AppNotification, Hospital, VisitRoute, SocialWorkerVisit, UserRole, Doctor, ColihVisit, CityMapping, REGIONAL_CONFIG } from '../types';
import { supabase } from './supabaseClient';

/** 
 * GVP STORAGE SERVICE - V15 (Dynamic City Mappings)
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
  notifications: [] as AppNotification[],
  doctors: [] as Doctor[],
  colihVisits: [] as ColihVisit[],
  presentationGoal: 12,
  cityMappings: [] as CityMapping[]
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
      
      // Tratamento especial para coordenadas
      if (camelKey === 'lat' || camelKey === 'lng') {
          if (val === null || val === "" || val === undefined) {
              val = undefined;
          } else {
              const parsed = parseFloat(val);
              val = isNaN(parsed) ? undefined : parsed;
          }
      }
      
      // Tratamento para status de visita COLIH legado
      if (camelKey === 'status' && !val && item.created_at) {
          val = 'COMPLETED'; 
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
      supabase.from('notifications').select('*'),
      supabase.from('doctors').select('*'),
      supabase.from('colih_visits').select('*'),
      supabase.from('city_mappings').select('*')
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
      notifications: mapFromDb<AppNotification>(fetchAll[7].data),
      doctors: mapFromDb<Doctor>(fetchAll[8].data),
      colihVisits: mapFromDb<ColihVisit>(fetchAll[9].data),
      presentationGoal: 12,
      cityMappings: mapFromDb<CityMapping>(fetchAll[10].data)
    };

    // Seed City Mappings if empty (Migration strategy)
    if (finalState.cityMappings.length === 0) {
        const seedData: CityMapping[] = [];
        Object.entries(REGIONAL_CONFIG).forEach(([regional, cities]) => {
            cities.forEach(city => {
                seedData.push({ id: crypto.randomUUID(), city, regional });
            });
        });
        
        // Optimistic update local state
        finalState.cityMappings = seedData;
        
        // Background insert to DB
        Promise.all(seedData.map(m => atomicUpdate('city_mappings', m))).catch(err => 
            console.error("Erro ao popular tabela de cidades inicial:", err)
        );
    }

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
    
    // Converte strings vazias para null em campos que exigem tipos estritos
    if (val === "") {
        if (
            key.endsWith('Id') || 
            key.endsWith('Date') || 
            key === 'lat' || 
            key === 'lng' ||
            key === 'surgeryDate' || 
            key === 'estimatedDischargeDate' ||
            key === 'lastVisitDate'
        ) {
            val = null;
        }
    }
    
    // Garante que lat/lng sejam enviados como números ou nulos
    if ((key === 'lat' || key === 'lng') && val !== null) {
        if (typeof val === 'string') {
            const parsed = parseFloat(val);
            val = isNaN(parsed) ? null : parsed;
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
      console.error(`[StorageService] Erro ao salvar em ${tableName}:`, JSON.stringify(error, null, 2));
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
