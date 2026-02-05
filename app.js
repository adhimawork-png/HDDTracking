// ======================================
// 1. TAB NAVIGATION + PAGE ANIMATION
// ======================================
function openTab(pageId, btn) {
    // Hide all pages
    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
    });

    // Delay to allow animation
    setTimeout(() => {
        document.getElementById(pageId).classList.add("active");
    }, 10);

    // Sidebar highlight
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // If user opens the Cek Data page → refresh table
    if (pageId === "cek") {
        renderTable();
    }
}



// ======================================
// 2. DARK MODE
// ======================================
const toggleDark = document.getElementById("darkModeToggle");

toggleDark.addEventListener("change", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", toggleDark.checked);
});

// Restore saved mode
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark");
    toggleDark.checked = true;
}



// ======================================
// 3. LOCAL STORAGE DATABASE HANDLER
// ======================================
const HDD_KEY = "HDD_DATABASE";

// Load localStorage → return array
function loadDB() {
    return JSON.parse(localStorage.getItem(HDD_KEY)) || [];
}

// Save array to localStorage
function saveDB(data) {
    localStorage.setItem(HDD_KEY, JSON.stringify(data));
}



// ======================================
// 4. RENDER TABLE (for Cek Data)
// ======================================
function renderTable() {
    const tableBody = document.getElementById("dataTable");
    const db = loadDB();

    tableBody.innerHTML = ""; // clear table

    db.forEach((row) => {
        tableBody.innerHTML += `
            <tr>
                <td>${row["Item No"] || ""}</td>
                <td>${row["Client"] || ""}</td>
                <td>${row["Device"] || ""}</td>
                <td>${row["SN"] || ""}</td>
                <td>${row["Location"] || ""}</td>
                <td>${row["Remarks"] || ""}</td>
            </tr>
        `;
    });
}



// ======================================
// 5. IMPORT EXCEL → LOCAL STORAGE
// ======================================
document.getElementById("importExcel").addEventListener("change", function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);

        // Read Excel workbook
        const workbook = XLSX.read(data, { type: "array" });

        // Use first sheet
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert to JSON array
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Save to localStorage
        saveDB(jsonData);

        alert("📁 Import Excel berhasil!\nTotal data: " + jsonData.length);

        renderTable();
    };

    reader.readAsArrayBuffer(file);
});



// ======================================
// 6. EXPORT EXCEL (future button ready)
// ======================================
function exportExcel() {
    const data = loadDB();

    if (data.length === 0) {
        alert("Tidak ada data untuk diexport.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HDD Database");

    XLSX.writeFile(workbook, "HDD-Database.xlsx");
}