document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const partidoSelect = document.getElementById('partido-select');
    const estadoSelect = document.getElementById('estado-select');
    const ordenacaoSelect = document.getElementById('ordenacao-select');
    const searchInput = document.getElementById('nome-input');
    const suggestionsDiv = document.getElementById('suggestions');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');
    const rankingHeader = document.getElementById('ranking-header');
    const rankingList = document.getElementById('ranking-list');

    // State variables
    let dadosParlamentares = {};
    let listaMedias = [];
    let listaFiltrada = [];
    let suggestions = [];
    let ordenacao = 'maior';
    let filtroPartido = '';
    let filtroEstado = '';
    let filtroNome = '';

    // Currency formatter
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    // Convert value to double
    function toDouble(v) {
        if (v == null) return 0.0;
        if (typeof v === 'number') return v;
        const s = v.toString().trim();
        if (s === '') return 0.0;
        try {
            return parseFloat(s.replace(/\./g, '').replace(',', '.'));
        } catch (e) {
            return 0.0;
        }
    }

    // Load data and calculate averages
    async function carregarECalcular() {
        try {
            const response = await fetch('../assets/data/gastos_por_parlamentar.json');
            const data = await response.json();
            
            dadosParlamentares = data;
            const acum = [];

            Object.entries(data).forEach(([id, infoRaw]) => {
                if (typeof infoRaw !== 'object') return;

                const info = infoRaw;
                let totalGeral = 0.0;
                let anosComRegistro = 0;

                // Try to use 'totais' field if present (more efficient)
                if (info.totais && typeof info.totais === 'object') {
                    const totais = info.totais;
                    totalGeral = toDouble(totais.totalGeral);
                    
                    // Count years with records
                    const totalPorAno = totais.total_por_ano;
                    if (totalPorAno && typeof totalPorAno === 'object') {
                        anosComRegistro = Object.values(totalPorAno).filter(v => toDouble(v) > 0.0).length;
                    } else {
                        // Fallback: count from gastos
                        const gastos = info.gastos;
                        if (gastos && typeof gastos === 'object') {
                            Object.entries(gastos).forEach(([ano, mapa]) => {
                                let somaAno = 0.0;
                                if (mapa && typeof mapa === 'object') {
                                    Object.values(mapa).forEach(v => somaAno += toDouble(v));
                                }
                                if (somaAno > 0.0) anosComRegistro++;
                            });
                        }
                    }
                } else {
                    // Calculate from 'gastos' (all years)
                    const gastos = info.gastos;
                    if (gastos && typeof gastos === 'object') {
                        Object.entries(gastos).forEach(([ano, mapa]) => {
                            let somaAno = 0.0;
                            if (mapa && typeof mapa === 'object') {
                                Object.values(mapa).forEach(v => somaAno += toDouble(v));
                            }
                            if (somaAno > 0.0) {
                                anosComRegistro++;
                                totalGeral += somaAno;
                            }
                        });
                    }
                }

                const media = (anosComRegistro > 0) ? (totalGeral / anosComRegistro) : 0.0;

                const nome = info.nome || id;
                const partido = info.partido || '';
                const uf = info.uf || '';
                const imagem = info.imagem || '';

                acum.push({
                    id: id,
                    nome: nome,
                    partido: partido,
                    uf: uf,
                    imagem: imagem,
                    totalGeral: totalGeral,
                    anosComRegistro: anosComRegistro,
                    mediaAnual: media
                });
            });

            // Sort descending by average
            acum.sort((a, b) => b.mediaAnual - a.mediaAnual);

            // Extract unique lists for filters
            const partidosSet = new Set();
            const ufsSet = new Set();
            acum.forEach(p => {
                if (p.partido) partidosSet.add(p.partido);
                if (p.uf) ufsSet.add(p.uf);
                suggestions.push(p.nome);
            });

            listaMedias = acum;
            listaFiltrada = [...acum];

            // Populate filter dropdowns
            populateSelect(partidoSelect, [...partidosSet].sort());
            populateSelect(estadoSelect, [...ufsSet].sort());

            aplicarOrdenacao();
            renderRanking();

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            rankingList.innerHTML = '<div style="text-align:center;color:#666;padding:40px;">Erro ao carregar dados.</div>';
        }
    }

    function populateSelect(selectElement, options) {
        // Keep the "Todos" option
        selectElement.innerHTML = '<option value="">Todos</option>';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectElement.appendChild(optionElement);
        });
    }

    function aplicarOrdenacao() {
        listaFiltrada.sort((a, b) => {
            if (ordenacao === 'maior') {
                return b.mediaAnual - a.mediaAnual;
            } else {
                return a.mediaAnual - b.mediaAnual;
            }
        });
        renderRanking();
    }

    function aplicarFiltros() {
        let resultado = [...listaMedias];

        // Filter by name
        if (filtroNome) {
            resultado = resultado.filter(p => 
                p.nome.toLowerCase().includes(filtroNome.toLowerCase())
            );
        }

        // Filter by party
        if (filtroPartido) {
            resultado = resultado.filter(p => p.partido === filtroPartido);
        }

        // Filter by state
        if (filtroEstado) {
            resultado = resultado.filter(p => p.uf === filtroEstado);
        }

        listaFiltrada = resultado;
        aplicarOrdenacao();
    }

    function renderRanking() {
        // Header
        rankingHeader.innerHTML = `<div class="ranking-title" style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:8px;">
            <i class="fas fa-calendar-alt" style="color:#4CAF50;"></i>
            Ranking Médias Anuais (${ordenacao === 'maior' ? 'Maiores' : 'Menores'})
        </div>`;

        // List
        if (!listaFiltrada.length) {
            rankingList.innerHTML = '<div class="no-data" style="text-align:center;color:#666;padding:40px;">Nenhum dado encontrado.</div>';
            return;
        }

        rankingList.innerHTML = listaFiltrada.map((entry, idx) => {
            const nome = entry.nome;
            const partido = entry.partido || '';
            const uf = entry.uf || '';
            let imagem = '';
            if (entry.imagem) {
                imagem = `../${entry.imagem}`;
            }

            let bg = '#fff';
            if (idx === 0) bg = 'rgba(255,215,0,0.12)';
            if (idx === 1) bg = 'rgba(192,192,192,0.12)';
            if (idx === 2) bg = 'rgba(205,127,50,0.12)';

            return `<div class="ranking-item" style="background:${bg};display:flex;align-items:center;padding:20px;border-radius:15px;margin-bottom:15px;box-shadow:0 4px 15px rgba(0,0,0,0.05);transition:all 0.3s ease;">
                <div class="avatar" style="width:60px;height:60px;border-radius:50%;background:#eee;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-right:20px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    ${imagem ? `<img src="${imagem}" alt="${nome}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-weight:bold;font-size:1.8em;color:#4CAF50;">${nome[0] || '?'}</span>`}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:1.3em;color:#333;margin-bottom:5px;">${nome}</div>
                    <div style="color:#666;font-size:1em;display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
                        <span style="background:rgba(76,175,80,0.1);color:#2E7D32;padding:4px 12px;border-radius:20px;font-size:0.9em;font-weight:600;">${partido}</span>
                        <span style="color:#777;">📍 ${uf}</span>
                        <span style="color:#666;font-size:0.9em;">📅 ${entry.anosComRegistro} ano${entry.anosComRegistro !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;font-size:1.4em;color:#4CAF50;">R$ ${formatCurrency(entry.mediaAnual)}</div>
                    <div style="color:#666;font-size:0.9em;margin-top:2px;">Média anual</div>
                </div>
            </div>`;
        }).join('');
    }

    // Event listeners
    ordenacaoSelect.addEventListener('change', e => {
        ordenacao = e.target.value;
        aplicarOrdenacao();
    });

    partidoSelect.addEventListener('change', e => {
        filtroPartido = e.target.value;
        aplicarFiltros();
    });

    estadoSelect.addEventListener('change', e => {
        filtroEstado = e.target.value;
        aplicarFiltros();
    });

    // Search bar logic with suggestions
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        filtroNome = value;
        
        if (!value) {
            suggestionsDiv.style.display = 'none';
            aplicarFiltros();
            return;
        }

        const filtered = suggestions.filter(n => 
            n.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 8);

        if (filtered.length) {
            suggestionsDiv.innerHTML = filtered.map(n => 
                `<div class="suggestion-item">${n}</div>`
            ).join('');
            suggestionsDiv.style.display = 'block';
        } else {
            suggestionsDiv.style.display = 'none';
        }
        
        aplicarFiltros();
    });

    suggestionsDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            searchInput.value = e.target.textContent;
            filtroNome = e.target.textContent;
            suggestionsDiv.style.display = 'none';
            aplicarFiltros();
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.input-group')) {
            suggestionsDiv.style.display = 'none';
        }
    });

    limparFiltrosBtn.addEventListener('click', () => {
        filtroNome = '';
        filtroPartido = '';
        filtroEstado = '';
        ordenacao = 'maior';
        
        searchInput.value = '';
        partidoSelect.value = '';
        estadoSelect.value = '';
        ordenacaoSelect.value = 'maior';
        
        suggestionsDiv.style.display = 'none';
        listaFiltrada = [...listaMedias];
        aplicarOrdenacao();
    });

    // Initialize
    carregarECalcular();
});
