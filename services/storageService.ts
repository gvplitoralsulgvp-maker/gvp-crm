
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

const INITIAL_ROUTES: VisitRoute[] = [
  { id: 'r1', name: 'Rota Santos - Zona Leste', hospitals: ['Santa Casa de Santos'], active: true },
];

export const createDefaultState = (): AppState => {
  return {
    currentUser: null,
    members: [...INITIAL_MEMBERS],
    hospitals: [...INITIAL_HOSPITALS],
    routes: [...INITIAL_ROUTES],
    visits: [] as VisitSlot[],
    patients: [] as Patient[],
    logs: [] as LogEntry[],
    notifications: [] as Notification[]
  };
};

const STORAGE_KEY = 'soft_crm_gvp_enterprise_v1';
let lastSyncedState: AppState = createDefaultState();
let isSaving = false;
let pendingSave: AppState | null = null;

const syncCollection = async (tableName: string, newItems: any[], oldItems: any[]) => {
    if (!supabase) return;
    try {
        const itemsToSync = newItems || [];
        const oldItemsToSync = oldItems || [];
        
        const upserts = itemsToSync.filter(newItem => {
            const oldItem = oldItemsToSync.find(o => o.id === newItem.id);
            return !oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem);
        });
        
        const deletes = oldItemsToSync.filter(oldItem => !itemsToSync.find(n => n.id === oldItem.id));
        
        if (upserts.length > 0) {
            const rows = upserts.map(item => ({ id: item.id, data: item }));
            await supabase.from(tableName).upsert(rows);
        }
        if (deletes.length > 0) {
            const idsToDelete = deletes.map(d => d.id);
            await supabase.from(tableName).delete().in('id', idsToDelete);
        }
    } catch (err: any) {
        console.error(`Sync error ${tableName}:`, err);
    }
};

export const saveState = async (newState: AppState) => {
  if (newState.currentUser) {
      localStorage.setItem('gvp_current_user', JSON.stringify(newState.currentUser));
  } else {
      localStorage.removeItem('gvp_current_user');
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

  if (!supabase || isSaving) {
      if (isSaving) pendingSave = newState;
      return;
  }
  isSaving = true;
  try {
      await Promise.all([
        syncCollection('members', newState.members, lastSyncedState.members),
        syncCollection('hospitals', newState.hospitals, lastSyncedState.hospitals),
        syncCollection('routes', newState.routes, lastSyncedState.routes),
        syncCollection('visits', newState.visits, lastSyncedState.visits),
        syncCollection('patients', newState.patients, lastSyncedState.patients),
        syncCollection('notifications', newState.notifications, lastSyncedState.notifications),
        syncCollection('logs', newState.logs, lastSyncedState.logs)
      ]);
      lastSyncedState = JSON.parse(JSON.stringify(newState));
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

  if (!supabase) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return { ...baseState, ...JSON.parse(stored) } as AppState;
        } catch (e) {
            return baseState;
        }
    }
    return baseState;
  }

  try {
    const collections = ['members', 'hospitals', 'routes', 'visits', 'patients', 'logs', 'notifications'];
    const results = await Promise.all(collections.map(col => supabase!.from(col).select('*')));
    
    const dataMap: Record<string, any[]> = {};
    collections.forEach((col, idx) => {
      dataMap[col] = results[idx].data ? results[idx].data!.map((r: any) => r.data) : [];
    });

    const loaded: AppState = {
        currentUser: null,
        members: (dataMap.members && dataMap.members.length > 0 ? dataMap.members : INITIAL_MEMBERS) as Member[],
        hospitals: (dataMap.hospitals && dataMap.hospitals.length > 0 ? dataMap.hospitals : INITIAL_HOSPITALS) as Hospital[],
        routes: (dataMap.routes && dataMap.routes.length > 0 ? dataMap.routes : INITIAL_ROUTES) as VisitRoute[],
        visits: (dataMap.visits || []) as VisitSlot[],
        patients: (dataMap.patients || []) as Patient[],
        logs: (dataMap.logs || []) as LogEntry[],
        notifications: (dataMap.notifications || []) as Notification[]
    };
    
    const storedUser = localStorage.getItem('gvp_current_user');
    if (storedUser) {
        try {
            const parsed = JSON.parse(storedUser);
            loaded.currentUser = loaded.members.find(m => m.id === parsed.id) || null;
        } catch (e) {}
    }
    lastSyncedState = JSON.parse(JSON.stringify(loaded));
    return loaded;
  } catch (e) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return { ...baseState, ...JSON.parse(stored) } as AppState;
        } catch (err) {}
    }
    return baseState;
  }
};
