import { StockItem, FilterState, MaterialCategory } from '../types';
import { formatDimensions, getCategoryBadge, getStatusBadge, getShapeLabel } from '../storage';
import { attachHoldToTick } from './holdToTick';

export function renderMaterialsTable(
  items: StockItem[],
  selectedIds: Set<string>,
  onQtyChange: (id: string, delta: number) => void
): string {
  if (items.length === 0) return '';

  return items
    .map((item) => {
      const isSelected = selectedIds.has(item.id);
      const catBadge = getCategoryBadge(item.category);
      const statusBadge = getStatusBadge(item.status);
      const dimensions = formatDimensions(item);
      const totalOffcuts = (item.offcuts || []).reduce((acc, o) => acc + o.quantity, 0);
      const totalVal = (item.fullStockQty * (item.costPerUnit || 0)).toFixed(2);
      const isLow = item.fullStockQty <= item.minThreshold;

      return `
        <tr class="hover:bg-[#181c23] transition-colors ${isSelected ? 'bg-blue-950/20' : ''}" data-item-id="${item.id}">
          <td class="py-2 px-3 text-center">
            <input type="checkbox" class="row-select-checkbox rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer" data-id="${item.id}" ${isSelected ? 'checked' : ''} />
          </td>
          
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${catBadge.bg} ${catBadge.text} border ${catBadge.border}">
                ${catBadge.label}
              </span>
              <span class="font-bold text-white tracking-tight">${item.name}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-[#717d91] font-mono mt-0.5">
              <span>SKU: <strong class="text-[#cbd5e1]">${item.sku || 'N/A'}</strong></span>
              <span>•</span>
              <span>Alloy: <strong class="text-slate-300">${item.alloyGrade}</strong></span>
              ${item.heatNumber ? `<span>• Heat: <strong class="text-amber-300/90">${item.heatNumber}</strong></span>` : ''}
              ${item.allocatedJob ? `<span>• Job: <span class="text-cyan-300 font-bold">${item.allocatedJob}</span></span>` : ''}
            </div>
          </td>

          <td class="py-2.5 px-3 font-mono">
            <div class="text-white font-medium">${dimensions}</div>
            <div class="text-[11px] text-[#717d91]">${getShapeLabel(item.shape)}</div>
          </td>

          <!-- Hold to Tick Full Stock Qty -->
          <td class="py-2.5 px-3 text-center">
            <div class="inline-flex items-center bg-[#101317] border border-[#2d323b] rounded p-0.5">
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="dec-material-qty" 
                data-id="${item.id}"
                title="Hold for 1s to tick rapidly down"
              >−</button>
              
              <span class="w-10 text-center font-mono font-bold text-xs ${isLow ? 'text-rose-400 font-extrabold' : 'text-white'}">
                ${item.fullStockQty}
              </span>
              
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="inc-material-qty" 
                data-id="${item.id}"
                title="Hold for 1s to tick rapidly up"
              >+</button>
            </div>
            ${isLow ? `<div class="text-[10px] text-rose-400 font-mono font-bold mt-0.5">Min: ${item.minThreshold}</div>` : ''}
          </td>

          <!-- Offcuts Drops -->
          <td class="py-2.5 px-3 text-center">
            ${
              totalOffcuts > 0
                ? `<button type="button" data-action="manage-offcuts" data-id="${item.id}" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/50 text-amber-300 border border-amber-700/50 hover:bg-amber-900/60">
                    <span>${totalOffcuts} drops</span>
                    <span class="text-[9px] opacity-75">▶</span>
                  </button>`
                : `<button type="button" data-action="manage-offcuts" data-id="${item.id}" class="text-[11px] font-mono text-[#5a6578] hover:text-[#cbd5e1] px-1.5 py-0.5 border border-dashed border-[#2d323b] rounded">
                    + drop
                  </button>`
            }
          </td>

          <!-- Rack Location -->
          <td class="py-2.5 px-3 font-mono">
            <span class="inline-flex items-center gap-1 text-[#e2e8f0]">
              <svg class="w-3 h-3 text-[#64748b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${item.rackLocation}</span>
            </span>
          </td>

          <!-- Status Badge -->
          <td class="py-2.5 px-3">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}">
              <span class="w-1.5 h-1.5 rounded-full ${statusBadge.dot}"></span>
              <span>${statusBadge.label}</span>
            </span>
          </td>

          <!-- Value ($) -->
          <td class="py-2.5 px-3 font-mono text-right text-slate-300">
            <div>$${totalVal}</div>
            <div class="text-[10px] text-[#64748b]">$${(item.costPerUnit || 0).toFixed(2)}/ea</div>
          </td>

          <!-- Actions: Cut, Edit, and Working Delete -->
          <td class="py-2.5 px-3 text-right">
            <div class="flex items-center justify-end gap-1 font-mono">
              <button 
                type="button" 
                data-action="cut-material" 
                data-id="${item.id}" 
                class="btn-metal p-1.5 rounded text-blue-400 hover:text-white" 
                title="Cut bar / Log Saw Drop"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/></svg>
              </button>
              
              <button 
                type="button" 
                data-action="edit-material" 
                data-id="${item.id}" 
                class="btn-metal p-1.5 rounded text-slate-300 hover:text-white" 
                title="Edit Material Specs"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>

              <button 
                type="button" 
                data-action="delete-material" 
                data-id="${item.id}" 
                class="btn-metal-danger p-1.5 rounded text-rose-400 hover:text-white" 
                title="Delete Material"
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

export function renderMaterialsCards(
  items: StockItem[],
  selectedIds: Set<string>
): string {
  return items
    .map((item) => {
      const isSelected = selectedIds.has(item.id);
      const catBadge = getCategoryBadge(item.category);
      const statusBadge = getStatusBadge(item.status);
      const dimensions = formatDimensions(item);
      const totalOffcuts = (item.offcuts || []).reduce((acc, o) => acc + o.quantity, 0);
      const totalVal = (item.fullStockQty * (item.costPerUnit || 0)).toFixed(2);
      const isLow = item.fullStockQty <= item.minThreshold;

      return `
        <div class="metal-card rounded p-3 space-y-2.5 ${isSelected ? 'border-blue-500' : ''}" data-item-id="${item.id}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <input type="checkbox" class="row-select-checkbox rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer mt-0.5" data-id="${item.id}" ${isSelected ? 'checked' : ''} />
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${catBadge.bg} ${catBadge.text} border ${catBadge.border}">
                    ${catBadge.label}
                  </span>
                  <span class="font-bold text-white text-xs">${item.name}</span>
                </div>
                <div class="text-[11px] text-[#717d91] font-mono mt-0.5">
                  <span>Alloy: <strong class="text-slate-300">${item.alloyGrade}</strong></span>
                  ${item.sku ? ` • SKU: <strong class="text-slate-300">${item.sku}</strong>` : ''}
                </div>
              </div>
            </div>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}">
              ${statusBadge.label}
            </span>
          </div>

          <div class="bg-[#121519] border border-[#282d36] rounded p-2 text-xs font-mono grid grid-cols-2 gap-2">
            <div>
              <div class="text-[10px] text-[#717d91]">Dimensions</div>
              <div class="text-white font-medium">${dimensions}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Location</div>
              <div class="text-white">${item.rackLocation}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Drops / Remnants</div>
              <button type="button" data-action="manage-offcuts" data-id="${item.id}" class="text-amber-400 hover:underline">
                ${totalOffcuts > 0 ? `${totalOffcuts} pieces` : '0 (add drop)'}
              </button>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Asset Value</div>
              <div class="text-emerald-400 font-bold">$${totalVal}</div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-[#232832]">
            <!-- Hold to Tick Full Stock Qty -->
            <div class="inline-flex items-center bg-[#101317] border border-[#2d323b] rounded p-0.5">
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                data-action="dec-material-qty" 
                data-id="${item.id}"
                title="Hold for 1s to tick rapidly down"
              >−</button>
              
              <span class="w-8 text-center font-mono font-bold text-xs ${isLow ? 'text-rose-400' : 'text-white'}">
                ${item.fullStockQty}
              </span>
              
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                data-action="inc-material-qty" 
                data-id="${item.id}"
                title="Hold for 1s to tick rapidly up"
              >+</button>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center gap-1">
              <button type="button" data-action="cut-material" data-id="${item.id}" class="btn-metal px-2 py-1 rounded text-xs text-blue-400 font-mono">
                Cut Drop
              </button>
              <button type="button" data-action="edit-material" data-id="${item.id}" class="btn-metal p-1 rounded text-slate-300" title="Edit">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>
              <button type="button" data-action="delete-material" data-id="${item.id}" class="btn-metal-danger p-1 rounded text-rose-400" title="Delete">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}
