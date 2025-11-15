// ========================================
// GLOBAL STATE (SANS LOCALSTORAGE)
// ========================================
let compoData = [];
let npsData = [];
let mergedData = [];
let filteredData = [];
let charts = {};
const PASSWORD = "Laronste";

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
// FILE UPLOAD HANDLERS (SANS STOCKAGE)
// ========================================
document.getElementById('compoFile').addEventListener('change', handleCompoUpload);
document.getElementById('npsFile').addEventListener('change', handleNPSUpload);
document.getElementById('processBtn').addEventListener('click', processData);

function handleCompoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading(true);
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            compoData = XLSX.utils.sheet_to_json(worksheet);
            
            document.getElementById('compoStatus').textContent = 
                `✅ ${compoData.length} lignes chargées`;
            document.getElementById('compoStatus').className = 'file-status success';
            
            checkFilesReady();
            showLoading(false);
        } catch (error) {
            showLoading(false);
            alert('Erreur lors de la lecture du fichier Compo: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function handleNPSUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading(true);
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            npsData = XLSX.utils.sheet_to_json(worksheet);
            
            document.getElementById('npsStatus').textContent = 
                `✅ ${npsData.length} lignes chargées`;
            document.getElementById('npsStatus').className = 'file-status success';
            
            checkFilesReady();
            showLoading(false);
        } catch (error) {
            showLoading(false);
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
            
            // DEBUG: Afficher le nombre de verbatims
            const verbatimsCount = mergedData.filter(d => d.verbatim && d.verbatim.trim().length > 10).length;
            console.log(`Total enquêtes: ${mergedData.length}, Verbatims valides: ${verbatimsCount}`);
            
            closeModal();
            
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('dataSection').style.display = 'block';
            
            initializeFilters();
            filteredData = [...mergedData];
            updateDashboard();
            
            showLoading(false);
            showNotification(`✅ ${mergedData.length} enquêtes chargées (${verbatimsCount} verbatims)`);
            
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
        
        // CORRECTION VERBATIM: Chercher dans toutes les colonnes possibles
        let verbatim = '';
        
        // Liste des colonnes possibles pour le verbatim
        const verbatimColumns = [
            'QID3',
            'QID3 - À vos claviers ! Pouvez-vous commenter cette note en quelques mots ?',
            'Verbatim',
            'Commentaire',
            'À vos claviers ! Pouvez-vous commenter cette note en quelques mots ?'
        ];
        
        // Chercher dans toutes les colonnes
        for (const col of verbatimColumns) {
            if (nps[col] && String(nps[col]).trim().length > 0) {
                verbatim = String(nps[col]).trim();
                break;
            }
        }
        
        // Si toujours vide, chercher dans TOUTES les colonnes qui contiennent du texte
        if (!verbatim) {
            for (const key in nps) {
                const value = String(nps[key] || '').trim();
                if (value.length > 20 && value.length < 500 && !key.includes('Date') && !key.includes('ID')) {
                    verbatim = value;
                    break;
                }
            }
        }
        
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
        '(Group) QID2_NPS_GROUP - Vous avez eu un échange [type_event_libelle] avec le Service Client [marque...',
        'QID2',
        'Score',
        'NPS'
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
// FILTRES
// ========================================
function initializeFilters() {
    const encadrants = [...new Set(mergedData.map(d => d.encadrant))].filter(Boolean).sort();
    const competences = [...new Set(mergedData.map(d => d.competence))].filter(Boolean).sort();
    
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
    
    setupAutocomplete('filterLog', 'logSuggestions', mergedData);
    setupAutocomplete('filterAgent', 'agentSuggestions', mergedData);
    
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

// ========================================
// DASHBOARD UPDATE
// ========================================
function updateDashboard() {
    updateKPIs();
    updateCharts();
    updateTable();
}

function updateKPIs() {
    const data = filteredData;
    
    const npsGlobal = calculateNPS(data);
    document.getElementById('npsGlobal').textContent = npsGlobal.toFixed(0);
    document.getElementById('npsGlobal').style.color = getNPSColor(npsGlobal);
    
    const promoters = data.filter(d => d.score >= 9).length;
    const passives = data.filter(d => d.score >= 7 && d.score <= 8).length;
    const detractors = data.filter(d => d.score <= 6).length;
    
    const trendText = `${promoters} promoteurs`;
    document.getElementById('npsTrend').textContent = trendText;
    
    document.getElementById('nbSurveys').textContent = data.length;
    const detailSurvey = `${promoters} promoteurs, ${passives} passifs, ${detractors} détracteurs`;
    document.getElementById('surveyDetail').textContent = detailSurvey;
    
    const resolved = data.filter(d => d.resolution === 'Oui').length;
    const resolutionRate = data.length > 0 ? (resolved / data.length * 100).toFixed(1) : 0;
    document.getElementById('resolutionRate').textContent = `${resolutionRate}%`;
    document.getElementById('resolutionDetail').textContent = `${resolved}/${data.length} résolus`;
    
    document.getElementById('evolution').textContent = '+0%';
    document.getElementById('evolutionDetail').textContent = 'vs mois précédent';
}

function calculateNPS(data) {
    if (data.length === 0) return 0;
    
    const promoters = data.filter(d => d.score >= 9).length;
    const detractors = data.filter(d => d.score <= 6).length;
    
    return ((promoters - detractors) / data.length) * 100;
}

function getNPSColor(nps) {
    if (nps >= 50) return '#00ff88';
    if (nps >= 0) return '#ffd93d';
    return '#ff2e63';
}

// ========================================
// SÉLECTEURS DE PÉRIODE POUR GRAPHIQUES
// ========================================
let currentChartPeriod = 'month';

function addChartPeriodSelectors() {
    const evolutionCard = document.querySelector('.chart-card');
    if (evolutionCard && !document.getElementById('periodSelector')) {
        const selector = document.createElement('div');
        selector.id = 'periodSelector';
        selector.className = 'period-selector';
        selector.innerHTML = `
            <button class="period-btn" data-period="day">Jour</button>
            <button class="period-btn" data-period="week">Semaine</button>
            <button class="period-btn active" data-period="month">Mois</button>
        `;
        
        const h3 = evolutionCard.querySelector('h3');
        h3.appendChild(selector);
        
        selector.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                selector.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentChartPeriod = this.getAttribute('data-period');
                updateCharts();
            });
        });
    }
}

// ========================================
// CHARTS
// ========================================
function updateCharts() {
    destroyCharts();
    
    createNPSEvolutionChart();
    createNPSByTLChart();
    createNPSByCompetenceChart();
    createScoreDistributionChart();
}

function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};
}

function createNPSEvolutionChart() {
    const data = filteredData;
    
    const periodData = {};
    data.forEach(d => {
        let period;
        if (currentChartPeriod === 'day' && d.day) {
            period = d.day;
        } else if (currentChartPeriod === 'week' && d.week) {
            period = d.week;
        } else if (currentChartPeriod === 'month' && d.month) {
            period = d.month;
        }
        
        if (period) {
            if (!periodData[period]) {
                periodData[period] = [];
            }
            periodData[period].push(d);
        }
    });
    
    const periods = Object.keys(periodData).sort();
    const npsValues = periods.map(p => calculateNPS(periodData[p]));
    
    const ctx = document.getElementById('npsEvolutionChart');
    charts.evolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periods,
            datasets: [{
                label: 'NPS',
                data: npsValues,
                borderColor: '#00f2fe',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { 
                    beginAtZero: false, 
                    min: -100, 
                    max: 100,
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                },
                x: {
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                }
            }
        }
    });
}

function createNPSByTLChart() {
    const data = filteredData;
    
    const tlData = {};
    data.forEach(d => {
        if (!d.encadrant) return;
        if (!tlData[d.encadrant]) {
            tlData[d.encadrant] = [];
        }
        tlData[d.encadrant].push(d);
    });
    
    const tlNPS = Object.entries(tlData)
        .map(([tl, records]) => ({
            tl: tl,
            nps: calculateNPS(records),
            count: records.length
        }))
        .filter(item => item.count >= 3)
        .sort((a, b) => b.nps - a.nps);
    
    const topBottom = [...tlNPS.slice(0, 10)];
    
    const ctx = document.getElementById('npsByTLChart');
    charts.tl = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topBottom.map(t => t.tl),
            datasets: [{
                label: 'NPS',
                data: topBottom.map(t => t.nps),
                backgroundColor: topBottom.map(t => getNPSColor(t.nps))
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { display: false }
            },
            scales: {
                x: { 
                    beginAtZero: false, 
                    min: -100, 
                    max: 100,
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                },
                y: {
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                }
            }
        }
    });
}

function createNPSByCompetenceChart() {
    const data = filteredData;
    
    const compData = {};
    data.forEach(d => {
        if (!d.competence) return;
        if (!compData[d.competence]) {
            compData[d.competence] = [];
        }
        compData[d.competence].push(d);
    });
    
    const compNPS = Object.entries(compData)
        .map(([comp, records]) => ({
            comp: comp,
            nps: calculateNPS(records),
            count: records.length
        }))
        .filter(item => item.count >= 3)
        .sort((a, b) => b.nps - a.nps);
    
    const ctx = document.getElementById('npsByCompetenceChart');
    charts.competence = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: compNPS.map(c => c.comp),
            datasets: [{
                label: 'NPS',
                data: compNPS.map(c => c.nps),
                backgroundColor: '#4facfe'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { 
                    beginAtZero: false, 
                    min: -100, 
                    max: 100,
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                },
                x: {
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                }
            }
        }
    });
}

function createScoreDistributionChart() {
    const data = filteredData;
    
    const distribution = Array(11).fill(0);
    data.forEach(d => {
        distribution[d.score]++;
    });
    
    const ctx = document.getElementById('scoreDistributionChart');
    charts.distribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
            datasets: [{
                label: 'Nombre de réponses',
                data: distribution,
                backgroundColor: distribution.map((_, i) => {
                    if (i <= 6) return '#ff2e63';
                    if (i <= 8) return '#ffd93d';
                    return '#00ff88';
                })
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                },
                x: {
                    grid: { color: 'rgba(0, 242, 254, 0.1)' },
                    ticks: { color: '#e0e7ff' }
                }
            }
        }
    });
}

// ========================================
// TABLE
// ========================================
function updateTable() {
    const data = filteredData;
    
    const agentData = {};
    data.forEach(d => {
        const key = d.log;
        if (!agentData[key]) {
            agentData[key] = {
                log: d.log,
                agent: d.agent,
                encadrant: d.encadrant,
                competence: d.competence,
                dateFin: d.dateFin,
                scores: [],
                resolutions: []
            };
        }
        agentData[key].scores.push(d.score);
        agentData[key].resolutions.push(d.resolution);
    });
    
    const agentMetrics = Object.values(agentData).map(agent => {
        const nps = calculateNPS(agent.scores.map(s => ({ score: s })));
        const promoters = agent.scores.filter(s => s >= 9).length;
        const passives = agent.scores.filter(s => s >= 7 && s <= 8).length;
        const detractors = agent.scores.filter(s => s <= 6).length;
        
        const resolved = agent.resolutions.filter(r => r === 'Oui').length;
        const resolutionRate = agent.resolutions.length > 0 ? (resolved / agent.resolutions.length * 100).toFixed(1) : 0;
        
        return {
            ...agent,
            nps: nps,
            nbSurveys: agent.scores.length,
            resolutionRate: resolutionRate,
            promoters: promoters,
            passives: passives,
            detractors: detractors
        };
    });
    
    agentMetrics.sort((a, b) => b.nps - a.nps);
    
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = agentMetrics.map(agent => `
        <tr>
            <td>${agent.log}</td>
            <td>${agent.agent}</td>
            <td>${agent.encadrant}</td>
            <td>${agent.competence}</td>
            <td style="color: ${getNPSColor(agent.nps)}; font-weight: 700; font-size: 1.1rem;">${agent.nps.toFixed(0)}</td>
            <td>${agent.nbSurveys}</td>
            <td>${agent.resolutionRate}%</td>
            <td style="color: #00ff88;">${agent.promoters}</td>
            <td style="color: #ffd93d;">${agent.passives}</td>
            <td style="color: #ff2e63;">${agent.detractors}</td>
            <td>${agent.dateFin || 'Actif'}</td>
        </tr>
    `).join('');
    
    const searchInput = document.getElementById('tableSearch');
    searchInput.removeEventListener('input', tableSearchHandler);
    searchInput.addEventListener('input', tableSearchHandler);
}

function tableSearchHandler() {
    const query = this.value.toLowerCase();
    const rows = document.getElementById('tableBody').querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

// ========================================
// EXPORT CSV
// ========================================
document.getElementById('exportCSV').addEventListener('click', exportToCSV);

function exportToCSV() {
    const data = filteredData;
    
    const headers = [
        'Log', 'Agent', 'Encadrant', 'Compétence', 'Date', 'Score', 
        'Verbatim', 'Résolution', 'Date Fin', 'Média', 'Activité'
    ];
    
    const rows = data.map(d => [
        d.log,
        d.agent,
        d.encadrant,
        d.competence,
        d.date ? d.date.toLocaleDateString('fr-FR') : '',
        d.score,
        d.verbatim.replace(/"/g, '""'),
        d.resolution,
        d.dateFin,
        d.media,
        d.activite
    ]);
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nps_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ========================================
// AI ANALYSIS (CORRIGÉ AVEC DEBUG)
// ========================================
document.getElementById('analyzeBtn').addEventListener('click', analyzeVerbatims);

async function analyzeVerbatims() {
    const apiChoice = document.querySelector('input[name="apiChoice"]:checked').value;
    const apiKey = apiChoice === 'openai' 
        ? document.getElementById('openaiKey').value 
        : document.getElementById('geminiKey').value;
    
    if (!apiKey) {
        alert('⚠️ Veuillez entrer une clé API valide');
        return;
    }
    
    // DEBUG: Afficher les verbatims dans la console
    console.log('=== DEBUG VERBATIMS ===');
    console.log('Nombre total de lignes filtrées:', filteredData.length);
    
    // Afficher les 5 premières lignes pour debug
    console.log('Échantillon des 5 premières lignes:');
    filteredData.slice(0, 5).forEach((d, i) => {
        console.log(`Ligne ${i + 1}:`, {
            log: d.log,
            verbatim: d.verbatim,
            verbatimLength: d.verbatim ? d.verbatim.length : 0
        });
    });
    
    // Extraire les verbatims valides
    const verbatimsData = filteredData.filter(d => {
        const hasVerbatim = d.verbatim && d.verbatim.trim().length > 10;
        return hasVerbatim;
    }).slice(0, 100);
    
    console.log(`Verbatims valides trouvés: ${verbatimsData.length}`);
    
    if (verbatimsData.length === 0) {
        alert(`❌ Aucun verbatim trouvé dans les ${filteredData.length} lignes filtrées.\n\nVérifiez:\n1. Que la colonne QID3 contient des commentaires\n2. Que les commentaires font plus de 10 caractères\n3. Consultez la console (F12) pour voir les données détectées`);
        return;
    }
    
    const verbatims = verbatimsData.map(d => d.verbatim).join('\n---\n');
    
    showLoading(true);
    
    try {
        const analysis = await callAIAPI(apiChoice, apiKey, verbatims);
        displayAnalysis(analysis);
        
        showLoading(false);
        showNotification(`✅ Analyse IA terminée ! ${verbatimsData.length} verbatims analysés`);
        
    } catch (error) {
        showLoading(false);
        alert('❌ Erreur lors de l\'analyse IA: ' + error.message);
        console.error('Erreur complète:', error);
    }
}

async function callAIAPI(provider, apiKey, verbatims) {
    const prompt = `Analyse ces verbatims clients NPS et fournis:
1. Les 5 thèmes principaux identifiés
2. Les 3-5 points faibles les plus critiques
3. Un plan d'action 30/60/90 jours avec KPI mesurables
4. Les tags à appliquer (#délai, #empathie, #technique, #satisfait, etc.)

Verbatims:
${verbatims}

Réponds UNIQUEMENT en JSON avec cette structure EXACTE (sans markdown, sans texte avant ou après):
{
  "themes": ["thème 1", "thème 2", "thème 3", "thème 4", "thème 5"],
  "weaknesses": ["point faible 1", "point faible 2", "point faible 3"],
  "actionPlan": {
    "30days": {"actions": ["action 1", "action 2"], "kpis": ["kpi 1", "kpi 2"]},
    "60days": {"actions": ["action 1", "action 2"], "kpis": ["kpi 1", "kpi 2"]},
    "90days": {"actions": ["action 1", "action 2"], "kpis": ["kpi 1", "kpi 2"]}
  },
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;

    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'Tu es un expert en analyse de feedback client. Tu réponds UNIQUEMENT en JSON valide, sans texte avant ou après.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur API OpenAI: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        let cleanContent = content.trim();
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Format de réponse invalide');
        
    } else if (provider === 'gemini') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erreur API Gemini: ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;
        
        let cleanContent = content.trim();
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Format de réponse invalide');
    }
}

function displayAnalysis(analysis) {
    document.getElementById('analysisResults').style.display = 'block';
    
    const themesDiv = document.getElementById('themes');
    themesDiv.innerHTML = '<ul class="analysis-list">' + analysis.themes.map(t => `<li>✓ ${t}</li>`).join('') + '</ul>';
    
    const weaknessesDiv = document.getElementById('weaknesses');
    weaknessesDiv.innerHTML = '<ul class="analysis-list">' + analysis.weaknesses.map(w => `<li>⚠️ ${w}</li>`).join('') + '</ul>';
    
    const actionPlanDiv = document.getElementById('actionPlan');
    actionPlanDiv.innerHTML = `
        <div class="action-block">
            <h4 style="color: #00f2fe; margin-bottom: 12px; font-size: 1.2rem;">📅 30 jours</h4>
            <p style="font-weight: 600; margin-bottom: 8px; color: #e0e7ff;">Actions:</p>
            <ul class="analysis-list">${analysis.actionPlan['30days'].actions.map(a => `<li>→ ${a}</li>`).join('')}</ul>
            <p style="font-weight: 600; margin-top: 12px; margin-bottom: 8px; color: #e0e7ff;">KPIs:</p>
            <ul class="analysis-list">${analysis.actionPlan['30days'].kpis.map(k => `<li>📊 ${k}</li>`).join('')}</ul>
        </div>
        <div class="action-block">
            <h4 style="color: #00f2fe; margin-bottom: 12px; font-size: 1.2rem;">📅 60 jours</h4>
            <p style="font-weight: 600; margin-bottom: 8px; color: #e0e7ff;">Actions:</p>
            <ul class="analysis-list">${analysis.actionPlan['60days'].actions.map(a => `<li>→ ${a}</li>`).join('')}</ul>
            <p style="font-weight: 600; margin-top: 12px; margin-bottom: 8px; color: #e0e7ff;">KPIs:</p>
            <ul class="analysis-list">${analysis.actionPlan['60days'].kpis.map(k => `<li>📊 ${k}</li>`).join('')}</ul>
        </div>
        <div class="action-block">
            <h4 style="color: #00f2fe; margin-bottom: 12px; font-size: 1.2rem;">📅 90 jours</h4>
            <p style="font-weight: 600; margin-bottom: 8px; color: #e0e7ff;">Actions:</p>
            <ul class="analysis-list">${analysis.actionPlan['90days'].actions.map(a => `<li>→ ${a}</li>`).join('')}</ul>
            <p style="font-weight: 600; margin-top: 12px; margin-bottom: 8px; color: #e0e7ff;">KPIs:</p>
            <ul class="analysis-list">${analysis.actionPlan['90days'].kpis.map(k => `<li>📊 ${k}</li>`).join('')}</ul>
        </div>
    `;
    
    const tagsDiv = document.getElementById('tags');
    tagsDiv.innerHTML = analysis.tags.map(tag => 
        `<span class="tag-badge">${tag}</span>`
    ).join('');
}

// ========================================
// UTILITIES
// ========================================
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}
