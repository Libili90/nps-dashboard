// ============================================
// VARIABLES GLOBALES
// ============================================

let mergedData = [];
let filteredData = [];
let periodRange = 30;

let revenueChart = null;
let profitChart = null;
let categoryChart = null;

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    initTheme();
    updateLastUpdateTime();
    setInterval(updateLastUpdateTime, 1000);
});

function initEventListeners() {
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    document.getElementById('period-select').addEventListener('change', handlePeriodChange);
    document.getElementById('category-filter').addEventListener('change', handleCategoryFilter);
    document.getElementById('export-btn').addEventListener('click', exportData);
}

// ============================================
// GESTION DES FICHIERS
// ============================================

async function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    showLoading();

    try {
        const allData = [];

        for (let file of files) {
            const data = await readFile(file);
            allData.push(...data);
        }

        mergedData = allData.sort((a, b) => new Date(a.date) - new Date(b.date));
        filteredData = [...mergedData];
        
        populateCategoryFilter();
        updateDashboard();
        updateLastUpdateTime();
        hideLoading();
        
        showNotification('✅ Fichiers chargés avec succès !', 'success');
    } catch (error) {
        console.error('Erreur:', error);
        hideLoading();
        showNotification('❌ Erreur lors du chargement', 'error');
    }
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const fileName = file.name.toLowerCase();

        reader.onload = (e) => {
            try {
                let data = [];

                if (fileName.endsWith('.csv')) {
                    data = parseCSV(e.target.result);
                } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                    data = parseExcel(e.target.result);
                }

                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));

        if (fileName.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    });
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const dateIndex = headers.findIndex(h => h === 'date');
    const categoryIndex = headers.findIndex(h => h === 'category' || h === 'catégorie');
    const revenueIndex = headers.findIndex(h => h === 'revenue' || h === 'revenus');
    const costsIndex = headers.findIndex(h => h === 'costs' || h === 'coûts');

    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        
        if (values.length < 4) continue;

        data.push({
            date: values[dateIndex]?.trim(),
            category: values[categoryIndex]?.trim(),
            revenue: parseFloat(values[revenueIndex]) || 0,
            costs: parseFloat(values[costsIndex]) || 0
        });
    }

    return data;
}

function parseExcel(data) {
    const workbook = XLSX.read(data, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    return jsonData.map(row => ({
        date: row.date || row.Date || '',
        category: row.category || row.Catégorie || row.Category || '',
        revenue: parseFloat(row.revenue || row.Revenus || row.Revenue) || 0,
        costs: parseFloat(row.costs || row.Coûts || row.Costs) || 0
    }));
}

// ============================================
// FILTRES
// ============================================

function populateCategoryFilter() {
    const categories = [...new Set(mergedData.map(item => item.category))];
    const select = document.getElementById('category-filter');
    
    select.innerHTML = '<option value="">Toutes les catégories</option>';
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function handlePeriodChange(event) {
    periodRange = parseInt(event.target.value);
    applyFilters();
}

function handleCategoryFilter(event) {
    applyFilters();
}

function applyFilters() {
    const selectedCategory = document.getElementById('category-filter').value;
    
    filteredData = mergedData.filter(item => {
        if (selectedCategory && item.category !== selectedCategory) {
            return false;
        }
        return true;
    });

    if (periodRange > 0) {
        filteredData = filteredData.slice(-periodRange);
    }

    updateDashboard();
}

// ============================================
// MISE À JOUR DU DASHBOARD
// ============================================

function updateDashboard() {
    if (filteredData.length === 0) return;
    
    calculateKPIs();
    updateCharts();
    updateTable();
    updateSummary();
}

function calculateKPIs() {
    const data = filteredData;
    
    if (data.length === 0) return;

    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);

    const totalCosts = data.reduce((sum, item) => sum + item.costs, 0);
    document.getElementById('total-costs').textContent = formatCurrency(totalCosts);

    const totalProfit = totalRevenue - totalCosts;
    document.getElementById('total-profit').textContent = formatCurrency(totalProfit);

    const avgMargin = (totalProfit / totalRevenue) * 100;
    document.getElementById('avg-margin').textContent = avgMargin.toFixed(1) + '%';

    calculateTrends();
}

function calculateTrends() {
    const halfPoint = Math.floor(filteredData.length / 2);
    
    if (halfPoint < 1) return;

    const oldData = filteredData.slice(0, halfPoint);
    const newData = filteredData.slice(halfPoint);

    const oldRevenue = oldData.reduce((sum, item) => sum + item.revenue, 0);
    const newRevenue = newData.reduce((sum, item) => sum + item.revenue, 0);
    const revenueTrend = ((newRevenue - oldRevenue) / oldRevenue) * 100;
    updateTrendIndicator('revenue-trend', revenueTrend);

    const oldCosts = oldData.reduce((sum, item) => sum + item.costs, 0);
    const newCosts = newData.reduce((sum, item) => sum + item.costs, 0);
    const costsTrend = ((newCosts - oldCosts) / oldCosts) * 100;
    updateTrendIndicator('costs-trend', costsTrend);

    const oldProfit = oldRevenue - oldCosts;
    const newProfit = newRevenue - newCosts;
    const profitTrend = ((newProfit - oldProfit) / oldProfit) * 100;
    updateTrendIndicator('profit-trend', profitTrend);
}

function updateTrendIndicator(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const sign = trend >= 0 ? '+' : '';
    element.textContent = sign + trend.toFixed(1) + '%';
    element.className = 'kpi-trend ' + (trend >= 0 ? 'positive' : 'negative');
}

// ============================================
// GRAPHIQUES
// ============================================

function updateCharts() {
    updateRevenueChart();
    updateProfitChart();
    updateCategoryChart();
}

function updateRevenueChart() {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredData.map(item => item.date),
            datasets: [{
                label: 'Revenus',
                data: filteredData.map(item => item.revenue),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function updateProfitChart() {
    const ctx = document.getElementById('profit-chart');
    if (!ctx) return;

    if (profitChart) {
        profitChart.destroy();
    }

    const profits = filteredData.map(item => item.revenue - item.costs);

    profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredData.map(item => item.date),
            datasets: [{
                label: 'Profit',
                data: profits,
                backgroundColor: profits.map(p => p >= 0 ? '#10b981' : '#ef4444')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    });
}

function updateCategoryChart() {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    if (categoryChart) {
        categoryChart.destroy();
    }

    const categoryData = {};
    filteredData.forEach(item => {
        if (!categoryData[item.category]) {
            categoryData[item.category] = 0;
        }
        categoryData[item.category] += item.revenue;
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + formatCurrency(context.parsed) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// ============================================
// TABLEAU
// ============================================

function updateTable() {
    const tbody = document.getElementById('data-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const displayData = filteredData.slice(-50);

    if (displayData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">
                    <i class="fas fa-inbox"></i>
                    <p>Aucune donnée disponible</p>
                    <small>Chargez un fichier pour commencer</small>
                </td>
            </tr>
        `;
        return;
    }

    displayData.forEach(item => {
        const row = document.createElement('tr');
        const profit = item.revenue - item.costs;
        const margin = (profit / item.revenue) * 100;

        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.category}</td>
            <td>${formatCurrency(item.revenue)}</td>
            <td>${formatCurrency(item.costs)}</td>
            <td class="${profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(profit)}</td>
            <td>${margin.toFixed(1)}%</td>
        `;

        tbody.appendChild(row);
    });

    updateTableCount();
}

function updateTableCount() {
    const count = filteredData.length;
    const countElement = document.getElementById('table-count');
    if (countElement) {
        countElement.textContent = `${count} entrée${count > 1 ? 's' : ''}`;
    }
}

// ============================================
// IA LOCALE
// ============================================

function updateSummary() {
    const summaryDiv = document.getElementById('ai-summary');
    if (!summaryDiv) return;

    summaryDiv.innerHTML = '<p class="loading">⏳ Génération de l\'analyse...</p>';
    
    setTimeout(() => {
        const summary = generateAISummary();
        summaryDiv.innerHTML = summary;
    }, 500);
}

function generateAISummary() {
    if (filteredData.length === 0) {
        return '<p class="placeholder">Chargez des données pour obtenir une analyse...</p>';
    }

    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCosts = filteredData.reduce((sum, item) => sum + item.costs, 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgMargin = (totalProfit / totalRevenue) * 100;

    const profits = filteredData.map(item => ({
        date: item.date,
        profit: item.revenue - item.costs
    }));
    
    const bestDay = profits.reduce((max, item) => item.profit > max.profit ? item : max);
    const worstDay = profits.reduce((min, item) => item.profit < min.profit ? item : min);

    const halfPoint = Math.floor(filteredData.length / 2);
    const recentData = filteredData.slice(halfPoint);
    const olderData = filteredData.slice(0, halfPoint);
    
    const recentAvg = recentData.reduce((sum, item) => sum + item.revenue, 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, item) => sum + item.revenue, 0) / olderData.length;
    
    const trend = recentAvg > olderAvg ? 'hausse' : 'baisse';
    const trendPercent = Math.abs(((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1);

    const categoryRevenue = {};
    filteredData.forEach(item => {
        categoryRevenue[item.category] = (categoryRevenue[item.category] || 0) + item.revenue;
    });
    
    const topCategory = Object.entries(categoryRevenue).sort((a, b) => b[1] - a[1])[0];

    return `
        <div class="ai-summary-content">
            <h3>📊 Analyse Intelligente</h3>
            
            <div class="summary-section">
                <h4>Performance Globale</h4>
                <p>Sur la période analysée, votre activité a généré <strong>${formatCurrency(totalRevenue)}</strong> 
                de revenus pour <strong>${formatCurrency(totalCosts)}</strong> de coûts, 
                résultant en un profit de <strong>${formatCurrency(totalProfit)}</strong> 
                (marge: <strong>${avgMargin.toFixed(1)}%</strong>).</p>
            </div>

            <div class="summary-section">
                <h4>Tendance</h4>
                <p>Les revenus sont en <strong>${trend}</strong> de <strong>${trendPercent}%</strong> 
                par rapport à la première moitié de la période.</p>
            </div>

            <div class="summary-section">
                <h4>Points Clés</h4>
                <ul>
                    <li><strong>Meilleure journée:</strong> ${bestDay.date} (${formatCurrency(bestDay.profit)})</li>
                    <li><strong>Journée la plus difficile:</strong> ${worstDay.date} (${formatCurrency(worstDay.profit)})</li>
                    <li><strong>Catégorie dominante:</strong> ${topCategory[0]} (${formatCurrency(topCategory[1])})</li>
                </ul>
            </div>

            <div class="summary-section">
                <h4>💡 Recommandations</h4>
                ${generateRecommendations(avgMargin, trend)}
            </div>
        </div>
    `;
}

function generateRecommendations(margin, trend) {
    const recommendations = [];

    if (margin < 20) {
        recommendations.push('<li>⚠️ Votre marge est faible. Envisagez d\'optimiser vos coûts ou d\'augmenter vos prix.</li>');
    } else if (margin > 40) {
        recommendations.push('<li>✅ Excellente marge ! Maintenez cette performance.</li>');
    } else {
        recommendations.push('<li>👍 Marge saine. Continuez sur cette voie.</li>');
    }

    if (trend === 'baisse') {
        recommendations.push('<li>📉 Attention à la tendance baissière. Analysez les causes et ajustez votre stratégie.</li>');
    } else {
        recommendations.push('<li>📈 Bonne dynamique de croissance. Capitalisez sur cette tendance.</li>');
    }

    return '<ul>' + recommendations.join('') + '</ul>';
}

// ============================================
// EXPORT XLSX
// ============================================

async function exportData() {
    if (filteredData.length === 0) {
        showNotification('❌ Aucune donnée à exporter', 'error');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();
        
        const exportData = filteredData.map(item => ({
            'Date': item.date,
            'Catégorie': item.category,
            'Revenus': item.revenue,
            'Coûts': item.costs,
            'Profit': item.revenue - item.costs,
            'Marge (%)': (((item.revenue - item.costs) / item.revenue) * 100).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [
            { wch: 12 }, { wch: 15 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 12 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Données");

        const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
        const totalCosts = filteredData.reduce((sum, item) => sum + item.costs, 0);
        const totalProfit = totalRevenue - totalCosts;

        const summaryData = [
            ['RÉSUMÉ FINANCIER', ''],
            ['', ''],
            ['Période', `${filteredData[0]?.date || ''} - ${filteredData[filteredData.length - 1]?.date || ''}`],
            ['Nombre d\'entrées', filteredData.length],
            ['', ''],
            ['Revenus Totaux', totalRevenue],
            ['Coûts Totaux', totalCosts],
            ['Profit Total', totalProfit],
            ['Marge Moyenne (%)', ((totalProfit / totalRevenue) * 100).toFixed(2)]
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

        const fileName = `finances_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showNotification('✅ Export XLSX réussi !', 'success');
    } catch (error) {
        console.error('Erreur export:', error);
        showNotification('❌ Erreur lors de l\'export', 'error');
    }
}

// ============================================
// THÈME
// ============================================

function initTheme() {
    const themeBtn = document.getElementById('theme-btn');
    if (!themeBtn) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        if (filteredData.length > 0) {
            updateCharts();
        }
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-btn i');
    if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ============================================
// UTILITAIRES
// ============================================

function formatCurrency(value) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const element = document.getElementById('last-update');
    if (element) {
        element.textContent = `Mise à jour: ${timeString}`;
    }
}

function showLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

console.log('✅ Dashboard financier initialisé !');
console.log('📊 Prêt à charger des données...');
