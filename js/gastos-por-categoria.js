// Gastos Por Categoria JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const categoriaSelect = document.getElementById('categoria-select');
    const anoSelect = document.getElementById('ano-select');
    const ordenacaoSelect = document.getElementById('ordenacao-select');
    const partidoSelect = document.getElementById('partido-select');
    const estadoSelect = document.getElementById('estado-select');
    const searchInput = document.getElementById('categoria-search');
    const suggestionsDiv = document.getElementById('categoria-suggestions');
    const rankingHeader = document.getElementById('ranking-header');
    const rankingList = document.getElementById('ranking-list');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');

    // Data
    let rankings = {};
    let dadosParlamentares = {};
    let categoriasDisponiveis = [];
    let anosDisponiveis = [];
    let partidosDisponiveis = [];
    let estadosDisponiveis = [];
    let listaCompleta = [];
    let listaFiltrada = [];
    let contadorAnos = {};
    let suggestions = [];

    // Filtros
    let categoriaSelecionada = null;
    let anoSelecionado = null;
    let filtroPartido = '';
    let filtroEstado = '';
    let filtroNome = '';
    let ordenacao = 'maior';

    // Utils
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function toCapitalCase(text) {
        return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
    }

    // Load data
    Promise.all([
        fetch('../assets/data/rankings.json').then(r => r.json()),
        fetch('../assets/data/gastos_por_parlamentar.json').then(r => r.json())
    ]).then(([rankingsData, dadosData]) => {
        rankings = rankingsData;
        dadosParlamentares = dadosData;
        if (rankings.None) delete rankings.None;

        // Categorias
        const categoriaAno = rankings.categoria_ano || {};
        categoriasDisponiveis = Object.keys(categoriaAno).sort();
        categoriasDisponiveis.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categoriaSelect.appendChild(opt);
        });
        categoriaSelecionada = categoriasDisponiveis[0] || null;
        categoriaSelect.value = categoriaSelecionada;

        // Anos
        const totalAno = rankings.Total_ano || {};
        let anos = Object.keys(totalAno).filter(k => k !== 'totalGeral').sort();
        anos.unshift('Todos');
        anosDisponiveis = anos;
        anosDisponiveis.forEach(ano => {
            const opt = document.createElement('option');
            opt.value = ano;
            opt.textContent = ano;
            anoSelect.appendChild(opt);
        });
        anoSelecionado = anosDisponiveis[0] || null;
        anoSelect.value = anoSelecionado;

        // Partidos e Estados
        const partidosSet = new Set();
        const estadosSet = new Set();
        Object.values(dadosParlamentares).forEach(entry => {
            if (entry && typeof entry === 'object') {
                if (entry.partido) partidosSet.add(entry.partido);
                if (entry.uf) estadosSet.add(entry.uf);
            }
        });
        partidosDisponiveis = Array.from(partidosSet).sort();
        estadosDisponiveis = Array.from(estadosSet).sort();
        partidosDisponiveis.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            partidoSelect.appendChild(opt);
        });
        estadosDisponiveis.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e;
            opt.textContent = e;
            estadoSelect.appendChild(opt);
        });

        // Suggestions for search bar
        suggestions = Object.values(dadosParlamentares).map(p => p.nome);

        computeRankingForCategoryYear(categoriaSelecionada, anoSelecionado);
    });

    // Event listeners
    categoriaSelect.addEventListener('change', e => {
        categoriaSelecionada = e.target.value;
        // Update anos for selected category
        const entry = rankings.categoria_ano?.[categoriaSelecionada];
        let anos = entry ? Object.keys(entry).filter(k => k !== 'total').sort() : [];
        if (anos.length && !anos.includes('Todos')) anos.unshift('Todos');
        anoSelect.innerHTML = '';
        anos.forEach(ano => {
            const opt = document.createElement('option');
            opt.value = ano;
            opt.textContent = ano;
            anoSelect.appendChild(opt);
        });
        anoSelecionado = anos[0] || null;
        anoSelect.value = anoSelecionado;
        computeRankingForCategoryYear(categoriaSelecionada, anoSelecionado);
    });
    anoSelect.addEventListener('change', e => {
        anoSelecionado = e.target.value;
        computeRankingForCategoryYear(categoriaSelecionada, anoSelecionado);
    });
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
        const filtered = suggestions.filter(n => n.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
        if (filtered.length) {
            suggestionsDiv.innerHTML = filtered.map(n => `<div class="suggestion-item">${n}</div>`).join('');
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
        searchInput.value = '';
        partidoSelect.value = '';
        estadoSelect.value = '';
        anoSelect.value = 'Todos';
        anoSelecionado = 'Todos';
        aplicarFiltros();
    });

    // Core logic
    function computeRankingForCategoryYear(category, year) {
        let mapIdToValue = {};
        let mapIdToYearCount = {};
        if (year === 'Todos') {
            // Sum across all years for each parliamentarian, skip 'total' field
            const categoryMap = rankings.categoria_ano?.[category] || {};
            if (categoryMap && Object.keys(categoryMap).length > 0) {
                Object.entries(categoryMap).forEach(([ano, anoMap]) => {
                    if (ano === 'total') return;
                    Object.entries(anoMap || {}).forEach(([id, value]) => {
                        let val = 0;
                        if (typeof value === 'number') {
                            val = value;
                        } else if (typeof value === 'string') {
                            val = parseFloat(value.replace(/\./g, '').replace(/,/g, '.')) || 0;
                        }
                        if (val > 0) {
                            mapIdToValue[id] = (mapIdToValue[id] || 0) + val;
                            mapIdToYearCount[id] = (mapIdToYearCount[id] || 0) + 1;
                        }
                    });
                });
            } else {
                // Fallback: compute from raw data
                Object.entries(dadosParlamentares).forEach(([id, p]) => {
                    const gastos = p.gastos || {};
                    let totalCategoria = 0.0;
                    let yearCount = 0;
                    Object.entries(gastos).forEach(([ano, anoMap]) => {
                        if (anoMap && typeof anoMap === 'object' && anoMap.hasOwnProperty(category)) {
                            const categoryValue = anoMap[category];
                            let yearValue = 0.0;
                            if (typeof categoryValue === 'number') {
                                yearValue = categoryValue;
                            } else if (typeof categoryValue === 'string') {
                                yearValue = parseFloat(categoryValue.replace(/\./g, '').replace(/,/g, '.')) || 0;
                            }
                            if (yearValue > 0) {
                                totalCategoria += yearValue;
                                yearCount++;
                            }
                        }
                    });
                    if (totalCategoria > 0) {
                        mapIdToValue[id] = totalCategoria;
                        mapIdToYearCount[id] = yearCount;
                    }
                });
            }
        } else {
            // Calculate for specific year
            const categoryMap = rankings.categoria_ano?.[category] || {};
            const yearMap = categoryMap[year] || {};
            Object.entries(yearMap).forEach(([id, value]) => {
                let val = 0;
                if (typeof value === 'number') {
                    val = value;
                } else if (typeof value === 'string') {
                    val = parseFloat(value.replace(/\./g, '').replace(/,/g, '.')) || 0;
                }
                mapIdToValue[id] = val;
            });
        }
        const list = Object.entries(mapIdToValue)
            .filter(([id, value]) => id !== 'None' && value > 0)
            .map(([id, value]) => ({ id, value }));
        list.sort((a, b) => b.value - a.value);
        listaCompleta = list;
        listaFiltrada = [...list];
        contadorAnos = mapIdToYearCount;
        aplicarFiltros();
        renderRanking();
    }

    function aplicarOrdenacao() {
        if (ordenacao === 'maior') {
            listaFiltrada.sort((a, b) => b.value - a.value);
        } else {
            listaFiltrada.sort((a, b) => a.value - b.value);
        }
        renderRanking();
    }

    function aplicarFiltros() {
        listaFiltrada = listaCompleta.filter(entry => {
            const info = dadosParlamentares[entry.id] || {};
            if (filtroNome && !(info.nome || '').toLowerCase().includes(filtroNome.toLowerCase())) return false;
            if (filtroPartido && info.partido !== filtroPartido) return false;
            if (filtroEstado && info.uf !== filtroEstado) return false;
            return true;
        });
        aplicarOrdenacao();
    }

    function renderRanking() {
        // Header
        rankingHeader.innerHTML = `
            <h2>${ordenacao === 'maior' ? 'Maiores' : 'Menores'} Gastos: ${toCapitalCase(categoriaSelecionada || '-')}</h2>
            <p>${anoSelecionado === 'Todos' ? 'Todos os anos' : anoSelecionado || '-'}</p>
        `;
        
        // List
        if (!listaFiltrada.length) {
            rankingList.innerHTML = '<div class="no-data">Nenhum dado encontrado para essa categoria/ano.</div>';
            return;
        }
        
        rankingList.innerHTML = listaFiltrada.map((entry, idx) => {
            const info = dadosParlamentares[entry.id] || {};
            const nome = info.nome || entry.id;
            const partido = info.partido || '';
            const uf = info.uf || '';
            let imagem = '';
            if (info.imagem) {
                imagem = `../${info.imagem}`;
            }
            const yearCount = contadorAnos[entry.id] || 0;
            
            return `
                <div class="ranking-item">
                    ${imagem ? 
                        `<img src="${imagem}" alt="${nome}" class="avatar">` : 
                        `<div class="avatar"><span>${nome[0] || '?'}</span></div>`
                    }
                    <div class="info">
                        <div class="name">${nome}</div>
                        <div class="details">
                            <span class="party">${partido}</span>
                            <span class="state"><i class="fas fa-map-marker-alt"></i> ${uf}</span>
                            ${anoSelecionado === 'Todos' && yearCount > 0 ? 
                                `<span class="year"><i class="fas fa-calendar-alt"></i> ${yearCount} ano${yearCount !== 1 ? 's' : ''}</span>` : 
                                ''
                            }
                        </div>
                    </div>
                    <div>
                        <div class="amount">R$ ${formatCurrency(entry.value)}</div>
                        <div class="category">${categoriaSelecionada || 'Categoria'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
});
