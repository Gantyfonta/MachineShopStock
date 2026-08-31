import { StockItem, ToolItem, MachinePartItem } from '../types';
import { showToast } from './toast';
import { saveStock, saveTools, saveMachineParts } from '../storage';

export type CodeExportScope = 'all' | 'tools' | 'materials' | 'parts' | 'tools-with-codes';

export interface InventoryCodePayload {
  format: 'MACHINE_SHOP_INVENTORY_CODE_V2';
  version: '2.0';
  exportedAt: string;
  scope: CodeExportScope;
  summary: {
    stockCount: number;
    toolsCount: number;
    partsCount: number;
    totalItems: number;
  };
  stock?: StockItem[];
  tools?: ToolItem[];
  parts?: MachinePartItem[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  counts: {
    stock: number;
    tools: number;
    parts: number;
    total: number;
  };
  data: {
    stock: StockItem[];
    tools: ToolItem[];
    parts: MachinePartItem[];
  };
  previewNames: string[];
}

/**
 * Generates a clean, portable inventory code JSON string
 */
export function generateInventoryCode(
  scope: CodeExportScope,
  stockItems: StockItem[],
  toolItems: ToolItem[],
  machinePartItems: MachinePartItem[],
  selectedIds?: Set<string>
): string {
  let filteredStock: StockItem[] = [];
  let filteredTools: ToolItem[] = [];
  let filteredParts: MachinePartItem[] = [];

  if (selectedIds && selectedIds.size > 0) {
    filteredStock = stockItems.filter((s) => selectedIds.has(s.id));
    filteredTools = toolItems.filter((t) => selectedIds.has(t.id));
    filteredParts = machinePartItems.filter((p) => selectedIds.has(p.id));
  } else {
    if (scope === 'all') {
      filteredStock = stockItems;
      filteredTools = toolItems;
      filteredParts = machinePartItems;
    } else if (scope === 'tools' || scope === 'tools-with-codes') {
      filteredTools = scope === 'tools-with-codes' 
        ? toolItems.filter((t) => (t.sku && t.sku.trim().length > 0) || (t.id && t.id.trim().length > 0))
        : toolItems;
    } else if (scope === 'materials') {
      filteredStock = stockItems;
    } else if (scope === 'parts') {
      filteredParts = machinePartItems;
    }
  }

  const payload: InventoryCodePayload = {
    format: 'MACHINE_SHOP_INVENTORY_CODE_V2',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    scope,
    summary: {
      stockCount: filteredStock.length,
      toolsCount: filteredTools.length,
      partsCount: filteredParts.length,
      totalItems: filteredStock.length + filteredTools.length + filteredParts.length
    },
    ...(filteredStock.length > 0 ? { stock: filteredStock } : {}),
    ...(filteredTools.length > 0 ? { tools: filteredTools } : {}),
    ...(filteredParts.length > 0 ? { parts: filteredParts } : {})
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and parses an inventory code or raw JSON string
 */
export function parseAndValidateCode(rawText: string): ValidationResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Code input is empty.',
      counts: { stock: 0, tools: 0, parts: 0, total: 0 },
      data: { stock: [], tools: [], parts: [] },
      previewNames: []
    };
  }

  // Remove markdown code fence if user pasted from chat/markdown
  let cleanJson = trimmed;
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleanJson);
    const stock: StockItem[] = [];
    const tools: ToolItem[] = [];
    const parts: MachinePartItem[] = [];
    const previewNames: string[] = [];

    // Case 1: Standard structured payload
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.stock)) {
        parsed.stock.forEach((item: any) => {
          if (item && (item.name || item.sku || item.alloyGrade)) {
            stock.push(item);
            if (previewNames.length < 5) previewNames.push(item.name || item.sku);
          }
        });
      }

      if (Array.isArray(parsed.tools)) {
        parsed.tools.forEach((item: any) => {
          if (item && (item.name || item.sku || item.toolType)) {
            tools.push(item);
            if (previewNames.length < 5) previewNames.push(item.name || item.sku);
          }
        });
      }

      if (Array.isArray(parsed.parts)) {
        parsed.parts.forEach((item: any) => {
          if (item && (item.name || item.partNumber || item.machineName)) {
            parts.push(item);
            if (previewNames.length < 5) previewNames.push(item.name || item.partNumber);
          }
        });
      }

      // Case 2: Direct raw array passed
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (!item) return;
          if (item.flutes !== undefined || item.toolType !== undefined || item.condition !== undefined) {
            tools.push(item);
            if (previewNames.length < 5) previewNames.push(item.name || item.sku);
          } else if (item.machineName !== undefined || item.partNumber !== undefined || item.criticality !== undefined) {
            parts.push(item);
            if (previewNames.length < 5) previewNames.push(item.name || item.partNumber);
          } else if (item.alloyGrade !== undefined || item.shape !== undefined || item.fullStockQty !== undefined) {
            stock.push(item);
            if (previewNames.length < 5) previewNames.push(item.name || item.sku);
          } else if (item.name || item.sku) {
            // Default to tools if SKU format looks like tool or generic
            tools.push(item);
            if (previewNames.length < 5) previewNames.push(item.name || item.sku);
          }
        });
      }

      // Case 3: Single item object passed
      if (!Array.isArray(parsed) && !parsed.stock && !parsed.tools && !parsed.parts) {
        if (parsed.name || parsed.sku || parsed.partNumber) {
          if (parsed.flutes !== undefined || parsed.toolType !== undefined) {
            tools.push(parsed as ToolItem);
          } else if (parsed.machineName !== undefined || parsed.partNumber !== undefined) {
            parts.push(parsed as MachinePartItem);
          } else {
            stock.push(parsed as StockItem);
          }
          previewNames.push(parsed.name || parsed.sku || parsed.partNumber);
        }
      }
    }

    const total = stock.length + tools.length + parts.length;
    if (total === 0) {
      return {
        isValid: false,
        error: 'No valid stock, tooling, or parts entries found in code.',
        counts: { stock: 0, tools: 0, parts: 0, total: 0 },
        data: { stock: [], tools: [], parts: [] },
        previewNames: []
      };
    }

    return {
      isValid: true,
      counts: {
        stock: stock.length,
        tools: tools.length,
        parts: parts.length,
        total
      },
      data: {
        stock,
        tools,
        parts
      },
      previewNames
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Invalid JSON syntax: ${err?.message || 'Check for missing brackets or commas.'}`,
      counts: { stock: 0, tools: 0, parts: 0, total: 0 },
      data: { stock: [], tools: [], parts: [] },
      previewNames: []
    };
  }
}

/**
 * Applies imported code items to the active inventory collections
 */
export function applyImportedInventory(
  mode: 'merge' | 'replace',
  importedData: { stock: StockItem[]; tools: ToolItem[]; parts: MachinePartItem[] },
  currentStock: StockItem[],
  currentTools: ToolItem[],
  currentParts: MachinePartItem[]
): {
  stock: StockItem[];
  tools: ToolItem[];
  parts: MachinePartItem[];
  stats: { added: number; updated: number; replaced: number };
} {
  let updatedStock = [...currentStock];
  let updatedTools = [...currentTools];
  let updatedParts = [...currentParts];

  let addedCount = 0;
  let updatedCount = 0;
  let replacedCount = 0;

  if (mode === 'replace') {
    if (importedData.stock.length > 0) {
      updatedStock = importedData.stock;
      replacedCount += importedData.stock.length;
    }
    if (importedData.tools.length > 0) {
      updatedTools = importedData.tools;
      replacedCount += importedData.tools.length;
    }
    if (importedData.parts.length > 0) {
      updatedParts = importedData.parts;
      replacedCount += importedData.parts.length;
    }
  } else {
    // MERGE & UPDATE MODE

    // 1. Stock Merge
    importedData.stock.forEach((item) => {
      const idx = updatedStock.findIndex(
        (s) => (s.id && item.id && s.id === item.id) || (s.sku && item.sku && s.sku.toLowerCase() === item.sku.toLowerCase())
      );
      if (idx >= 0) {
        updatedStock[idx] = { ...updatedStock[idx], ...item, lastUpdated: new Date().toISOString().split('T')[0] };
        updatedCount++;
      } else {
        const newItem: StockItem = {
          ...item,
          id: item.id || `stk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        updatedStock.push(newItem);
        addedCount++;
      }
    });

    // 2. Tools Merge
    importedData.tools.forEach((item) => {
      const idx = updatedTools.findIndex(
        (t) => (t.id && item.id && t.id === item.id) || (t.sku && item.sku && t.sku.toLowerCase() === item.sku.toLowerCase())
      );
      if (idx >= 0) {
        updatedTools[idx] = { ...updatedTools[idx], ...item, lastUpdated: new Date().toISOString().split('T')[0] };
        updatedCount++;
      } else {
        const newTool: ToolItem = {
          ...item,
          id: item.id || `tool-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        updatedTools.push(newTool);
        addedCount++;
      }
    });

    // 3. Machine Parts Merge
    importedData.parts.forEach((item) => {
      const idx = updatedParts.findIndex(
        (p) =>
          (p.id && item.id && p.id === item.id) ||
          (p.partNumber && item.partNumber && p.partNumber.toLowerCase() === item.partNumber.toLowerCase())
      );
      if (idx >= 0) {
        updatedParts[idx] = { ...updatedParts[idx], ...item, lastUpdated: new Date().toISOString().split('T')[0] };
        updatedCount++;
      } else {
        const newPart: MachinePartItem = {
          ...item,
          id: item.id || `part-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        updatedParts.push(newPart);
        addedCount++;
      }
    });
  }

  // Persist to local storage
  saveStock(updatedStock);
  saveTools(updatedTools);
  saveMachineParts(updatedParts);

  return {
    stock: updatedStock,
    tools: updatedTools,
    parts: updatedParts,
    stats: {
      added: addedCount,
      updated: updatedCount,
      replaced: replacedCount
    }
  };
}

/**
 * Copy text with clipboard API and visual callback
 */
export async function copyCodeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for iframe / strict browser permissions
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    console.error('Failed to copy to clipboard', e);
    return false;
  }
}
