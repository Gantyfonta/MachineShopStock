export type MaterialCategory =
  | 'aluminum'
  | 'carbon-steel'
  | 'alloy-steel'
  | 'stainless'
  | 'tool-steel'
  | 'brass-bronze'
  | 'plastics'
  | 'titanium-exotic';

export type StockShape =
  | 'round-bar'
  | 'flat-bar'
  | 'square-bar'
  | 'hex-bar'
  | 'round-tube'
  | 'square-tube'
  | 'plate-sheet'
  | 'angle-iron'
  | 'drill-rod';

export type StockStatus = 'in-stock' | 'low-stock' | 'reserved' | 'ordered' | 'scrap';

export interface Offcut {
  id: string;
  length: number; // in primary unit (e.g. inches)
  width?: number; // for plate/sheet remnants
  quantity: number;
  location?: string;
  jobRef?: string;
  dateCreated: string;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string; // e.g. 6061-T6 Aluminum Round Bar 2.0" Dia
  category: MaterialCategory;
  alloyGrade: string; // e.g. 6061-T6, 4140 Pre-hard, 304 SS, O1
  shape: StockShape;
  
  // Dimensions
  diameter?: number; // for round bar / tube / drill rod
  width?: number; // for flat bar, rectangular tube, plate
  thickness?: number; // for flat bar, plate, angle
  wallThickness?: number; // for tubes
  length: number; // standard bar/piece length in inches/mm
  unit: 'in' | 'mm';

  // Quantities & Drops
  fullStockQty: number; // number of full bars/sheets
  minThreshold: number; // low stock alert trigger
  offcuts: Offcut[]; // remnant pieces

  // Shop Logistics
  rackLocation: string; // e.g. Rack A-1, Cantilever 3, Plate Rack 2
  status: StockStatus;
  heatNumber?: string; // Lot # or MTR # for aerospace / ISO certs
  supplier?: string; // e.g. Alro, McMaster, OnlineMetals, Ryerson
  costPerUnit: number; // cost per full bar/piece
  allocatedJob?: string; // reserved for specific shop job #
  lastUpdated: string;
  lastCounted?: string;
  notes?: string;
}

// -------------------------------------------------------------
// Tooling & Cutters Inventory Types
// -------------------------------------------------------------
export type ToolCategory =
  | 'end-mill'
  | 'face-mill'
  | 'drill-bit'
  | 'tap-thread'
  | 'carbide-insert'
  | 'tool-holder'
  | 'boring-reamer'
  | 'saw-blade';

export type ToolCondition = 'new' | 'in-machine' | 'needs-regrind' | 'worn-scrap';

export interface ToolItem {
  id: string;
  sku: string;
  name: string; // e.g. 1/2" 4-Flute AlTiN Carbide End Mill
  category: ToolCategory;
  toolType: string; // e.g. Square End Mill, Ball Nose, Indexable Face Mill, Spiral Tap, WNMG Turning Insert
  sizeDiameter: string; // e.g. 0.500", 3/8", 1/4"-20, 2.00" Face Mill
  flutes?: string; // 2F, 3F, 4F, 5F, Indexable
  coating?: string; // AlTiN, TiN, TiCN, DLC, Bright / Uncoated
  shankOrHolder?: string; // 1/2" Shank, CAT40-ER32, BT40, 3/4" Weldon
  insertGrade?: string; // e.g. WNMG 432-PM, APKT 1604, C5 Carbide
  location: string; // e.g. Crib Drawer 3A, Machine 1 Carousel Pod 12, Cabinet B
  qtyInStock: number;
  minThreshold: number;
  costPerUnit: number;
  condition: ToolCondition;
  supplier?: string;
  assignedMachine?: string; // e.g. Haas VF-2, Mazak Lathe
  lastUpdated: string;
  lastCounted?: string;
  notes?: string;
}

// -------------------------------------------------------------
// Machine Parts & Spares Inventory Types
// -------------------------------------------------------------
export type MachinePartCategory =
  | 'belts-pulleys'
  | 'filters-lube'
  | 'wipers-seals'
  | 'coolant-nozzles'
  | 'bearings-screws'
  | 'electrical-sensors'
  | 'pneumatics-valves'
  | 'drawbar-spindle'
  | 'hardware-fittings';

export type PartCriticality = 'critical-spare' | 'standard' | 'consumable';

export interface MachinePartItem {
  id: string;
  partNumber: string; // e.g. 93-2144A, B-54 V-Belt
  name: string; // e.g. Haas VF-2 Spindle Drive Belt Gates Poly-V
  machineName: string; // e.g. Haas VF-2 CNC Mill, Bridgeport Series 1, Mazak QTN
  category: MachinePartCategory;
  criticality: PartCriticality;
  location: string; // e.g. Maintenance Rack M-1, Spares Cabinet 4
  qtyInStock: number;
  minThreshold: number;
  costPerUnit: number;
  supplier?: string; // Haas Automation, McMaster-Carr, Grainger, Misumi
  oemBrand?: string; // Haas, Gates, SMC, Omron, NSK, Bijur
  lastUpdated: string;
  lastCounted?: string;
  serviceIntervalNotes?: string;
}

// -------------------------------------------------------------
// Saw Cut Logging
// -------------------------------------------------------------
export interface CutLogEntry {
  id: string;
  timestamp: string;
  stockItemId: string;
  materialName: string;
  cutLength: number;
  cutQuantity: number;
  kerf: number;
  jobId: string;
  machinist: string;
  createdOffcut: boolean;
  offcutLength?: number;
  notes?: string;
}

export type ActiveShopTab = 'materials' | 'tools' | 'machine-parts' | 'audit-count';

export interface FilterState {
  searchQuery: string;
  category: string; // 'all' or specific category
  shape: string; // 'all' or StockShape
  status: string; // 'all' or StockStatus
  location: string; // 'all' or location string
  machineFilter?: string; // for machine parts / tools
  viewMode: 'table' | 'cards';
  sortBy: 'grade' | 'shape' | 'qty' | 'location' | 'value' | 'updated' | 'name' | 'machine';
  sortOrder: 'asc' | 'desc';
}
