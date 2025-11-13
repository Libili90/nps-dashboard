// ========================================
// GLOBAL STATE
// ========================================
let compoData = [];
let npsData = [];
let mergedData = [];
let filteredData = [];
let charts = {};

// ========================================
// FILE UPLOAD HANDLERS
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
            
            document.getElementById('compoStatus').textContent = 
                `✅ ${compoData.length} lignes chargées`;
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
            
            document.getElementById('npsStatus').textContent = 
                `✅ ${npsData.length} lignes chargées`;
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
            
            initializeFilters();
            applyDefaultFilter();
            
            document.getElementById('uploadSection').style.display = 'none';
            document.getElementById('dashboardSection').style.display = 'block';
            
            updateDashboard();
            
            showLoading(false);
        } catch (error) {
            showLoading(false);
            alert('Erreur lors du traitement: ' + error.message);
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
        const compoInfo = compoMap.get(logNPS) || {
            log: logNPS,
            agent: 'Inconnu',
            encadrant: 'Non renseigné',
            competence: 'Non renseignée',
            dateFin: '',
            dateDebut: '',
            media: '',
            activite: ''
        };
        
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
// FILTRES INTELLIGENTS AVEC AUTO-UPDATE
// ========================================
function initializeFilters() {
    // Récupérer valeurs uniques
    const encadrants = [...new Set(mergedData.map(d => d.encadrant))].filter(Boolean).sort();
    const competences = [...new Set(mergedData.map(d => d.competence))].filter(Boolean).sort();
    
    // Populate TL checkboxes
    const tlContainer = document.getElementById('filterTL');
    tlContainer.innerHTML = '';
    encadrants.forEach(tl => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${tl}" class="tl-checkbox">
            ${tl}
        `;
        tlContainer.appendChild(label);
    });
    
    // Populate Competence checkboxes
    const compContainer = document.getElementById('filterCompetence');
    compContainer.innerHTML = '';
    competences.forEach(comp => {
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${comp}" class="comp-checkbox">
            ${comp}
        `;
        compContainer.appendChild(label);
    });
    
    // Auto-completion avec mise à jour automatique
    setupAutocomplete('filterLog', 'logSuggestions', mergedData);
    setupAutocomplete('filterAgent', 'agentSuggestions', mergedData);
    
    // Event listeners pour application automatique
    document.getElementById('filterLog').addEventListener('input', applyFiltersAuto);
    document.getElementById('filterAgent').addEventListener('input', applyFiltersAuto);
    document.getElementById('filterDateType').addEventListener('change', function() {
        const dateInput = document.getElementById('filterDate');
        dateInput.style.display = (this.value === 'after' || this.value === 'before') ? 'block' : 'none';
        applyFiltersAuto();
    });
    document.getElementById('filterDate').addEventListener('change', applyFiltersAuto);
    document.getElementById('filterPeriod').addEventListener('change', applyFiltersAuto);
    
    // Checkboxes avec auto-update
    document.querySelectorAll('.tl-checkbox, .comp-checkbox').forEach(cb => {
        cb.addEventListener('change', applyFiltersAuto);
    });
    
    document.getElementById('applyFilters').addEventListener('click', applyFiltersAuto);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
}

function setupAutocomplete(inputId, suggestionsId, data) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);
    
    input.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query.length < 2) {
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
            // Afficher log + agent
            const item = data.find(d => inputId === 'filterLog' ? d.log === m : d.agent === m);
            const displayText = inputId === 'filterLog' 
                ? `${m} - ${item.agent}` 
                : `${m} - ${item.log}`;
            return `<div class="suggestion-item" data-value="${m}">${displayText}</div>`;
        }).join('');
        
        suggestions.classList.add('active');
        
        // Click sur suggestion
        suggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                input.value = value;
                suggestions.classList.remove('active');
                
                // CONNEXION AUTOMATIQUE: Si log sélectionné, remplir les autres filtres
                if (inputId === 'filterLog') {
                    const agentData = data.find(d => d.log === value);
                    if (agentData) {
                        document.getElementById('filterAgent').value = agentData.agent;
                        // Cocher automatiquement TL et compétence
                        document.querySelectorAll('.tl-checkbox').forEach(cb => {
                            cb.checked = (cb.value === agentData.encadrant);
                        });
                        document.querySelectorAll('.comp-checkbox').forEach(cb => {
                            cb.checked = (cb.value === agentData.competence);
                        });
                    }
                }
                
                // Si agent sélectionné, remplir log
                if (inputId === 'filterAgent') {
                    const agentData = data.find(d => d.agent === value);
                    if (agentData) {
                        document.getElementById('filterLog').value = agentData.log;
                        document.querySelectorAll('.tl-checkbox').forEach(cb => {
                            cb.checked = (cb.value === agentData.encadrant);
                        });
                        document.querySelectorAll('.comp-checkbox').forEach(cb => {
                            cb.checked = (cb.value === agentData.competence);
                        });
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

function applyDefaultFilter() {
    // Par défaut: agents ACTIFS + mois en cours
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('filterPeriod').value = currentMonth;
    document.getElementById('filterDateType').value = 'active';
    applyFiltersAuto();
}

function applyFiltersAuto() {
    let data = [...mergedData];
    
    // Filtre Log
    const logFilter = document.getElementById('filterLog').value.trim();
    if (logFilter) {
        data = data.filter(d => d.log.toLowerCase().includes(logFilter.toLowerCase()));
    }
    
    // Filtre Agent
    const agentFilter = document.getElementById('filterAgent').value.trim();
    if (agentFilter) {
        data = data.filter(d => d.agent.toLowerCase().includes(agentFilter.toLowerCase()));
    }
    
    // Filtre TL
    const selectedTLs = Array.from(document.querySelectorAll('.tl-checkbox:checked')).map(cb => cb.value);
    if (selectedTLs.length > 0) {
        data = data.filter(d => selectedTLs.includes(d.encadrant));
    }
    
    // Filtre Compétence
    const selectedComps = Array.from(document.querySelectorAll('.comp-checkbox:checked')).map(cb => cb.value);
    if (selectedComps.length > 0) {
        data = data.filter(d => selectedComps.includes(d.competence));
    }
    
    // Filtre Date fin
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
    
    // Filtre Période NPS
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
    document.getElementById('filterDateType').value = 'active';
    document.getElementById('filterDate').style.display = 'none';
    document.getElementById('filterDate').value = '';
    
    applyDefaultFilter();
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
    
    const trendText = `${data.filter(d => d.score >= 9).length} promoteurs`;
    document.getElementById('npsTrend').textContent = trendText;
    
    document.getElementById('nbSurveys').textContent = data.length;
    const detailSurvey = `${data.filter(d => d.score >= 9).length} promoteurs, ${data.filter(d => d.score >= 7 && d.score <= 8).length} passifs, ${data.filter(d => d.score <= 6).length} détracteurs`;
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
    if (nps >= 50) return '#10b981';
    if (nps >= 0) return '#f59e0b';
    return '#ef4444';
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
    
    const monthlyData = {};
    data.forEach(d => {
        if (!d.month) return;
        if (!monthlyData[d.month]) {
            monthlyData[d.month] = [];
        }
        monthlyData[d.month].push(d);
    });
    
    const months = Object.keys(monthlyData).sort();
    const npsValues = months.map(m => calculateNPS(monthlyData[m]));
    
    const ctx = document.getElementById('npsEvolutionChart');
    charts.evolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
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
                y: { beginAtZero: false, min: -100, max: 100 }
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
    
    const topBottom = [...tlNPS.slice(0, 5), ...tlNPS.slice(-5)];
    
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
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: false, min: -100, max: 100 }
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
                y: { beginAtZero: false, min: -100, max: 100 }
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
                    if (i <= 6) return '#ef4444';
                    if (i <= 8) return '#f59e0b';
                    return '#10b981';
                })
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
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
                scores: []
            };
        }
        agentData[key].scores.push(d.score);
    });
    
    const agentMetrics = Object.values(agentData).map(agent => {
        const nps = calculateNPS(agent.scores.map(s => ({ score: s })));
        const promoters = agent.scores.filter(s => s >= 9).length;
        const passives = agent.scores.filter(s => s >= 7 && s <= 8).length;
        const detractors = agent.scores.filter(s => s <= 6).length;
        
        const agentRecords = data.filter(d => d.log === agent.log);
        const resolved = agentRecords.filter(d => d.resolution === 'Oui').length;
        const resolutionRate = agentRecords.length > 0 ? (resolved / agentRecords.length * 100).toFixed(1) : 0;
        
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
            <td style="color: ${getNPSColor(agent.nps)}; font-weight: 600;">${agent.nps.toFixed(0)}</td>
            <td>${agent.nbSurveys}</td>
            <td>${agent.resolutionRate}%</td>
            <td>${agent.promoters}</td>
            <td>${agent.passives}</td>
            <td>${agent.detractors}</td>
            <td>${agent.dateFin || '-'}</td>
        </tr>
    `).join('');
    
    document.getElementById('tableSearch').addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
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
// AI ANALYSIS
// ========================================
document.getElementById('analyzeBtn').addEventListener('click', analyzeVerbatims);

async function analyzeVerbatims() {
    const apiChoice = document.querySelector('input[name="apiChoice"]:checked').value;
    const apiKey = apiChoice === 'openai' 
        ? document.getElementById('openaiKey').value 
        : document.getElementById('geminiKey').value;
    
    if (!apiKey) {
        alert('Veuillez entrer une clé API valide');
        return;
    }
    
    showLoading(true);
    
    try {
        const verbatims = filteredData
            .filter(d => d.verbatim && d.verbatim.length > 10)
            .map(d => d.verbatim)
            .join('\n---\n');
        
        if (!verbatims) {
            alert('Aucun verbatim à analyser dans la sélection actuelle');
            showLoading(false);
            return;
        }
        
        const analysis = await callAIAPI(apiChoice, apiKey, verbatims);
        displayAnalysis(analysis);
        
        showLoading(false);
    } catch (error) {
        showLoading(false);
        alert('Erreur lors de l\'analyse IA: ' + error.message);
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

Réponds en JSON avec cette structure:
{
  "themes": ["thème 1", "thème 2", ...],
  "weaknesses": ["point faible 1", "point faible 2", ...],
  "actionPlan": {
    "30days": {"actions": ["action 1", ...], "kpis": ["kpi 1", ...]},
    "60days": {"actions": ["action 1", ...], "kpis": ["kpi 1", ...]},
    "90days": {"actions": ["action 1", ...], "kpis": ["kpi 1", ...]}
  },
  "tags": ["#tag1", "#tag2", ...]
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
                    { role: 'system', content: 'Tu es un expert en analyse de feedback client et en expérience client.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            throw new Error(`Erreur API OpenAI: ${response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
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
            throw new Error(`Erreur API Gemini: ${response.statusText}`);
        }
        
        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error('Format de réponse invalide');
    }
}

function displayAnalysis(analysis) {
    document.getElementById('analysisResults').style.display = 'block';
    
    const themesDiv = document.getElementById('themes');
    themesDiv.innerHTML = '<ul>' + analysis.themes.map(t => `<li>${t}</li>`).join('') + '</ul>';
    
    const weaknessesDiv = document.getElementById('weaknesses');
    weaknessesDiv.innerHTML = '<ul>' + analysis.weaknesses.map(w => `<li>${w}</li>`).join('') + '</ul>';
    
    const actionPlanDiv = document.getElementById('actionPlan');
    actionPlanDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #00f2fe; margin-bottom: 10px;">📅 30 jours</h4>
            <p style="font-weight: 600; margin-bottom: 5px;">Actions:</p>
            <ul>${analysis.actionPlan['30days'].actions.map(a => `<li>${a}</li>`).join('')}</ul>
            <p style="font-weight: 600; margin-top: 10px; margin-bottom: 5px;">KPIs:</p>
            <ul>${analysis.actionPlan['30days'].kpis.map(k => `<li>${k}</li>`).join('')}</ul>
        </div>
        <div style="margin-bottom: 20px;">
            <h4 style="color: #00f2fe; margin-bottom: 10px;">📅 60 jours</h4>
            <p style="font-weight: 600; margin-bottom: 5px;">Actions:</p>
            <ul>${analysis.actionPlan['60days'].actions.map(a => `<li>${a}</li>`).join('')}</ul>
            <p style="font-weight: 600; margin-top: 10px; margin-bottom: 5px;">KPIs:</p>
            <ul>${analysis.actionPlan['60days'].kpis.map(k => `<li>${k}</li>`).join('')}</ul>
        </div>
        <div style="margin-bottom: 20px;">
            <h4 style="color: #00f2fe; margin-bottom: 10px;">📅 90 jours</h4>
            <p style="font-weight: 600; margin-bottom: 5px;">Actions:</p>
            <ul>${analysis.actionPlan['90days'].actions.map(a => `<li>${a}</li>`).join('')}</ul>
            <p style="font-weight: 600; margin-top: 10px; margin-bottom: 5px;">KPIs:</p>
            <ul>${analysis.actionPlan['90days'].kpis.map(k => `<li>${k}</li>`).join('')}</ul>
        </div>
    `;
    
    const tagsDiv = document.getElementById('tags');
    tagsDiv.innerHTML = analysis.tags.map(tag => 
        `<span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 25px; margin: 5px; font-size: 0.9rem; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">${tag}</span>`
    ).join('');
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}
