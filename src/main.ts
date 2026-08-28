import './index.css';
import {
  StockItem,
  ToolItem,
  MachinePartItem,
  CutLogEntry,
  ActiveShopTab,
  FilterState,
  Offcut
} from './types';

import {
  loadStock,
  saveStock,
  loadTools,
  saveTools,
  loadMachineParts,
  saveMachineParts,
  resetToSampleStock,
  loadCutLogs,
  addCutLog,
  exportStockToCSV,
  exportToolsToCSV,
  exportPartsToCSV
} from './storage';

import { initDeleteModal, confirmDelete } from './modules/deleteModal';
import { attachHoldToTick } from './modules/holdToTick';
import { showToast } from './modules/toast';
import { renderMaterialsTable, renderMaterialsCards } from './modules/materialsView';
import { renderToolsTable, renderToolsCards } from './modules/toolsView';
import { renderPartsTable, renderPartsCards } from './modules/partsView';
import { renderAuditTable } from './modules/auditView';

// =============================================================
// Application State
// =============================================================
let stockItems: StockItem[] = [];
let toolItems: ToolItem[] = [];
let machinePartItems: MachinePartItem[] = [];
let cutLogs: CutLogEntry[] = [];

let activeTab: ActiveShopTab = 'materials';
const selectedIds = new Set<string>();
let activeOffcutItemId: string | null = null;
let holdCleanupFunctions: Array<() => void> = [];

const filterState: FilterState = {
  searchQuery: '',
  category: 'all',
  shape: 'all',
  status: 'all',
  location: 'all',
  viewMode: 'table',
  sortBy: 'updated',
  sortOrder: 'desc'
};

// =============================================================
// App Initialization
// =============================================================
function initApp() {
  // 1. Load initial data
  stockItems = loadStock();
  toolItems = loadTools();
  machinePartItems = loadMachineParts();
  cutLogs = loadCutLogs();

  // 2. Initialize custom delete modal
  initDeleteModal();

  // 3. Bind UI event listeners
  setupTabNavigation();
  setupFilterListeners();
  setupGlobalActionDelegates();
  setupModalForms();
  setupToolsMenu();

  // 4. Initial Render
  updateCategoryChips();
  updateLocationDropdown();
  renderApp();
}

// =============================================================
// Tab Switching & Navigation
// =============================================================
function setupTabNavigation() {
  const tabs: Array<{ id: string; tab: ActiveShopTab }> = [
    { id: 'tab-btn-materials', tab: 'materials' },
    { id: 'tab-btn-tools', tab: 'tools' },
    { id: 'tab-btn-parts', tab: 'machine-parts' },
    { id: 'tab-btn-audit', tab: 'audit-count' }
  ];

  tabs.forEach(({ id, tab }) => {
    const btn = document.getElementById(id);
    btn?.addEventListener('click', () => {
      activeTab = tab;
      selectedIds.clear();
      filterState.category = 'all';
      filterState.location = 'all';
      filterState.status = 'all';
      filterState.shape = 'all';

      // Update tab active classes
      tabs.forEach((t) => {
        const b = document.getElementById(t.id);
        if (t.tab === tab) {
          b?.classList.add('active-tab', 'font-bold');
        } else {
          b?.classList.remove('active-tab', 'font-bold');
        }
      });

      // Update Add Button label based on active tab
      const addPrimaryBtnText = document.getElementById('btn-add-primary-text');
      const addPrimaryBtn = document.getElementById('btn-add-primary');
      if (addPrimaryBtnText && addPrimaryBtn) {
        if (tab === 'materials') {
          addPrimaryBtnText.textContent = '+ Add Stock';
          addPrimaryBtn.classList.remove('hidden');
        } else if (tab === 'tools') {
          addPrimaryBtnText.textContent = '+ Add Tool';
          addPrimaryBtn.classList.remove('hidden');
        } else if (tab === 'machine-parts') {
          addPrimaryBtnText.textContent = '+ Add Spare';
          addPrimaryBtn.classList.remove('hidden');
        } else {
          addPrimaryBtn.classList.add('hidden');
        }
      }

      updateCategoryChips();
      updateLocationDropdown();
      renderApp();
    });
  });

  // Primary Add button click
  document.getElementById('btn-add-primary')?.addEventListener('click', () => {
    if (activeTab === 'materials') openMaterialModal();
    else if (activeTab === 'tools') openToolModal();
    else if (activeTab === 'machine-parts') openPartModal();
  });
}

// =============================================================
// Filters & Search
// =============================================================
function setupFilterListeners() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const searchClearBtn = document.getElementById('search-clear-btn');
  const shapeFilter = document.getElementById('filter-shape') as HTMLSelectElement;
  const statusFilter = document.getElementById('filter-status') as HTMLSelectElement;
  const locationFilter = document.getElementById('filter-location') as HTMLSelectElement;
  const viewTableBtn = document.getElementById('view-table-btn');
  const viewCardsBtn = document.getElementById('view-cards-btn');
  const resetEmptyBtn = document.getElementById('empty-state-reset-btn');

  searchInput?.addEventListener('input', () => {
    filterState.searchQuery = searchInput.value.trim().toLowerCase();
    if (searchClearBtn) {
      searchClearBtn.classList.toggle('hidden', !filterState.searchQuery);
    }
    renderApp();
  });

  searchClearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    filterState.searchQuery = '';
    searchClearBtn.classList.add('hidden');
    renderApp();
  });

  shapeFilter?.addEventListener('change', () => {
    filterState.shape = shapeFilter.value;
    renderApp();
  });

  statusFilter?.addEventListener('change', () => {
    filterState.status = statusFilter.value;
    renderApp();
  });

  locationFilter?.addEventListener('change', () => {
    filterState.location = locationFilter.value;
    renderApp();
  });

  viewTableBtn?.addEventListener('click', () => {
    filterState.viewMode = 'table';
    viewTableBtn.classList.add('bg-[#282e39]', 'text-white', 'font-bold');
    viewCardsBtn?.classList.remove('bg-[#282e39]', 'text-white', 'font-bold');
    renderApp();
  });

  viewCardsBtn?.addEventListener('click', () => {
    filterState.viewMode = 'cards';
    viewCardsBtn.classList.add('bg-[#282e39]', 'text-white', 'font-bold');
    viewTableBtn?.classList.remove('bg-[#282e39]', 'text-white', 'font-bold');
    renderApp();
  });

  resetEmptyBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (searchClearBtn) searchClearBtn.classList.add('hidden');
    if (shapeFilter) shapeFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    if (locationFilter) locationFilter.value = 'all';
    filterState.searchQuery = '';
    filterState.category = 'all';
    filterState.shape = 'all';
    filterState.status = 'all';
    filterState.location = 'all';
    updateCategoryChips();
    renderApp();
  });
}

function updateCategoryChips() {
  const container = document.getElementById('category-chips-container');
  if (!container) return;

  let chips: Array<{ id: string; label: string }> = [{ id: 'all', label: 'All Categories' }];

  if (activeTab === 'materials' || activeTab === 'audit-count') {
    chips = [
      { id: 'all', label: 'All Alloys' },
      { id: 'aluminum', label: 'Aluminum (6061/7075)' },
      { id: 'carbon-steel', label: 'Carbon Steel (1018)' },
      { id: 'alloy-steel', label: 'Alloy Steel (4140)' },
      { id: 'stainless', label: 'Stainless (304/316)' },
      { id: 'tool-steel', label: 'Tool Steel (O1/A2)' },
      { id: 'brass-bronze', label: 'Brass & Bronze' },
      { id: 'plastics', label: 'Plastics / Delrin' },
      { id: 'titanium-exotic', label: 'Titanium & Exotic' }
    ];
  } else if (activeTab === 'tools') {
    chips = [
      { id: 'all', label: 'All Tooling' },
      { id: 'end-mill', label: 'End Mills' },
      { id: 'face-mill', label: 'Face Mills' },
      { id: 'drill-bit', label: 'Drill Bits' },
      { id: 'tap-thread', label: 'Taps & Thread' },
      { id: 'carbide-insert', label: 'Carbide Inserts' },
      { id: 'tool-holder', label: 'Tool Holders & Collets' },
      { id: 'boring-reamer', label: 'Boring & Reamers' }
    ];
  } else if (activeTab === 'machine-parts') {
    chips = [
      { id: 'all', label: 'All Machine Spares' },
      { id: 'belts-pulleys', label: 'Spindle Belts & Drive' },
      { id: 'filters-lube', label: 'Lube & Filters' },
      { id: 'wipers-seals', label: 'Way Wipers & Seals' },
      { id: 'coolant-nozzles', label: 'Coolant & Plumbing' },
      { id: 'bearings-screws', label: 'Ball Screws & Bearings' },
      { id: 'electrical-sensors', label: 'Limit Sensors & Sw' },
      { id: 'drawbar-spindle', label: 'Drawbar & Spindle' }
    ];
  }

  container.innerHTML = chips
    .map((c) => {
      const isActive = filterState.category === c.id;
      return `
        <button 
          type="button" 
          data-category="${c.id}" 
          class="category-chip-btn px-2.5 py-1 rounded text-xs whitespace-nowrap transition-all ${
            isActive
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'metal-tab-btn text-[#8b98ab] hover:text-[#e2e8f0]'
          }"
        >${c.label}</button>
      `;
    })
    .join('');

  container.querySelectorAll('.category-chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      filterState.category = btn.getAttribute('data-category') || 'all';
      updateCategoryChips();
      renderApp();
    });
  });
}

function updateLocationDropdown() {
  const locSelect = document.getElementById('filter-location') as HTMLSelectElement;
  if (!locSelect) return;

  const locs = new Set<string>();
  if (activeTab === 'materials') {
    stockItems.forEach((i) => i.rackLocation && locs.add(i.rackLocation));
  } else if (activeTab === 'tools') {
    toolItems.forEach((t) => t.location && locs.add(t.location));
  } else if (activeTab === 'machine-parts') {
    machinePartItems.forEach((p) => p.location && locs.add(p.location));
  }

  locSelect.innerHTML = `<option value="all">All Locations (${locs.size})</option>` +
    Array.from(locs)
      .sort()
      .map((l) => `<option value="${l}">${l}</option>`)
      .join('');
}

// =============================================================
// Core Render Engine
// =============================================================
function renderApp() {
  // Clean up any active hold-to-tick event listeners from previous render
  holdCleanupFunctions.forEach((cleanup) => cleanup());
  holdCleanupFunctions = [];

  // Update Navigation Badges
  const badgeMat = document.getElementById('tab-badge-materials');
  const badgeTools = document.getElementById('tab-badge-tools');
  const badgeParts = document.getElementById('tab-badge-parts');
  if (badgeMat) badgeMat.textContent = String(stockItems.length);
  if (badgeTools) badgeTools.textContent = String(toolItems.length);
  if (badgeParts) badgeParts.textContent = String(machinePartItems.length);

  // Update Metrics
  updateMetrics();

  // Handle Tab Views
  const tableViewWrapper = document.getElementById('table-view-wrapper');
  const cardsViewWrapper = document.getElementById('cards-view-wrapper');
  const auditViewWrapper = document.getElementById('audit-view-wrapper');
  const tableHead = document.getElementById('main-table-head');
  const tableBody = document.getElementById('stock-table-body');
  const emptyState = document.getElementById('stock-empty-state');

  if (activeTab === 'audit-count') {
    tableViewWrapper?.classList.add('hidden');
    cardsViewWrapper?.classList.add('hidden');
    auditViewWrapper?.classList.remove('hidden');
    renderAuditView();
    attachHoldToTickToButtons();
    return;
  }

  auditViewWrapper?.classList.add('hidden');

  if (filterState.viewMode === 'table') {
    tableViewWrapper?.classList.remove('hidden');
    cardsViewWrapper?.classList.add('hidden');
  } else {
    tableViewWrapper?.classList.add('hidden');
    cardsViewWrapper?.classList.remove('hidden');
  }

  if (activeTab === 'materials') {
    const filtered = filterMaterials();
    const hasItems = filtered.length > 0;

    if (emptyState) emptyState.classList.toggle('hidden', hasItems);

    if (tableHead) {
      tableHead.innerHTML = `
        <tr class="bg-[#14161a] text-[#8b98ab] border-b border-[#282d36] text-[10px] uppercase font-mono">
          <th class="py-2 px-3 text-center w-8">
            <input type="checkbox" id="select-all-header-checkbox" class="rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer" ${filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id)) ? 'checked' : ''} />
          </th>
          <th class="py-2.5 px-3">Material & Grade</th>
          <th class="py-2.5 px-3">Shape & Dimensions</th>
          <th class="py-2.5 px-3 text-center">Full Bar Stock (Hold +/-)</th>
          <th class="py-2.5 px-3 text-center">Offcuts</th>
          <th class="py-2.5 px-3">Rack Location</th>
          <th class="py-2.5 px-3">Status</th>
          <th class="py-2.5 px-3 text-right">Value ($)</th>
          <th class="py-2.5 px-3 text-right">Actions</th>
        </tr>
      `;
    }

    if (tableBody) {
      tableBody.innerHTML = renderMaterialsTable(filtered, selectedIds, (id, delta) => {
        adjustStockQty(id, delta);
      });
    }

    if (cardsViewWrapper) {
      cardsViewWrapper.innerHTML = renderMaterialsCards(filtered, selectedIds);
    }
  } else if (activeTab === 'tools') {
    const filtered = filterTools();
    const hasItems = filtered.length > 0;

    if (emptyState) emptyState.classList.toggle('hidden', hasItems);

    if (tableHead) {
      tableHead.innerHTML = `
        <tr class="bg-[#14161a] text-[#8b98ab] border-b border-[#282d36] text-[10px] uppercase font-mono">
          <th class="py-2 px-3 text-center w-8">
            <input type="checkbox" id="select-all-header-checkbox" class="rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer" ${filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id)) ? 'checked' : ''} />
          </th>
          <th class="py-2.5 px-3">Tool Description & Specs</th>
          <th class="py-2.5 px-3">Type & Shank</th>
          <th class="py-2.5 px-3 text-center">Qty In Stock (Hold +/-)</th>
          <th class="py-2.5 px-3">Crib Location</th>
          <th class="py-2.5 px-3">Condition</th>
          <th class="py-2.5 px-3 text-right">Value ($)</th>
          <th class="py-2.5 px-3 text-right">Actions</th>
        </tr>
      `;
    }

    if (tableBody) {
      tableBody.innerHTML = renderToolsTable(filtered, selectedIds);
    }

    if (cardsViewWrapper) {
      cardsViewWrapper.innerHTML = renderToolsCards(filtered, selectedIds);
    }
  } else if (activeTab === 'machine-parts') {
    const filtered = filterParts();
    const hasItems = filtered.length > 0;

    if (emptyState) emptyState.classList.toggle('hidden', hasItems);

    if (tableHead) {
      tableHead.innerHTML = `
        <tr class="bg-[#14161a] text-[#8b98ab] border-b border-[#282d36] text-[10px] uppercase font-mono">
          <th class="py-2 px-3 text-center w-8">
            <input type="checkbox" id="select-all-header-checkbox" class="rounded bg-[#0f1216] border-[#2d323b] text-blue-600 focus:ring-0 cursor-pointer" ${filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id)) ? 'checked' : ''} />
          </th>
          <th class="py-2.5 px-3">Part Description & Machine</th>
          <th class="py-2.5 px-3">Target Asset</th>
          <th class="py-2.5 px-3 text-center">Qty In Stock (Hold +/-)</th>
          <th class="py-2.5 px-3">Storage Bin</th>
          <th class="py-2.5 px-3">Criticality</th>
          <th class="py-2.5 px-3 text-right">Value ($)</th>
          <th class="py-2.5 px-3 text-right">Actions</th>
        </tr>
      `;
    }

    if (tableBody) {
      tableBody.innerHTML = renderPartsTable(filtered, selectedIds);
    }

    if (cardsViewWrapper) {
      cardsViewWrapper.innerHTML = renderPartsCards(filtered, selectedIds);
    }
  }

  // Update Batch Toolbar
  updateBatchToolbar();

  // Attach Hold-to-Tick to all rendered buttons
  attachHoldToTickToButtons();
}

function renderAuditView() {
  const tbody = document.getElementById('audit-table-body');
  if (tbody) {
    tbody.innerHTML = renderAuditTable(stockItems, toolItems, machinePartItems);
  }
}

// =============================================================
// Hold to Tick Accelerator Binding
// =============================================================
function attachHoldToTickToButtons() {
  document.querySelectorAll<HTMLElement>('.qty-hold-btn').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (!action || !id) return;

    const cleanup = attachHoldToTick(btn, {
      initialDelayMs: 1000,
      intervalMs: 70,
      onStep: () => {
        handleQtyAction(action, id);
      },
      onHoldStart: () => {
        showToast('Auto-ticking quantity rapidly...', 'info');
      },
      onHoldEnd: () => {
        // Persist when user releases button
        if (action.includes('material')) saveStock(stockItems);
        else if (action.includes('tool')) saveTools(toolItems);
        else if (action.includes('part')) saveMachineParts(machinePartItems);
        updateMetrics();
      }
    });

    holdCleanupFunctions.push(cleanup);
  });
}

function handleQtyAction(action: string, id: string) {
  if (action === 'inc-material-qty' || action === 'inc-material') {
    adjustStockQty(id, 1, false);
  } else if (action === 'dec-material-qty' || action === 'dec-material') {
    adjustStockQty(id, -1, false);
  } else if (action === 'inc-tool-qty' || action === 'inc-tool') {
    adjustToolQty(id, 1, false);
  } else if (action === 'dec-tool-qty' || action === 'dec-tool') {
    adjustToolQty(id, -1, false);
  } else if (action === 'inc-part-qty' || action === 'inc-part') {
    adjustPartQty(id, 1, false);
  } else if (action === 'dec-part-qty' || action === 'dec-part') {
    adjustPartQty(id, -1, false);
  }
}

function adjustStockQty(id: string, delta: number, autoSave = true) {
  const item = stockItems.find((s) => s.id === id);
  if (!item) return;
  item.fullStockQty = Math.max(0, item.fullStockQty + delta);
  if (item.fullStockQty === 0) item.status = 'scrap';
  else if (item.fullStockQty <= item.minThreshold) item.status = 'low-stock';
  else if (item.status === 'low-stock') item.status = 'in-stock';
  item.lastUpdated = new Date().toISOString().split('T')[0];

  updateItemQtyDisplay(id, item.fullStockQty, item.fullStockQty <= item.minThreshold);
  if (autoSave) {
    saveStock(stockItems);
    updateMetrics();
  }
}

function adjustToolQty(id: string, delta: number, autoSave = true) {
  const tool = toolItems.find((t) => t.id === id);
  if (!tool) return;
  tool.qtyInStock = Math.max(0, tool.qtyInStock + delta);
  if (tool.qtyInStock === 0) tool.condition = 'worn-scrap';
  else if (tool.qtyInStock <= tool.minThreshold) tool.condition = 'needs-regrind';
  tool.lastUpdated = new Date().toISOString().split('T')[0];

  updateItemQtyDisplay(id, tool.qtyInStock, tool.qtyInStock <= tool.minThreshold);
  if (autoSave) {
    saveTools(toolItems);
    updateMetrics();
  }
}

function adjustPartQty(id: string, delta: number, autoSave = true) {
  const part = machinePartItems.find((p) => p.id === id);
  if (!part) return;
  part.qtyInStock = Math.max(0, part.qtyInStock + delta);
  part.lastUpdated = new Date().toISOString().split('T')[0];

  updateItemQtyDisplay(id, part.qtyInStock, part.qtyInStock <= part.minThreshold);
  if (autoSave) {
    saveMachineParts(machinePartItems);
    updateMetrics();
  }
}

function updateItemQtyDisplay(id: string, newQty: number, isLow: boolean) {
  const row = document.querySelector(`[data-item-id="${id}"]`);
  if (row) {
    const qtySpan = row.querySelector('.w-10, .w-8');
    if (qtySpan) {
      qtySpan.textContent = String(newQty);
      qtySpan.className = `w-10 text-center font-mono font-bold text-xs ${
        isLow ? 'text-rose-400 font-extrabold' : 'text-white'
      }`;
    }
  }

  const auditRow = document.querySelector(`[data-audit-id="${id}"]`);
  if (auditRow) {
    const qtySpan = auditRow.querySelector('.w-12');
    if (qtySpan) {
      qtySpan.textContent = String(newQty);
      qtySpan.className = `w-12 text-center font-mono font-bold text-xs ${
        isLow ? 'text-rose-400 font-extrabold' : 'text-white'
      }`;
    }
  }
}

// =============================================================
// Filters & Queries
// =============================================================
function filterMaterials(): StockItem[] {
  return stockItems.filter((item) => {
    if (filterState.searchQuery) {
      const q = filterState.searchQuery;
      const match =
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.alloyGrade.toLowerCase().includes(q) ||
        item.rackLocation.toLowerCase().includes(q) ||
        (item.heatNumber && item.heatNumber.toLowerCase().includes(q)) ||
        (item.allocatedJob && item.allocatedJob.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterState.category !== 'all' && item.category !== filterState.category) return false;
    if (filterState.shape !== 'all' && item.shape !== filterState.shape) return false;
    if (filterState.status === 'low-stock') {
      if (item.fullStockQty > item.minThreshold) return false;
    } else if (filterState.status === 'has-offcuts') {
      if (!item.offcuts || item.offcuts.length === 0) return false;
    } else if (filterState.status !== 'all' && item.status !== filterState.status) {
      return false;
    }
    if (filterState.location !== 'all' && item.rackLocation !== filterState.location) return false;
    return true;
  });
}

function filterTools(): ToolItem[] {
  return toolItems.filter((tool) => {
    if (filterState.searchQuery) {
      const q = filterState.searchQuery;
      const match =
        tool.name.toLowerCase().includes(q) ||
        tool.sku.toLowerCase().includes(q) ||
        tool.toolType.toLowerCase().includes(q) ||
        tool.sizeDiameter.toLowerCase().includes(q) ||
        tool.location.toLowerCase().includes(q) ||
        (tool.assignedMachine && tool.assignedMachine.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterState.category !== 'all' && tool.category !== filterState.category) return false;
    if (filterState.status === 'low-stock') {
      if (tool.qtyInStock > tool.minThreshold) return false;
    } else if (filterState.status !== 'all' && tool.condition !== filterState.status) {
      return false;
    }
    if (filterState.location !== 'all' && tool.location !== filterState.location) return false;
    return true;
  });
}

function filterParts(): MachinePartItem[] {
  return machinePartItems.filter((part) => {
    if (filterState.searchQuery) {
      const q = filterState.searchQuery;
      const match =
        part.name.toLowerCase().includes(q) ||
        part.partNumber.toLowerCase().includes(q) ||
        part.machineName.toLowerCase().includes(q) ||
        part.location.toLowerCase().includes(q) ||
        (part.oemBrand && part.oemBrand.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterState.category !== 'all' && part.category !== filterState.category) return false;
    if (filterState.status === 'low-stock') {
      if (part.qtyInStock > part.minThreshold) return false;
    } else if (filterState.status !== 'all' && part.criticality !== filterState.status) {
      return false;
    }
    if (filterState.location !== 'all' && part.location !== filterState.location) return false;
    return true;
  });
}

// =============================================================
// Metrics Bar
// =============================================================
function updateMetrics() {
  const m1 = document.getElementById('metric-total-items');
  const m2 = document.getElementById('metric-total-bars');
  const m3 = document.getElementById('metric-total-offcuts');
  const m4 = document.getElementById('metric-low-stock');
  const m5 = document.getElementById('metric-reserved');
  const m6 = document.getElementById('metric-total-value');

  const title1 = document.getElementById('metric-title-1');
  const title2 = document.getElementById('metric-title-2');
  const title3 = document.getElementById('metric-title-3');
  const title5 = document.getElementById('metric-title-5');

  if (activeTab === 'materials') {
    if (title1) title1.textContent = 'Raw Stock SKUs';
    if (title2) title2.textContent = 'Full Bars / Tubes';
    if (title3) title3.textContent = 'Usable Drops';
    if (title5) title5.textContent = 'Job Allocated';

    const totalBars = stockItems.reduce((acc, i) => acc + i.fullStockQty, 0);
    const totalDrops = stockItems.reduce((acc, i) => acc + (i.offcuts || []).reduce((a, o) => a + o.quantity, 0), 0);
    const lowCount = stockItems.filter((i) => i.fullStockQty <= i.minThreshold).length;
    const reservedCount = stockItems.filter((i) => Boolean(i.allocatedJob)).length;
    const totalVal = stockItems.reduce((acc, i) => acc + i.fullStockQty * (i.costPerUnit || 0), 0);

    if (m1) m1.textContent = String(stockItems.length);
    if (m2) m2.textContent = String(totalBars);
    if (m3) m3.textContent = String(totalDrops);
    if (m4) m4.textContent = String(lowCount);
    if (m5) m5.textContent = String(reservedCount);
    if (m6) m6.textContent = totalVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else if (activeTab === 'tools') {
    if (title1) title1.textContent = 'Tooling SKUs';
    if (title2) title2.textContent = 'Total Cutters';
    if (title3) title3.textContent = 'In Carousel';
    if (title5) title5.textContent = 'Regrind Needed';

    const totalTools = toolItems.reduce((acc, t) => acc + t.qtyInStock, 0);
    const inCarousel = toolItems.filter((t) => t.condition === 'in-machine').length;
    const lowCount = toolItems.filter((t) => t.qtyInStock <= t.minThreshold).length;
    const regrindCount = toolItems.filter((t) => t.condition === 'needs-regrind').length;
    const totalVal = toolItems.reduce((acc, t) => acc + t.qtyInStock * (t.costPerUnit || 0), 0);

    if (m1) m1.textContent = String(toolItems.length);
    if (m2) m2.textContent = String(totalTools);
    if (m3) m3.textContent = String(inCarousel);
    if (m4) m4.textContent = String(lowCount);
    if (m5) m5.textContent = String(regrindCount);
    if (m6) m6.textContent = totalVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else if (activeTab === 'machine-parts') {
    if (title1) title1.textContent = 'Spare Components';
    if (title2) title2.textContent = 'Total Spares';
    if (title3) title3.textContent = 'Critical Spares';
    if (title5) title5.textContent = 'Consumables';

    const totalParts = machinePartItems.reduce((acc, p) => acc + p.qtyInStock, 0);
    const criticalCount = machinePartItems.filter((p) => p.criticality === 'critical-spare').length;
    const lowCount = machinePartItems.filter((p) => p.qtyInStock <= p.minThreshold).length;
    const consumableCount = machinePartItems.filter((p) => p.criticality === 'consumable').length;
    const totalVal = machinePartItems.reduce((acc, p) => acc + p.qtyInStock * (p.costPerUnit || 0), 0);

    if (m1) m1.textContent = String(machinePartItems.length);
    if (m2) m2.textContent = String(totalParts);
    if (m3) m3.textContent = String(criticalCount);
    if (m4) m4.textContent = String(lowCount);
    if (m5) m5.textContent = String(consumableCount);
    if (m6) m6.textContent = totalVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}

// =============================================================
// Global Action Event Delegation (Working Delete, Edit, Offcuts)
// =============================================================
function setupGlobalActionDelegates() {
  document.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest('[data-action]') as HTMLElement;
    if (!actionBtn) return;

    const action = actionBtn.getAttribute('data-action');
    const id = actionBtn.getAttribute('data-id');

    // 1. Working Delete Material Stock
    if (action === 'delete-material' && id) {
      const item = stockItems.find((s) => s.id === id);
      const name = item ? item.name : 'this material';
      const confirmed = await confirmDelete(
        `Are you sure you want to permanently delete ${name} (Alloy: ${item?.alloyGrade}) from shop inventory?`,
        'Delete Raw Stock Material'
      );
      if (confirmed) {
        stockItems = stockItems.filter((s) => s.id !== id);
        selectedIds.delete(id);
        saveStock(stockItems);
        showToast(`Deleted ${name} from inventory`, 'danger');
        renderApp();
      }
      return;
    }

    // 2. Working Delete Tool
    if (action === 'delete-tool' && id) {
      const tool = toolItems.find((t) => t.id === id);
      const name = tool ? tool.name : 'this tool';
      const confirmed = await confirmDelete(
        `Are you sure you want to remove tool "${name}" from the tool crib inventory?`,
        'Delete Tooling Item'
      );
      if (confirmed) {
        toolItems = toolItems.filter((t) => t.id !== id);
        selectedIds.delete(id);
        saveTools(toolItems);
        showToast(`Removed ${name} from tool crib`, 'danger');
        renderApp();
      }
      return;
    }

    // 3. Working Delete Machine Part
    if (action === 'delete-part' && id) {
      const part = machinePartItems.find((p) => p.id === id);
      const name = part ? part.name : 'this machine part';
      const confirmed = await confirmDelete(
        `Are you sure you want to remove machine spare part "${name}" (Machine: ${part?.machineName})?`,
        'Delete Machine Part'
      );
      if (confirmed) {
        machinePartItems = machinePartItems.filter((p) => p.id !== id);
        selectedIds.delete(id);
        saveMachineParts(machinePartItems);
        showToast(`Removed ${name} from machine spares`, 'danger');
        renderApp();
      }
      return;
    }

    // 4. Edit Actions
    if (action === 'edit-material' && id) {
      openMaterialModal(id);
      return;
    }
    if (action === 'edit-tool' && id) {
      openToolModal(id);
      return;
    }
    if (action === 'edit-part' && id) {
      openPartModal(id);
      return;
    }

    // 5. Cut Saw Drop Action
    if (action === 'cut-material' && id) {
      openCutModal(id);
      return;
    }

    // 6. Manage Offcuts
    if (action === 'manage-offcuts' && id) {
      openOffcutsModal(id);
      return;
    }

    // 7. Delete Offcut Drop piece
    if (action === 'delete-offcut') {
      const offcutId = actionBtn.getAttribute('data-offcut-id');
      if (activeOffcutItemId && offcutId) {
        const item = stockItems.find((s) => s.id === activeOffcutItemId);
        if (item) {
          item.offcuts = (item.offcuts || []).filter((o) => o.id !== offcutId);
          saveStock(stockItems);
          renderOffcutsList(item);
          renderApp();
          showToast('Offcut drop removed from bin', 'warning');
        }
      }
      return;
    }

    // 8. Audit Mark Verified
    if (action === 'audit-verify') {
      const domain = actionBtn.getAttribute('data-domain');
      const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (domain === 'material') {
        const item = stockItems.find((s) => s.id === id);
        if (item) item.lastCounted = stamp;
        saveStock(stockItems);
      } else if (domain === 'tool') {
        const tool = toolItems.find((t) => t.id === id);
        if (tool) tool.lastCounted = stamp;
        saveTools(toolItems);
      } else if (domain === 'part') {
        const part = machinePartItems.find((p) => p.id === id);
        if (part) part.lastCounted = stamp;
        saveMachineParts(machinePartItems);
      }
      showToast(`Item verified in physical count at ${stamp}`, 'success');
      renderAuditView();
      return;
    }
  });

  // Checkbox selection delegation
  document.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;

    // Header Select All
    if (target.id === 'select-all-header-checkbox') {
      let currentList: Array<{ id: string }> = [];
      if (activeTab === 'materials') currentList = filterMaterials();
      else if (activeTab === 'tools') currentList = filterTools();
      else if (activeTab === 'machine-parts') currentList = filterParts();

      if (target.checked) {
        currentList.forEach((i) => selectedIds.add(i.id));
      } else {
        selectedIds.clear();
      }
      renderApp();
      return;
    }

    // Row checkbox
    if (target.classList.contains('row-select-checkbox')) {
      const id = target.getAttribute('data-id');
      if (id) {
        if (target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateBatchToolbar();
      }
    }
  });

  // Metric filter buttons
  document.getElementById('metric-filter-offcuts')?.addEventListener('click', () => {
    activeTab = 'materials';
    filterState.status = 'has-offcuts';
    renderApp();
  });

  document.getElementById('metric-filter-low')?.addEventListener('click', () => {
    filterState.status = 'low-stock';
    renderApp();
  });

  // Audit view buttons
  document.getElementById('btn-audit-mark-all')?.addEventListener('click', () => {
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    stockItems.forEach((s) => (s.lastCounted = stamp));
    toolItems.forEach((t) => (t.lastCounted = stamp));
    machinePartItems.forEach((p) => (p.lastCounted = stamp));
    saveStock(stockItems);
    saveTools(toolItems);
    saveMachineParts(machinePartItems);
    showToast('All in-stock items stamped as verified', 'success');
    renderAuditView();
  });

  document.getElementById('btn-audit-export-report')?.addEventListener('click', () => {
    let report = `MACHINE SHOP PHYSICAL INVENTORY AUDIT REPORT\nGenerated: ${new Date().toLocaleString()}\n\n`;
    report += `RAW MATERIALS:\n` + exportStockToCSV(stockItems) + '\n\n';
    report += `TOOLING & CUTTERS:\n` + exportToolsToCSV(toolItems) + '\n\n';
    report += `MACHINE SPARE PARTS:\n` + exportPartsToCSV(machinePartItems);

    downloadFile(report, `shop_inventory_audit_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showToast('Audit report exported successfully', 'success');
  });

  // Quick Cut Button in Header
  document.getElementById('btn-quick-cut')?.addEventListener('click', () => {
    openCutModal();
  });

  // Saw Log History Button
  document.getElementById('btn-cut-history')?.addEventListener('click', () => {
    openHistoryModal();
  });
}

// =============================================================
// Batch Toolbar Operations
// =============================================================
function updateBatchToolbar() {
  const toolbar = document.getElementById('batch-toolbar');
  const countEl = document.getElementById('batch-selected-count');
  if (!toolbar || !countEl) return;

  if (selectedIds.size > 0) {
    toolbar.classList.remove('hidden');
    countEl.textContent = String(selectedIds.size);
  } else {
    toolbar.classList.add('hidden');
  }

  // Clear batch selection
  document.getElementById('batch-btn-clear')?.addEventListener('click', () => {
    selectedIds.clear();
    renderApp();
  });

  // Batch Delete
  document.getElementById('batch-btn-delete')?.addEventListener('click', async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirmDelete(
      `Are you sure you want to permanently delete ${selectedIds.size} selected items from shop inventory?`,
      'Batch Delete Items'
    );
    if (confirmed) {
      if (activeTab === 'materials') {
        stockItems = stockItems.filter((s) => !selectedIds.has(s.id));
        saveStock(stockItems);
      } else if (activeTab === 'tools') {
        toolItems = toolItems.filter((t) => !selectedIds.has(t.id));
        saveTools(toolItems);
      } else if (activeTab === 'machine-parts') {
        machinePartItems = machinePartItems.filter((p) => !selectedIds.has(p.id));
        saveMachineParts(machinePartItems);
      }
      showToast(`Deleted ${selectedIds.size} items from inventory`, 'danger');
      selectedIds.clear();
      renderApp();
    }
  });

  // Batch Adjust Qty
  document.getElementById('batch-btn-adjust-qty')?.addEventListener('click', () => {
    openBatchModal('adjust-qty');
  });

  // Batch Change Location
  document.getElementById('batch-btn-change-location')?.addEventListener('click', () => {
    openBatchModal('set-location');
  });

  // Batch Set Status
  document.getElementById('batch-btn-set-status')?.addEventListener('click', () => {
    openBatchModal('set-status');
  });

  // Batch Export
  document.getElementById('batch-btn-export')?.addEventListener('click', () => {
    if (activeTab === 'materials') {
      const selected = stockItems.filter((s) => selectedIds.has(s.id));
      downloadFile(exportStockToCSV(selected), 'selected_materials.csv', 'text/csv');
    } else if (activeTab === 'tools') {
      const selected = toolItems.filter((t) => selectedIds.has(t.id));
      downloadFile(exportToolsToCSV(selected), 'selected_tools.csv', 'text/csv');
    } else if (activeTab === 'machine-parts') {
      const selected = machinePartItems.filter((p) => selectedIds.has(p.id));
      downloadFile(exportPartsToCSV(selected), 'selected_parts.csv', 'text/csv');
    }
    showToast(`Exported ${selectedIds.size} items to CSV`, 'success');
  });
}

function openBatchModal(actionType: 'adjust-qty' | 'set-location' | 'set-status') {
  const modal = document.getElementById('modal-batch');
  const title = document.getElementById('modal-batch-title');
  const container = document.getElementById('batch-field-container');
  const closeBtn = document.getElementById('modal-batch-close');
  const cancelBtn = document.getElementById('modal-batch-cancel');
  const form = document.getElementById('form-batch') as HTMLFormElement;

  if (!modal || !title || !container || !form) return;

  if (actionType === 'adjust-qty') {
    title.textContent = `Batch Adjust Quantity (${selectedIds.size} Items)`;
    container.innerHTML = `
      <label class="block text-[#8b98ab] text-[11px] mb-1">Set Fixed Quantity or Add/Subtract Offset:</label>
      <input type="number" id="batch-input-qty" required placeholder="e.g. 5 (or -1)" class="w-full px-2.5 py-1.5 bg-[#0f1216] border border-[#2d323b] rounded text-[#e2e8f0] text-xs font-mono" />
    `;
  } else if (actionType === 'set-location') {
    title.textContent = `Batch Set Location (${selectedIds.size} Items)`;
    container.innerHTML = `
      <label class="block text-[#8b98ab] text-[11px] mb-1">New Rack / Drawer Location:</label>
      <input type="text" id="batch-input-location" required placeholder="e.g. Cantilever B-1 or Crib 3A" class="w-full px-2.5 py-1.5 bg-[#0f1216] border border-[#2d323b] rounded text-[#e2e8f0] text-xs font-mono" />
    `;
  } else if (actionType === 'set-status') {
    title.textContent = `Batch Set Status (${selectedIds.size} Items)`;
    container.innerHTML = `
      <label class="block text-[#8b98ab] text-[11px] mb-1">New Status:</label>
      <select id="batch-input-status" class="w-full px-2.5 py-1.5 bg-[#0f1216] border border-[#2d323b] rounded text-[#e2e8f0] text-xs font-mono">
        <option value="in-stock">In Stock (Optimal)</option>
        <option value="low-stock">Low Stock</option>
        <option value="reserved">Reserved</option>
        <option value="ordered">On Order</option>
      </select>
    `;
  }

  modal.classList.remove('hidden');

  const closeModal = () => modal.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal, { once: true });
  cancelBtn?.addEventListener('click', closeModal, { once: true });

  form.onsubmit = (e) => {
    e.preventDefault();
    if (actionType === 'adjust-qty') {
      const val = parseInt((document.getElementById('batch-input-qty') as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
        if (activeTab === 'materials') {
          stockItems.forEach((s) => {
            if (selectedIds.has(s.id)) s.fullStockQty = Math.max(0, s.fullStockQty + val);
          });
          saveStock(stockItems);
        } else if (activeTab === 'tools') {
          toolItems.forEach((t) => {
            if (selectedIds.has(t.id)) t.qtyInStock = Math.max(0, t.qtyInStock + val);
          });
          saveTools(toolItems);
        } else if (activeTab === 'machine-parts') {
          machinePartItems.forEach((p) => {
            if (selectedIds.has(p.id)) p.qtyInStock = Math.max(0, p.qtyInStock + val);
          });
          saveMachineParts(machinePartItems);
        }
      }
    } else if (actionType === 'set-location') {
      const loc = (document.getElementById('batch-input-location') as HTMLInputElement).value.trim();
      if (loc) {
        if (activeTab === 'materials') {
          stockItems.forEach((s) => selectedIds.has(s.id) && (s.rackLocation = loc));
          saveStock(stockItems);
        } else if (activeTab === 'tools') {
          toolItems.forEach((t) => selectedIds.has(t.id) && (t.location = loc));
          saveTools(toolItems);
        } else if (activeTab === 'machine-parts') {
          machinePartItems.forEach((p) => selectedIds.has(p.id) && (p.location = loc));
          saveMachineParts(machinePartItems);
        }
      }
    } else if (actionType === 'set-status') {
      const stat = (document.getElementById('batch-input-status') as HTMLSelectElement).value;
      if (activeTab === 'materials') {
        stockItems.forEach((s) => selectedIds.has(s.id) && (s.status = stat as any));
        saveStock(stockItems);
      }
    }

    closeModal();
    showToast(`Updated ${selectedIds.size} items`, 'success');
    renderApp();
  };
}

// =============================================================
// Modals Setup (Material, Tool, Machine Part, Cut Logger)
// =============================================================
function setupModalForms() {
  // 1. Material Modal
  const matModal = document.getElementById('modal-material');
  const matClose = document.getElementById('modal-material-close');
  const matCancel = document.getElementById('modal-material-cancel');
  const matForm = document.getElementById('form-material') as HTMLFormElement;
  const matShapeSelect = document.getElementById('input-shape') as HTMLSelectElement;
  const matDeleteBtn = document.getElementById('modal-material-delete-btn');

  matClose?.addEventListener('click', () => matModal?.classList.add('hidden'));
  matCancel?.addEventListener('click', () => matModal?.classList.add('hidden'));

  matShapeSelect?.addEventListener('change', () => {
    updateDynamicDimensionsUI(matShapeSelect.value);
  });

  // Presets in material modal
  document.querySelectorAll('#alloy-presets-container .preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      const cat = btn.getAttribute('data-cat');
      const name = btn.getAttribute('data-name');
      if (preset) (document.getElementById('input-alloy') as HTMLInputElement).value = preset;
      if (cat) (document.getElementById('input-category') as HTMLSelectElement).value = cat;
      if (name) (document.getElementById('input-name') as HTMLInputElement).value = name;
    });
  });

  matForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = (document.getElementById('input-material-id') as HTMLInputElement).value;
    const name = (document.getElementById('input-name') as HTMLInputElement).value.trim();
    const category = (document.getElementById('input-category') as HTMLSelectElement).value as any;
    const alloyGrade = (document.getElementById('input-alloy') as HTMLInputElement).value.trim();
    const shape = (document.getElementById('input-shape') as HTMLSelectElement).value as any;
    const sku = (document.getElementById('input-sku') as HTMLInputElement).value.trim();
    const unit = (document.getElementById('input-unit') as HTMLSelectElement).value as 'in' | 'mm';

    const diameter = parseFloat((document.getElementById('input-diameter') as HTMLInputElement).value) || undefined;
    const width = parseFloat((document.getElementById('input-width') as HTMLInputElement).value) || undefined;
    const thickness = parseFloat((document.getElementById('input-thickness') as HTMLInputElement).value) || undefined;
    const wallThickness = parseFloat((document.getElementById('input-wall') as HTMLInputElement).value) || undefined;
    const length = parseFloat((document.getElementById('input-length') as HTMLInputElement).value) || 72;

    const fullStockQty = parseInt((document.getElementById('input-qty') as HTMLInputElement).value, 10) || 0;
    const minThreshold = parseInt((document.getElementById('input-min-threshold') as HTMLInputElement).value, 10) || 2;
    const costPerUnit = parseFloat((document.getElementById('input-cost') as HTMLInputElement).value) || 0;
    const rackLocation = (document.getElementById('input-location') as HTMLInputElement).value.trim() || 'Rack General';
    const status = (document.getElementById('input-status') as HTMLSelectElement).value as any;
    const heatNumber = (document.getElementById('input-heat') as HTMLInputElement).value.trim() || undefined;
    const supplier = (document.getElementById('input-supplier') as HTMLInputElement).value.trim() || undefined;
    const allocatedJob = (document.getElementById('input-job') as HTMLInputElement).value.trim() || undefined;
    const notes = (document.getElementById('input-notes') as HTMLInputElement).value.trim() || undefined;

    if (id) {
      // Edit existing
      const existing = stockItems.find((s) => s.id === id);
      if (existing) {
        Object.assign(existing, {
          name,
          category,
          alloyGrade,
          shape,
          sku: sku || `SKU-${alloyGrade}-${shape}`,
          unit,
          diameter,
          width,
          thickness,
          wallThickness,
          length,
          fullStockQty,
          minThreshold,
          costPerUnit,
          rackLocation,
          status,
          heatNumber,
          supplier,
          allocatedJob,
          notes,
          lastUpdated: new Date().toISOString().split('T')[0]
        });
        showToast(`Updated material ${name}`, 'success');
      }
    } else {
      // Add new
      const newItem: StockItem = {
        id: 'stk-' + Date.now(),
        sku: sku || `SKU-${alloyGrade}-${shape}`,
        name,
        category,
        alloyGrade,
        shape,
        unit,
        diameter,
        width,
        thickness,
        wallThickness,
        length,
        fullStockQty,
        minThreshold,
        costPerUnit,
        rackLocation,
        status,
        heatNumber,
        supplier,
        allocatedJob,
        notes,
        offcuts: [],
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      stockItems.unshift(newItem);
      showToast(`Added ${name} to stock inventory`, 'success');
    }

    saveStock(stockItems);
    matModal?.classList.add('hidden');
    renderApp();
  });

  // Delete button inside Material Modal
  matDeleteBtn?.addEventListener('click', async () => {
    const id = (document.getElementById('input-material-id') as HTMLInputElement).value;
    if (!id) return;
    const item = stockItems.find((s) => s.id === id);
    const confirmed = await confirmDelete(
      `Are you sure you want to delete ${item?.name || 'this stock'}?`,
      'Delete Material Stock'
    );
    if (confirmed) {
      stockItems = stockItems.filter((s) => s.id !== id);
      selectedIds.delete(id);
      saveStock(stockItems);
      matModal?.classList.add('hidden');
      showToast('Deleted material stock', 'danger');
      renderApp();
    }
  });

  // 2. Tool Modal
  const toolModal = document.getElementById('modal-tool');
  const toolClose = document.getElementById('modal-tool-close');
  const toolCancel = document.getElementById('modal-tool-cancel');
  const toolForm = document.getElementById('form-tool') as HTMLFormElement;
  const toolDeleteBtn = document.getElementById('modal-tool-delete-btn');

  toolClose?.addEventListener('click', () => toolModal?.classList.add('hidden'));
  toolCancel?.addEventListener('click', () => toolModal?.classList.add('hidden'));

  toolForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = (document.getElementById('input-tool-id') as HTMLInputElement).value;
    const name = (document.getElementById('input-tool-name') as HTMLInputElement).value.trim();
    const category = (document.getElementById('input-tool-category') as HTMLSelectElement).value as any;
    const sku = (document.getElementById('input-tool-sku') as HTMLInputElement).value.trim();
    const sizeDiameter = (document.getElementById('input-tool-size') as HTMLInputElement).value.trim();
    const flutes = (document.getElementById('input-tool-flutes') as HTMLInputElement).value.trim();
    const coating = (document.getElementById('input-tool-coating') as HTMLInputElement).value.trim();
    const shankOrHolder = (document.getElementById('input-tool-shank') as HTMLInputElement).value.trim();
    const insertGrade = (document.getElementById('input-tool-insert-grade') as HTMLInputElement).value.trim();
    const location = (document.getElementById('input-tool-location') as HTMLInputElement).value.trim();
    const qtyInStock = parseInt((document.getElementById('input-tool-qty') as HTMLInputElement).value, 10) || 0;
    const minThreshold = parseInt((document.getElementById('input-tool-min') as HTMLInputElement).value, 10) || 2;
    const costPerUnit = parseFloat((document.getElementById('input-tool-cost') as HTMLInputElement).value) || 0;
    const condition = (document.getElementById('input-tool-condition') as HTMLSelectElement).value as any;
    const assignedMachine = (document.getElementById('input-tool-machine') as HTMLInputElement).value.trim();
    const supplier = (document.getElementById('input-tool-supplier') as HTMLInputElement).value.trim();
    const notes = (document.getElementById('input-tool-notes') as HTMLInputElement).value.trim();

    if (id) {
      const existing = toolItems.find((t) => t.id === id);
      if (existing) {
        Object.assign(existing, {
          name,
          category,
          sku: sku || `TOOL-${category}-${sizeDiameter}`,
          toolType: (document.getElementById('input-tool-category') as HTMLSelectElement).selectedOptions[0].text,
          sizeDiameter,
          flutes,
          coating,
          shankOrHolder,
          insertGrade,
          location,
          qtyInStock,
          minThreshold,
          costPerUnit,
          condition,
          assignedMachine,
          supplier,
          notes,
          lastUpdated: new Date().toISOString().split('T')[0]
        });
        showToast(`Updated tool ${name}`, 'success');
      }
    } else {
      const newTool: ToolItem = {
        id: 'tool-' + Date.now(),
        sku: sku || `TOOL-${category}-${sizeDiameter}`,
        name,
        category,
        toolType: (document.getElementById('input-tool-category') as HTMLSelectElement).selectedOptions[0].text,
        sizeDiameter,
        flutes,
        coating,
        shankOrHolder,
        insertGrade,
        location,
        qtyInStock,
        minThreshold,
        costPerUnit,
        condition,
        assignedMachine,
        supplier,
        notes,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      toolItems.unshift(newTool);
      showToast(`Added ${name} to tool crib`, 'success');
    }

    saveTools(toolItems);
    toolModal?.classList.add('hidden');
    renderApp();
  });

  // Delete button inside Tool Modal
  toolDeleteBtn?.addEventListener('click', async () => {
    const id = (document.getElementById('input-tool-id') as HTMLInputElement).value;
    if (!id) return;
    const tool = toolItems.find((t) => t.id === id);
    const confirmed = await confirmDelete(
      `Are you sure you want to delete tool "${tool?.name || 'this tool'}"?`,
      'Delete Tooling Item'
    );
    if (confirmed) {
      toolItems = toolItems.filter((t) => t.id !== id);
      selectedIds.delete(id);
      saveTools(toolItems);
      toolModal?.classList.add('hidden');
      showToast('Deleted tool from crib', 'danger');
      renderApp();
    }
  });

  // 3. Machine Part Modal
  const partModal = document.getElementById('modal-part');
  const partClose = document.getElementById('modal-part-close');
  const partCancel = document.getElementById('modal-part-cancel');
  const partForm = document.getElementById('form-part') as HTMLFormElement;
  const partDeleteBtn = document.getElementById('modal-part-delete-btn');

  partClose?.addEventListener('click', () => partModal?.classList.add('hidden'));
  partCancel?.addEventListener('click', () => partModal?.classList.add('hidden'));

  partForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = (document.getElementById('input-part-id') as HTMLInputElement).value;
    const name = (document.getElementById('input-part-name') as HTMLInputElement).value.trim();
    const machineName = (document.getElementById('input-part-machine') as HTMLInputElement).value.trim();
    const partNumber = (document.getElementById('input-part-number') as HTMLInputElement).value.trim();
    const category = (document.getElementById('input-part-category') as HTMLSelectElement).value as any;
    const criticality = (document.getElementById('input-part-criticality') as HTMLSelectElement).value as any;
    const location = (document.getElementById('input-part-location') as HTMLInputElement).value.trim();
    const qtyInStock = parseInt((document.getElementById('input-part-qty') as HTMLInputElement).value, 10) || 0;
    const minThreshold = parseInt((document.getElementById('input-part-min') as HTMLInputElement).value, 10) || 1;
    const costPerUnit = parseFloat((document.getElementById('input-part-cost') as HTMLInputElement).value) || 0;
    const oemBrand = (document.getElementById('input-part-brand') as HTMLInputElement).value.trim();
    const supplier = (document.getElementById('input-part-supplier') as HTMLInputElement).value.trim();
    const serviceIntervalNotes = (document.getElementById('input-part-notes') as HTMLInputElement).value.trim();

    if (id) {
      const existing = machinePartItems.find((p) => p.id === id);
      if (existing) {
        Object.assign(existing, {
          name,
          machineName,
          partNumber,
          category,
          criticality,
          location,
          qtyInStock,
          minThreshold,
          costPerUnit,
          oemBrand,
          supplier,
          serviceIntervalNotes,
          lastUpdated: new Date().toISOString().split('T')[0]
        });
        showToast(`Updated spare part ${name}`, 'success');
      }
    } else {
      const newPart: MachinePartItem = {
        id: 'part-' + Date.now(),
        partNumber,
        name,
        machineName,
        category,
        criticality,
        location,
        qtyInStock,
        minThreshold,
        costPerUnit,
        oemBrand,
        supplier,
        serviceIntervalNotes,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      machinePartItems.unshift(newPart);
      showToast(`Added ${name} to machine spares`, 'success');
    }

    saveMachineParts(machinePartItems);
    partModal?.classList.add('hidden');
    renderApp();
  });

  // Delete button inside Part Modal
  partDeleteBtn?.addEventListener('click', async () => {
    const id = (document.getElementById('input-part-id') as HTMLInputElement).value;
    if (!id) return;
    const part = machinePartItems.find((p) => p.id === id);
    const confirmed = await confirmDelete(
      `Are you sure you want to delete spare part "${part?.name || 'this part'}"?`,
      'Delete Machine Part'
    );
    if (confirmed) {
      machinePartItems = machinePartItems.filter((p) => p.id !== id);
      selectedIds.delete(id);
      saveMachineParts(machinePartItems);
      partModal?.classList.add('hidden');
      showToast('Deleted machine part from inventory', 'danger');
      renderApp();
    }
  });

  // 4. Cut / Drop Logger Form
  const cutModal = document.getElementById('modal-cut');
  const cutClose = document.getElementById('modal-cut-close');
  const cutCancel = document.getElementById('modal-cut-cancel');
  const cutForm = document.getElementById('form-cut') as HTMLFormElement;

  cutClose?.addEventListener('click', () => cutModal?.classList.add('hidden'));
  cutCancel?.addEventListener('click', () => cutModal?.classList.add('hidden'));

  cutForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const stockId = (document.getElementById('cut-stock-select') as HTMLSelectElement).value;
    const cutLength = parseFloat((document.getElementById('cut-length') as HTMLInputElement).value);
    const cutQty = parseInt((document.getElementById('cut-qty') as HTMLInputElement).value, 10) || 1;
    const kerf = parseFloat((document.getElementById('cut-kerf') as HTMLInputElement).value) || 0.125;
    const jobId = (document.getElementById('cut-job-id') as HTMLInputElement).value.trim() || 'General Job';
    const machinist = (document.getElementById('cut-machinist') as HTMLInputElement).value.trim() || 'Machinist';
    const autoSaveOffcut = (document.getElementById('cut-save-offcut') as HTMLInputElement).checked;

    const item = stockItems.find((s) => s.id === stockId);
    if (!item) return;

    const totalCutNeeded = cutLength * cutQty + kerf * cutQty;
    let createdDrop = false;
    let remnantLength = 0;

    // If full bar exists, deduct 1 bar and compute remnant offcut
    if (item.fullStockQty > 0) {
      item.fullStockQty -= 1;
      remnantLength = Math.max(0, item.length - totalCutNeeded);

      if (autoSaveOffcut && remnantLength >= 4.0) {
        createdDrop = true;
        const newOffcut: Offcut = {
          id: 'oc-' + Date.now(),
          length: Number(remnantLength.toFixed(2)),
          quantity: 1,
          location: `Drop ${item.rackLocation}`,
          jobRef: jobId,
          dateCreated: new Date().toISOString().split('T')[0]
        };
        item.offcuts = item.offcuts || [];
        item.offcuts.push(newOffcut);
      }
    }

    addCutLog({
      stockItemId: item.id,
      materialName: item.name,
      cutLength,
      cutQuantity: cutQty,
      kerf,
      jobId,
      machinist,
      createdOffcut: createdDrop,
      offcutLength: createdDrop ? Number(remnantLength.toFixed(2)) : undefined
    });

    saveStock(stockItems);
    cutModal?.classList.add('hidden');
    showToast(`Logged cut for ${item.name} (${cutQty}x ${cutLength}")`, 'success');
    renderApp();
  });
}

function updateDynamicDimensionsUI(shape: string) {
  const dDiameter = document.getElementById('dim-group-diameter');
  const dWidth = document.getElementById('dim-group-width');
  const dThickness = document.getElementById('dim-group-thickness');
  const dWall = document.getElementById('dim-group-wall');

  dDiameter?.classList.add('hidden');
  dWidth?.classList.add('hidden');
  dThickness?.classList.add('hidden');
  dWall?.classList.add('hidden');

  if (shape === 'round-bar' || shape === 'drill-rod') {
    dDiameter?.classList.remove('hidden');
  } else if (shape === 'flat-bar') {
    dWidth?.classList.remove('hidden');
    dThickness?.classList.remove('hidden');
  } else if (shape === 'square-bar') {
    dWidth?.classList.remove('hidden');
  } else if (shape === 'hex-bar') {
    dDiameter?.classList.remove('hidden');
  } else if (shape === 'round-tube') {
    dDiameter?.classList.remove('hidden');
    dWall?.classList.remove('hidden');
  } else if (shape === 'square-tube') {
    dWidth?.classList.remove('hidden');
    dWall?.classList.remove('hidden');
  } else if (shape === 'plate-sheet') {
    dThickness?.classList.remove('hidden');
    dWidth?.classList.remove('hidden');
  } else if (shape === 'angle-iron') {
    dWidth?.classList.remove('hidden');
    dThickness?.classList.remove('hidden');
  }
}

function openMaterialModal(id?: string) {
  const modal = document.getElementById('modal-material');
  const title = document.getElementById('modal-material-title');
  const deleteBtn = document.getElementById('modal-material-delete-btn');
  const form = document.getElementById('form-material') as HTMLFormElement;

  if (!modal || !form) return;
  form.reset();

  if (id) {
    const item = stockItems.find((s) => s.id === id);
    if (!item) return;
    if (title) title.textContent = `Edit Material: ${item.name}`;
    if (deleteBtn) deleteBtn.classList.remove('hidden');

    (document.getElementById('input-material-id') as HTMLInputElement).value = item.id;
    (document.getElementById('input-name') as HTMLInputElement).value = item.name;
    (document.getElementById('input-category') as HTMLSelectElement).value = item.category;
    (document.getElementById('input-alloy') as HTMLInputElement).value = item.alloyGrade;
    (document.getElementById('input-shape') as HTMLSelectElement).value = item.shape;
    (document.getElementById('input-sku') as HTMLInputElement).value = item.sku || '';
    (document.getElementById('input-unit') as HTMLSelectElement).value = item.unit || 'in';

    (document.getElementById('input-diameter') as HTMLInputElement).value = item.diameter ? String(item.diameter) : '';
    (document.getElementById('input-width') as HTMLInputElement).value = item.width ? String(item.width) : '';
    (document.getElementById('input-thickness') as HTMLInputElement).value = item.thickness ? String(item.thickness) : '';
    (document.getElementById('input-wall') as HTMLInputElement).value = item.wallThickness ? String(item.wallThickness) : '';
    (document.getElementById('input-length') as HTMLInputElement).value = String(item.length || 72);

    (document.getElementById('input-qty') as HTMLInputElement).value = String(item.fullStockQty);
    (document.getElementById('input-min-threshold') as HTMLInputElement).value = String(item.minThreshold);
    (document.getElementById('input-cost') as HTMLInputElement).value = String(item.costPerUnit || 0);
    (document.getElementById('input-location') as HTMLInputElement).value = item.rackLocation;
    (document.getElementById('input-status') as HTMLSelectElement).value = item.status;
    (document.getElementById('input-heat') as HTMLInputElement).value = item.heatNumber || '';
    (document.getElementById('input-supplier') as HTMLInputElement).value = item.supplier || '';
    (document.getElementById('input-job') as HTMLInputElement).value = item.allocatedJob || '';
    (document.getElementById('input-notes') as HTMLInputElement).value = item.notes || '';

    updateDynamicDimensionsUI(item.shape);
  } else {
    if (title) title.textContent = '+ Add Machine Shop Material';
    if (deleteBtn) deleteBtn.classList.add('hidden');
    (document.getElementById('input-material-id') as HTMLInputElement).value = '';
    (document.getElementById('input-length') as HTMLInputElement).value = '72';
    (document.getElementById('input-qty') as HTMLInputElement).value = '1';
    (document.getElementById('input-min-threshold') as HTMLInputElement).value = '2';
    updateDynamicDimensionsUI('round-bar');
  }

  modal.classList.remove('hidden');
}

function openToolModal(id?: string) {
  const modal = document.getElementById('modal-tool');
  const title = document.getElementById('modal-tool-title');
  const deleteBtn = document.getElementById('modal-tool-delete-btn');
  const form = document.getElementById('form-tool') as HTMLFormElement;

  if (!modal || !form) return;
  form.reset();

  if (id) {
    const tool = toolItems.find((t) => t.id === id);
    if (!tool) return;
    if (title) title.textContent = `Edit Tooling: ${tool.name}`;
    if (deleteBtn) deleteBtn.classList.remove('hidden');

    (document.getElementById('input-tool-id') as HTMLInputElement).value = tool.id;
    (document.getElementById('input-tool-name') as HTMLInputElement).value = tool.name;
    (document.getElementById('input-tool-category') as HTMLSelectElement).value = tool.category;
    (document.getElementById('input-tool-sku') as HTMLInputElement).value = tool.sku || '';
    (document.getElementById('input-tool-size') as HTMLInputElement).value = tool.sizeDiameter;
    (document.getElementById('input-tool-flutes') as HTMLInputElement).value = tool.flutes || '';
    (document.getElementById('input-tool-coating') as HTMLInputElement).value = tool.coating || '';
    (document.getElementById('input-tool-shank') as HTMLInputElement).value = tool.shankOrHolder || '';
    (document.getElementById('input-tool-insert-grade') as HTMLInputElement).value = tool.insertGrade || '';
    (document.getElementById('input-tool-location') as HTMLInputElement).value = tool.location;
    (document.getElementById('input-tool-qty') as HTMLInputElement).value = String(tool.qtyInStock);
    (document.getElementById('input-tool-min') as HTMLInputElement).value = String(tool.minThreshold);
    (document.getElementById('input-tool-cost') as HTMLInputElement).value = String(tool.costPerUnit || 0);
    (document.getElementById('input-tool-condition') as HTMLSelectElement).value = tool.condition;
    (document.getElementById('input-tool-machine') as HTMLInputElement).value = tool.assignedMachine || '';
    (document.getElementById('input-tool-supplier') as HTMLInputElement).value = tool.supplier || '';
    (document.getElementById('input-tool-notes') as HTMLInputElement).value = tool.notes || '';
  } else {
    if (title) title.textContent = '+ Add Tooling / Cutter';
    if (deleteBtn) deleteBtn.classList.add('hidden');
    (document.getElementById('input-tool-id') as HTMLInputElement).value = '';
    (document.getElementById('input-tool-qty') as HTMLInputElement).value = '5';
    (document.getElementById('input-tool-min') as HTMLInputElement).value = '2';
  }

  modal.classList.remove('hidden');
}

function openPartModal(id?: string) {
  const modal = document.getElementById('modal-part');
  const title = document.getElementById('modal-part-title');
  const deleteBtn = document.getElementById('modal-part-delete-btn');
  const form = document.getElementById('form-part') as HTMLFormElement;

  if (!modal || !form) return;
  form.reset();

  if (id) {
    const part = machinePartItems.find((p) => p.id === id);
    if (!part) return;
    if (title) title.textContent = `Edit Spare Part: ${part.name}`;
    if (deleteBtn) deleteBtn.classList.remove('hidden');

    (document.getElementById('input-part-id') as HTMLInputElement).value = part.id;
    (document.getElementById('input-part-name') as HTMLInputElement).value = part.name;
    (document.getElementById('input-part-machine') as HTMLInputElement).value = part.machineName;
    (document.getElementById('input-part-number') as HTMLInputElement).value = part.partNumber;
    (document.getElementById('input-part-category') as HTMLSelectElement).value = part.category;
    (document.getElementById('input-part-criticality') as HTMLSelectElement).value = part.criticality;
    (document.getElementById('input-part-location') as HTMLInputElement).value = part.location;
    (document.getElementById('input-part-qty') as HTMLInputElement).value = String(part.qtyInStock);
    (document.getElementById('input-part-min') as HTMLInputElement).value = String(part.minThreshold);
    (document.getElementById('input-part-cost') as HTMLInputElement).value = String(part.costPerUnit || 0);
    (document.getElementById('input-part-brand') as HTMLInputElement).value = part.oemBrand || '';
    (document.getElementById('input-part-supplier') as HTMLInputElement).value = part.supplier || '';
    (document.getElementById('input-part-notes') as HTMLInputElement).value = part.serviceIntervalNotes || '';
  } else {
    if (title) title.textContent = '+ Add Machine Spare Component';
    if (deleteBtn) deleteBtn.classList.add('hidden');
    (document.getElementById('input-part-id') as HTMLInputElement).value = '';
    (document.getElementById('input-part-qty') as HTMLInputElement).value = '2';
    (document.getElementById('input-part-min') as HTMLInputElement).value = '1';
  }

  modal.classList.remove('hidden');
}

function openCutModal(stockId?: string) {
  const modal = document.getElementById('modal-cut');
  const select = document.getElementById('cut-stock-select') as HTMLSelectElement;
  if (!modal || !select) return;

  select.innerHTML = stockItems
    .map(
      (s) =>
        `<option value="${s.id}" ${s.id === stockId ? 'selected' : ''}>${s.name} (${s.fullStockQty} bars @ ${s.length}") - ${s.rackLocation}</option>`
    )
    .join('');

  modal.classList.remove('hidden');
}

function openOffcutsModal(itemId: string) {
  activeOffcutItemId = itemId;
  const item = stockItems.find((s) => s.id === itemId);
  if (!item) return;

  const modal = document.getElementById('modal-offcuts');
  const title = document.getElementById('modal-offcuts-title');
  const subtitle = document.getElementById('modal-offcuts-subtitle');
  const closeBtn = document.getElementById('modal-offcuts-close');
  const form = document.getElementById('form-add-offcut') as HTMLFormElement;

  if (title) title.textContent = `Remnant Drops: ${item.name}`;
  if (subtitle) subtitle.textContent = `Base Profile: ${item.alloyGrade} • Rack: ${item.rackLocation}`;

  renderOffcutsList(item);
  modal?.classList.remove('hidden');

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'), { once: true });

  form.onsubmit = (e) => {
    e.preventDefault();
    const len = parseFloat((document.getElementById('new-offcut-length') as HTMLInputElement).value);
    const qty = parseInt((document.getElementById('new-offcut-qty') as HTMLInputElement).value, 10) || 1;
    const loc = (document.getElementById('new-offcut-loc') as HTMLInputElement).value.trim() || `Drop Bin ${item.rackLocation}`;

    if (len > 0) {
      item.offcuts = item.offcuts || [];
      item.offcuts.push({
        id: 'oc-' + Date.now(),
        length: len,
        quantity: qty,
        location: loc,
        dateCreated: new Date().toISOString().split('T')[0]
      });
      saveStock(stockItems);
      form.reset();
      renderOffcutsList(item);
      renderApp();
      showToast(`Added ${qty}x ${len}" drop to bin`, 'success');
    }
  };
}

function renderOffcutsList(item: StockItem) {
  const container = document.getElementById('offcuts-list-container');
  if (!container) return;

  const offcuts = item.offcuts || [];
  if (offcuts.length === 0) {
    container.innerHTML = `<div class="p-3 text-center text-[#717d91] bg-[#121418] rounded">No remnant pieces currently logged for this bar stock.</div>`;
    return;
  }

  container.innerHTML = offcuts
    .map(
      (oc) => `
      <div class="p-2.5 bg-[#121519] border border-[#282d36] rounded flex items-center justify-between gap-3 text-xs">
        <div>
          <div class="font-bold text-white flex items-center gap-2">
            <span class="text-amber-400 font-mono">${oc.quantity}x ${oc.length}" Piece</span>
            ${oc.location ? `<span class="text-[10px] px-1.5 py-0.2 bg-[#1e232c] text-slate-300 rounded border border-[#333a46]">${oc.location}</span>` : ''}
          </div>
          <div class="text-[10px] text-[#717d91] font-mono mt-0.5">
            <span>Logged: ${oc.dateCreated}</span>
            ${oc.jobRef ? ` • Ref: <span class="text-cyan-300">${oc.jobRef}</span>` : ''}
          </div>
        </div>

        <button 
          type="button" 
          data-action="delete-offcut" 
          data-offcut-id="${oc.id}" 
          class="btn-metal-danger p-1 rounded text-rose-400 hover:text-white" 
          title="Delete Offcut Piece"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
        </button>
      </div>
    `
    )
    .join('');
}

function openHistoryModal() {
  const modal = document.getElementById('modal-history');
  const tbody = document.getElementById('history-table-body');
  const closeBtn = document.getElementById('modal-history-close');

  if (!modal || !tbody) return;

  if (cutLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-[#717d91]">No cuts recorded in saw log yet.</td></tr>`;
  } else {
    tbody.innerHTML = cutLogs
      .map(
        (log) => `
        <tr class="hover:bg-[#181c23]">
          <td class="py-2 px-2.5 text-[#8b98ab]">${new Date(log.timestamp).toLocaleString()}</td>
          <td class="py-2 px-2.5 font-bold text-white">${log.materialName}</td>
          <td class="py-2 px-2.5 text-amber-300 font-mono">${log.cutLength}"</td>
          <td class="py-2 px-2.5 text-center font-mono">${log.cutQuantity}</td>
          <td class="py-2 px-2.5 text-cyan-300">${log.jobId}</td>
          <td class="py-2 px-2.5 text-slate-300">${log.machinist}</td>
          <td class="py-2 px-2.5">
            ${
              log.createdOffcut
                ? `<span class="text-emerald-400 font-mono">${log.offcutLength}" saved</span>`
                : `<span class="text-[#5a6578]">No Drop</span>`
            }
          </td>
        </tr>
      `
      )
      .join('');
  }

  modal.classList.remove('hidden');
  closeBtn?.addEventListener('click', () => modal.classList.add('hidden'), { once: true });
}

// =============================================================
// Tools Menu (CSV Export, Import, Reset, Print Labels)
// =============================================================
function setupToolsMenu() {
  const moreBtn = document.getElementById('btn-more-options');
  const moreMenu = document.getElementById('menu-more-options');

  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenu?.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    moreMenu?.classList.add('hidden');
  });

  // Export Active Inventory CSV
  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    if (activeTab === 'materials') {
      downloadFile(exportStockToCSV(stockItems), `machine_shop_materials_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } else if (activeTab === 'tools') {
      downloadFile(exportToolsToCSV(toolItems), `machine_shop_tools_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } else if (activeTab === 'machine-parts') {
      downloadFile(exportPartsToCSV(machinePartItems), `machine_shop_parts_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } else {
      downloadFile(exportStockToCSV(stockItems), 'shop_materials.csv', 'text/csv');
    }
    showToast('Exported inventory to CSV', 'success');
  });

  // Import Inventory CSV Modal
  const importModal = document.getElementById('modal-import');
  const importClose = document.getElementById('modal-import-close');
  const importCancel = document.getElementById('modal-import-cancel');
  const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;
  const importTextInput = document.getElementById('import-text-input') as HTMLTextAreaElement;
  const doImportBtn = document.getElementById('btn-do-import');

  document.getElementById('btn-import-csv')?.addEventListener('click', () => {
    importModal?.classList.remove('hidden');
  });

  importClose?.addEventListener('click', () => importModal?.classList.add('hidden'));
  importCancel?.addEventListener('click', () => importModal?.classList.add('hidden'));

  importFileInput?.addEventListener('change', () => {
    const file = importFileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (importTextInput && typeof e.target?.result === 'string') {
          importTextInput.value = e.target.result;
        }
      };
      reader.readAsText(file);
    }
  });

  doImportBtn?.addEventListener('click', () => {
    const text = importTextInput.value.trim();
    if (!text) {
      showToast('Please paste CSV text or select a file', 'warning');
      return;
    }
    parseAndImportCSV(text);
    importModal?.classList.add('hidden');
  });

  // Reset Demo Stock
  document.getElementById('btn-reset-demo')?.addEventListener('click', async () => {
    const confirmed = await confirmDelete(
      'Reset all stock, tools, and machine parts back to initial factory demo dataset?',
      'Reset Shop Inventory'
    );
    if (confirmed) {
      const res = resetToSampleStock();
      stockItems = res.stock;
      toolItems = res.tools;
      machinePartItems = res.parts;
      selectedIds.clear();
      showToast('Factory demo stock & tooling restored', 'success');
      renderApp();
    }
  });

  // Print Labels
  document.getElementById('btn-print-labels')?.addEventListener('click', () => {
    printInventoryLabels();
  });
}

function parseAndImportCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) {
    showToast('CSV file is empty or missing data rows', 'warning');
    return;
  }

  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length >= 4) {
      if (activeTab === 'tools') {
        toolItems.unshift({
          id: 'tool-imp-' + Date.now() + '-' + i,
          sku: cols[0] || `TOOL-IMP-${i}`,
          name: cols[1] || 'Imported Tool',
          category: (cols[2] as any) || 'end-mill',
          toolType: cols[3] || 'Milling Tool',
          sizeDiameter: cols[4] || '0.500"',
          location: cols[9] || 'Tool Crib',
          qtyInStock: parseInt(cols[10], 10) || 1,
          minThreshold: parseInt(cols[11], 10) || 1,
          costPerUnit: parseFloat(cols[12]) || 0,
          condition: 'new',
          lastUpdated: new Date().toISOString().split('T')[0]
        });
        importedCount++;
      } else if (activeTab === 'machine-parts') {
        machinePartItems.unshift({
          id: 'part-imp-' + Date.now() + '-' + i,
          partNumber: cols[0] || `PN-${i}`,
          name: cols[1] || 'Imported Machine Part',
          machineName: cols[2] || 'Machine Asset',
          category: (cols[3] as any) || 'belts-pulleys',
          criticality: (cols[4] as any) || 'standard',
          location: cols[5] || 'Maintenance Rack',
          qtyInStock: parseInt(cols[6], 10) || 1,
          minThreshold: parseInt(cols[7], 10) || 1,
          costPerUnit: parseFloat(cols[8]) || 0,
          lastUpdated: new Date().toISOString().split('T')[0]
        });
        importedCount++;
      } else {
        stockItems.unshift({
          id: 'stk-imp-' + Date.now() + '-' + i,
          sku: cols[0] || `SKU-IMP-${i}`,
          name: cols[1] || 'Imported Material',
          category: (cols[2] as any) || 'aluminum',
          alloyGrade: cols[3] || '6061-T6',
          shape: (cols[4] as any) || 'round-bar',
          length: 72,
          unit: 'in',
          fullStockQty: parseInt(cols[7], 10) || 1,
          minThreshold: parseInt(cols[8], 10) || 1,
          rackLocation: cols[10] || 'Main Rack',
          status: 'in-stock',
          costPerUnit: parseFloat(cols[14]) || 0,
          offcuts: [],
          lastUpdated: new Date().toISOString().split('T')[0]
        });
        importedCount++;
      }
    }
  }

  if (activeTab === 'tools') saveTools(toolItems);
  else if (activeTab === 'machine-parts') saveMachineParts(machinePartItems);
  else saveStock(stockItems);

  showToast(`Successfully imported ${importedCount} items`, 'success');
  renderApp();
}

function printInventoryLabels() {
  const container = document.getElementById('print-labels-container');
  if (!container) return;

  const itemsToPrint = stockItems.slice(0, 12);
  container.innerHTML = `
    <div style="font-family: monospace; padding: 20px;">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 2px solid black; padding-bottom: 5px;">
        MACHINE SHOP STOCK & TOOLING BIN LABELS
      </h1>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        ${itemsToPrint
          .map(
            (item) => `
          <div style="border: 2px solid black; padding: 12px; border-radius: 4px; page-break-inside: avoid;">
            <div style="font-size: 14px; font-weight: bold;">${item.name}</div>
            <div style="font-size: 11px; margin-top: 4px;">SKU: <strong>${item.sku}</strong> | ALLOY: <strong>${item.alloyGrade}</strong></div>
            <div style="font-size: 11px; margin-top: 2px;">LOCATION: <strong>${item.rackLocation}</strong></div>
            ${item.heatNumber ? `<div style="font-size: 10px; margin-top: 2px;">HEAT/LOT: ${item.heatNumber}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  window.print();
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
