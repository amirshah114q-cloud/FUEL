// ─── Dashboard DTOs (Phase 3) ───────────────────────────────────────────────

export interface FuelTypeSplit {
  fuelType: FuelType;
  liters: number;
  amount: number;
  entries: number;
}

export interface DashboardSummary {
  month: string;
  totalLiters: number;
  totalAmount: number;
  entryCount: number;
  averageAmountPerEntry: number;
  activeDrivers: number;
  activeVehicles: number;
  byFuelType: FuelTypeSplit[];
  previousMonth: {
    month: string;
    totalLiters: number;
    totalAmount: number;
    entryCount: number;
  };
}

export interface MonthlyTrendPoint {
  month: string; // YYYY-MM
  liters: number;
  amount: number;
  entries: number;
}

export interface DailyUsagePoint {
  date: string; // YYYY-MM-DD
  day: number;
  liters: number;
  amount: number;
  entries: number;
}

export interface VehicleExpenseItem {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  isActive: boolean;
  liters: number;
  amount: number;
  entries: number;
}

export interface DriverExpenseItem {
  driverId: string;
  driverName: string;
  employeeId: string;
  isActive: boolean;
  liters: number;
  amount: number;
  entries: number;
}

// ─── Fleet management DTOs (Phase 3) ────────────────────────────────────────

export interface DriverDTO {
  id: string;
  name: string;
  phone: string;
  employeeId: string;
  isActive: boolean;
  assignedVehicle: {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    model: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDTO {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  isActive: boolean;
  assignedDriver: {
    id: string;
    name: string;
    employeeId: string;
    phone: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}