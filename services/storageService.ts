
import { Member, VisitRoute, VisitSlot, AppState, Patient, LogEntry, Notification, Hospital, TrainingMaterial, Experience, UserRole } from '../types';
import { supabase } from './supabaseClient';

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

const INITIAL_TRAINING: TrainingMaterial[] = [
  { id: 't1', title: 'Abordagem em Estados Terminais', category: 'Abordagem', type: 'texto', description: 'Guia de como oferecer consolo e manter a serenidade.', url: '#', isRestricted: true },
  { id: 't2', title: 'Higienização e EPIs', category: 'Segurança', type: 'video', description: 'Protocolos fundamentais de segurança hospitalar.', url: 'https://www.youtube.com/watch?v=dQw4w9XcQ', isRestricted: false },
  { id: 't3', title: 'Preenchimento do S-55', category: 'Protocolos', type: 'texto', description: 'Passo a passo para o relatório de assistência jurídica.', url: '#', isRestricted: true },
  { id: 't4', title: 'Bioética e Autonomia', category: 'Bioética', type: 'pdf', description: 'Conceitos básicos sobre o direito do paciente.', url: '#', isRestricted: false },
];

const INITIAL_STATE: AppState = {
  currentUser: null,
  members: [],
  hospitals: INITIAL_HOSPITALS,
  routes: [],
  visits: [],
  patients: [],
  logs: [],
  notifications: [],
  experiences: [],
  trainingMaterials: INITIAL_TRAINING,
};

const STORAGE_KEY = 'gvp_app_state_v5';
let lastSyncedState: AppState = { ...INITIAL_STATE };
let isSaving = false;
let pendingSave: AppState | null = null;

const syncCollection = async (tableName: string, newItems: any[], oldItems: any[]) => {
    if (!supabase) return;
    try {
        const itemsToProcess = newItems || [];
        const oldItemsToProcess = oldItems || [];
        
        const upserts = itemsToProcess.filter(newItem => {
            const oldItem = oldItemsToProcess.find((o: any) => o.id === newItem.id);
            return !oldItem || JSON.stringify(oldItem) !== JSON.stringify(newItem);
        });
        const deletes = oldItemsToProcess.filter(oldItem => !itemsToProcess.find(n => n.id === oldItem.id));
        
        if (upserts.length > 0) {
            const rows = upserts.map(item => ({ id: item.id, data: item }));
            await supabase.from(tableName).upsert(rows);
        }
        if (deletes.length > 0) {
            const idsToDelete = deletes.map(d => d.id);
            await supabase.from(tableName).delete().in('id', idsToDelete);
        }
    } catch (err) {
        console.error(`Error syncing ${tableName}`, err);
    }
};

export const saveState = async (newState: AppState) => {
  // Persistência local imediata
  if (newState.currentUser) localStorage.setItem('gvp_current_user', JSON.stringify(newState.currentUser));
  else localStorage.removeItem('gvp_current_user');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

  if (!supabase) return;
  if (isSaving) { pendingSave = newState; return; }
  isSaving = true;

  try {
      await Promise.all([
        syncCollection('members', newState.members, lastSyncedState.members),
        syncCollection('hospitals', newState.hospitals, lastSyncedState.hospitals),
        syncCollection('routes', newState.routes, lastSyncedState.routes),
        syncCollection('visits', newState.visits, lastSyncedState.visits),
        syncCollection('patients', newState.patients, lastSyncedState.patients),
        syncCollection('notifications', newState.notifications, lastSyncedState.notifications),
        syncCollection('experiences', newState.experiences, lastSyncedState.experiences),
        syncCollection('training', newState.trainingMaterials, lastSyncedState.trainingMaterials),
        syncCollection('logs', newState.logs, lastSyncedState.logs)
      ]);
      lastSyncedState = JSON.parse(JSON.stringify(newState));
  } finally {
      isSaving = false;
      if (pendingSave) {
          const nextState = pendingSave;
          pendingSave = null;
          saveState(nextState);
      }
  }
};

export const loadState = async (): Promise<AppState> => {
  try {
    if (!supabase) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
          const parsed = JSON.parse(stored);
          const mergedState: AppState = {
            currentUser: null,
            members: parsed.members || [],
            hospitals: parsed.hospitals || INITIAL_HOSPITALS,
            routes: parsed.routes || [],
            visits: parsed.visits || [],
            patients: parsed.patients || [],
            logs: parsed.logs || [],
            notifications: parsed.notifications || [],
            experiences: parsed.experiences || [],
            trainingMaterials: parsed.trainingMaterials || INITIAL_TRAINING
          };
          return mergedState;
      }
      return INITIAL_STATE;
    }

    const collections = ['members', 'hospitals', 'routes', 'visits', 'patients', 'logs', 'notifications', 'experiences', 'training'];
    const results = await Promise.all(collections.map(col => supabase!.from(col).select('*')));
    
    const [m, h, r, v, p, l, n, ex, tr] = results;

    const loadedState: AppState = {
        currentUser: null,
        members: (m.data?.map(i => i.data) || []) as Member[],
        hospitals: (h.data?.map(i => i.data) || INITIAL_HOSPITALS) as Hospital[],
        routes: (r.data?.map(i => i.data) || []) as VisitRoute[],
        visits: (v.data?.map(i => i.data) || []) as VisitSlot[],
        patients: (p.data?.map(i => i.data) || []) as Patient[],
        logs: (l.data?.map(i => i.data) || []) as LogEntry[],
        notifications: (n.data?.map(i => i.data) || []) as Notification[],
        experiences: (ex.data?.map(i => i.data) || []) as Experience[],
        trainingMaterials: (tr.data?.map(i => i.data) || INITIAL_TRAINING) as TrainingMaterial[]
    };

    lastSyncedState = JSON.parse(JSON.stringify(loadedState));
    
    const storedUser = localStorage.getItem('gvp_current_user');
    if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const valid = loadedState.members.find(member => member.id === parsed.id);
        if (valid) loadedState.currentUser = valid;
    }
    
    return loadedState;
  } catch (error) {
    console.error("Erro ao carregar estado do Supabase, tentando LocalStorage...", error);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const parsed = JSON.parse(stored);
        const fallbackState: AppState = {
            currentUser: null,
            members: parsed.members || [],
            hospitals: parsed.hospitals || INITIAL_HOSPITALS,
            routes: parsed.routes || [],
            visits: parsed.visits || [],
            patients: parsed.patients || [],
            logs: parsed.logs || [],
            notifications: parsed.notifications || [],
            experiences: parsed.experiences || [],
            trainingMaterials: parsed.trainingMaterials || INITIAL_TRAINING
        };
        return fallbackState;
    }
    return INITIAL_STATE;
  }
};
