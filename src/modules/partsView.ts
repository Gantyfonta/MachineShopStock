import { MachinePartItem } from '../types';
import { getPartCategoryBadge, getStatusBadge } from '../storage';

export function renderPartsTable(
  parts: MachinePartItem[],
  selectedIds: Set<string>
): string {
  if (parts.length === 0) return '';

  return parts
    .map((part) => {
      const isSelected = selectedIds.has(part.id);
      const catBadge = getPartCategoryBadge(part.category);
      const statusBadge = getStatusBadge(part.criticality);
      const isLow = part.qtyInStock <= part.minThreshold;
      const totalVal = (part.qtyInStock * (part.costPerUnit || 0)).toFixed(2);

      return `
        <tr class="hover:bg-[#181c23] transition-colors ${isSelected ? 'bg-blue-950/20' : ''}" data-item-id="${part.id}">
          <td class="py-2 px-3 text-center">
            <input type="checkbox" class="row-select-checkbox rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer" data-id="${part.id}" ${isSelected ? 'checked' : ''} />
          </td>

          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${catBadge.bg} ${catBadge.text} border ${catBadge.border}">
                ${catBadge.label}
              </span>
              <span class="font-bold text-white tracking-tight">${part.name}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-[#717d91] font-mono mt-0.5">
              <span>Part #: <strong class="text-[#cbd5e1]">${part.partNumber}</strong></span>
              <span>• Machine: <strong class="text-blue-300 font-bold">${part.machineName}</strong></span>
              ${part.oemBrand ? `<span>• OEM: <strong class="text-slate-300">${part.oemBrand}</strong></span>` : ''}
              ${part.supplier ? `<span>• Vendor: <span class="text-slate-400">${part.supplier}</span></span>` : ''}
            </div>
          </td>

          <td class="py-2.5 px-3 font-mono">
            <div class="text-white font-medium">${part.machineName}</div>
            <div class="text-[11px] text-[#717d91] truncate max-w-xs">${part.serviceIntervalNotes || 'Maintenance Spare'}</div>
          </td>

          <!-- Hold to Tick Part Qty -->
          <td class="py-2.5 px-3 text-center">
            <div class="inline-flex items-center bg-[#101317] border border-[#2d323b] rounded p-0.5">
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="dec-part-qty" 
                data-id="${part.id}"
                title="Hold for 1s to tick rapidly down"
              >−</button>
              
              <span class="w-10 text-center font-mono font-bold text-xs ${isLow ? 'text-rose-400 font-extrabold' : 'text-white'}">
                ${part.qtyInStock}
              </span>
              
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="inc-part-qty" 
                data-id="${part.id}"
                title="Hold for 1s to tick rapidly up"
              >+</button>
            </div>
            ${isLow ? `<div class="text-[10px] text-rose-400 font-mono font-bold mt-0.5">Min: ${part.minThreshold}</div>` : ''}
          </td>

          <!-- Location -->
          <td class="py-2.5 px-3 font-mono">
            <span class="inline-flex items-center gap-1 text-[#e2e8f0]">
              <svg class="w-3 h-3 text-[#64748b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${part.location}</span>
            </span>
          </td>

          <!-- Criticality Badge -->
          <td class="py-2.5 px-3">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}">
              <span class="w-1.5 h-1.5 rounded-full ${statusBadge.dot}"></span>
              <span>${statusBadge.label}</span>
            </span>
          </td>

          <!-- Value -->
          <td class="py-2.5 px-3 font-mono text-right text-slate-300">
            <div>$${totalVal}</div>
            <div class="text-[10px] text-[#64748b]">$${(part.costPerUnit || 0).toFixed(2)}/ea</div>
          </td>

          <!-- Actions -->
          <td class="py-2.5 px-3 text-right">
            <div class="flex items-center justify-end gap-1 font-mono">
              <button 
                type="button" 
                data-action="edit-part" 
                data-id="${part.id}" 
                class="btn-metal p-1.5 rounded text-slate-300 hover:text-white" 
                title="Edit Part Details"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>

              <button 
                type="button" 
                data-action="delete-part" 
                data-id="${part.id}" 
                class="btn-metal-danger p-1.5 rounded text-rose-400 hover:text-white" 
                title="Delete Part"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

export function renderPartsCards(
  parts: MachinePartItem[],
  selectedIds: Set<string>
): string {
  return parts
    .map((part) => {
      const isSelected = selectedIds.has(part.id);
      const catBadge = getPartCategoryBadge(part.category);
      const statusBadge = getStatusBadge(part.criticality);
      const isLow = part.qtyInStock <= part.minThreshold;
      const totalVal = (part.qtyInStock * (part.costPerUnit || 0)).toFixed(2);

      return `
        <div class="metal-card rounded p-3 space-y-2.5 ${isSelected ? 'border-blue-500' : ''}" data-item-id="${part.id}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <input type="checkbox" class="row-select-checkbox rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer mt-0.5" data-id="${part.id}" ${isSelected ? 'checked' : ''} />
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${catBadge.bg} ${catBadge.text} border ${catBadge.border}">
                    ${catBadge.label}
                  </span>
                  <span class="font-bold text-white text-xs">${part.name}</span>
                </div>
                <div class="text-[11px] text-[#717d91] font-mono mt-0.5">
                  <span>Machine: <strong class="text-blue-300">${part.machineName}</strong></span>
                  <span> • Part #: <strong class="text-slate-300">${part.partNumber}</strong></span>
                </div>
              </div>
            </div>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}">
              ${statusBadge.label}
            </span>
          </div>

          <div class="bg-[#121519] border border-[#282d36] rounded p-2 text-xs font-mono grid grid-cols-2 gap-2">
            <div>
              <div class="text-[10px] text-[#717d91]">OEM / Brand</div>
              <div class="text-white">${part.oemBrand || 'Standard'}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Bin Location</div>
              <div class="text-white">${part.location}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Vendor</div>
              <div class="text-slate-300">${part.supplier || 'N/A'}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Asset Value</div>
              <div class="text-emerald-400 font-bold">$${totalVal}</div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-[#232832]">
            <!-- Hold to Tick Part Qty -->
            <div class="inline-flex items-center bg-[#101317] border border-[#2d323b] rounded p-0.5">
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                data-action="dec-part-qty" 
                data-id="${part.id}"
                title="Hold for 1s to tick rapidly down"
              >−</button>
              
              <span class="w-8 text-center font-mono font-bold text-xs ${isLow ? 'text-rose-400' : 'text-white'}">
                ${part.qtyInStock}
              </span>
              
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                data-action="inc-part-qty" 
                data-id="${part.id}"
                title="Hold for 1s to tick rapidly up"
              >+</button>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center gap-1">
              <button type="button" data-action="edit-part" data-id="${part.id}" class="btn-metal p-1 rounded text-slate-300" title="Edit">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>
              <button type="button" data-action="delete-part" data-id="${part.id}" class="btn-metal-danger p-1 rounded text-rose-400" title="Delete">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}
