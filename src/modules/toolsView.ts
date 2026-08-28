import { ToolItem } from '../types';
import { getToolCategoryBadge, getStatusBadge } from '../storage';

export function renderToolsTable(
  tools: ToolItem[],
  selectedIds: Set<string>
): string {
  if (tools.length === 0) return '';

  return tools
    .map((tool) => {
      const isSelected = selectedIds.has(tool.id);
      const catBadge = getToolCategoryBadge(tool.category);
      const statusBadge = getStatusBadge(tool.condition);
      const isLow = tool.qtyInStock <= tool.minThreshold;
      const totalVal = (tool.qtyInStock * (tool.costPerUnit || 0)).toFixed(2);

      return `
        <tr class="hover:bg-[#181c23] transition-colors ${isSelected ? 'bg-blue-950/20' : ''}" data-item-id="${tool.id}">
          <td class="py-2 px-3 text-center">
            <input type="checkbox" class="row-select-checkbox rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer" data-id="${tool.id}" ${isSelected ? 'checked' : ''} />
          </td>

          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${catBadge.bg} ${catBadge.text} border ${catBadge.border}">
                ${catBadge.label}
              </span>
              <span class="font-bold text-white tracking-tight">${tool.name}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-[#717d91] font-mono mt-0.5">
              <span>SKU: <strong class="text-[#cbd5e1]">${tool.sku || 'N/A'}</strong></span>
              ${tool.sizeDiameter ? `<span>• Size: <strong class="text-amber-300">${tool.sizeDiameter}</strong></span>` : ''}
              ${tool.flutes ? `<span>• Geom: <strong class="text-slate-300">${tool.flutes}</strong></span>` : ''}
              ${tool.coating ? `<span>• Coat: <strong class="text-cyan-300">${tool.coating}</strong></span>` : ''}
              ${tool.assignedMachine ? `<span>• Machine: <strong class="text-indigo-300">${tool.assignedMachine}</strong></span>` : ''}
            </div>
          </td>

          <td class="py-2.5 px-3 font-mono">
            <div class="text-white font-medium">${tool.toolType}</div>
            <div class="text-[11px] text-[#717d91]">${tool.shankOrHolder || 'Standard'}</div>
          </td>

          <!-- Hold to Tick Tool Qty -->
          <td class="py-2.5 px-3 text-center">
            <div class="inline-flex items-center bg-[#101317] border border-[#2d323b] rounded p-0.5">
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="dec-tool-qty" 
                data-id="${tool.id}"
                title="Hold for 1s to tick rapidly down"
              >−</button>
              
              <span class="w-10 text-center font-mono font-bold text-xs ${isLow ? 'text-rose-400 font-extrabold' : 'text-white'}">
                ${tool.qtyInStock}
              </span>
              
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-sm text-[#cbd5e1] hover:text-white"
                data-action="inc-tool-qty" 
                data-id="${tool.id}"
                title="Hold for 1s to tick rapidly up"
              >+</button>
            </div>
            ${isLow ? `<div class="text-[10px] text-rose-400 font-mono font-bold mt-0.5">Min: ${tool.minThreshold}</div>` : ''}
          </td>

          <!-- Crib Location -->
          <td class="py-2.5 px-3 font-mono">
            <span class="inline-flex items-center gap-1 text-[#e2e8f0]">
              <svg class="w-3 h-3 text-[#64748b]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              <span>${tool.location}</span>
            </span>
          </td>

          <!-- Condition Badge -->
          <td class="py-2.5 px-3">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}">
              <span class="w-1.5 h-1.5 rounded-full ${statusBadge.dot}"></span>
              <span>${statusBadge.label}</span>
            </span>
          </td>

          <!-- Value -->
          <td class="py-2.5 px-3 font-mono text-right text-slate-300">
            <div>$${totalVal}</div>
            <div class="text-[10px] text-[#64748b]">$${(tool.costPerUnit || 0).toFixed(2)}/ea</div>
          </td>

          <!-- Actions -->
          <td class="py-2.5 px-3 text-right">
            <div class="flex items-center justify-end gap-1 font-mono">
              <button 
                type="button" 
                data-action="edit-tool" 
                data-id="${tool.id}" 
                class="btn-metal p-1.5 rounded text-slate-300 hover:text-white" 
                title="Edit Tool Parameters"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>

              <button 
                type="button" 
                data-action="delete-tool" 
                data-id="${tool.id}" 
                class="btn-metal-danger p-1.5 rounded text-rose-400 hover:text-white" 
                title="Delete Tool"
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

export function renderToolsCards(
  tools: ToolItem[],
  selectedIds: Set<string>
): string {
  return tools
    .map((tool) => {
      const isSelected = selectedIds.has(tool.id);
      const catBadge = getToolCategoryBadge(tool.category);
      const statusBadge = getStatusBadge(tool.condition);
      const isLow = tool.qtyInStock <= tool.minThreshold;
      const totalVal = (tool.qtyInStock * (tool.costPerUnit || 0)).toFixed(2);

      return `
        <div class="metal-card rounded p-3 space-y-2.5 ${isSelected ? 'border-blue-500' : ''}" data-item-id="${tool.id}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2">
              <input type="checkbox" class="row-select-checkbox rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer mt-0.5" data-id="${tool.id}" ${isSelected ? 'checked' : ''} />
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${catBadge.bg} ${catBadge.text} border ${catBadge.border}">
                    ${catBadge.label}
                  </span>
                  <span class="font-bold text-white text-xs">${tool.name}</span>
                </div>
                <div class="text-[11px] text-[#717d91] font-mono mt-0.5">
                  <span>Size: <strong class="text-amber-300">${tool.sizeDiameter}</strong></span>
                  ${tool.coating ? ` • Coat: <strong class="text-cyan-300">${tool.coating}</strong>` : ''}
                </div>
              </div>
            </div>
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}">
              ${statusBadge.label}
            </span>
          </div>

          <div class="bg-[#121519] border border-[#282d36] rounded p-2 text-xs font-mono grid grid-cols-2 gap-2">
            <div>
              <div class="text-[10px] text-[#717d91]">Holder / Shank</div>
              <div class="text-white">${tool.shankOrHolder || 'Standard'}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Crib Location</div>
              <div class="text-white">${tool.location}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Assigned Machine</div>
              <div class="text-slate-300">${tool.assignedMachine || 'Shop General'}</div>
            </div>
            <div>
              <div class="text-[10px] text-[#717d91]">Asset Value</div>
              <div class="text-emerald-400 font-bold">$${totalVal}</div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-[#232832]">
            <!-- Hold to Tick Tool Qty -->
            <div class="inline-flex items-center bg-[#101317] border border-[#2d323b] rounded p-0.5">
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                data-action="dec-tool-qty" 
                data-id="${tool.id}"
                title="Hold for 1s to tick rapidly down"
              >−</button>
              
              <span class="w-8 text-center font-mono font-bold text-xs ${isLow ? 'text-rose-400' : 'text-white'}">
                ${tool.qtyInStock}
              </span>
              
              <button 
                type="button"
                class="qty-hold-btn btn-metal w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
                data-action="inc-tool-qty" 
                data-id="${tool.id}"
                title="Hold for 1s to tick rapidly up"
              >+</button>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center gap-1">
              <button type="button" data-action="edit-tool" data-id="${tool.id}" class="btn-metal p-1 rounded text-slate-300" title="Edit">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
              </button>
              <button type="button" data-action="delete-tool" data-id="${tool.id}" class="btn-metal-danger p-1 rounded text-rose-400" title="Delete">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}
