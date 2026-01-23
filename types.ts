
export enum UserRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
  MEMBER = 'MEMBER'
}

export type VisitStatus = 'PENDING' | 'ON_THE_WAY' | 'FINISHED';

export interface AppDocument {
  id: string;
  title: string;
  category: 'protocol' | 'training' | 'pauta';
  url: string;
  filePath: string;
  contentType?: string;
  createdAt?: string;
}

export interface AppEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  targetGroup: 'GVP' | 'COLIH' | 'ALL';
  createdAt?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  phone?: string;
  congregation?: string;
  hasSeenOnboarding?: boolean;
  password?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  isColih?: boolean;
  colihClassification?: 'President' | 'Coordinator' | 'Secretary' | 'Assistant' | 'Facilitator' | 'Member' | null;
  regional?: string;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  importantInfo?: string;
  regional?: string;
  responsibleMemberIds?: string[];
}

export interface VisitRoute {
  id: string;
  name: string;
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
}

export interface SocialWorkerVisit {
  id: string;
  hospitalId: string;
  date: string;
  memberIds: string[];
  status: VisitStatus;
  report?: VisitReport;
}

export interface Patient {
  id: string;
  name: string;
  hospitalId?: string;
  hospitalName?: string;
  room?: string;
  bed?: string;
  floor?: string;
  wing?: string;
  admissionDate: string;
  active: boolean;
  treatment?: string;
  notes?: string;
  
  phone?: string;
  email?: string;
  age?: string;
  gender?: string;
  companionName?: string;
  companionPhone?: string;
  localElder?: string;
  elderPhone?: string;
  congregation?: string;

  spiritualStatus?: string;
  nonWitnessFamily?: boolean;
  hasDirectivesCard?: boolean;
  hasS55?: boolean;
  formsConsidered?: boolean;
  agentsNotified?: boolean;
  
  visitTime?: string;
  isSurgical?: boolean;
  surgeryDate?: string;
  clinicalStatus?: string;
  
  gvpRequestPending?: boolean;
  isMedicalDischarge?: boolean;
  estimatedDischargeDate?: string;
  needsAccommodation?: boolean;
  isExternalRequest?: boolean;
  
  isIsolation?: boolean;
  isolationType?: string;

  assignedColihIds?: string[];
  regional?: string;
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
  type: 'info' | 'warning' | 'success';
  read: boolean;
  timestamp: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  hospitalIds?: string[];
  city?: string;
  address?: string;
  regional?: string;
  phone?: string;
  email?: string;
  cooperationLevel?: 'Unknown' | 'Low' | 'Medium' | 'High';
  isConsultant?: boolean;
  treatsPediatric?: boolean;
  responsibleMemberName?: string;
  lastVisitDate?: string;
}

export type ColihInteractionType = 'visit' | 'presentation' | 'material_delivery' | 'email_phone';

export interface ColihVisit {
  id: string;
  doctorId?: string;
  hospitalId?: string;
  date: string;
  memberIds: string[];
  notes: string;
  interactionType: ColihInteractionType;
  status: 'SCHEDULED' | 'COMPLETED';
  createdAt: string;
  hlc38Presented?: boolean;
  collaboratorInterest?: boolean;
}

export interface CityMapping {
  id: string;
  city: string;
  regional: string;
}

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
  doctors: Doctor[];
  colihVisits: ColihVisit[];
  presentationGoal: number; 
  cityMappings: CityMapping[];
  documents: AppDocument[];
  events: AppEvent[];
}

export const REGIONAL_CONFIG: Record<string, string[]> = {
  'Litoral Sul': ['Mongaguá', 'Itanhaém', 'Peruíbe']
};

export const ALL_REGIONALS = Object.keys(REGIONAL_CONFIG);
