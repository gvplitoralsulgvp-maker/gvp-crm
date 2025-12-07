
import { Member, VisitRoute, VisitSlot, UserRole, AppState, Patient, LogEntry, Notification, Hospital } from '../types';
import { supabase } from './supabaseClient';

// --- INITIAL DEFAULT DATA (Fallback) ---
const INITIAL_HOSPITALS: Hospital[] = [
  { id: 'h1', name: 'Santa Casa de Santos', address: 'Av. Dr. Cláudio Luís da Costa, 50', city: 'Santos', lat: -23.9446, lng: -46.3235 },
  { id: 'h2', name: 'Hosp. Guilherme Álvaro', address: 'R. Oswaldo Cruz, 197', city: 'Santos', lat: -23.9667, lng: -46.3359 },
  { id: 'h3', name: 'Hospital Ana Costa', address: 'R. Pedro Américo, 60', city: 'Santos', lat: -23.9542, lng: -46.3323 },
  { id: 'h4', name: 'Beneficência Portuguesa', address: 'Av. Dr. Bernardino de Campos, 47', city: 'Santos', lat: -23.9482, lng: -46.3268 },
  { id: 'h5', name: 'Hospital São Lucas', address: 'Av. Ana Costa, 168', city: 'Santos', lat: -23.9526, lng: -46.3326 },
  { id: 'h6', name: 'Hospital Municipal de São Vicente', address: 'R. Ipiranga, 319', city: 'São Vicente', lat: -23.9664, lng: -46.3887 },
  { id: 'h7', name: 'Hospital Irmã Dulce', address: 'R. Dair Borges, 550', city: 'Praia Grande', lat: -24.0089, lng: -46.4194 },
  { id: 'h8', name: 'Hospital Santo Amaro', address: 'R. Quintino Bocaiúva, 177', city: 'Guarujá', lat: -23.9934, lng: -46.2568 },
  { id: 'h9', name: 'Hospital Municipal de Cubatão', address: 'Av. Henry Borden, s/n', city: 'Cubatão', lat: -23.8864, lng: -46.4262 },
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
  },
  { 
    id: '2', 
    name: 'João Santos', 
    email: 'joao@gvp.com',
    password: '123456',
    role: UserRole.MEMBER, 
    phone: '5513988888888', 
    congregation: 'Centro',
    circuit: 'SP-10',
    address: 'Centro, São Vicente',
    lat: -23.9620, lng: -46.3900, 
    active: true 
  },
];

const INITIAL_ROUTES: VisitRoute[] = [
  { id: 'r1', name: 'Rota Santos - Zona Leste', hospitals: ['Santa Casa de Santos', 'Beneficência Portuguesa'], active: true },
  { id: 'r2', name: 'Rota Santos - Praia', hospitals: ['Hosp. Guilherme Álvaro', 'Hospital Ana Costa', 'Hospital São Lucas'], active: true },
  { id: 'r3', name: 'Rota São Vicente / PG', hospitals: ['Hospital Municipal de São Vicente', 'Hospital Irmã Dulce'], active: true },
  { id: 'r4', name: 'Rota Guarujá / Cubatão', hospitals: ['Hospital Santo Amaro', 'Hospital Municipal de Cubatão'], active: true },
];

const INITIAL_PATIENTS: Patient[] = [];

const INITIAL_STATE: AppState = {
  currentUser: null,
  members: INITIAL_MEMBERS,
  hospitals: INITIAL_HOSPITALS,
  routes: INITIAL_ROUTES,
  visits: [],
  patients: INITIAL_PATIENTS,
  logs: [],
  notifications: [],
};

const STORAGE_KEY = 'gvp_app_state_v3';
let lastSyncedState: AppState = { ...INITIAL_STATE };
let isInitialLoad = true;

// --- SAVE STATE ---
// Defined before loadState so we can call it inside loadState for migration
const syncCollection = async (tableName: string, newItems: any[], oldItems: any[]) => {
    if (!supabase) return;
    
    try {
        const upserts = newItems.filter(newItem => {
            const oldItem = oldItems.find(o => o.id === newItem.id);
            return !oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem);
        });

        const deletes = oldItems.filter(oldItem => !newItems.find(n => n.id === oldItem.id));

        if (upserts.length > 0) {
            const rows = upserts.map(item => ({ id: item.id, data: item }));
            const { error } = await supabase.from(tableName).upsert(rows);
            if (error) console.error(`Error syncing ${tableName}:`, error);
        }

        if (deletes.length > 0) {
            const idsToDelete = deletes.map(d => d.id);
            const { error } = await supabase.from(tableName).delete().in('id', idsToDelete);
            if (error) console.error(`Error deleting from ${tableName}:`, error);
        }
    } catch (err) {
        console.error(`Exception syncing ${tableName}:`, err);
    }
};

export const saveState = async (newState: AppState) => {
  // Always update session user locally
  if (newState.currentUser) {
      localStorage.setItem('gvp_current_user', JSON.stringify(newState.currentUser));
  } else {
      localStorage.removeItem('gvp_current_user');
  }

  // 1. OFFLINE MODE
  if (!supabase) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return;
  }

  // 2. ONLINE MODE
  // Fire and forget sync (don't await to keep UI responsive)
  Promise.all([
    syncCollection('members', newState.members, lastSyncedState.members),
    syncCollection('hospitals', newState.hospitals, lastSyncedState.hospitals),
    syncCollection('routes', newState.routes, lastSyncedState.routes),
    syncCollection('visits', newState.visits, lastSyncedState.visits),
    syncCollection('patients', newState.patients, lastSyncedState.patients),
    syncCollection('notifications', newState.notifications, lastSyncedState.notifications),
    syncCollection('logs', newState.logs, lastSyncedState.logs)
  ]).then(() => {
      lastSyncedState = JSON.parse(JSON.stringify(newState));
  }).catch(err => console.error("Sync error:", err));
};

// --- LOAD STATE ---
export const loadState = async (): Promise<AppState> => {
  // 1. OFFLINE MODE (Fallback if supabase is null)
  if (!supabase) {
    console.log("Using LocalStorage (Offline Mode).");
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if(!parsed.notifications) parsed.notifications = [];
            if(!parsed.logs) parsed.logs = [];
            return parsed;
        } catch (e) {
            console.error("Error parsing local state", e);
        }
    }
    return INITIAL_STATE;
  }

  // 2. ONLINE MODE (Supabase)
  try {
    console.log("Loading data from Supabase...");

    const [
        { data: members },
        { data: hospitals },
        { data: routes },
        { data: visits },
        { data: patients },
        { data: logs },
        { data: notifications }
    ] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('hospitals').select('*'),
        supabase.from('routes').select('*'),
        supabase.from('visits').select('*'),
        supabase.from('patients').select('*'),
        supabase.from('logs').select('*').limit(100).order('id', { ascending: false }),
        supabase.from('notifications').select('*')
    ]);

    // Check if Database is empty (Fresh Install)
    const isDbEmpty = (!members || members.length === 0) && (!routes || routes.length === 0);

    if (isDbEmpty) {
        console.log("⚠️ Database is empty. Attempting migration from LocalStorage...");
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const localData = JSON.parse(stored);
                // MIGRATION: Upload local data to Supabase immediately
                console.log("🚀 Migrating local data to Supabase...");
                // Note: We deliberately don't set lastSyncedState here so saveState sees everything as "new" and uploads it.
                lastSyncedState = INITIAL_STATE; 
                await saveState(localData);
                
                isInitialLoad = false;
                // Restore session user logic
                const storedUser = localStorage.getItem('gvp_current_user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    localData.currentUser = parsedUser;
                }
                return localData;
            } catch (e) {
                console.error("Migration failed", e);
            }
        }
    }

    const loadedState: AppState = {
        currentUser: null, 
        members: members && members.length > 0 ? members.map((r: any) => r.data) : INITIAL_MEMBERS,
        hospitals: hospitals && hospitals.length > 0 ? hospitals.map((r: any) => r.data) : INITIAL_HOSPITALS,
        routes: routes && routes.length > 0 ? routes.map((r: any) => r.data) : INITIAL_ROUTES,
        visits: visits ? visits.map((r: any) => r.data) : [],
        patients: patients ? patients.map((r: any) => r.data) : INITIAL_PATIENTS,
        logs: logs ? logs.map((r: any) => r.data) : [],
        notifications: notifications ? notifications.map((r: any) => r.data) : []
    };

    lastSyncedState = JSON.parse(JSON.stringify(loadedState));
    isInitialLoad = false;
    
    // Attempt session restore
    const storedUser = localStorage.getItem('gvp_current_user');
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const validUser = loadedState.members.find(m => m.id === parsedUser.id && m.active);
        if (validUser) loadedState.currentUser = validUser;
    }

    return loadedState;

  } catch (error) {
    console.error("Critical error loading state from Supabase:", error);
    // Fallback to local storage if network fails but Supabase client exists
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return INITIAL_STATE;
  }
};
