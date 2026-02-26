const { shell, ipcRenderer } = require('electron');

// --- DOM Elements ---
const btnOpenPiano = document.getElementById('btn-open-piano');
const btnShowAdd = document.getElementById('btn-show-add');
const btnSave = document.getElementById('btn-save');
const btnExport = document.getElementById('btn-export');
const fileImport = document.getElementById('file-import');
const btnEditTab = document.getElementById('btn-edit-tab'); // New Edit button
const btnDeleteTab = document.getElementById('btn-delete-tab');

const addView = document.getElementById('add-view');
const readView = document.getElementById('read-view');
const addViewTitle = document.getElementById('add-view-title'); // Form title

const inputArtist = document.getElementById('input-artist');
const inputSong = document.getElementById('input-song');
const inputCategory = document.getElementById('input-category');
const inputTab = document.getElementById('input-tab');
const tabCounter = document.getElementById('tab-counter');

const displayTitle = document.getElementById('display-title');
const displayArtist = document.getElementById('display-artist');
const displayCategory = document.getElementById('display-category');
const displayTab = document.getElementById('display-tab');

// --- NEW DOM ELEMENTS ---
const toggleTop = document.getElementById('toggle-top');
const btnFontUp = document.getElementById('btn-font-up');
const btnFontDown = document.getElementById('btn-font-down');

const tabList = document.getElementById('tab-list');
const searchBar = document.getElementById('search-bar');
const filterArtist = document.getElementById('filter-artist');
const filterCategory = document.getElementById('filter-category');
const fileImportGW2Tabs = document.getElementById('file-import-gw2tabs');

// --- State ---
let tabs = JSON.parse(localStorage.getItem('gw2-music-tabs')) || [];
let currentEditingTabId = null; // Tracks if we are editing an existing tab
let currentViewedTab = null;    // Tracks the tab currently open in the viewer

// --- Event Listeners ---

// Always on Top Toggle
toggleTop.addEventListener('change', (e) => {
    ipcRenderer.send('toggle-always-on-top', e.target.checked);
});

// --- Font Resizing Logic ---
let currentFontSize = parseInt(localStorage.getItem('gw2-font-size')) || 16;
displayTab.style.fontSize = `${currentFontSize}px`;

btnFontUp.addEventListener('click', () => {
    if (currentFontSize < 36) { // Max size
        currentFontSize += 2;
        displayTab.style.fontSize = `${currentFontSize}px`;
        localStorage.setItem('gw2-font-size', currentFontSize);
    }
});

btnFontDown.addEventListener('click', () => {
    if (currentFontSize > 10) { // Min size
        currentFontSize -= 2;
        displayTab.style.fontSize = `${currentFontSize}px`;
        localStorage.setItem('gw2-font-size', currentFontSize);
    }
});

// Update character counter when typing or pasting
inputTab.addEventListener('input', () => {
    tabCounter.textContent = `${inputTab.value.length} / 5000`;
});

fileImportGW2Tabs.addEventListener('change', importLegacyGW2Tabs);

btnOpenPiano.addEventListener('click', () => {
    shell.openExternal('https://sauryelle.github.io/gw2-virtual-piano/');
});

// Click "Add New Tab" in Sidebar
btnShowAdd.addEventListener('click', () => {
    currentEditingTabId = null;
    addViewTitle.textContent = "Scribe New Tab";
    btnSave.textContent = "Seal Tab into Tome";
    tabCounter.textContent = "0 / 5000";

    // Clear form
    inputArtist.value = '';
    inputSong.value = '';
    inputCategory.value = '';
    inputTab.value = '';

    showAddView();
});

// Click "Edit Tab" in Read View
btnEditTab.addEventListener('click', () => {
    if (!currentViewedTab) return;

    currentEditingTabId = currentViewedTab.id;
    addViewTitle.textContent = "Edit Existing Tab";
    btnSave.textContent = "Update Tab in Tome";

    // Populate form with current tab data
    inputArtist.value = currentViewedTab.artist;
    inputSong.value = currentViewedTab.song;
    inputCategory.value = currentViewedTab.category;
    inputTab.value = currentViewedTab.contenhugt;

    showAddView();
    tabCounter.textContent = `${inputTab.value.length} / 5000`;
});

// Click "Delete Tab" in Read View (Double-click safety)
let deleteTimeout;
btnDeleteTab.addEventListener('click', () => {
    if (!currentViewedTab) return;

    if (btnDeleteTab.textContent === "Delete") {
        // First click: Ask for confirmation inline
        btnDeleteTab.textContent = "Sure?";
        btnDeleteTab.style.backgroundColor = "#ff5555";
        btnDeleteTab.style.color = "#ffffff";
        btnDeleteTab.style.borderColor = "#ff5555";

        // Reset back to normal after 3 seconds
        deleteTimeout = setTimeout(() => {
            btnDeleteTab.textContent = "Delete";
            btnDeleteTab.style.backgroundColor = "";
            btnDeleteTab.style.color = "";
            btnDeleteTab.style.borderColor = "";
        }, 3000);
    } else {
        // Second click: Actually delete
        clearTimeout(deleteTimeout);
        tabs = tabs.filter(t => t.id !== currentViewedTab.id);

        saveTabs();
        updateFilters();
        renderList();
        btnShowAdd.click(); // Return to 'Add' screen safely

        // Reset button state for the next tab
        btnDeleteTab.textContent = "Delete";
        btnDeleteTab.style.backgroundColor = "";
        btnDeleteTab.style.color = "";
        btnDeleteTab.style.borderColor = "";
    }
});

// Save or Update Tab
btnSave.addEventListener('click', () => {
    const artist = inputArtist.value.trim();
    const song = inputSong.value.trim();
    const category = inputCategory.value.trim() || 'Uncategorized';
    const tabContent = inputTab.value.trim();
    tabCounter.textContent = "0 / 5000";

    // --- NEW: UI Warning instead of freezing alert() ---
    if (!artist || !song || !tabContent) {
        const originalText = btnSave.textContent;

        // Turn button red and show warning
        btnSave.textContent = "⚠️ Missing Fields!";
        btnSave.style.color = "#ff5555";
        btnSave.style.borderColor = "#ff5555";

        // Reset button after 3 seconds
        setTimeout(() => {
            btnSave.textContent = originalText;
            btnSave.style.color = "";
            btnSave.style.borderColor = "";
        }, 3000);

        return;
    }
    // ---------------------------------------------------

    if (currentEditingTabId) {
        // Find and update the existing tab
        const index = tabs.findIndex(t => t.id === currentEditingTabId);
        if (index !== -1) {
            tabs[index] = { ...tabs[index], artist, song, category, content: tabContent };
            currentViewedTab = tabs[index];
        }
    } else {
        // Create a new tab
        const newTab = {
            id: Date.now().toString(),
                         artist,
                         song,
                         category,
                         content: tabContent
        };
        tabs.push(newTab);
        currentViewedTab = newTab;
    }

    saveTabs();
    updateFilters();
    renderList();
    showReadView(currentViewedTab);
});

// Import & Export
btnExport.addEventListener('click', exportTabs);
fileImport.addEventListener('change', importTabs);

// Filters
searchBar.addEventListener('input', renderList);
filterArtist.addEventListener('change', renderList);
filterCategory.addEventListener('change', renderList);


// --- Functions ---

function saveTabs() {
    localStorage.setItem('gw2-music-tabs', JSON.stringify(tabs));
}

function showAddView() {
    readView.classList.add('hidden');
    readView.classList.remove('flex');
    addView.classList.remove('hidden');
    addView.classList.add('flex');
}

function showReadView(tab) {
    currentViewedTab = tab; // Update state
    displayTitle.textContent = tab.song;
    displayArtist.textContent = tab.artist;
    displayCategory.textContent = tab.category;

    // 1. Escape HTML
    let safeText = tab.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 2. Apply Scribe Colors (Using inline styles so the regex doesn't match Tailwind bracket classes)
    safeText = safeText.replace(/\((.*?)\)/g, '<span style="color: #ff5555; font-weight: bold; text-shadow: 0 0 5px rgba(255,0,0,0.5);">($1)</span>');
    safeText = safeText.replace(/\[(.*?)\]/g, '<span style="color: #6fa8dc; font-weight: bold; text-shadow: 0 0 5px rgba(100,150,255,0.5);">[$1]</span>');

    // 3. Inject formatted HTML
    displayTab.innerHTML = safeText;

    addView.classList.add('hidden');
    addView.classList.remove('flex');
    readView.classList.remove('hidden');
    readView.classList.add('flex');
}

// --- Import / Export Logic ---

function importLegacyGW2Tabs(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const xmlText = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            // Check if the browser failed to parse the XML
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Invalid XML formatting");
            }

            const xmlTabs = xmlDoc.getElementsByTagName("Tab");
            let addedCount = 0;

            for (let i = 0; i < xmlTabs.length; i++) {
                const titleNode = xmlTabs[i].getElementsByTagName("title")[0];
                const tabNode = xmlTabs[i].getElementsByTagName("tab")[0];

                if (!titleNode || !tabNode) continue;

                const rawTitle = titleNode.textContent.trim();
                const content = tabNode.textContent.trim();

                if (!rawTitle || !content) continue;

                // --- THE CLEVER SPLIT LOGIC ---
                let artist = "Unknown Artist";
                let song = rawTitle;

                // If the title contains " - ", split it into Artist and Song
                if (rawTitle.includes(" - ")) {
                    const parts = rawTitle.split(" - ");
                    artist = parts[0].trim();
                    // Re-join the rest in case the song title itself has hyphens
                    song = parts.slice(1).join(" - ").trim();
                }
                // ------------------------------

                const newTab = {
                    id: `legacy-${Date.now().toString()}-${i}`,
                    artist: artist,
                    song: song,
                    category: "Legacy Import", // Tag them so they are easy to filter!
                    content: content
                };

                tabs.push(newTab);
                addedCount++;
            }

            // Save and refresh UI
            saveTabs();
            updateFilters();
            renderList();

            // Show success message in the search bar
            searchBar.placeholder = `✅ ${addedCount} legacy tabs imported!`;
            setTimeout(() => searchBar.placeholder = "Search tabs...", 4000);

        } catch (error) {
            console.error(error);
            searchBar.placeholder = `⚠️ Failed to parse XML file!`;
            searchBar.style.borderColor = "#ff5555";
            setTimeout(() => {
                searchBar.placeholder = "Search tabs...";
                searchBar.style.borderColor = "";
            }, 4000);
        }

        // Reset the file input
        event.target.value = '';
    };

    // Read the XML as a raw text string
    reader.readAsText(file);
}

function exportTabs() {
    if (tabs.length === 0) {
        // UI warning instead of alert
        const originalText = btnExport.innerHTML;
        btnExport.innerHTML = '<span style="color:#ff5555">Empty Tome!</span>';
        setTimeout(() => btnExport.innerHTML = originalText, 3000);
        return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tabs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "gw2-tome-backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importTabs(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTabs = JSON.parse(e.target.result);
            if (!Array.isArray(importedTabs)) throw new Error("Invalid format");

            const existingIds = new Set(tabs.map(t => t.id));
            let addedCount = 0;

            importedTabs.forEach(t => {
                if (t.id && t.song && t.content && !existingIds.has(t.id)) {
                    tabs.push(t);
                    existingIds.add(t.id);
                    addedCount++;
                }
            });

            saveTabs();
            updateFilters();
            renderList();

            // Success flash on the search bar as visual feedback
            searchBar.placeholder = `✅ ${addedCount} tabs imported!`;
            setTimeout(() => searchBar.placeholder = "Search tabs...", 4000);

        } catch (error) {
            // UI warning instead of alert
            searchBar.placeholder = `⚠️ Invalid backup file!`;
            searchBar.style.borderColor = "#ff5555";
            setTimeout(() => {
                searchBar.placeholder = "Search tabs...";
                searchBar.style.borderColor = "";
            }, 4000);
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// --- List & Filters ---
function updateFilters() {
    const artists = [...new Set(tabs.map(t => t.artist))].sort();
    const categories = [...new Set(tabs.map(t => t.category))].sort();

    filterArtist.innerHTML = '<option value="">All Artists</option>';
    artists.forEach(artist => {
        const opt = document.createElement('option');
        opt.value = artist;
        opt.textContent = artist;
        filterArtist.appendChild(opt);
    });

    filterCategory.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(category => {
        const opt = document.createElement('option');
        opt.value = category;
        opt.textContent = category;
        filterCategory.appendChild(opt);
    });
}

function renderList() {
    const searchTerm = searchBar.value.toLowerCase();
    const selectedArtist = filterArtist.value;
    const selectedCategory = filterCategory.value;

    tabList.innerHTML = '';

    // 1. Filter the tabs based on inputs
    const filteredTabs = tabs.filter(tab => {
        const matchesSearch = tab.song.toLowerCase().includes(searchTerm) || tab.artist.toLowerCase().includes(searchTerm);
        const matchesArtist = selectedArtist === '' || tab.artist === selectedArtist;
        const matchesCategory = selectedCategory === '' || tab.category === selectedCategory;

        return matchesSearch && matchesArtist && matchesCategory;
    });

    // 2. NEW: Sort the filtered tabs alphabetically by Song Name (A to Z)
    filteredTabs.sort((a, b) => a.song.localeCompare(b.song));

    // 3. Render the sorted list
    filteredTabs.forEach(tab => {
        const li = document.createElement('li');
        // Changed p-3 to p-2 for compactness, and flex-col to flex-row items-baseline
        li.className = "p-2 rounded text-sm lg:text-base text-[#d4af37] font-['Cinzel'] flex flex-row items-baseline gap-2 mb-1 border-b border-[#5a4b3c] hover:bg-[rgba(106,31,31,0.4)] hover:border-l-[3px] hover:border-[#d4af37] transition-all flex-shrink-0";

        // Formatted horizontally as: Songname - Artist
        li.innerHTML = `
        <span class="truncate">${tab.song}</span>
        <span class="text-xs lg:text-sm font-['Cormorant_Garamond'] text-[#e6d8c3] truncate flex-shrink-0">- ${tab.artist}</span>
        `;

        li.addEventListener('click', () => showReadView(tab));
        tabList.appendChild(li);
    });
}

// --- Initialization ---
updateFilters();
renderList();
