import { StockItem, ToolItem, MachinePartItem, CutLogEntry } from './types';
import { INITIAL_STOCK, INITIAL_TOOLS, INITIAL_MACHINE_PARTS } from './sampleData';

const STOCK_STORAGE_KEY = 'machine_shop_stock_data_v2';
const TOOLS_STORAGE_KEY = 'machine_shop_tools_data_v2';
const PARTS_STORAGE_KEY = 'machine_shop_parts_data_v2';
const CUTS_STORAGE_KEY = 'machine_shop_cuts_log_v2';

// -------------------------------------------------------------
// Raw Materials Storage
// -------------------------------------------------------------
export function loadStock(): StockItem[] {
  try {
    const raw = localStorage.getItem(STOCK_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    saveStock(INITIAL_STOCK);
    return INITIAL_STOCK;
  } catch (err) {
    console.error('Failed to load stock from localStorage:', err);
    return INITIAL_STOCK;
  }
}

export function saveStock(items: StockItem[]): void {
  try {
    localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save stock to localStorage:', err);
  }
}

// -------------------------------------------------------------
// Tooling & Cutters Storage
// -------------------------------------------------------------
export function loadTools(): ToolItem[] {
  try {
    const raw = localStorage.getItem(TOOLS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    saveTools(INITIAL_TOOLS);
    return INITIAL_TOOLS;
  } catch (err) {
    console.error('Failed to load tools from localStorage:', err);
    return INITIAL_TOOLS;
  }
}

export function saveTools(tools: ToolItem[]): void {
  try {
    localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(tools));
  } catch (err) {
    console.error('Failed to save tools to localStorage:', err);
  }
}

// -------------------------------------------------------------
// Machine Parts & Spares Storage
// -------------------------------------------------------------
export function loadMachineParts(): MachinePartItem[] {
  try {
    const raw = localStorage.getItem(PARTS_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    saveMachineParts(INITIAL_MACHINE_PARTS);
    return INITIAL_MACHINE_PARTS;
  } catch (err) {
    console.error('Failed to load machine parts from localStorage:', err);
    return INITIAL_MACHINE_PARTS;
  }
}

export function saveMachineParts(parts: MachinePartItem[]): void {
  try {
    localStorage.setItem(PARTS_STORAGE_KEY, JSON.stringify(parts));
  } catch (err) {
    console.error('Failed to save machine parts to localStorage:', err);
  }
}

export function resetToSampleStock(): { stock: StockItem[]; tools: ToolItem[]; parts: MachinePartItem[] } {
  saveStock(INITIAL_STOCK);
  saveTools(INITIAL_TOOLS);
  saveMachineParts(INITIAL_MACHINE_PARTS);
  return { stock: INITIAL_STOCK, tools: INITIAL_TOOLS, parts: INITIAL_MACHINE_PARTS };
}

// -------------------------------------------------------------
// Cut Logs Storage
// -------------------------------------------------------------
export function loadCutLogs(): CutLogEntry[] {
  try {
    const raw = localStorage.getItem(CUTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load cut logs:', err);
    return [];
  }
}

export function addCutLog(entry: Omit<CutLogEntry, 'id' | 'timestamp'>): CutLogEntry {
  const newEntry: CutLogEntry = {
    ...entry,
    id: 'cut-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString()
  };
  const logs = loadCutLogs();
  logs.unshift(newEntry);
  if (logs.length > 100) logs.length = 100;
  try {
    localStorage.setItem(CUTS_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save cut logs:', err);
  }
  return newEntry;
}

// -------------------------------------------------------------
// CSV Exporters
// -------------------------------------------------------------
export function exportStockToCSV(items: StockItem[]): string {
  const headers = [
    'SKU',
    'Name',
    'Category',
    'Alloy / Grade',
    'Shape',
    'Dimensions',
    'Unit',
    'Full Bar Count',
    'Min Threshold',
    'Offcuts Summary',
    'Location / Rack',
    'Status',
    'Heat / Lot #',
    'Supplier',
    'Unit Cost ($)',
    'Total Value ($)',
    'Allocated Job #',
    'Last Updated',
    'Notes'
  ];

  const rows = items.map(item => {
    const dim = formatDimensions(item);
    const offcutSummary = (item.offcuts || []).map(o => `${o.quantity}x ${o.length}${item.unit}`).join('; ');
    const totalVal = (item.fullStockQty * item.costPerUnit).toFixed(2);
    
    return [
      `"${(item.sku || '').replace(/"/g, '""')}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${(item.alloyGrade || '').replace(/"/g, '""')}"`,
      `"${item.shape}"`,
      `"${dim.replace(/"/g, '""')}"`,
      `"${item.unit || 'in'}"`,
      item.fullStockQty,
      item.minThreshold,
      `"${offcutSummary.replace(/"/g, '""')}"`,
      `"${(item.rackLocation || '').replace(/"/g, '""')}"`,
      `"${item.status}"`,
      `"${(item.heatNumber || '').replace(/"/g, '""')}"`,
      `"${(item.supplier || '').replace(/"/g, '""')}"`,
      item.costPerUnit,
      totalVal,
      `"${(item.allocatedJob || '').replace(/"/g, '""')}"`,
      `"${item.lastUpdated}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function exportToolsToCSV(tools: ToolItem[]): string {
  const headers = [
    'SKU',
    'Tool Name',
    'Category',
    'Tool Type',
    'Size / Diameter',
    'Flutes / Geometry',
    'Coating',
    'Shank / Holder',
    'Insert Grade',
    'Crib Location',
    'Qty In Stock',
    'Min Threshold',
    'Unit Cost ($)',
    'Condition',
    'Assigned Machine',
    'Supplier',
    'Last Updated',
    'Notes'
  ];

  const rows = tools.map(t => {
    return [
      `"${(t.sku || '').replace(/"/g, '""')}"`,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${(t.toolType || '').replace(/"/g, '""')}"`,
      `"${(t.sizeDiameter || '').replace(/"/g, '""')}"`,
      `"${(t.flutes || '').replace(/"/g, '""')}"`,
      `"${(t.coating || '').replace(/"/g, '""')}"`,
      `"${(t.shankOrHolder || '').replace(/"/g, '""')}"`,
      `"${(t.insertGrade || '').replace(/"/g, '""')}"`,
      `"${(t.location || '').replace(/"/g, '""')}"`,
      t.qtyInStock,
      t.minThreshold,
      t.costPerUnit,
      `"${t.condition}"`,
      `"${(t.assignedMachine || '').replace(/"/g, '""')}"`,
      `"${(t.supplier || '').replace(/"/g, '""')}"`,
      `"${t.lastUpdated}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

export function exportPartsToCSV(parts: MachinePartItem[]): string {
  const headers = [
    'Part Number / OEM',
    'Part Description',
    'Machine / Asset',
    'Category',
    'Criticality',
    'Storage Location',
    'Qty In Stock',
    'Min Threshold',
    'Unit Cost ($)',
    'Supplier',
    'OEM Brand',
    'Last Updated',
    'Service / Maintenance Notes'
  ];

  const rows = parts.map(p => {
    return [
      `"${(p.partNumber || '').replace(/"/g, '""')}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.machineName || '').replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.criticality}"`,
      `"${(p.location || '').replace(/"/g, '""')}"`,
      p.qtyInStock,
      p.minThreshold,
      p.costPerUnit,
      `"${(p.supplier || '').replace(/"/g, '""')}"`,
      `"${(p.oemBrand || '').replace(/"/g, '""')}"`,
      `"${p.lastUpdated}"`,
      `"${(p.serviceIntervalNotes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

// -------------------------------------------------------------
// Formatters & UI Badges
// -------------------------------------------------------------
export function formatDimensions(item: Partial<StockItem>): string {
  const u = item.unit || 'in';
  if (item.shape === 'round-bar' || item.shape === 'drill-rod') {
    return `Ø${item.diameter || 0}" × ${item.length || 0}"`;
  }
  if (item.shape === 'hex-bar') {
    return `${item.diameter || 0}" HEX × ${item.length || 0}"`;
  }
  if (item.shape === 'flat-bar') {
    return `${item.thickness || 0}" × ${item.width || 0}" × ${item.length || 0}"`;
  }
  if (item.shape === 'square-bar') {
    return `${item.width || item.thickness || 0}" SQ × ${item.length || 0}"`;
  }
  if (item.shape === 'round-tube') {
    return `OD Ø${item.diameter || 0}" × ${item.wallThickness || 0}" Wall × ${item.length || 0}"`;
  }
  if (item.shape === 'square-tube') {
    return `${item.width || 0}" SQ Tube × ${item.wallThickness || 0}" Wall × ${item.length || 0}"`;
  }
  if (item.shape === 'plate-sheet') {
    return `${item.thickness || 0}" Thick × ${item.width || 0}" W × ${item.length || 0}" L`;
  }
  if (item.shape === 'angle-iron') {
    return `${item.width || 0}" × ${item.thickness || 0}" Angle × ${item.length || 0}"`;
  }
  return `${item.length || 0}${u}`;
}

export function getCategoryBadge(category: string): { label: string; bg: string; text: string; border: string } {
  switch (category) {
    case 'aluminum':
      return { label: 'Aluminum', bg: 'bg-[#25282E]', text: 'text-sky-400', border: 'border-sky-700/50' };
    case 'carbon-steel':
      return { label: 'Carbon Steel', bg: 'bg-[#1C1F25]', text: 'text-slate-300', border: 'border-slate-600/50' };
    case 'alloy-steel':
      return { label: 'Alloy Steel (4140)', bg: 'bg-[#25282E]', text: 'text-slate-200', border: 'border-slate-500/50' };
    case 'stainless':
      return { label: 'Stainless', bg: 'bg-[#25282E]', text: 'text-cyan-300', border: 'border-cyan-700/50' };
    case 'tool-steel':
      return { label: 'Tool Steel', bg: 'bg-[#25282E]', text: 'text-amber-400', border: 'border-amber-700/50' };
    case 'brass-bronze':
      return { label: 'Brass / Bronze', bg: 'bg-[#25282E]', text: 'text-yellow-400', border: 'border-yellow-700/50' };
    case 'plastics':
      return { label: 'Plastics / Delrin', bg: 'bg-[#25282E]', text: 'text-emerald-400', border: 'border-emerald-700/50' };
    case 'titanium-exotic':
      return { label: 'Titanium / Exotic', bg: 'bg-[#25282E]', text: 'text-indigo-400', border: 'border-indigo-700/50' };
    default:
      return { label: category, bg: 'bg-[#1C1F25]', text: 'text-gray-300', border: 'border-[#2A2D31]' };
  }
}

export function getToolCategoryBadge(category: string): { label: string; bg: string; text: string; border: string } {
  switch (category) {
    case 'end-mill':
      return { label: 'End Mill', bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-700/60' };
    case 'face-mill':
      return { label: 'Face Mill', bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-700/60' };
    case 'drill-bit':
      return { label: 'Drill Bit', bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/60' };
    case 'tap-thread':
      return { label: 'Tap / Thread', bg: 'bg-yellow-950/60', text: 'text-yellow-300', border: 'border-yellow-700/60' };
    case 'carbide-insert':
      return { label: 'Carbide Insert', bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/60' };
    case 'tool-holder':
      return { label: 'Tool Holder / Collet', bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-700/60' };
    case 'boring-reamer':
      return { label: 'Boring / Reamer', bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-700/60' };
    default:
      return { label: category, bg: 'bg-[#25282E]', text: 'text-slate-300', border: 'border-[#2A2D31]' };
  }
}

export function getPartCategoryBadge(category: string): { label: string; bg: string; text: string; border: string } {
  switch (category) {
    case 'belts-pulleys':
      return { label: 'Belts & Drive', bg: 'bg-orange-950/60', text: 'text-orange-300', border: 'border-orange-700/60' };
    case 'filters-lube':
      return { label: 'Lube & Filters', bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/60' };
    case 'wipers-seals':
      return { label: 'Way Wipers & Seals', bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-700/60' };
    case 'coolant-nozzles':
      return { label: 'Coolant & Plumbing', bg: 'bg-cyan-950/60', text: 'text-cyan-300', border: 'border-cyan-700/60' };
    case 'bearings-screws':
      return { label: 'Ball Screws & Bearings', bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-700/60' };
    case 'electrical-sensors':
      return { label: 'Sensors & Electrical', bg: 'bg-yellow-950/60', text: 'text-yellow-300', border: 'border-yellow-700/60' };
    case 'drawbar-spindle':
      return { label: 'Spindle & Drawbar', bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-700/60' };
    default:
      return { label: category, bg: 'bg-[#25282E]', text: 'text-slate-300', border: 'border-[#2A2D31]' };
  }
}

export function getStatusBadge(status: string): { label: string; bg: string; text: string; border: string; icon: string; dot: string } {
  switch (status) {
    case 'in-stock':
    case 'new':
      return { label: 'OPTIMAL', bg: 'bg-green-950/50', text: 'text-emerald-400', border: 'border-emerald-600/40', icon: 'check-circle', dot: 'bg-emerald-400' };
    case 'low-stock':
    case 'needs-regrind':
      return { label: 'LOW STOCK', bg: 'bg-amber-950/50', text: 'text-amber-400', border: 'border-amber-600/40', icon: 'alert-triangle', dot: 'bg-amber-400' };
    case 'reserved':
    case 'in-machine':
      return { label: 'IN MACHINE', bg: 'bg-blue-950/50', text: 'text-blue-400', border: 'border-blue-600/40', icon: 'lock', dot: 'bg-blue-400' };
    case 'ordered':
      return { label: 'ON ORDER', bg: 'bg-sky-950/50', text: 'text-sky-400', border: 'border-sky-600/40', icon: 'truck', dot: 'bg-sky-400' };
    case 'scrap':
    case 'worn-scrap':
      return { label: 'SCRAP / ZERO', bg: 'bg-rose-950/60', text: 'text-rose-400', border: 'border-rose-600/40', icon: 'trash-2', dot: 'bg-rose-400' };
    case 'critical-spare':
      return { label: 'CRITICAL SPARE', bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-600/60', icon: 'shield-alert', dot: 'bg-rose-400' };
    case 'consumable':
      return { label: 'CONSUMABLE', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-600/50', icon: 'repeat', dot: 'bg-slate-400' };
    default:
      return { label: status.toUpperCase(), bg: 'bg-[#25282E]', text: 'text-slate-400', border: 'border-[#2A2D31]', icon: 'info', dot: 'bg-slate-500' };
  }
}

export function getShapeLabel(shape: string): string {
  switch (shape) {
    case 'round-bar': return 'Round Bar (●)';
    case 'flat-bar': return 'Flat Bar (▬)';
    case 'square-bar': return 'Square Bar (■)';
    case 'hex-bar': return 'Hex Bar (⬡)';
    case 'round-tube': return 'Round Tube (◎)';
    case 'square-tube': return 'Square Tube (▣)';
    case 'plate-sheet': return 'Plate / Sheet';
    case 'angle-iron': return 'Angle Iron';
    case 'drill-rod': return 'Drill Rod';
    default: return shape;
  }
}
