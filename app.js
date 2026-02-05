// ======================================
// CONFIG: Apps Script Web App URL
// ======================================
const API_URL = "https://script.google.com/macros/s/AKfycbw75CkrBfD3kCXyhuP0axE0co7Y2zvnYQRoYocETBVwKjiNTsgj_P0Np3i-bn-ut6rJ/exec";
const FETCH_TIMEOUT_MS = 20000;

// ======================================
// FIELDS: SAMA PERSIS DENGAN HEADER SHEET "Data Device Registry"
// (termasuk typo "Onwer", "Transmital", dan "SN:")
// ======================================
const FIELDS = [
  "Item No.",
  "Job Yr",
  "Project no",
  "Job No.",
  "Job Desc.",
  "Direct Client",
  "End Client",
  "Client Contact",
  "Device Onwer (End User)",
  "Device End Location",
  "Device Model",
  "Device Type",
  "SN:",
  "Site Deployed",
  "Date Deployed",
  "Device ID",
  "Device Designation",
  "Device Capacity",
  "New / Reuse",
  "Used Capacity",
  "Data Library Location \\ Shelve",
  "Updated Data Library",
  "Checked by",
  "Sent to Client",
  "Transmital No. to Client",
  "Transmittal Date",
  "Disk - Checked Out By [Name / Date]",
  "Remarks",
  "Reuse"
];

// input type untuk tanggal
const FIELD_TYPES = {
  "Date Deployed": "date",
  "Transmittal Date": "date"
};

// ======================================
// STATE
// ======================================
let SHEET_DATA = [];
let CURRENT_QUERY = "";
let CURRENT_SORT = { key: null, dir: "asc" };
const FIELD_ID_MAP = {};

// ======================================
// Helpers
// ======================================
function $(id) { return document.getElementById(id); }

function setSyncStatus(mode, text) {
  const el = $("syncStatus");
  if (!el) return;
  el.classList.remove("ok", "err");
  if (mode === "ok") el.classList.add("ok");
  if (mode === "err") el.classList.add("err");
  el.textContent = text;
}

function setSaveStatus(text, isError = false) {
  const el = $("saveStatus");
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b00020" : "";
}

// ✅ escape HTML yang BENAR (mencegah XSS & tidak double-escape)
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return ch;
    }
  });
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/\\/g, " ")
    .replace(/[:.()[\]/]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return { ok: true, data: JSON.parse(text), raw: text };
  } catch {
    return { ok: false, data: null, raw: text };
  }
}

// ======================================
// JSONP helper (untuk bypass CORS saat GET)
// ======================================
function jsonp(url, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const cbName = "cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    const sep = url.includes("?") ? "&" : "?";
    script.src = `${url}${sep}callback=${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP load error"));
    };

    document.body.appendChild(script);
  });
}

// ======================================
// Tabs
// ======================================
function openTab(pageId, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  setTimeout(() => document.getElementById(pageId)?.classList.add("active"), 10);

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  if (pageId === "cek") loadAndRenderFromSheet();
}
window.openTab = openTab;

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => openTab(btn.dataset.tab, btn));
});

// ======================================
// Dark mode
// ======================================
const toggleDark = $("darkModeToggle");
toggleDark?.addEventListener("change", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", toggleDark.checked);
});
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
  if (toggleDark) toggleDark.checked = true;
}

// ======================================
// Build Dynamic Form & Table Head
// ======================================
function buildForm() {
  const wrap = $("dynamicFields");
  if (!wrap) return;
  wrap.innerHTML = "";

  FIELDS.forEach((label) => {
    const id = "f-" + slugify(label);
    FIELD_ID_MAP[label] = id;

    const field = document.createElement("div");
    field.className = "field";

    const lab = document.createElement("label");
    lab.setAttribute("for", id);
    lab.textContent = label;

    const inp = document.createElement("input");
    inp.id = id;
    inp.name = label;
    inp.type = FIELD_TYPES[label] || "text";
    inp.autocomplete = "off";

    field.appendChild(lab);
    field.appendChild(inp);
    wrap.appendChild(field);
  });
}

function buildTableHead() {
  const thead = $("tableHead");
  if (!thead) return;

  const tr = document.createElement("tr");

  FIELDS.forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    th.setAttribute("role", "button");
    th.setAttribute("tabindex", "0");
    th.dataset.sort = label;

    th.addEventListener("click", () => sortTableBy(label));
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") sortTableBy(label);
    });

    tr.appendChild(th);
  });

  thead.innerHTML = "";
  thead.appendChild(tr);

  // placeholder colspan
  const ph = $("placeholderRow");
  if (ph) {
    const td = ph.querySelector("td");
    if (td) td.colSpan = FIELDS.length;
  }
}

// ======================================
// API GET (JSONP) — FIX utama agar data muncul di GitHub Pages
// ======================================
async function apiGetAll() {
  const json = await jsonp(API_URL, FETCH_TIMEOUT_MS);

  if (!json || json.ok !== true) {
    throw new Error("API returned not ok (JSONP)");
  }
  if (json.data && Array.isArray(json.data)) return json.data;

  if (Array.isArray(json)) return json;
  return [];
}

// ======================================
// API POST append row (tetap fetch)
// ======================================
async function apiAppendRow(rowObj) {
  const res = await fetchWithTimeout(API_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ row: rowObj })
  });

  const parsed = await safeJson(res);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${parsed.raw?.slice(0, 200) || "Error"}`);
  if (!parsed.ok) throw new Error("Response POST bukan JSON: " + parsed.raw?.slice(0, 200));

  if (parsed.data?.ok === false) throw new Error(parsed.data?.message || "Server returned ok:false");
  return parsed.data;
}

// ======================================
// Render + Search + Sort
// ======================================
function computeView() {
  let view = [...SHEET_DATA];

  const q = (CURRENT_QUERY || "").trim().toLowerCase();
  if (q) {
    view = view.filter(row =>
      FIELDS.some(k => String(row?.[k] ?? "").toLowerCase().includes(q))
    );
  }

  if (CURRENT_SORT.key) {
    const { key, dir } = CURRENT_SORT;
    const mult = dir === "asc" ? 1 : -1;

    view.sort((a, b) => {
      const va = a?.[key] ?? "";
      const vb = b?.[key] ?? "";

      const na = Number(va);
      const nb = Number(vb);
      const bothNum =
        !Number.isNaN(na) && !Number.isNaN(nb) &&
        String(va).trim() !== "" && String(vb).trim() !== "";

      if (bothNum) return (na - nb) * mult;

      return String(va).localeCompare(String(vb), "id", { sensitivity: "base" }) * mult;
    });
  }

  return view;
}

// ===== TABLE VIEW (desktop/laptop) — UI lama TIDAK diubah =====
function renderTable(data) {
  const tbody = $("dataTable");
  const hint = $("tableHint");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${FIELDS.length}" style="opacity:0.7;">Tidak ada data.</td></tr>`;
    if (hint) hint.textContent = "";
    return;
  }

  const maxRows = 500; // performa
  const shown = data.slice(0, maxRows);

  shown.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = FIELDS.map(k => `<td>${escapeHtml(row?.[k])}</td>`).join("");
    tbody.appendChild(tr);
  });

  if (hint) {
    hint.textContent = data.length > maxRows
      ? `Menampilkan ${maxRows} dari ${data.length} baris (limit untuk performa).`
      : `Menampilkan ${data.length} baris.`;
  }
}

// ===== CARD VIEW (mobile) — baru, tidak ganggu table =====
function renderCards(data) {
  const list = $("cardList");
  if (!list) return;

  list.innerHTML = "";

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="muted" style="opacity:0.7;">Tidak ada data.</div>`;
    return;
  }

  // Summary (ringkas dulu supaya readable)
  const SUMMARY_FIELDS = [
    "Item No.",
    "Job No.",
    "Job Desc.",
    "Device Model",
    "Device Type",
    "SN:",
    "Date Deployed"
  ];
  const summarySet = new Set(SUMMARY_FIELDS);

  const maxRows = 200; // lebih ringan di HP
  const shown = data.slice(0, maxRows);

  for (const row of shown) {
    const card = document.createElement("div");
    card.className = "mobile-card";

    const summaryHtml = SUMMARY_FIELDS.map((k) => {
      const label = escapeHtml(k);
      const value = escapeHtml(row?.[k] ?? "");
      return `
        <div class="mobile-row">
          <div class="mobile-label">${label}</div>
          <div class="mobile-value">${value || "<span class='muted'>-</span>"}</div>
        </div>
      `;
    }).join("");

    const detailHtml = FIELDS
      .filter(k => !summarySet.has(k))
      .map((k) => {
        const label = escapeHtml(k);
        const value = escapeHtml(row?.[k] ?? "");
        return `
          <div class="mobile-row">
            <div class="mobile-label">${label}</div>
            <div class="mobile-value">${value || "<span class='muted'>-</span>"}</div>
          </div>
        `;
      }).join("");

    card.innerHTML = `
      <div class="mobile-summary">
        ${summaryHtml}
      </div>

      <div class="mobile-details">
        <details>
          <summary>Lihat detail lainnya</summary>
          <div>
            ${detailHtml}
          </div>
        </details>
      </div>
    `;

    list.appendChild(card);
  }

  if (data.length > maxRows) {
    const more = document.createElement("div");
    more.className = "muted";
    more.style.opacity = "0.7";
    more.textContent = `Menampilkan ${maxRows} dari ${data.length} baris (limit untuk performa di HP).`;
    list.appendChild(more);
  }
}

function sortTableBy(key) {
  if (!key) return;

  if (CURRENT_SORT.key === key) {
    CURRENT_SORT.dir = CURRENT_SORT.dir === "asc" ? "desc" : "asc";
  } else {
    CURRENT_SORT.key = key;
    CURRENT_SORT.dir = "asc";
  }

  const view = computeView();
  renderTable(view);
  renderCards(view);
}

// ======================================
// Load sheet data
// ======================================
async function loadAndRenderFromSheet() {
  setSyncStatus("ok", "Loading...");
  try {
    const data = await apiGetAll();
    SHEET_DATA = data || [];
    setSyncStatus("ok", `Online • ${SHEET_DATA.length} rows`);

    const view = computeView();
    renderTable(view);
    renderCards(view);
  } catch (err) {
    console.error(err);
    setSyncStatus("err", "Error");
    renderTable([]);
    renderCards([]);
    const hint = $("tableHint");
    if (hint) hint.textContent = "Gagal load data. Cek Console (F12): " + (err.message || err);
  }
}

// ======================================
// Save form -> sheet
// ======================================
$("btnSave")?.addEventListener("click", async () => {
  setSaveStatus("Menyimpan ke Google Sheets...");

  const rowObj = {};
  FIELDS.forEach((label) => {
    const id = FIELD_ID_MAP[label];
    rowObj[label] = $(id)?.value?.trim?.() ?? "";
  });

  if (!rowObj["Item No."]) {
    setSaveStatus("Item No. wajib diisi.", true);
    alert("Item No. wajib diisi.");
    return;
  }

  try {
    await apiAppendRow(rowObj);
    setSaveStatus("✅ Berhasil disimpan.");
    $("inputForm")?.reset();
    await loadAndRenderFromSheet();
  } catch (err) {
    console.error(err);
    setSaveStatus("❌ Gagal simpan: " + (err.message || err), true);
    alert("Gagal simpan ke Google Sheets. Cek Console (F12).");
  }
});

// ======================================
// Search (debounce)
// ======================================
let searchTimer = null;
$("searchInput")?.addEventListener("input", (e) => {
  const val = e.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    CURRENT_QUERY = val;

    const view = computeView();
    renderTable(view);
    renderCards(view);
  }, 150);
});

// ======================================
// Import/Export Excel (preview only)
// ======================================
$("btnImport")?.addEventListener("click", () => $("importExcel")?.click());

$("importExcel")?.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    SHEET_DATA = jsonData || [];
    CURRENT_QUERY = "";
    CURRENT_SORT = { key: null, dir: "asc" };

    setSyncStatus("ok", `Preview Import • ${SHEET_DATA.length} rows`);

    const view = computeView();
    renderTable(view);
    renderCards(view);

    alert(
      "📁 Import Excel berhasil!\nPreview: " + SHEET_DATA.length +
      " baris.\n\nCatatan: ini hanya preview di web, belum otomatis masuk Google Sheets."
    );
  };

  reader.readAsArrayBuffer(file);
});

$("btnExport")?.addEventListener("click", exportExcel);

function exportExcel() {
  const data = computeView();
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diexport.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Device Registry");
  XLSX.writeFile(workbook, "Data-Device-Registry.xlsx");
}

// ======================================
// INIT
// ======================================
buildForm();
buildTableHead();
loadAndRenderFromSheet().catch(console.error);
