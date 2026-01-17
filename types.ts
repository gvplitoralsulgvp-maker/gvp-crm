
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
  notifications: Notification[];
}

export interface Member {
  id: string; // UUID String
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  phone?: string;
  congregation?: string;
  active: boolean;
  address?: string;
  lat?: number;
  lng?: number;
  hasSeenOnboarding?: boolean;
}

export interface Hospital {
  id: string; // UUID String
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  importantInfo?: string;
}

export interface VisitRoute {
  id: string; // UUID String
  name: string;
  hospitalIds: string[]; // Array de UUID Strings
  hospitals?: string[]; // Nomes virtuais para UI
  active: boolean;
}

export interface VisitReport {
  doctorName: string;
  notes: string;
  followUpNeeded: boolean;
  createdAt: string;
}

export interface VisitSlot {
  id: string; // UUID String
  routeId: string;
  date: string;
  memberIds: string[]; // Array de UUID Strings
  status: VisitStatus;
  report?: VisitReport;
}

export interface SocialWorkerVisit {
  id: string; // UUID String
  hospitalId: string;
  date: string;
  memberIds: string[]; // Array de UUID Strings
  status: VisitStatus;
  report?: VisitReport;
}

export interface Patient {
  id: string;
  name: string;
  hospitalId: string;
  hospitalName?: string; // Virtual para UI
  treatment: string;
  admissionDate: string;
  estimatedDischargeDate?: string; 
  active: boolean;
  floor?: string;
  wing?: string;
  bed?: string;
  isIsolation?: boolean;
  isolationType?: string;
  notes?: string;
  isExternalRequest?: boolean;
  needsAccommodation?: boolean;
  hasDirectivesCard?: boolean;
  agentsNotified?: boolean;
  formsConsidered?: boolean;
  hasS55?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  timestamp: string;
}
