// Main JavaScript for the home page
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scrolling for any internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add loading animation for page cards
    const pageCards = document.querySelectorAll('.page-card');
    pageCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });

    // Add click analytics (optional - for future use)
    pageCards.forEach(card => {
        card.addEventListener('click', function() {
            const pageName = this.querySelector('h3').textContent;
            console.log(`Navigating to: ${pageName}`);
            // You can add analytics tracking here in the future
        });
    });

    // Initialize CongressApp if congress elements exist
    if (document.getElementById('congress-year-select')) {
        window.congressApp = new CongressApp();
    }
});

class CongressApp {
    constructor() {
        this.data = {};
        this.currentChart = null;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateYearSelect();
        this.showLoading(false);
        // Load current year by default
        this.loadCongressData();
    }

    async loadData() {
        this.showLoading(true);
        try {
            const response = await fetch('assets/data/gastos_por_parlamentar.json');
            this.data = await response.json();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar os dados. Verifique se o arquivo JSON está disponível.');
        }
        this.showLoading(false);
    }

    setupEventListeners() {
        const yearSelect = document.getElementById('congress-year-select');
        
        // Year change functionality
        yearSelect.addEventListener('change', () => this.loadCongressData());
    }

    populateYearSelect() {
        const yearSelect = document.getElementById('congress-year-select');
        const currentYear = new Date().getFullYear();
        
        for (let year = 2008; year <= currentYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    loadCongressData() {
        const yearSelect = document.getElementById('congress-year-select');
        const selectedYear = yearSelect.value;
        
        this.showLoading(true);
        
        // Simulate loading delay for better UX
        setTimeout(() => {
            const congressData = this.aggregateCongressData(selectedYear);
            
            if (congressData && Object.keys(congressData).length > 0) {
                this.displayCongressResults(congressData, selectedYear);
            } else {
                this.showNoResults();
            }
            
            this.showLoading(false);
        }, 500);
    }

    aggregateCongressData(year) {
        const aggregatedData = {};
        
        // Iterate through all parliamentarians
        Object.values(this.data).forEach(parlamentar => {
            if (parlamentar.gastos[year]) {
                Object.entries(parlamentar.gastos[year]).forEach(([category, value]) => {
                    if (aggregatedData[category]) {
                        aggregatedData[category] += value;
                    } else {
                        aggregatedData[category] = value;
                    }
                });
            }
        });

        return aggregatedData;
    }

    displayCongressResults(expenses, year) {
        // Show results section
        document.getElementById('congress-results-section').style.display = 'block';

        // Update congress info
        document.getElementById('congress-year-info').textContent = `Ano: ${year}`;

        // Calculate and display total
        const total = Object.values(expenses).reduce((sum, value) => sum + value, 0);
        
        document.getElementById('congress-total-expenses').innerHTML = 
            `Total gasto em ${year}: R$ ${this.formatCurrency(total)}`;

        // Display expenses list
        this.displayExpensesList(expenses);
        
        // Display chart
        this.displayChart(expenses);
    }

    displayExpensesList(expenses) {
        const container = document.getElementById('congress-expenses-items');
        
        // Sort expenses by value (descending)
        const sortedExpenses = Object.entries(expenses)
            .sort(([,a], [,b]) => b - a);

        container.innerHTML = sortedExpenses.map(([category, value]) => {
            const icon = this.getCategoryIcon(category);
            const colorClass = this.getCategoryColorClass(category);
            
            return `
                <div class="congress-expense-item">
                    <div class="congress-expense-icon ${colorClass}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="congress-expense-category">${category}</div>
                    <div class="congress-expense-value">R$ ${this.formatCurrency(value)}</div>
                </div>
            `;
        }).join('');
    }

    displayChart(expenses) {
        const ctx = document.getElementById('congress-expenses-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const sortedExpenses = Object.entries(expenses)
            .sort(([,a], [,b]) => b - a);

        const data = {
            labels: sortedExpenses.map(([category]) => this.truncateText(category, 20)),
            datasets: [{
                data: sortedExpenses.map(([,value]) => value),
                backgroundColor: sortedExpenses.map(([category]) => this.getCategoryColor(category)),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };

        this.currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.parsed;
                                return `${label}: R$ ${this.formatCurrency(value)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    showLoading(show) {
        document.getElementById('congress-loading').style.display = show ? 'block' : 'none';
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    getCategoryIcon(category) {
        const icons = {
            'ASSINATURA DE PUBLICAÇÕES': 'fas fa-newspaper',
            'COMBUSTÍVEIS E LUBRIFICANTES.': 'fas fa-gas-pump',
            'CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS.': 'fas fa-brain',
            'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': 'fas fa-bullhorn',
            'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR': 'fas fa-utensils',
            'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': 'fas fa-bed',
            'HOSPEDAGEM, EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': 'fas fa-bed',
            'LOCOMOÇÃO, ALIMENTAÇÃO E  HOSPEDAGEM': 'fas fa-car',
            'LOCOMOÇÃO, ALIMENTAÇÃO E HOSPEDAGEM': 'fas fa-car',
            'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': 'fas fa-truck',
            'LOCAÇÃO DE VEÍCULOS AUTOMOTORES OU FRETAMENTO DE EMBARCAÇÕES': 'fas fa-truck',
            'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR': 'fas fa-building',
            'PASSAGEM AÉREA - REEMBOLSO': 'fas fa-plane',
            'PASSAGEM AÉREA - RPA': 'fas fa-plane',
            'PASSAGENS TERRESTRES, MARÍTIMAS OU FLUVIAIS': 'fas fa-ship',
            'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA.': 'fas fa-shield-alt',
            'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO': 'fas fa-parking',
            'SERVIÇOS POSTAIS': 'fas fa-mail-bulk',
            'TELEFONIA': 'fas fa-phone',
            'OUTROS SERVIÇOS': 'fas fa-layer-group'
        };
        
        return icons[category] || 'fas fa-money-bill';
    }

    getCategoryColorClass(category) {
        const classes = {
            'ASSINATURA DE PUBLICAÇÕES': 'category-assinatura',
            'COMBUSTÍVEIS E LUBRIFICANTES.': 'category-combustiveis',
            'CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS.': 'category-consultorias',
            'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': 'category-divulgacao',
            'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR': 'category-alimentacao',
            'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': 'category-hospedagem',
            'HOSPEDAGEM, EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': 'category-hospedagem',
            'LOCOMOÇÃO, ALIMENTAÇÃO E  HOSPEDAGEM': 'category-locomocao',
            'LOCOMOÇÃO, ALIMENTAÇÃO E HOSPEDAGEM': 'category-locomocao',
            'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': 'category-locacao',
            'LOCAÇÃO DE VEÍCULOS AUTOMOTORES OU FRETAMENTO DE EMBARCAÇÕES': 'category-embarcacoes',
            'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR': 'category-manutencao',
            'PASSAGEM AÉREA - REEMBOLSO': 'category-passagem-reembolso',
            'PASSAGEM AÉREA - RPA': 'category-passagem-rpa',
            'PASSAGENS TERRESTRES, MARÍTIMAS OU FLUVIAIS': 'category-passagens',
            'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA.': 'category-seguranca',
            'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO': 'category-taxi',
            'SERVIÇOS POSTAIS': 'category-postais',
            'TELEFONIA': 'category-telefonia',
            'OUTROS SERVIÇOS': 'category-outros'
        };
        
        return classes[category] || 'category-outros';
    }

    getCategoryColor(category) {
        const colors = {
            'ASSINATURA DE PUBLICAÇÕES': '#4CAF50',
            'COMBUSTÍVEIS E LUBRIFICANTES.': '#FF9800',
            'CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS.': '#2196F3',
            'DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.': '#F44336',
            'FORNECIMENTO DE ALIMENTAÇÃO DO PARLAMENTAR': '#9C27B0',
            'HOSPEDAGEM ,EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': '#009688',
            'HOSPEDAGEM, EXCETO DO PARLAMENTAR NO DISTRITO FEDERAL.': '#009688',
            'LOCOMOÇÃO, ALIMENTAÇÃO E  HOSPEDAGEM': '#795548',
            'LOCOMOÇÃO, ALIMENTAÇÃO E HOSPEDAGEM': '#795548',
            'LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES': '#3F51B5',
            'LOCAÇÃO DE VEÍCULOS AUTOMOTORES OU FRETAMENTO DE EMBARCAÇÕES': '#E91E63',
            'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR': '#9E9E9E',
            'PASSAGEM AÉREA - REEMBOLSO': '#FFC107',
            'PASSAGEM AÉREA - RPA': '#00BCD4',
            'PASSAGENS TERRESTRES, MARÍTIMAS OU FLUVIAIS': '#CDDC39',
            'SERVIÇO DE SEGURANÇA PRESTADO POR EMPRESA ESPECIALIZADA.': '#FF5722',
            'SERVIÇO DE TÁXI, PEDÁGIO E ESTACIONAMENTO': '#03A9F4',
            'SERVIÇOS POSTAIS': '#8BC34A',
            'TELEFONIA': '#673AB7',
            'OUTROS SERVIÇOS': '#607D8B'
        };
        
        return colors[category] || '#607D8B';
    }
}
