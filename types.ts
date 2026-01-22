
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export type VisitStatus = 'PENDING' | 'ON_THE_WAY' | 'FINISHED';

export interface AppState {
  currentUser: Member | null;
  members: Member[];
  hospitals: Hospital[];
  routes: VisitRoute[];
  visits: VisitSlot[];
  socialWorkerVisits: SocialWorkerVisit[];
  patients: Patient[];
  logs: LogEntry[];
  notifications: AppNotification[];
  // COLIH Data
  doctors: Doctor[];
  colihVisits: ColihVisit[];
  presentationGoal: number; // Meta anual de apresentações
  // Config Data
  cityMappings: CityMapping[]; // Mapeamento dinâmico
}

// --- CONFIGURAÇÃO DE REGIONAIS (LEGADO/FALLBACK) ---
export const REGIONAL_CONFIG: Record<string, string[]> = {
  "Litoral Sul 1": ["Santos", "São Vicente", "Cubatão"],
  "Litoral Sul 2": ["Guarujá", "Bertioga", "Praia Grande"],
  "Litoral Sul 3": ["Mongaguá", "Itanhaém", "Peruíbe", "Itariri", "Pedro de Toledo", "Juquitiba"]
};

export const ALL_REGIONALS = Object.keys(REGIONAL_CONFIG);

export interface CityMapping {
  id: string;
  city: string;
  regional: string;
}

export type ColihClassification = 'Member' | 'Facilitator' | 'Secretary' | 'Coordinator' | null;

export interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  phone?: string;
  congregation?: string;
  active: boolean;
  address?: string;
  city?: string; // Novo campo para determinar regional do membro
  lat?: number;
  lng?: number;
  hasSeenOnboarding?: boolean;
  circuit?: string;
  isColih?: boolean; // Permissão geral de acesso
  colihClassification?: ColihClassification; // Papel específico dentro da COLIH
  regional?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  importantInfo?: string;
  regional?: string;
  responsibleMemberIds?: string[]; // IDs dos membros responsáveis (Min 2, Max 4)
}

export interface VisitRoute {
  id: string;
  name: string;
  hospitalIds?: string[];
  hospitals?: string[];
  active: boolean;
}

export interface VisitReport {
  doctorName: string;
  notes: string;
  followUpNeeded: boolean;
  createdAt: string;
}

export interface VisitSlot {
  id: string;
  routeId: string;
  date: string;
  memberIds: string[];
  status: VisitStatus;
  report?: VisitReport;
  patientId?: string; // Optional link to specific patient case
}

export interface SocialWorkerVisit {
  id: string;
  hospitalId: string;
  date: string;
  memberIds: string[];
  status: VisitStatus;
  report?: VisitReport;
}

// Helper type para flags booleanas do paciente
export type PatientFlagKey = 'hasDirectivesCard' | 'agentsNotified' | 'hasS55' | 'formsConsidered' | 'nonWitnessFamily' | 'needsAccommodation' | 'isSurgical' | 'isIsolation';

export interface Patient {
  id: string;
  name: string;
  hospitalId: string;
  hospitalName?: string;
  regional?: string; // Novo campo: Regional designada para o caso
  treatment: string; // Usado como "Problema de saúde (modo simples)"
  admissionDate: string;
  estimatedDischargeDate?: string; 
  active: boolean;
  floor?: string;
  wing?: string;
  bed?: string;
  room?: string;
  phone?: string;
  email?: string;
  age?: string;
  gender?: string;
  companionName?: string;
  companionPhone?: string;
  congregation?: string;
  spiritualStatus?: string; // "Boa condição espiritual?"
  localElder?: string; // "Nome do Ancião"
  elderPhone?: string; // Novo "Contato do Ancião"
  nonWitnessFamily?: boolean; // Novo "Família que não serve a Jeová envolvida?"
  visitTime?: string;
  isSurgical?: boolean;
  surgeryDate?: string;
  clinicalStatus?: string;
  isIsolation?: boolean;
  isolationType?: string;
  notes?: string;
  isExternalRequest?: boolean;
  needsAccommodation?: boolean;
  hasDirectivesCard?: boolean; // "Tem cartão diretivas (DPA) preenchido?"
  agentsNotified?: boolean;
  formsConsidered?: boolean;
  hasS55?: boolean;
  gvpRequestPending?: boolean;
  gvpRequestNote?: string;
  assignedColihIds?: string[]; // IDs dos membros COLIH designados para o caso
  isMedicalDischarge?: boolean; // Indica que o paciente teve alta médica, mas o caso ainda pode estar aberto para COLIH (HLC-7)
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  timestamp: string;
}

// --- COLIH TYPES ---

export type CooperationLevel = 'High' | 'Medium' | 'Low' | 'Unknown';
export type ColihInteractionType = 'visit' | 'presentation' | 'material_delivery' | 'email_phone';

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  cooperationLevel: CooperationLevel;
  isConsultant: boolean;
  treatsPediatric: boolean;
  insurancePlans: string; // Comma separated
  hospitals: string; // Comma separated names
  phone: string;
  email: string;
  address: string;
  city?: string; // Novo campo para designação de regional
  secretaryName?: string;
  notes?: string;
  lastVisitDate?: string;
  responsibleMemberName?: string; // Novo campo da planilha
  regional?: string; // Nova regional
  gvpSupportRequested?: boolean; // Flag to request GVP visit
}

export interface ColihVisit {
  id: string;
  doctorId?: string; // Agora opcional, pois pode ser uma visita puramente institucional
  hospitalId?: string; // Novo campo para visitas institucionais/apresentações
  date: string;
  memberIds: string[];
  notes: string; // "O que foi tratado"
  interactionType: ColihInteractionType;
  status: 'SCHEDULED' | 'COMPLETED'; // Novo Status
  topicsDiscussed?: string;
  materialDelivered?: string; // Novo campo
  nextSteps?: string; // Novo campo (Sugestões de próximas conversas)
  
  // Campos específicos para Apresentações
  hlc38Presented?: boolean; // "Apresentou HLC-38?"
  collaboratorInterest?: boolean; // "Mostrou interesse em ser colaborador?"
  
  createdAt: string;
}
