// ============================================
// SECTION 5: MISE À JOUR DU DASHBOARD
// ============================================

function updateDashboard() {
    calculateKPIs();
    updateCharts();
    updateTable();
    updateSummary();
}

function calculateKPIs() {
    const data = filteredData.slice(-periodRange);
    
    if (data.length === 0) return;

    // Revenus totaux
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);

    // Coûts totaux
    const totalCosts = data.reduce((sum, item) => sum + item.costs, 0);
    document.getElementById('total-costs').textContent = formatCurrency(totalCosts);

    // Profit total
    const totalProfit = totalRevenue - totalCosts;
    document.getElementById('total-profit').textContent = formatCurrency(totalProfit);

    // Marge moyenne
    const avgMargin = (totalProfit / totalRevenue) * 100;
    document.getElementById('avg-margin').textContent = avgMargin.toFixed(1) + '%';

    // Tendances (comparaison avec période précédente)
    calculateTrends(data);
}

function calculateTrends(currentData) {
    const previousData = filteredData.slice(-periodRange * 2, -periodRange);
    
    if (previousData.length === 0) return;

    const currentRevenue = currentData.reduce((sum, item) => sum + item.revenue, 0);
    const previousRevenue = previousData.reduce((sum, item) => sum + item.revenue, 0);
    
    const revenueTrend = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    updateTrendIndicator('revenue-trend', revenueTrend);

    const currentCosts = currentData.reduce((sum, item) => sum + item.costs, 0);
    const previousCosts = previousData.reduce((sum, item) => sum + item.costs, 0);
    
    const costsTrend = ((currentCosts - previousCosts) / previousCosts) * 100;
    updateTrendIndicator('costs-trend', costsTrend);

    const currentProfit = currentRevenue - currentCosts;
    const previousProfit = previousRevenue - previousCosts;
    
    const profitTrend = ((currentProfit - previousProfit) / previousProfit) * 100;
    updateTrendIndicator('profit-trend', profitTrend);
}

function updateTrendIndicator(elementId, trend) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = (trend >= 0 ? '+' : '') + trend.toFixed(1) + '%';
    element.className = 'trend ' + (trend >= 0 ? 'positive' : 'negative');
}

// ============================================
// SECTION 6: GRAPHIQUES (Chart.js)
// ============================================

let revenueChart, profitChart, categoryChart;

function updateCharts() {
    updateRevenueChart();
    updateProfitChart();
    updateCategoryChart();
}

function updateRevenueChart() {
    const data = filteredData.slice(-periodRange);
    
    const ctx = document.getElementById('revenue-chart').getContext('2d');
    
    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item.date),
            datasets: [{
                label: 'Revenus',
                data: data.map(item => item.revenue),
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
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updateProfitChart() {
    const data = filteredData.slice(-periodRange);
    
    const ctx = document.getElementById('profit-chart').getContext('2d');
    
    if (profitChart) {
        profitChart.destroy();
    }

    profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.date),
            datasets: [{
                label: 'Profit',
                data: data.map(item => item.revenue - item.costs),
                backgroundColor: data.map(item => 
                    item.revenue - item.costs >= 0 ? '#10b981' : '#ef4444'
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function updateCategoryChart() {
    const categoryData = {};
    
    filteredData.slice(-periodRange).forEach(item => {
        if (!categoryData[item.category]) {
            categoryData[item.category] = 0;
        }
        categoryData[item.category] += item.revenue;
    });

    const ctx = document.getElementById('category-chart').getContext('2d');
    
    if (categoryChart) {
        categoryChart.destroy();
    }

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
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
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
// SECTION 7: TABLEAU DE DONNÉES
// ============================================

function updateTable() {
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';

    const data = filteredData.slice(-50); // Dernières 50 entrées

    data.forEach(item => {
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
}

function updateSummary() {
    const summaryDiv = document.getElementById('ai-summary');
    summaryDiv.innerHTML = '<p class="loading">Génération du résumé...</p>';
    
    setTimeout(() => {
        const summary = generateAISummary();
        summaryDiv.innerHTML = summary;
    }, 500);
}

// ============================================
// SECTION 8: IA LOCALE (Sans API)
// ============================================

function generateAISummary() {
    const data = filteredData.slice(-periodRange);
    
    if (data.length === 0) {
        return '<p>Aucune donnée disponible pour l\'analyse.</p>';
    }

    // Calculs statistiques
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalCosts = data.reduce((sum, item) => sum + item.costs, 0);
    const totalProfit = totalRevenue - totalCosts;
    const avgMargin = (totalProfit / totalRevenue) * 100;

    // Meilleure et pire journée
    const profits = data.map(item => ({
        date: item.date,
        profit: item.revenue - item.costs
    }));
    
    const bestDay = profits.reduce((max, item) => item.profit > max.profit ? item : max);
    const worstDay = profits.reduce((min, item) => item.profit < min.profit ? item : min);

    // Tendance
    const recentData = data.slice(-7);
    const olderData = data.slice(-14, -7);
    
    const recentAvg = recentData.reduce((sum, item) => sum + item.revenue, 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, item) => sum + item.revenue, 0) / olderData.length;
    
    const trend = recentAvg > olderAvg ? 'hausse' : 'baisse';
    const trendPercent = Math.abs(((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1);

    // Catégorie dominante
    const categoryRevenue = {};
    data.forEach(item => {
        categoryRevenue[item.category] = (categoryRevenue[item.category] || 0) + item.revenue;
    });
    
    const topCategory = Object.entries(categoryRevenue)
        .sort((a, b) => b[1] - a[1])[0];

    // Génération du résumé HTML
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
                par rapport à la période précédente.</p>
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
                ${generateRecommendations(avgMargin, trend, data)}
            </div>
        </div>
    `;
}

function generateRecommendations(margin, trend, data) {
    const recommendations = [];

    if (margin < 20) {
        recommendations.push('<li>⚠️ Votre marge est faible. Envisagez d\'optimiser vos coûts ou d\'augmenter vos prix.</li>');
    } else if (margin > 40) {
        recommendations.push('<li>✅ Excellente marge ! Maintenez cette performance.</li>');
    }

    if (trend === 'baisse') {
        recommendations.push('<li>📉 Attention à la tendance baissière. Analysez les causes et ajustez votre stratégie.</li>');
    } else {
        recommendations.push('<li>📈 Bonne dynamique de croissance. Capitalisez sur cette tendance.</li>');
    }

    // Analyse de la volatilité
    const revenues = data.map(item => item.revenue);
    const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);
    const volatility = (stdDev / avg) * 100;

    if (volatility > 30) {
        recommendations.push('<li>⚡ Forte volatilité détectée. Travaillez sur la stabilisation de vos revenus.</li>');
    }

    return '<ul>' + recommendations.join('') + '</ul>';
}

// ============================================
// SECTION 9: EXPORT XLSX
// ============================================

async function exportData() {
    try {
        // Créer un nouveau workbook
        const wb = XLSX.utils.book_new();
        
        // Préparer les données pour l'export
        const exportData = filteredData.map(item => ({
            'Date': item.date,
            'Catégorie': item.category,
            'Revenus': item.revenue,
            'Coûts': item.costs,
            'Profit': item.revenue - item.costs,
            'Marge (%)': (((item.revenue - item.costs) / item.revenue) * 100).toFixed(2)
        }));

        // Créer la feuille de données
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Ajouter des styles (largeurs de colonnes)
        ws['!cols'] = [
            { wch: 12 },  // Date
            { wch: 15 },  // Catégorie
            { wch: 15 },  // Revenus
            { wch: 15 },  // Coûts
            { wch: 15 },  // Profit
            { wch: 12 }   // Marge
        ];

        // Ajouter la feuille au workbook
        XLSX.utils.book_append_sheet(wb, ws, "Données Financières");

        // Créer une feuille de résumé
        const summaryData = [
            ['RÉSUMÉ FINANCIER', ''],
            ['', ''],
            ['Période', `${filteredData[0]?.date || ''} - ${filteredData[filteredData.length - 1]?.date || ''}`],
            ['Nombre d\'entrées', filteredData.length],
            ['', ''],
            ['Revenus Totaux', filteredData.reduce((sum, item) => sum + item.revenue, 0)],
            ['Coûts Totaux', filteredData.reduce((sum, item) => sum + item.costs, 0)],
            ['Profit Total', filteredData.reduce((sum, item) => sum + (item.revenue - item.costs), 0)],
            ['Marge Moyenne (%)', ((filteredData.reduce((sum, item) => sum + (item.revenue - item.costs), 0) / filteredData.reduce((sum, item) => sum + item.revenue, 0)) * 100).toFixed(2)]
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

        // Générer le fichier
        const fileName = `finances_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showNotification('Export XLSX réussi !', 'success');
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        showNotification('Erreur lors de l\'export XLSX', 'error');
    }
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

// ============================================
// UTILITAIRES
// ============================================

function formatCurrency(value) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

// ============================================
// SECTION 10: THÈME SOMBRE/CLAIR
// ============================================

function initTheme() {
    const themeBtn = document.getElementById('theme-btn');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Appliquer le thème sauvegardé
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Toggle theme
    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Recréer les graphiques avec les nouvelles couleurs
        if (mergedData.length > 0) {
            updateCharts();
        }
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#theme-btn i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ============================================
// SECTION 11: MISE À JOUR TEMPS RÉEL
// ============================================

function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('last-update').textContent = `Mise à jour: ${timeString}`;
}

// ============================================
// SECTION 12: COMPTEUR TABLEAU
// ============================================

function updateTableCount() {
    const count = filteredData.length;
    document.getElementById('table-count').textContent = `${count} entrée${count > 1 ? 's' : ''}`;
}

// Mettre à jour la fonction updateTable pour inclure le compteur
const originalUpdateTable = updateTable;
updateTable = function() {
    originalUpdateTable();
    updateTableCount();
};

// ============================================
// SECTION 13: AMÉLIORATIONS DIVERSES
// ============================================

// Spinner de chargement
function showLoading() {
    document.getElementById('loading-spinner').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-spinner').style.display = 'none';
}

// Améliorer la fonction de chargement de fichier
const originalFileUploadHandler = document.getElementById('file-upload').onchange;
document.getElementById('file-upload').addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;
    
    showLoading();
    
    // Attendre un peu pour que le spinner s'affiche
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
        await handleFileUpload(e);
        updateLastUpdateTime();
        hideLoading();
    } catch (error) {
        hideLoading();
        showNotification('Erreur lors du chargement du fichier', 'error');
        console.error(error);
    }
});

// Initialiser le thème au démarrage
initTheme();

// Mettre à jour l'heure toutes les secondes
setInterval(updateLastUpdateTime, 1000);

console.log('✅ Dashboard financier initialisé avec succès !');
console.log('📊 Fonctionnalités disponibles:');
console.log('   - Import CSV/XLSX');
console.log('   - Graphiques interactifs');
console.log('   - IA locale');
console.log('   - Export XLSX');
console.log('   - Thème sombre/clair');
console.log('   - Filtres avancés');
