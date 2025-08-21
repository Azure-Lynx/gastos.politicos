class ParlamentarApp {
    constructor() {
        this.data = {};
        this.suggestions = [];
        this.currentChart = null;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.populateYearSelect();
        this.showLoading(false);
        // Load random parlamentar and year by default
        this.loadRandomParlamentar();
    }

    async loadData() {
        this.showLoading(true);
        try {
            const response = await fetch('../assets/data/gastos_por_parlamentar.json');
            this.data = await response.json();
            this.suggestions = Object.values(this.data).map(p => p.nome);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar os dados. Verifique se o arquivo JSON está disponível.');
        }
        this.showLoading(false);
    }

    setupEventListeners() {
        const searchInput = document.getElementById('parlamentar-search');
        const searchBtn = document.getElementById('search-btn');
        const shareBtn = document.getElementById('share-btn');
        const suggestionsDiv = document.getElementById('suggestions');

        // Search functionality
        searchBtn.addEventListener('click', () => this.searchParlamentar());
        
        // Enter key search
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchParlamentar();
            }
        });

        // Autocomplete functionality
        searchInput.addEventListener('input', (e) => {
            this.showSuggestions(e.target.value);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-group')) {
                suggestionsDiv.style.display = 'none';
            }
        });

        // Share functionality
        shareBtn.addEventListener('click', () => this.shareResults());
    }

    populateYearSelect() {
        const yearSelect = document.getElementById('year-select');
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

    loadRandomParlamentar() {
        // Get all parlamentares that have data
        const parlamentares = Object.values(this.data);
        
        if (parlamentares.length === 0) {
            return;
        }

        // Select a random parlamentar
        const randomParlamentar = parlamentares[Math.floor(Math.random() * parlamentares.length)];
        
        // Get available years for this parlamentar
        const availableYears = Object.keys(randomParlamentar.gastos);
        
        if (availableYears.length === 0) {
            return;
        }

        // Select a random year from available years
        const randomYear = availableYears[Math.floor(Math.random() * availableYears.length)];
        
        // Set the form values
        document.getElementById('parlamentar-search').value = randomParlamentar.nome;
        document.getElementById('year-select').value = randomYear;
        
        // Display the results
        this.displayResults(randomParlamentar, randomYear);
    }

    showSuggestions(query) {
        const suggestionsDiv = document.getElementById('suggestions');
        
        if (!query.trim()) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        const filtered = this.suggestions.filter(name => 
            name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);

        if (filtered.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = filtered.map(name => 
            `<div class="suggestion-item" onclick="app.selectSuggestion('${name.replace(/'/g, "\\'")}')">
                ${name}
            </div>`
        ).join('');

        suggestionsDiv.style.display = 'block';
    }

    selectSuggestion(name) {
        document.getElementById('parlamentar-search').value = name;
        document.getElementById('suggestions').style.display = 'none';
    }

    searchParlamentar() {
        const searchInput = document.getElementById('parlamentar-search');
        const yearSelect = document.getElementById('year-select');
        const name = searchInput.value.trim();
        const year = yearSelect.value;

        if (!name) {
            alert('Por favor, digite o nome de um parlamentar.');
            return;
        }

        this.showLoading(true);
        
        // Simulate loading delay for better UX
        setTimeout(() => {
            const parlamentar = this.findParlamentar(name);
            
            if (parlamentar && parlamentar.gastos[year]) {
                this.displayResults(parlamentar, year);
            } else {
                this.showNoResults();
            }
            
            this.showLoading(false);
        }, 500);
    }

    findParlamentar(name) {
        return Object.values(this.data).find(p => 
            p.nome.toLowerCase() === name.toLowerCase()
        );
    }

    displayResults(parlamentar, year) {
        // Hide no results and show results section
        document.getElementById('no-results').style.display = 'none';
        document.getElementById('results-section').style.display = 'block';

        // Update parlamentar info
    document.getElementById('parlamentar-name').textContent = parlamentar.nome;
    document.getElementById('parlamentar-party').textContent = `${parlamentar.partido} - ${parlamentar.uf}`;
    // Prefer local image if available, fallback to foto
    let imgSrc = parlamentar.imagem || parlamentar.foto;
    if (imgSrc && imgSrc.startsWith("assets/images/")) {
        imgSrc = "../" + imgSrc;
    }
    document.getElementById('parlamentar-photo').src = imgSrc;

        // Calculate and display total
        const expenses = parlamentar.gastos[year];
        const total = Object.values(expenses).reduce((sum, value) => sum + value, 0);
        
        document.getElementById('total-expenses').innerHTML = 
            `Total gasto em ${year}: R$ ${this.formatCurrency(total)}`;

        // Display expenses list
        this.displayExpensesList(expenses);
        
        // Display chart
        this.displayChart(expenses);
    }

    displayExpensesList(expenses) {
        const container = document.getElementById('expenses-items');
        
        // Sort expenses by value (descending)
        const sortedExpenses = Object.entries(expenses)
            .sort(([,a], [,b]) => b - a);

        container.innerHTML = sortedExpenses.map(([category, value]) => {
            const icon = this.getCategoryIcon(category);
            const colorClass = this.getCategoryColorClass(category);
            
            return `
                <div class="expense-item">
                    <div class="expense-icon ${colorClass}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="expense-category">${category}</div>
                    <div class="expense-value">R$ ${this.formatCurrency(value)}</div>
                </div>
            `;
        }).join('');
    }

    displayChart(expenses) {
        const ctx = document.getElementById('expenses-chart').getContext('2d');
        
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

    showNoResults() {
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('no-results').style.display = 'block';
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    shareResults() {
        const parlamentarName = document.getElementById('parlamentar-name').textContent;
        const year = document.getElementById('year-select').value;
        const total = document.getElementById('total-expenses').textContent;
        
        const shareText = `Confira os gastos detalhados de ${parlamentarName} em ${year}!\n${total}`;
        const shareUrl = window.location.href;

        if (navigator.share) {
            navigator.share({
                title: 'Gastos por Parlamentar',
                text: shareText,
                url: shareUrl
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
                alert('Link copiado para a área de transferência!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = `${shareText}\n${shareUrl}`;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('Link copiado para a área de transferência!');
            });
        }
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

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ParlamentarApp();
});
