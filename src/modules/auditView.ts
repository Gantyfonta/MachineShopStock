import { StockItem, ToolItem, MachinePartItem } from '../types';

export function renderAuditTable(
  stock: StockItem[],
  tools: ToolItem[],
  parts: MachinePartItem[]
): string {
  const allEntries: Array<{
    id: string;
    domain: 'material' | 'tool' | 'part';
    typeLabel: string;
    typeBadge: string;
    name: string;
    subtext: string;
    location: string;
    loggedQty: number;
    minThreshold: number;
    lastCounted?: string;
  }> = [];

  // Add Materials
  stock.forEach((s) => {
    allEntries.push({
      id: s.id,
      domain: 'material',
      typeLabel: 'STOCK',
      typeBadge: 'bg-blue-950 text-blue-300 border-blue-700/60',
      name: s.name,
      subtext: `Alloy: ${s.alloyGrade} • SKU: ${s.sku || 'N/A'}`,
      location: s.rackLocation,
      loggedQty: s.fullStockQty,
      minThreshold: s.minThreshold,
      lastCounted: s.lastCounted
    });
  });

  // Add Tools
  tools.forEach((t) => {
    allEntries.push({
      id: t.id,
      domain: 'tool',
      typeLabel: 'TOOL',
      typeBadge: 'bg-amber-950 text-amber-300 border-amber-700/60',
      name: t.name,
      subtext: `Type: ${t.toolType} • Size: ${t.sizeDiameter} • Mach: ${t.assignedMachine || 'General'}`,
      location: t.location,
      loggedQty: t.qtyInStock,
      minThreshold: t.minThreshold,
      lastCounted: t.lastCounted
    });
  });

  // Add Machine Parts
  parts.forEach((p) => {
    allEntries.push({
      id: p.id,
      domain: 'part',
      typeLabel: 'SPARE',
      typeBadge: 'bg-emerald-950 text-emerald-300 border-emerald-700/60',
      name: p.name,
      subtext: `Asset: ${p.machineName} • Part #: ${p.partNumber}`,
      location: p.location,
      loggedQty: p.qtyInStock,
      minThreshold: p.minThreshold,
      lastCounted: p.lastCounted
    });
  });

  if (allEntries.length === 0) {
    return `<tr><td colspan="7" class="py-6 text-center text-[#717d91]">No items available for audit cycle count.</td></tr>`;
  }

  return allEntries
    .map((entry) => {
      const isVerified = Boolean(entry.lastCounted);
      const isLow = entry.loggedQty <= entry.minThreshold;

      return `
        <tr class="hover:bg-[#181c23] transition-colors" data-audit-id="${entry.id}" data-audit-domain="${entry.domain}">
          <td class="py-2.5 px-3">
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${entry.typeBadge}">
              ${entry.typeLabel}
            </span>
          </td>

          <td class="py-2.5 px-3">
            <div class="font-bold text-white tracking-tight">${entry.name}</div>
            <div class="text-[11px] text-[#717d91]">${entry.subtext}</div>
          </td>

          <td class="py-2.5 px-3 text-[#e2e8f0]">
            <span class="inline-flex items-center gap-1">
              <svg class="w-3 h-3 text-[#64748b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${entry.location}</span>
            </span>
          </td>

          <td class="py-2.5 px-3 text-center">
            <span class="font-bold text-xs ${isLow ? 'text-rose-400' : 'text-slate-300'}">${entry.loggedQty}</span>
          </td>

          <!-- Hold to Tick Quick Count Adjustment -->
          <td class="py-2.5 px-3 text-center">
            <div class="inline-flex items-center bg-[#101317] border border-[#2d323b] rounded p-0.5">
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="dec-${entry.domain}-qty" 
                data-id="${entry.id}"
                title="Hold for 1s to tick rapidly down"
              >−</button>
              
              <span class="w-12 text-center font-mono font-bold text-xs ${isLow ? 'text-rose-400 font-extrabold' : 'text-white'}">
                ${entry.loggedQty}
              </span>
              
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="inc-${entry.domain}-qty" 
                data-id="${entry.id}"
                title="Hold for 1s to tick rapidly up"
              >+</button>
            </div>
          </td>

          <td class="py-2.5 px-3 text-center">
            ${
              isLow
                ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-400 border border-rose-700/50">Low / Reorder</span>`
                : `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-700/40">In-Tolerance</span>`
            }
          </td>

          <td class="py-2.5 px-3 text-right">
            ${
              isVerified
                ? `<button type="button" data-action="audit-verify" data-domain="${entry.domain}" data-id="${entry.id}" class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-emerald-950/60 text-emerald-300 border border-emerald-600/50 hover:bg-emerald-900/60">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Counted (${entry.lastCounted})</span>
                  </button>`
                : `<button type="button" data-action="audit-verify" data-domain="${entry.domain}" data-id="${entry.id}" class="btn-metal-blue px-2.5 py-1 rounded text-xs font-bold shadow-xs">
                    Mark Verified
                  </button>`
            }
          </td>
        </tr>
      `;
    })
    .join('');
}
