const { shell } = require('electron');

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

const displayTitle = document.getElementById('display-title');
const displayArtist = document.getElementById('display-artist');
const displayCategory = document.getElementById('display-category');
const displayTab = document.getElementById('display-tab');

const tabList = document.getElementById('tab-list');
const searchBar = document.getElementById('search-bar');
const filterArtist = document.getElementById('filter-artist');
const filterCategory = document.getElementById('filter-category');

// --- State ---
let tabs = JSON.parse(localStorage.getItem('gw2-music-tabs')) || [];
let currentEditingTabId = null; // Tracks if we are editing an existing tab
let currentViewedTab = null;    // Tracks the tab currently open in the viewer

// --- Event Listeners ---

btnOpenPiano.addEventListener('click', () => {
    shell.openExternal('https://sauryelle.github.io/gw2-virtual-piano/');
});

// Click "Add New Tab" in Sidebar
btnShowAdd.addEventListener('click', () => {
    currentEditingTabId = null;
    addViewTitle.textContent = "Scribe New Tab";
    btnSave.textContent = "Seal Tab into Tome";

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
    inputTab.value = currentViewedTab.content;

    showAddView();
});

// Click "Delete Tab" in Read View
btnDeleteTab.addEventListener('click', () => {
    if (!currentViewedTab) return;

    const confirmDelete = confirm(`Are you sure you want to permanently erase "${currentViewedTab.song}" from the tome?`);

    if (confirmDelete) {
        // Remove the tab from the array
        tabs = tabs.filter(t => t.id !== currentViewedTab.id);

        // Save the updated array and refresh the UI
        saveTabs();
        updateFilters();
        renderList();

        // Simulate clicking the "Add New Tab" button to clear the reading screen safely
        btnShowAdd.click();
    }
});

// Save or Update Tab
btnSave.addEventListener('click', () => {
    const artist = inputArtist.value.trim();
    const song = inputSong.value.trim();
    const category = inputCategory.value.trim() || 'Uncategorized';
    const tabContent = inputTab.value.trim();

    if (!artist || !song || !tabContent) {
        alert("Please fill out the Artist, Song Name, and Tab fields.");
        return;
    }

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
function exportTabs() {
    if (tabs.length === 0) {
        alert("Your tome is empty! There is nothing to export.");
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
            alert(`Successfully imported ${addedCount} new tabs into your tome!`);
        } catch (error) {
            alert("Failed to read the file. Please ensure it is a valid backup JSON.");
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

    const filteredTabs = tabs.filter(tab => {
        const matchesSearch = tab.song.toLowerCase().includes(searchTerm) || tab.artist.toLowerCase().includes(searchTerm);
        const matchesArtist = selectedArtist === '' || tab.artist === selectedArtist;
        const matchesCategory = selectedCategory === '' || tab.category === selectedCategory;

        return matchesSearch && matchesArtist && matchesCategory;
    });

    filteredTabs.forEach(tab => {
        const li = document.createElement('li');
        li.className = "p-3 rounded text-base lg:text-lg text-[#d4af37] font-['Cinzel'] flex flex-col mb-1 border-b border-[#5a4b3c] hover:bg-[rgba(106,31,31,0.4)] hover:border-l-[3px] hover:border-[#d4af37] transition-all";

        li.innerHTML = `
        ${tab.song}
        <span class="text-xs lg:text-sm font-['Cormorant_Garamond'] text-[#e6d8c3]">${tab.artist}</span>
        `;

        li.addEventListener('click', () => showReadView(tab));
        tabList.appendChild(li);
    });
}

// --- Initialization ---
updateFilters();
renderList();
