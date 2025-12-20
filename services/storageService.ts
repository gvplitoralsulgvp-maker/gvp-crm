
import { Member, VisitRoute, VisitSlot, UserRole, AppState, Patient, LogEntry, Notification, Hospital } from '../types';
import { supabase } from './supabaseClient';

const INITIAL_HOSPITALS: Hospital[] = [
  { id: 'h1', name: 'Santa Casa de Santos', address: 'Av. Dr. Cláudio Luís da Costa, 50', city: 'Santos', lat: -23.9446, lng: -46.3235 },
  { id: 'h2', name: 'Hosp. Guilherme Álvaro', address: 'R. Oswaldo Cruz, 197', city: 'Santos', lat: -23.9667, lng: -46.3359 },
  { id: 'h3', name: 'Hospital Ana Costa', address: 'R. Pedro Américo, 60', city: 'Santos', lat: -23.9542, lng: -46.3323 },
];

const INITIAL_MEMBERS: Member[] = [
  { 
    id: '1', 
    name: 'Carlos Silva', 
    email: 'admin@gvp.com',
    password: '123456',
    role: UserRole.ADMIN, 
    phone: '5513999999999', 
    congregation: 'Jardim das Flores',
    circuit: 'SP-10',
    address: 'Gonzaga, Santos',
    lat: -23.9645, lng: -46.3350, 
    active: true 
  }
];

export const createDefaultState = (): AppState => {
  return {
    currentUser: null,
    members: [...INITIAL_MEMBERS],
    hospitals: [...INITIAL_HOSPITALS],
    routes: [
      { id: 'r1', name: 'Rota Santos - Zona Leste', hospitals: ['Santa Casa de Santos'], active: true },
    ],
    visits: [],
    patients: [],
    logs: [],
    notifications: []
  };
};

const STORAGE_KEY = 'soft_crm_gvp_v5_prod';

let isSaving = false;
let pendingSave: AppState | null = null;

const syncCollection = async (tableName: string, newItems: any[]) => {
    if (!supabase) return;
    try {
        if (newItems && Array.isArray(newItems)) {
            const rows = newItems.map(item => ({ id: item.id, data: item }));
            const { error } = await supabase.from(tableName).upsert(rows);
            if (error) throw error;
        }
    } catch (err: any) {
        console.error(`[Sync] Error in ${tableName}:`, err);
        throw err;
    }
};

export const saveState = async (newState: AppState): Promise<void> => {
  // Sempre salvar no LocalStorage primeiro (instantâneo)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  if (newState.currentUser) {
    localStorage.setItem('gvp_current_user', JSON.stringify(newState.currentUser));
  }

  if (!supabase || isSaving) {
      if (isSaving) pendingSave = newState;
      return;
  }

  isSaving = true;
  try {
      // Sincroniza em ordem de dependência
      await syncCollection('routes', newState.routes);
      await Promise.all([
        syncCollection('members', newState.members),
        syncCollection('hospitals', newState.hospitals),
        syncCollection('visits', newState.visits),
        syncCollection('patients', newState.patients),
        syncCollection('logs', newState.logs)
      ]);
  } catch (err) {
      console.error("[Storage] Cloud sync failed, but data is safe locally.");
  } finally {
      isSaving = false;
      if (pendingSave) {
          const next = pendingSave;
          pendingSave = null;
          saveState(next);
      }
  }
};

export const loadState = async (): Promise<AppState> => {
  const baseState = createDefaultState();
  const stored = localStorage.getItem(STORAGE_KEY);
  let localData: Partial<AppState> = {};

  if (stored) {
    try { localData = JSON.parse(stored); } catch (e) { console.error("Local load error", e); }
  }

  if (!supabase) return { ...baseState, ...localData } as AppState;

  try {
    const collections = ['routes', 'members', 'hospitals', 'visits', 'patients', 'logs'];
    const results = await Promise.all(collections.map(col => supabase!.from(col).select('*')));
    
    const cloudData: any = {};
    collections.forEach((col, idx) => {
      // Extrai os dados do formato {id, data} do Supabase
      const data = results[idx].data ? results[idx].data!.map((r: any) => r.data) : [];
      cloudData[col] = data;
    });

    // Lógica de Merge: Só usa a nuvem se houver dados, senão mantém o local
    const merge = (key: keyof AppState) => {
        const cloud = cloudData[key];
        const local = localData[key];
        return (cloud && Array.isArray(cloud) && cloud.length > 0) ? cloud : (local || baseState[key]);
    };

    const finalState: AppState = {
        ...baseState,
        routes: merge('routes') as VisitRoute[],
        members: merge('members') as Member[],
        hospitals: merge('hospitals') as Hospital[],
        visits: merge('visits') as VisitSlot[],
        patients: merge('patients') as Patient[],
        logs: merge('logs') as LogEntry[],
        notifications: localData.notifications || []
    };

    const storedUser = localStorage.getItem('gvp_current_user');
    if (storedUser) {
        try {
            const parsed = JSON.parse(storedUser);
            // Re-vincula o usuário logado aos dados frescos dos membros
            finalState.currentUser = finalState.members.find(m => m.id === parsed.id) || null;
        } catch (e) {}
    }

    return finalState;
  } catch (e) {
    console.error("[Storage] Error loading from cloud, using local fallback", e);
    return { ...baseState, ...localData } as AppState;
  }
};
