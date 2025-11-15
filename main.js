// ========================================
// GLOBAL STATE
// ========================================
let compoData = [];
let npsData = [];
let mergedData = [];
let filteredData = [];
let charts = {};
const PASSWORD = "Laronste";

// Clé pour le stockage local
const STORAGE_KEY_COMPO = 'nps_dashboard_compo';
const STORAGE_KEY_NPS = 'nps_dashboard_nps';

// ========================================
// INITIALISATION AU CHARGEMENT
// ========================================
window.addEventListener('DOMContentLoaded', function() {
    loadStoredData();
});

function loadStoredData() {
    try {
        const storedCompo = localStorage.getItem(STORAGE_KEY_COMPO);
        const storedNPS = localStorage.getItem(STORAGE_KEY_NPS);
        
        if (storedCompo && storedNPS) {
            compoData = JSON.parse(storedCompo);
            npsData = JSON.parse(storedNPS);
            
            // Traiter automatiquement
            processStoredData();
        }
    } catch (error) {
        console.log('Pas de données stockées ou erreur:', error);
    }
}

function processStoredData() {
    showLoading(true);
    
    setTimeout(() => {
        try {
            const compoMap = createCompoMap(compoData);
            mergedData = mergeNPSWithCompo(npsData, compoMap);
            
            if (mergedData.length > 0) {
                document.getElementById('emptyState').style.display = 'none';
                document.getElementById('dataSection').style.display = 'block';
                
                initializeFilters();
                filteredData = [...mergedData];
                updateDashboard();
                
                showNotification(`✅ ${mergedData.length} enquêtes chargées depuis le stockage`);
            }
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            console.error('Erreur traitement:', error);
        }
    }, 500);
}

// ========================================
// MODAL & PASSWORD HANDLERS
// ========================================
document.getElementById('dataBtn').addEventListener('click', openModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('unlockBtn').addEventListener('click', checkPassword);
document.getElementById('passwordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkPassword();
    }
});

function openModal() {
    document.getElementById('uploadModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('uploadModal').style.display = 'none';
    // Reset password
    document.getElementById('passwordInput').value = '';
}

function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    if (input === PASSWORD) {
        document.getElementById('passwordSection').style.display = 'none';
        document.getElementById('uploadSection').style.display = 'block';
    } else {
        alert('❌ Mot de passe incorrect !');
        document.getElementById('passwordInput').value = '';
    }
}

// ========================================
// FILE UPLOAD HANDLERS (Indépendants)
// ========================================
document.getElementById('compoFile').addEventListener('change', handleCompoUpload);
document.getElementById('npsFile').addEventListener('change', handleNPSUpload);
document.getElementById('processBtn').addEventListener('click', processData);

function handleCompoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            compoData = XLSX.utils.sheet_to_json(worksheet);
            
            // Stocker dans localStorage
            localStorage.setItem(STORAGE_KEY_COMPO, JSON.stringify(compoData));
            
            document.getElementById('compoStatus').textContent = 
                `✅ ${compoData.length} lignes chargées et stockées`;
            document.getElementById('compoStatus').className = 'file-status success';
            
            checkFilesReady();
        } catch (error) {
            alert('Erreur lors de la lecture du fichier Compo: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleNPSUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            npsData = XLSX.utils.sheet_to_json(worksheet);
            
            // Stocker dans localStorage
            localStorage.setItem(STORAGE_KEY_NPS, JSON.stringify(npsData));
            
            document.getElementById('npsStatus').textContent = 
                `✅ ${npsData.length} lignes chargées et stockées`;
            document.getElementById('npsStatus').className = 'file-status success';
            
            checkFilesReady();
        } catch (error) {
            alert('Erreur lors de la lecture du fichier NPS: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function checkFilesReady() {
    if (compoData.length > 0 && npsData.length > 0) {
        document.getElementById('processBtn').disabled = false;
    }
}

// ========================================
// DATA PROCESSING
// ========================================
function processData() {
    showLoading(true);
    
    setTimeout(() => {
        try {
            const compoMap = createCompoMap(compoData);
            mergedData = mergeNPSWithCompo(npsData, compoMap);
            
            if (mergedData.length === 0) {
                alert('❌ Aucune correspondance trouvée entre les fichiers. Vérifiez que les logs correspondent.');
                showLoading(false);
                return;
            }
            
            closeModal();
            
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('dataSection').style.display = 'block';
            
            initializeFilters();
            filteredData = [...mergedData];
            updateDashboard();
            
            showLoading(false);
            showNotification(`✅ ${mergedData.length} enquêtes chargées avec succès !`);
            
        } catch (error) {
            showLoading(false);
            alert('Erreur lors du traitement: ' + error.message);
            console.error(error);
        }
    }, 500);
}

function createCompoMap(data) {
    const map = new Map();
    
    data.forEach(row => {
        const log = String(row.Log || '').trim().substring(0, 10);
        if (log) {
            map.set(log, {
                log: log,
                agent: row['Nom et prénom'] || '',
                encadrant: row['Encadrants'] || '',
                competence: row['Compétence'] || '',
                dateFin: row['Date fin'] || '',
                dateDebut: row['Date début'] || '',
                media: row['Média'] || '',
                activite: row['Activité ( projet)'] || ''
            });
        }
    });
    
    return map;
}

function mergeNPSWithCompo(npsData, compoMap) {
    const merged = [];
    
    npsData.forEach(nps => {
        const logNPS = String(nps.ID_Agent || '').trim().substring(0, 10);
        const compoInfo = compoMap.get(logNPS);
        
        if (!compoInfo) return;
        
        const score = extractNPSScore(nps);
        if (score === null) return;
        
        const verbatim = String(nps['QID3'] || '').trim();
        const resolution = extractResolution(nps);
        const date = parseDate(nps["Date d'appel"]);
        
        merged.push({
            ...nps,
            ...compoInfo,
            score: score,
            verbatim: verbatim,
            resolution: resolution,
            date: date,
            month: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '',
            week: date ? getWeekNumber(date) : '',
            day: date ? date.toISOString().split('T')[0] : '',
            isActive: !compoInfo.dateFin || compoInfo.dateFin === ''
        });
    });
    
    return merged;
}

function extractNPSScore(nps) {
    const scoreKeys = [
        'QID2 - Vous avez eu un échange [type_event_libelle] avec le Service Client [marque...',
        '(Group) QID2_NPS_GROUP - Vous avez eu un échange [type_event_libelle] avec le Service Client [marque...'
    ];
    
    for (const key of scoreKeys) {
        const value = nps[key];
        if (value !== undefined && value !== null && value !== '') {
            const score = parseInt(value);
            if (!isNaN(score) && score >= 0 && score <= 10) {
                return score;
            }
        }
    }
    
    return null;
}

function extractResolution(nps) {
    const resolutionText = String(nps['Après avoir eu recours au Service Client, le dysfonctionnement rencontré est résolu :'] || '').toLowerCase();
    
    if (resolutionText.includes('oui')) return 'Oui';
    if (resolutionText.includes('non')) return 'Non';
    return 'Non renseigné';
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    
    const parts = String(dateStr).split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
    }
    
    return null;
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ========================================
// FILTRES AVEC AUTO-COMPLETION
// ========================================
function initializeFilters() {
    const encadrants = [...new Set(mergedData.map(d => d.encadrant))].filter(Boolean).sort();
    const competences = [...new Set(mergedData.map(d => d.competence))].filter(Boolean).sort();
    
    // Populate TL checkboxes avec event listeners
    const tlContainer = document.getElementById('filterTL');
    tlContainer.innerHTML = '';
    encadrants.forEach(tl => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tl;
        checkbox.className = 'tl-checkbox';
        checkbox.addEventListener('change', applyFiltersAuto);
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + tl));
        tlContainer.appendChild(label);
    });
    
    // Populate Competence checkboxes avec event listeners
    const compContainer = document.getElementById('filterCompetence');
    compContainer.innerHTML = '';
    competences.forEach(comp => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = comp;
        checkbox.className = 'comp-checkbox';
        checkbox.addEventListener('change', applyFiltersAuto);
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + comp));
        compContainer.appendChild(label);
    });
    
    // Auto-completion
    setupAutocomplete('filterLog', 'logSuggestions', mergedData);
    setupAutocomplete('filterAgent', 'agentSuggestions', mergedData);
    
    // Event listeners
    document.getElementById('filterLog').addEventListener('input', applyFiltersAuto);
    document.getElementById('filterAgent').addEventListener('input', applyFiltersAuto);
    document.getElementById('filterDateType').addEventListener('change', function() {
        const dateInput = document.getElementById('filterDate');
        dateInput.style.display = (this.value === 'after' || this.value === 'before') ? 'block' : 'none';
        applyFiltersAuto();
    });
    document.getElementById('filterDate').addEventListener('change', applyFiltersAuto);
    document.getElementById('filterPeriod').addEventListener('change', applyFiltersAuto);
    
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Ajouter les sélecteurs de période pour les graphiques
    addChartPeriodSelectors();
}

function setupAutocomplete(inputId, suggestionsId, data) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);
    
    input.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 1) {
            suggestions.classList.remove('active');
            return;
        }
        
        let matches = [];
        if (inputId === 'filterLog') {
            matches = [...new Set(data.map(d => d.log))]
                .filter(v => v && v.toLowerCase().includes(query))
                .slice(0, 10);
        } else if (inputId === 'filterAgent') {
            matches = [...new Set(data.map(d => d.agent))]
                .filter(v => v && v.toLowerCase().includes(query))
                .slice(0, 10);
        }
        
        if (matches.length === 0) {
            suggestions.classList.remove('active');
            return;
        }
        
        suggestions.innerHTML = matches.map(m => {
            const item = data.find(d => inputId === 'filterLog' ? d.log === m : d.agent === m);
            const displayText = inputId === 'filterLog' 
                ? `${m} - ${item.agent}` 
                : `${m} - ${item.log}`;
            return `<div class="suggestion-item" data-value="${m}">${displayText}</div>`;
        }).join('');
        
        suggestions.classList.add('active');
        
        suggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                input.value = value;
                suggestions.classList.remove('active');
                
                if (inputId === 'filterLog') {
                    const agentData = data.find(d => d.log === value);
                    if (agentData) {
                        document.getElementById('filterAgent').value = agentData.agent;
                    }
                }
                
                if (inputId === 'filterAgent') {
                    const agentData = data.find(d => d.agent === value);
                    if (agentData) {
                        document.getElementById('filterLog').value = agentData.log;
                    }
                }
                
                applyFiltersAuto();
            });
        });
    });
    
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('active');
        }
    });
}

function applyFiltersAuto() {
    let data = [...mergedData];
    
    const logFilter = document.getElementById('filterLog').value.trim();
    if (logFilter) {
        data = data.filter(d => d.log.toLowerCase().includes(logFilter.toLowerCase()));
    }
    
    const agentFilter = document.getElementById('filterAgent').value.trim();
    if (agentFilter) {
        data = data.filter(d => d.agent.toLowerCase().includes(agentFilter.toLowerCase()));
    }
    
    const selectedTLs = Array.from(document.querySelectorAll('.tl-checkbox:checked')).map(cb => cb.value);
    if (selectedTLs.length > 0) {
        data = data.filter(d => selectedTLs.includes(d.encadrant));
    }
    
    const selectedComps = Array.from(document.querySelectorAll('.comp-checkbox:checked')).map(cb => cb.value);
    if (selectedComps.length > 0) {
        data = data.filter(d => selectedComps.includes(d.competence));
    }
    
    const dateType = document.getElementById('filterDateType').value;
    const dateValue = document.getElementById('filterDate').value;
    
    if (dateType === 'active') {
        data = data.filter(d => d.isActive);
    } else if (dateType === 'after' && dateValue) {
        const filterDate = new Date(dateValue);
        data = data.filter(d => {
            if (!d.dateFin) return false;
            const agentDate = parseDate(d.dateFin);
            return agentDate && agentDate > filterDate;
        });
    } else if (dateType === 'before' && dateValue) {
        const filterDate = new Date(dateValue);
        data = data.filter(d => {
            if (!d.dateFin) return true;
            const agentDate = parseDate(d.dateFin);
            return agentDate && agentDate < filterDate;
        });
    }
    
    const periodFilter = document.getElementById('filterPeriod').value;
    if (periodFilter) {
        data = data.filter(d => d.month === periodFilter);
    }
    
    filteredData = data;
    updateDashboard();
}

function resetFilters() {
    document.getElementById('filterLog').value = '';
    document.getElementById('filterAgent').value = '';
    document.querySelectorAll('.tl-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.comp-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('filterDateType').value = 'all';
    document.getElementById('filterDate').style.display = 'none';
    document.getElementById('filterDate').value = '';
    document.getElementById('filterPeriod').value = '';
    
    filteredData = [...mergedData];
    updateDashboard();
}
