
export enum UserRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export interface AppState {
  currentUser: Member | null;
  members: Member[];
  hospitals: Hospital[];
  routes: VisitRoute[];
  visits: VisitSlot[];
  patients: Patient[];
  logs: LogEntry[];
  notifications: Notification[];
  trainingMaterials: TrainingMaterial[];
  experiences: Experience[];
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  password?: string;
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

export interface VisitRoute {
  id: string;
  name: string;
  hospitals: string[];
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
  report?: VisitReport;
}

export interface Patient {
  id: string;
  name: string;
  hospitalName: string;
  treatment: string;
  admissionDate: string;
  estimatedDischargeDate?: string;
  needsAccommodation: boolean;
  floor?: string;
  wing?: string;
  bed?: string;
  isIsolation?: boolean;
  isolationType?: string;
  hasDirectivesCard?: boolean;
  agentsNotified?: boolean;
  formsConsidered?: boolean;
  hasS55?: boolean;
  notes?: string;
  active: boolean;
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

export interface TrainingMaterial {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'video' | 'pdf' | 'text';
  url: string;
  isRestricted?: boolean;
}

export interface Experience {
  id: string;
  memberId: string;
  memberName: string;
  content: string;
  date: string;
  likes: number;
  category: 'Encorajamento' | 'Gratidão' | 'Aprendizado';
}
