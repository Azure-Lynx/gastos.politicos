// Ranking Geral JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const anoSelect = document.getElementById('ano-select');
    const ordenacaoSelect = document.getElementById('ordenacao-select');
    const partidoSelect = document.getElementById('partido-select');
    const estadoSelect = document.getElementById('estado-select');
    const searchInput = document.getElementById('geral-search');
    const suggestionsDiv = document.getElementById('geral-suggestions');
    const rankingHeader = document.getElementById('ranking-header');
    const rankingList = document.getElementById('ranking-list');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');

    // Data
    let rankings = {};
    let dadosParlamentares = {};
    let anosDisponiveis = [];
    let partidosDisponiveis = [];
    let estadosDisponiveis = [];
    let listaCompleta = [];
    let listaFiltrada = [];
    let suggestions = [];

    // Filtros
    let anoSelecionado = null;
    let filtroPartido = '';
    let filtroEstado = '';
    let filtroNome = '';
    let ordenacao = 'maior';

    // Utils
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Load data
    Promise.all([
        fetch('../assets/data/rankings.json').then(r => r.json()).catch(() => ({})),
        fetch('../assets/data/gastos_por_parlamentar.json').then(r => r.json())
    ]).then(([rankingsData, dadosData]) => {
        rankings = rankingsData;
        dadosParlamentares = dadosData;

        // Anos
        let anos = [];
        const totalAno = rankings.Total_ano || {};
        if (totalAno && Object.keys(totalAno).length > 0) {
            anos = Object.keys(totalAno).filter(k => k !== 'totalGeral').sort();
        } else {
            // Fallback: get years from raw data
            const anosSet = new Set();
            Object.values(dadosParlamentares).forEach(entry => {
                if (entry && entry.gastos) {
                    Object.keys(entry.gastos).forEach(ano => anosSet.add(ano));
                }
            });
            anos = Array.from(anosSet).sort();
        }
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

        computeRankingForYear(anoSelecionado);
    });

    // Event listeners
    anoSelect.addEventListener('change', e => {
        anoSelecionado = e.target.value;
        computeRankingForYear(anoSelecionado);
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
    function computeRankingForYear(ano) {
        let mapIdToValue = {};

        if (ano === 'Todos') {
            // Calculate total for all years
            Object.entries(dadosParlamentares).forEach(([id, p]) => {
                // Try to use 'totais' field if available
                if (p.totais && p.totais.totalGeral) {
                    let val = 0;
                    if (typeof p.totais.totalGeral === 'number') {
                        val = p.totais.totalGeral;
                    } else if (typeof p.totais.totalGeral === 'string') {
                        val = parseFloat(p.totais.totalGeral.replace(/\./g, '').replace(/,/g, '.')) || 0;
                    }
                    mapIdToValue[id] = val;
                } else {
                    // Fallback: sum all years manually
                    const gastos = p.gastos || {};
                    let totalGeral = 0.0;
                    Object.values(gastos).forEach(anoMap => {
                        if (anoMap && typeof anoMap === 'object') {
                            Object.values(anoMap).forEach(v => {
                                if (typeof v === 'number') {
                                    totalGeral += v;
                                } else if (typeof v === 'string') {
                                    totalGeral += parseFloat(v.replace(/\./g, '').replace(/,/g, '.')) || 0;
                                }
                            });
                        }
                    });
                    mapIdToValue[id] = totalGeral;
                }
            });
        } else {
            // Calculate for specific year
            const totalAnoMap = rankings.Total_ano || {};
            if (totalAnoMap[ano]) {
                Object.entries(totalAnoMap[ano]).forEach(([id, v]) => {
                    let val = 0;
                    if (typeof v === 'number') {
                        val = v;
                    } else if (typeof v === 'string') {
                        val = parseFloat(v.replace(/\./g, '').replace(/,/g, '.')) || 0;
                    }
                    mapIdToValue[id] = val;
                });
            } else {
                // Fallback: calculate from raw data
                Object.entries(dadosParlamentares).forEach(([id, p]) => {
                    const gastos = p.gastos || {};
                    const anoMap = gastos[ano];
                    let somaAno = 0.0;
                    if (anoMap && typeof anoMap === 'object') {
                        Object.values(anoMap).forEach(v => {
                            if (typeof v === 'number') {
                                somaAno += v;
                            } else if (typeof v === 'string') {
                                somaAno += parseFloat(v.replace(/\./g, '').replace(/,/g, '.')) || 0;
                            }
                        });
                    }
                    mapIdToValue[id] = somaAno;
                });
            }
        }

        const list = Object.entries(mapIdToValue)
            .filter(([id, value]) => id !== 'None' && value > 0)
            .map(([id, value]) => ({ id, value }));
        list.sort((a, b) => b.value - a.value);
        listaCompleta = list;
        listaFiltrada = [...list];
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
            <h2><i class="fas fa-chart-bar"></i> Ranking Geral</h2>
            <p>${ordenacao === 'maior' ? 'Maiores' : 'Menores'} Gastos ${anoSelecionado === 'Todos' ? 'Totais' : `em ${anoSelecionado || '-'}`}</p>
        `;
        
        // List
        if (!listaFiltrada.length) {
            rankingList.innerHTML = '<div class="no-data">Nenhum dado encontrado.</div>';
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
                        </div>
                    </div>
                    <div>
                        <div class="amount">R$ ${formatCurrency(entry.value)}</div>
                        <div class="total">${anoSelecionado === 'Todos' ? 'Total geral' : `Ano ${anoSelecionado}`}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
});
