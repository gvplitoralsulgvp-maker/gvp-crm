
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export interface Member {
  id: string;
  name: string;
  email?: string; // Login email
  password?: string; // Login password (simulated)
  role: UserRole;
  phone?: string;
  congregation?: string;
  circuit?: string;
  address?: string;
  cep?: string;
  lat?: number;
  lng?: number;
  active: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

// Replaces 'Hospital' to allow grouping
export interface VisitRoute {
  id: string;
  name: string; // e.g. "Rota Zona Sul" or "Grupo 1"
  hospitals: string[]; // List of hospital names in this route
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
  routeId: string; // Changed from hospitalId
  date: string; // YYYY-MM-DD
  memberIds: string[]; // Max 2 members
  report?: VisitReport;
}

export interface Patient {
  id: string;
  name: string;
  hospitalName: string; // Linked to a route/hospital string
  treatment: string;
  admissionDate: string;
  estimatedDischargeDate?: string;
  needsAccommodation: boolean; // Precisa de hospedagem
  
  // Internal Location
  floor?: string;
  wing?: string;
  bed?: string;

  // Isolation / Precautions
  isIsolation?: boolean;
  isolationType?: string; // e.g., "Contato", "Respiratório"

  // Medical Legal / Directive Fields
  hasDirectivesCard?: boolean; // Cartão de Diretivas
  agentsNotified?: boolean; // Procuradores avisados
  formsConsidered?: boolean; // S-401, S-407, S-55
  
  notes?: string;
  active: boolean; // If false, patient is discharged/archived
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string; // e.g., "Agendou Visita", "Alterou Rota"
  details: string;
}

export interface Notification {
  id: string;
  userId: string; // Who receives the notification
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  timestamp: string;
}

export interface AppState {
  currentUser: Member | null;
  members: Member[];
  hospitals: Hospital[]; // Detailed hospital data for maps
  routes: VisitRoute[];
  visits: VisitSlot[];
  patients: Patient[];
  logs: LogEntry[];
  notifications: Notification[];
}
