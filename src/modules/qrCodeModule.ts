import QRCode from 'qrcode';
import { StockItem, ToolItem, MachinePartItem } from '../types';
import { formatDimensions, getCategoryBadge, getStatusBadge, getShapeLabel, getToolCategoryBadge, getPartCategoryBadge, saveStock, saveTools, saveMachineParts } from '../storage';
import { showToast } from './toast';
import jsQR from 'jsqr';

export interface InventoryBundle {
  stock: StockItem[];
  tools: ToolItem[];
  parts: MachinePartItem[];
}

/**
 * Generate full scan URL that encodes the item ID into query param and hash
 */
export function generateScanUrl(itemId: string, domain: 'material' | 'tool' | 'part'): string {
  const url = new URL(window.location.href);
  url.searchParams.set('item', itemId);
  url.searchParams.set('domain', domain);
  url.hash = `item=${itemId}`;
  return url.toString();
}

/**
 * Generate QR code data URL (PNG)
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
}

/**
 * Open QR Label Modal for generating, displaying, downloading, and printing asset tags
 */
export async function openQrModal(
  item: StockItem | ToolItem | MachinePartItem,
  domain: 'material' | 'tool' | 'part'
) {
  let modal = document.getElementById('modal-qr-label');
  if (!modal) {
    createQrLabelModalDom();
    modal = document.getElementById('modal-qr-label')!;
  }

  const scanUrl = generateScanUrl(item.id, domain);
  let qrDataUrl = '';
  try {
    qrDataUrl = await generateQrDataUrl(scanUrl);
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    showToast('Failed to generate QR matrix', 'danger');
    return;
  }

  // Populate info
  const titleEl = document.getElementById('qr-modal-item-name');
  const skuEl = document.getElementById('qr-modal-item-sku');
  const locEl = document.getElementById('qr-modal-item-location');
  const specEl = document.getElementById('qr-modal-item-specs');
  const imgEl = document.getElementById('qr-modal-image') as HTMLImageElement;
  const linkInput = document.getElementById('qr-modal-url-input') as HTMLInputElement;
  const printBtn = document.getElementById('qr-modal-print-btn');
  const downloadBtn = document.getElementById('qr-modal-download-btn');
  const copyBtn = document.getElementById('qr-modal-copy-btn');
  const testScanBtn = document.getElementById('qr-modal-test-scan-btn');

  if (titleEl) titleEl.textContent = item.name;

  let skuText = '';
  let locationText = '';
  let specText = '';

  if (domain === 'material') {
    const s = item as StockItem;
    skuText = `SKU: ${s.sku || 'N/A'} • Alloy: ${s.alloyGrade}`;
    locationText = `Rack: ${s.rackLocation}`;
    specText = `${formatDimensions(s)} (${getShapeLabel(s.shape)}) • In Stock: ${s.fullStockQty} Bars`;
  } else if (domain === 'tool') {
    const t = item as ToolItem;
    skuText = `SKU: ${t.sku || 'N/A'} • Type: ${t.toolType}`;
    locationText = `Crib: ${t.location}`;
    specText = `Size: ${t.sizeDiameter} • Holder: ${t.shankOrHolder || 'Standard'} • Qty: ${t.qtyInStock}`;
  } else if (domain === 'part') {
    const p = item as MachinePartItem;
    skuText = `Part #: ${p.partNumber} • OEM: ${p.oemBrand || 'Standard'}`;
    locationText = `Bin: ${p.location}`;
    specText = `Asset: ${p.machineName} • Qty: ${p.qtyInStock}`;
  }

  if (skuEl) skuEl.textContent = skuText;
  if (locEl) locEl.textContent = locationText;
  if (specEl) specEl.textContent = specText;
  if (imgEl) imgEl.src = qrDataUrl;
  if (linkInput) linkInput.value = scanUrl;

  // Button actions
  if (copyBtn) {
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(scanUrl);
        showToast('Scan URL copied to clipboard!', 'success');
      } catch {
        linkInput.select();
        document.execCommand('copy');
        showToast('Scan URL copied!', 'success');
      }
    };
  }

  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `QR_${item.name.replace(/[^a-zA-Z0-9]/g, '_')}_${item.id}.png`;
      a.click();
      showToast('QR Code image downloaded', 'success');
    };
  }

  if (printBtn) {
    printBtn.onclick = () => {
      printAssetTag(item, domain, qrDataUrl);
    };
  }

  if (testScanBtn) {
    testScanBtn.onclick = () => {
      modal?.classList.add('hidden');
      openScanDetailsModal(item.id, (window as any).__inventoryBundle, (window as any).__onInventoryRefresh);
    };
  }

  modal.classList.remove('hidden');
}

/**
 * Print individual asset tag formatted for thermal label or paper
 */
function printAssetTag(item: StockItem | ToolItem | MachinePartItem, domain: string, qrDataUrl: string) {
  let subHeader = '';
  let loc = '';
  let specs = '';
  let barcodeNum = '';

  if (domain === 'material') {
    const s = item as StockItem;
    subHeader = `ALLOY: ${s.alloyGrade} | ${s.shape.toUpperCase()}`;
    loc = `RACK LOCATION: ${s.rackLocation}`;
    specs = `DIMENSIONS: ${formatDimensions(s)} | FULL BARS: ${s.fullStockQty}`;
    barcodeNum = s.sku || s.id;
  } else if (domain === 'tool') {
    const t = item as ToolItem;
    subHeader = `TOOL TYPE: ${t.toolType} | ${t.coating || 'Standard'}`;
    loc = `CRIB LOCATION: ${t.location}`;
    specs = `SIZE: ${t.sizeDiameter} | SHANK: ${t.shankOrHolder || 'Std'} | QTY: ${t.qtyInStock}`;
    barcodeNum = t.sku || t.id;
  } else if (domain === 'part') {
    const p = item as MachinePartItem;
    subHeader = `MACHINE: ${p.machineName} | OEM: ${p.oemBrand || 'Std'}`;
    loc = `STORAGE BIN: ${p.location}`;
    specs = `PART #: ${p.partNumber} | QTY: ${p.qtyInStock}`;
    barcodeNum = p.partNumber || p.id;
  }

  const printWindow = window.open('', '_blank', 'width=550,height=600');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Asset Tag - ${item.name}</title>
        <style>
          @page {
            size: auto;
            margin: 5mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
            color: #000;
            background: #fff;
            padding: 10px;
            margin: 0;
          }
          .tag-container {
            border: 2.5px solid #000;
            border-radius: 6px;
            padding: 12px;
            max-width: 420px;
            background: #fff;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .shop-title {
            font-weight: 900;
            font-size: 14px;
            letter-spacing: 0.5px;
          }
          .domain-badge {
            background: #000;
            color: #fff;
            font-weight: bold;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
          }
          .item-name {
            font-size: 16px;
            font-weight: 800;
            line-height: 1.2;
            margin: 4px 0;
          }
          .sub-header {
            font-size: 11px;
            font-weight: bold;
            color: #333;
            margin-bottom: 8px;
          }
          .content-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 6px;
          }
          .qr-img {
            width: 110px;
            height: 110px;
            border: 1px solid #ddd;
            padding: 2px;
            flex-shrink: 0;
          }
          .details-col {
            flex-grow: 1;
            font-size: 11px;
            line-height: 1.4;
          }
          .loc-highlight {
            background: #eee;
            border: 1px solid #999;
            padding: 4px 6px;
            font-weight: 900;
            font-size: 12px;
            margin-bottom: 6px;
            border-radius: 3px;
          }
          .footer-note {
            font-size: 9px;
            color: #555;
            margin-top: 8px;
            text-align: center;
            border-top: 1px dashed #aaa;
            padding-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="tag-container">
          <div class="header-row">
            <span class="shop-title">⚙ MACHINE SHOP ASSET TAG</span>
            <span class="domain-badge">${domain.toUpperCase()}</span>
          </div>

          <div class="item-name">${item.name}</div>
          <div class="sub-header">${subHeader}</div>

          <div class="content-row">
            <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
            <div class="details-col">
              <div class="loc-highlight">${loc}</div>
              <div>${specs}</div>
              <div style="margin-top: 4px; font-weight: bold; font-family: monospace;">TAG ID: ${barcodeNum}</div>
            </div>
          </div>

          <div class="footer-note">
            Scan QR code with any mobile camera to view live shop specs, location beacon, & inventory balance.
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Create QR Label Modal DOM element if not present
 */
function createQrLabelModalDom() {
  const modalDiv = document.createElement('div');
  modalDiv.id = 'modal-qr-label';
  modalDiv.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs hidden';
  modalDiv.innerHTML = `
    <div class="metal-panel-dense rounded-lg border border-[#3b4250] shadow-2xl max-w-md w-full overflow-hidden text-white animate-in fade-in zoom-in duration-150">
      
      <!-- Modal Header -->
      <div class="p-3.5 border-b border-[#282d36] flex items-center justify-between bg-[#121519]">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-xs">
            QR
          </div>
          <h3 class="font-bold text-sm text-white tracking-tight">Shop Asset Tag & Mobile QR</h3>
        </div>
        <button type="button" id="modal-qr-label-close" class="text-[#8b98ab] hover:text-white p-1 rounded hover:bg-[#20252e]">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-4 space-y-4 font-mono text-xs">
        
        <!-- Live Tag Preview Card -->
        <div class="bg-white text-black p-3.5 rounded border-2 border-slate-900 shadow-md">
          <div class="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
            <span class="font-black text-[11px] tracking-wide">⚙ SHOP ASSET MATRIX</span>
            <span class="text-[9px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-bold uppercase">PHYSICAL TAG</span>
          </div>

          <div class="flex items-start gap-3">
            <!-- QR Display -->
            <div class="bg-white p-1 rounded border border-slate-300 shrink-0">
              <img id="qr-modal-image" src="" alt="Item QR" class="w-28 h-28 object-contain" />
            </div>

            <!-- Item Text -->
            <div class="flex-1 min-w-0 space-y-1">
              <div id="qr-modal-item-name" class="font-black text-xs text-slate-950 leading-snug line-clamp-2"></div>
              <div id="qr-modal-item-sku" class="text-[10px] text-slate-700 font-bold"></div>
              <div class="bg-slate-100 border border-slate-300 rounded p-1 text-[10px] font-bold text-slate-900" id="qr-modal-item-location"></div>
              <div id="qr-modal-item-specs" class="text-[10px] text-slate-600 line-clamp-2"></div>
            </div>
          </div>
          <div class="text-[9px] text-slate-500 mt-2 text-center border-t border-slate-200 pt-1">
            Point phone camera at code to open mobile spec sheet & live inventory controls.
          </div>
        </div>

        <!-- Scan Direct Link -->
        <div>
          <label class="block text-[11px] text-[#8b98ab] mb-1">Direct Mobile Scan URL:</label>
          <div class="flex items-center gap-1.5">
            <input type="text" id="qr-modal-url-input" readonly class="flex-1 px-2.5 py-1.5 bg-[#0f1216] border border-[#2d323b] rounded text-[#cbd5e1] text-[11px] font-mono select-all" />
            <button type="button" id="qr-modal-copy-btn" class="btn-metal px-2.5 py-1.5 rounded font-bold text-xs" title="Copy Link">Copy</button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-3 gap-2 pt-1">
          <button type="button" id="qr-modal-print-btn" class="btn-metal-blue py-2 px-2 rounded font-bold text-xs flex items-center justify-center gap-1">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            <span>Print Tag</span>
          </button>

          <button type="button" id="qr-modal-download-btn" class="btn-metal py-2 px-2 rounded font-bold text-xs flex items-center justify-center gap-1 text-slate-200">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>PNG</span>
          </button>

          <button type="button" id="qr-modal-test-scan-btn" class="btn-metal py-2 px-2 rounded font-bold text-xs flex items-center justify-center gap-1 text-amber-300 hover:text-white" title="Simulate Phone Scan">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M12 2v20"/></svg>
            <span>Test View</span>
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  document.getElementById('modal-qr-label-close')?.addEventListener('click', () => {
    modalDiv.classList.add('hidden');
  });
}

/**
 * Mobile-Optimized Scan & Spec Sheet Modal that opens when a phone scans the QR code
 */
export function openScanDetailsModal(
  itemId: string,
  bundle: InventoryBundle,
  onUpdate: () => void
) {
  let itemData: StockItem | ToolItem | MachinePartItem | null = null;
  let domain: 'material' | 'tool' | 'part' = 'material';

  // Search stock materials
  const mat = (bundle.stock || []).find((s) => s.id === itemId);
  if (mat) {
    itemData = mat;
    domain = 'material';
  } else {
    // Search tools
    const tool = (bundle.tools || []).find((t) => t.id === itemId);
    if (tool) {
      itemData = tool;
      domain = 'tool';
    } else {
      // Search parts
      const part = (bundle.parts || []).find((p) => p.id === itemId);
      if (part) {
        itemData = part;
        domain = 'part';
      }
    }
  }

  if (!itemData) {
    showToast(`Scanned item #${itemId} not found in database`, 'warning');
    return;
  }

  let modal = document.getElementById('modal-mobile-scan-details');
  if (!modal) {
    createMobileScanDetailsModalDom();
    modal = document.getElementById('modal-mobile-scan-details')!;
  }

  renderMobileScanModalContent(itemData, domain, bundle, onUpdate);
  modal.classList.remove('hidden');
}

/**
 * Render inner content of Mobile Scan Spec Sheet modal
 */
function renderMobileScanModalContent(
  item: StockItem | ToolItem | MachinePartItem,
  domain: 'material' | 'tool' | 'part',
  bundle: InventoryBundle,
  onUpdate: () => void
) {
  const container = document.getElementById('mobile-scan-content-container');
  if (!container) return;

  const closeBtn = document.getElementById('modal-mobile-scan-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById('modal-mobile-scan-details')?.classList.add('hidden');
      // Clean query parameter from URL without page reload
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    };
  }

  let domainBadge = '';
  let statusBadgeHtml = '';
  let locationTitle = '';
  let qtyValue = 0;
  let minThresh = 0;
  let specsRowsHtml = '';

  if (domain === 'material') {
    const s = item as StockItem;
    domainBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-700/60">RAW STOCK MATERIAL</span>`;
    const sb = getStatusBadge(s.status);
    statusBadgeHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${sb.bg} ${sb.text} border ${sb.border}">${sb.label}</span>`;
    locationTitle = s.rackLocation;
    qtyValue = s.fullStockQty;
    minThresh = s.minThreshold;

    const totalDrops = (s.offcuts || []).reduce((acc, o) => acc + o.quantity, 0);

    specsRowsHtml = `
      <div class="grid grid-cols-2 gap-2 text-xs font-mono">
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Alloy & Grade</div>
          <div class="text-white font-bold text-sm">${s.alloyGrade}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Shape Profile</div>
          <div class="text-white font-bold text-sm">${getShapeLabel(s.shape)}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2 col-span-2">
          <div class="text-[10px] text-[#717d91]">Dimensions & Standard Length</div>
          <div class="text-amber-300 font-bold text-sm">${formatDimensions(s)}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Heat / MTR Lot #</div>
          <div class="text-slate-300">${s.heatNumber || 'Standard Stock'}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Job Allocation</div>
          <div class="text-cyan-300 font-bold">${s.allocatedJob || 'Unassigned / Open'}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Remnant Drops</div>
          <div class="text-amber-400 font-bold">${totalDrops} offcuts in bin</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Unit Value</div>
          <div class="text-emerald-400 font-bold">$${(s.costPerUnit || 0).toFixed(2)}/ea</div>
        </div>
      </div>
    `;
  } else if (domain === 'tool') {
    const t = item as ToolItem;
    domainBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700/60">TOOLING & CUTTER</span>`;
    const sb = getStatusBadge(t.condition);
    statusBadgeHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${sb.bg} ${sb.text} border ${sb.border}">${sb.label}</span>`;
    locationTitle = t.location;
    qtyValue = t.qtyInStock;
    minThresh = t.minThreshold;

    specsRowsHtml = `
      <div class="grid grid-cols-2 gap-2 text-xs font-mono">
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Tool Type</div>
          <div class="text-white font-bold text-sm">${t.toolType}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Diameter / Cut Size</div>
          <div class="text-amber-300 font-bold text-sm">${t.sizeDiameter}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Geometry / Flutes</div>
          <div class="text-slate-200">${t.flutes || 'Standard'}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">PVD/CVD Coating</div>
          <div class="text-cyan-300 font-bold">${t.coating || 'Uncoated'}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Holder / Shank</div>
          <div class="text-slate-300">${t.shankOrHolder || 'Straight Shank'}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Target Machine</div>
          <div class="text-indigo-300 font-bold">${t.assignedMachine || 'General Shop'}</div>
        </div>
      </div>
    `;
  } else if (domain === 'part') {
    const p = item as MachinePartItem;
    domainBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">MACHINE SPARE PART</span>`;
    const sb = getStatusBadge(p.criticality);
    statusBadgeHtml = `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${sb.bg} ${sb.text} border ${sb.border}">${sb.label}</span>`;
    locationTitle = p.location;
    qtyValue = p.qtyInStock;
    minThresh = p.minThreshold;

    specsRowsHtml = `
      <div class="grid grid-cols-2 gap-2 text-xs font-mono">
        <div class="bg-[#101317] border border-[#282d36] rounded p-2 col-span-2">
          <div class="text-[10px] text-[#717d91]">Assigned Machine Asset</div>
          <div class="text-blue-300 font-bold text-sm">${p.machineName}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">OEM / Manufacturer</div>
          <div class="text-slate-200">${p.oemBrand || 'OEM'}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2">
          <div class="text-[10px] text-[#717d91]">Part Number</div>
          <div class="text-white font-bold">${p.partNumber}</div>
        </div>
        <div class="bg-[#101317] border border-[#282d36] rounded p-2 col-span-2">
          <div class="text-[10px] text-[#717d91]">Service / Maintenance Interval Notes</div>
          <div class="text-slate-300">${p.serviceIntervalNotes || 'Scheduled preventative maintenance replacement.'}</div>
        </div>
      </div>
    `;
  }

  const isLow = qtyValue <= minThresh;

  container.innerHTML = `
    <!-- Top Identity Card -->
    <div class="bg-[#121519] border border-[#282d36] rounded-lg p-3.5 space-y-2">
      <div class="flex items-center justify-between gap-2">
        ${domainBadge}
        ${statusBadgeHtml}
      </div>

      <h2 class="text-lg font-extrabold text-white tracking-tight">${item.name}</h2>
      
      <div class="text-xs text-[#8b98ab] font-mono">
        <span>SKU / ID: <strong class="text-[#cbd5e1]">${(item as any).sku || (item as any).partNumber || item.id}</strong></span>
      </div>
    </div>

    <!-- Location Beacon (Crucial for physical search) -->
    <div class="bg-gradient-to-r from-blue-950/80 to-slate-900 border-2 border-blue-500/70 rounded-lg p-3.5 flex items-center gap-3 shadow-lg">
      <div class="w-10 h-10 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center text-blue-300 shrink-0">
        <svg class="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="flex-1">
        <div class="text-[11px] font-mono text-blue-300 font-bold uppercase tracking-wider">Current Physical Shop Location</div>
        <div class="text-base font-black text-white font-mono tracking-tight">${locationTitle}</div>
      </div>
    </div>

    <!-- Live Quantity & Mobile Fast-Adjustment -->
    <div class="bg-[#121519] border border-[#282d36] rounded-lg p-3.5 flex items-center justify-between">
      <div>
        <div class="text-[11px] text-[#8b98ab] font-mono uppercase">Physical On-Hand Quantity</div>
        <div class="text-2xl font-black font-mono ${isLow ? 'text-rose-400' : 'text-white'}">
          <span id="scan-modal-live-qty">${qtyValue}</span>
          <span class="text-xs font-normal text-[#8b98ab] ml-1">${domain === 'material' ? 'bars' : 'units'}</span>
        </div>
        ${isLow ? `<div class="text-[10px] text-rose-400 font-mono font-bold">Alert: Below reorder threshold (${minThresh})</div>` : ''}
      </div>

      <!-- Quick mobile tap controls -->
      <div class="flex items-center gap-2 font-mono">
        <button 
          type="button" 
          id="btn-scan-dec-qty"
          class="btn-metal w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg text-white active:scale-95"
        >−</button>
        <button 
          type="button" 
          id="btn-scan-inc-qty"
          class="btn-metal-blue w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg text-white shadow-md active:scale-95"
        >+</button>
      </div>
    </div>

    <!-- Technical Specs Matrix -->
    <div class="space-y-1.5">
      <div class="text-[11px] font-mono text-[#8b98ab] uppercase font-bold">Item Specifications</div>
      ${specsRowsHtml}
    </div>

    <!-- Mobile Quick Actions -->
    <div class="pt-2 border-t border-[#282d36] flex flex-wrap items-center gap-2 font-mono">
      <button 
        type="button" 
        id="btn-scan-mark-audit" 
        class="flex-1 btn-metal-blue py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Mark Cycle Verified</span>
      </button>

      <button 
        type="button" 
        id="btn-scan-reprint-qr" 
        class="btn-metal py-2 px-3 rounded text-xs font-bold text-slate-300 flex items-center gap-1"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="6" height="6" x="3" y="3" rx="1"/><rect width="6" height="6" x="15" y="3" rx="1"/><rect width="6" height="6" x="3" y="15" rx="1"/></svg>
        <span>Tag Label</span>
      </button>
    </div>
  `;

  // Attach button events
  const decBtn = document.getElementById('btn-scan-dec-qty');
  const incBtn = document.getElementById('btn-scan-inc-qty');
  const auditBtn = document.getElementById('btn-scan-mark-audit');
  const tagBtn = document.getElementById('btn-scan-reprint-qr');

  if (decBtn) {
    decBtn.onclick = () => {
      adjustItemQtyInScan(item, domain, -1, bundle, onUpdate);
    };
  }

  if (incBtn) {
    incBtn.onclick = () => {
      adjustItemQtyInScan(item, domain, 1, bundle, onUpdate);
    };
  }

  if (auditBtn) {
    auditBtn.onclick = () => {
      const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      item.lastCounted = stamp;
      if (domain === 'material') saveStock(bundle.stock);
      else if (domain === 'tool') saveTools(bundle.tools);
      else if (domain === 'part') saveMachineParts(bundle.parts);
      onUpdate();
      showToast(`Verified item in stock at ${stamp}`, 'success');
      auditBtn.innerHTML = `✓ Verified (${stamp})`;
      auditBtn.className = 'flex-1 btn-metal py-2 px-3 rounded text-xs font-bold text-emerald-400 border-emerald-600/50';
    };
  }

  if (tagBtn) {
    tagBtn.onclick = () => {
      document.getElementById('modal-mobile-scan-details')?.classList.add('hidden');
      openQrModal(item, domain);
    };
  }
}

function adjustItemQtyInScan(
  item: StockItem | ToolItem | MachinePartItem,
  domain: 'material' | 'tool' | 'part',
  delta: number,
  bundle: InventoryBundle,
  onUpdate: () => void
) {
  let newQty = 0;
  if (domain === 'material') {
    const s = item as StockItem;
    s.fullStockQty = Math.max(0, s.fullStockQty + delta);
    newQty = s.fullStockQty;
    saveStock(bundle.stock);
  } else if (domain === 'tool') {
    const t = item as ToolItem;
    t.qtyInStock = Math.max(0, t.qtyInStock + delta);
    newQty = t.qtyInStock;
    saveTools(bundle.tools);
  } else if (domain === 'part') {
    const p = item as MachinePartItem;
    p.qtyInStock = Math.max(0, p.qtyInStock + delta);
    newQty = p.qtyInStock;
    saveMachineParts(bundle.parts);
  }

  const liveEl = document.getElementById('scan-modal-live-qty');
  if (liveEl) liveEl.textContent = String(newQty);

  onUpdate();
  showToast(`Updated stock balance to ${newQty}`, 'info');
}

/**
 * Create Mobile Scan Details Modal DOM
 */
function createMobileScanDetailsModalDom() {
  const modalDiv = document.createElement('div');
  modalDiv.id = 'modal-mobile-scan-details';
  modalDiv.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm hidden overflow-y-auto';
  modalDiv.innerHTML = `
    <div class="metal-panel-dense rounded-lg border border-[#3b4250] shadow-2xl max-w-lg w-full overflow-hidden text-white my-auto animate-in fade-in zoom-in duration-150">
      
      <!-- Modal Header -->
      <div class="p-3.5 border-b border-[#282d36] flex items-center justify-between bg-[#121519]">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center text-white font-mono font-bold text-xs">
            ✓
          </div>
          <h3 class="font-bold text-sm text-white tracking-tight">Mobile Shop Scanner • Item Specs</h3>
        </div>
        <button type="button" id="modal-mobile-scan-close" class="text-[#8b98ab] hover:text-white p-1 rounded hover:bg-[#20252e]">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div id="mobile-scan-content-container" class="p-4 space-y-4 max-h-[80vh] overflow-y-auto"></div>
    </div>
  `;

  document.body.appendChild(modalDiv);
}

/**
 * Check if the URL contains an item query or hash param (e.g. from scanning a QR code)
 */
export function checkUrlForScanParam(bundle: InventoryBundle, onUpdate: () => void): boolean {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    let itemId = urlParams.get('item') || urlParams.get('scan');

    if (!itemId && window.location.hash) {
      const hashMatch = window.location.hash.match(/item=([^&]+)/);
      if (hashMatch) itemId = hashMatch[1];
    }

    if (itemId) {
      setTimeout(() => {
        openScanDetailsModal(itemId!, bundle, onUpdate);
      }, 100);
      return true;
    }
  } catch (err) {
    console.error('Error checking scan URL param:', err);
  }
  return false;
}

/**
 * In-App Camera QR Scanner Modal
 */
export function openCameraScannerModal(bundle: InventoryBundle, onUpdate: () => void) {
  let modal = document.getElementById('modal-camera-scanner');
  if (!modal) {
    createCameraScannerModalDom();
    modal = document.getElementById('modal-camera-scanner')!;
  }

  modal.classList.remove('hidden');

  const video = document.getElementById('qr-scanner-video') as HTMLVideoElement;
  const canvas = document.getElementById('qr-scanner-canvas') as HTMLCanvasElement;
  const statusEl = document.getElementById('qr-scanner-status');
  const closeBtn = document.getElementById('modal-camera-scanner-close');
  const manualInput = document.getElementById('camera-manual-id-input') as HTMLInputElement;
  const manualBtn = document.getElementById('camera-manual-id-btn');
  const fileInput = document.getElementById('camera-file-qr-input') as HTMLInputElement;

  let stream: MediaStream | null = null;
  let scanning = true;

  const stopCamera = () => {
    scanning = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    modal?.classList.add('hidden');
  };

  if (closeBtn) closeBtn.onclick = stopCamera;

  // Manual ID lookup fallback
  if (manualBtn) {
    manualBtn.onclick = () => {
      const id = manualInput.value.trim();
      if (id) {
        stopCamera();
        openScanDetailsModal(id, bundle, onUpdate);
      }
    };
  }

  // File Upload scan
  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              const detected = parseScanResultToId(code.data);
              stopCamera();
              showToast(`Scanned QR Code successfully!`, 'success');
              openScanDetailsModal(detected, bundle, onUpdate);
            } else {
              showToast('No QR code detected in uploaded image', 'warning');
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
  }

  // Start live webcam feed
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    if (statusEl) statusEl.textContent = 'Starting camera feed...';

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((mediaStream) => {
        stream = mediaStream;
        video.srcObject = mediaStream;
        video.setAttribute('playsinline', 'true');
        video.play();
        requestAnimationFrame(tick);
      })
      .catch((err) => {
        console.warn('Camera access denied or unavailable:', err);
        if (statusEl) statusEl.textContent = 'Camera not available. Upload photo or enter Tag ID below.';
      });
  } else {
    if (statusEl) statusEl.textContent = 'Camera API not supported on this browser. Use manual lookup below.';
  }

  function tick() {
    if (!scanning) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          const detected = parseScanResultToId(code.data);
          stopCamera();
          showToast(`QR Code matched item!`, 'success');
          openScanDetailsModal(detected, bundle, onUpdate);
          return;
        }
      }
    }
    requestAnimationFrame(tick);
  }
}

function parseScanResultToId(data: string): string {
  try {
    if (data.includes('item=')) {
      const match = data.match(/item=([^&]+)/);
      if (match) return match[1];
    }
    if (data.includes('scan=')) {
      const match = data.match(/scan=([^&]+)/);
      if (match) return match[1];
    }
  } catch {}
  return data.trim();
}

function createCameraScannerModalDom() {
  const modalDiv = document.createElement('div');
  modalDiv.id = 'modal-camera-scanner';
  modalDiv.className = 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm hidden';
  modalDiv.innerHTML = `
    <div class="metal-panel-dense rounded-lg border border-[#3b4250] shadow-2xl max-w-md w-full overflow-hidden text-white animate-in fade-in zoom-in duration-150">
      
      <!-- Modal Header -->
      <div class="p-3.5 border-b border-[#282d36] flex items-center justify-between bg-[#121519]">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-xs">
            📷
          </div>
          <h3 class="font-bold text-sm text-white tracking-tight">Scan Shop QR Code</h3>
        </div>
        <button type="button" id="modal-camera-scanner-close" class="text-[#8b98ab] hover:text-white p-1 rounded hover:bg-[#20252e]">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-4 space-y-4 font-mono text-xs">
        
        <!-- Video Viewfinder Frame -->
        <div class="relative bg-black rounded-lg overflow-hidden border-2 border-blue-500/60 aspect-square max-h-64 flex items-center justify-center">
          <video id="qr-scanner-video" class="w-full h-full object-cover"></video>
          <canvas id="qr-scanner-canvas" class="hidden"></canvas>
          
          <!-- Viewfinder Target Crosshairs -->
          <div class="absolute inset-8 border-2 border-dashed border-blue-400/80 rounded-lg pointer-events-none flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
          </div>

          <div id="qr-scanner-status" class="absolute bottom-2 left-2 right-2 bg-black/80 text-[10px] text-center text-blue-300 py-1 px-2 rounded">
            Align QR code within target frame...
          </div>
        </div>

        <!-- Upload Image QR Alternative -->
        <div class="bg-[#121519] border border-[#282d36] rounded p-2.5 space-y-2">
          <label class="block text-[11px] text-[#8b98ab]">Or Upload Tag Photo / Image:</label>
          <input type="file" id="camera-file-qr-input" accept="image/*" class="w-full text-[10px] text-[#8b98ab] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-mono file:bg-blue-600 file:text-white cursor-pointer" />
        </div>

        <!-- Manual ID Lookup Alternative -->
        <div class="bg-[#121519] border border-[#282d36] rounded p-2.5 space-y-1.5">
          <label class="block text-[11px] text-[#8b98ab]">Or Enter Tag ID / SKU Manually:</label>
          <div class="flex items-center gap-1.5">
            <input type="text" id="camera-manual-id-input" placeholder="e.g. stk-1, tool-1, part-1" class="flex-1 px-2.5 py-1.5 bg-[#0f1216] border border-[#2d323b] rounded text-white text-xs font-mono" />
            <button type="button" id="camera-manual-id-btn" class="btn-metal-blue px-3 py-1.5 rounded font-bold text-xs">Lookup</button>
          </div>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);
}
