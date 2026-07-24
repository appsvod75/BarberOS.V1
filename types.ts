
export type Role = 'admin' | 'reception' | 'barber' | 'display' | 'cashier';

export interface MonthlyPlan {
  id: string;
  branchId: string;
  month: number; // 0-11
  year: number;
  goal: number;
  productGoalPercent: number;
  workingDays: number;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  webhookUrl?: string;
  reportEmail?: string;
  active: boolean;
  hasReception?: boolean;
  defaultMonthlyGoal?: number;
  defaultProductGoalPercent?: number;
  defaultWorkingDays?: number;
  autoCloseTime?: string; // HH:mm:ss
  autoCloseEnabled?: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  pin: string;
  active?: boolean;
  branchId?: string;
  canDoPos?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  visits: number;
  points?: number;
  birthDate?: string;
  referredBy?: string;
  registrationBranchId?: string;
}

export type ItemType = 'service' | 'product' | 'combo';

export interface CatalogItem {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  category: string;
  active?: boolean;
  cost?: number;
  comboDefinition?: string[];
}

export interface BranchStock {
  id: string;
  branchId: string;
  itemId: string;
  stock: number;
  averageCost: number;
}

export type TicketType = 'C' | 'B' | 'D' | 'X';

export interface Ticket {
  id: string;
  branchId: string;
  sequenceNumber: number;
  fullCode: string;
  type: TicketType;
  clientId?: string;
  clientName: string;
  status: 'waiting' | 'serving' | 'completed' | 'cancelled';
  createdAt: string;
  barberId?: string;
  chair?: string;
}

export interface SaleItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'bitcoin' | 'points';

export interface Payment {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  branchId: string;
  ticketId?: string;
  clientId?: string;
  barberId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payments: Payment[];
  timestamp: string;
  pointsEarned?: number;
  pointsUsed?: number;
  appliedPromotionId?: string;
}

export interface CashSession {
  id: string;
  branchId: string;
  openingAmount: number;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
}

export interface CashClosure {
  id: string;
  branchId: string;
  openedAt: string;
  closedAt: string;
  openedBy: string;
  openingAmount: number;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalTransfer: number;
  totalBitcoin: number;
  servicesTotal: number;
  productsTotal: number;
  combosTotal: number;
  operationsCount: number;
}

export type VideoSourceType = 'youtube' | 'mp4';

export interface VideoItem {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
}

export interface VideoLog {
  id: string;
  branchId: string;
  userId: string;
  userName: string;
  action: 'updated_playlist';
  videoNames: string[];
  timestamp: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerVisit: number;
  pointsPerCurrency: number;
  redemptionThreshold: number;
  redemptionValue: number;
  referralBonus: number;
}

export type PromotionType = 'percentage' | 'fixed_discount';
export type PromotionTrigger = 'always' | 'days_of_week' | 'happy_hour' | 'birthday' | 'date_range';

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  active: boolean;
  trigger: PromotionTrigger;
  daysActive?: number[]; // 0-6
  hourStart?: string; // HH:mm
  hourEnd?: string; // HH:mm
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  applyTo?: 'all' | 'services' | 'products' | 'specific';
  specificItemId?: string;
}

export interface AppConfig {
  videoSource: VideoSourceType;
  youtubeVideoId: string;
  videoPlaylist: VideoItem[];
  tickerMessage: string;
  tickerSpeed: number;
  salonName: string;
  salonAddress?: string;
  salonPhone?: string;
  ticketFooter?: string;
  logoUrl?: string;
  publicLogoUrl?: string;
  webhookUrl?: string;
  contactEmail?: string;
  ticketSize?: '58mm' | '80mm';
  ticketProductMap?: {
    C: string;
    B: string;
    D: string;
  };
  loyalty?: LoyaltyConfig;
}

export type InventoryMovementType = 'initial' | 'purchase' | 'adjustment_in' | 'adjustment_out' | 'sale' | 'transfer_in' | 'transfer_out';

export interface InventoryMovement {
  id: string;
  branchId: string;
  itemId: string;
  itemName: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost?: number;
  previousStock: number;
  newStock: number;
  date: string;
  reason?: string;
  relatedBranchId?: string;
  performedBy?: string;
  status?: 'pending' | 'completed';
}

export interface Category {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  branchId: string;
  clientName: string;
  clientPhone?: string;
  date: string;
  time: string;
  barberId?: string;
  serviceType: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
}
