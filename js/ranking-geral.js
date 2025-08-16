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
        rankingHeader.innerHTML = `<div class="ranking-title" style="background:#e8f5e9;padding:12px;border-radius:8px;text-align:center;font-weight:bold;display:flex;align-items:center;justify-content:center;gap:8px;">
            <i class="fas fa-chart-bar" style="color:#4CAF50;"></i>
            ${ordenacao === 'maior' ? 'Maiores' : 'Menores'} Gastos ${anoSelecionado === 'Todos' ? 'Totais' : `em ${anoSelecionado || '-'}`}
        </div>`;
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
            let bg = '#fff';
            if (idx === 0) bg = 'rgba(255,215,0,0.12)';
            if (idx === 1) bg = 'rgba(192,192,192,0.12)';
            if (idx === 2) bg = 'rgba(205,127,50,0.12)';
            return `<div class="ranking-item" style="background:${bg};display:flex;align-items:center;padding:20px;border-radius:15px;margin-bottom:15px;box-shadow:0 4px 15px rgba(0,0,0,0.05);transition:all 0.3s ease;">
                <div class="ranking-position" style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#4CAF50,#45a049);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2em;margin-right:20px;">
                    ${idx + 1}
                </div>
                <div class="avatar" style="width:60px;height:60px;border-radius:50%;background:#eee;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-right:20px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                    ${imagem ? `<img src="${imagem}" alt="${nome}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-weight:bold;font-size:1.8em;color:#4CAF50;">${nome[0] || '?'}</span>`}
                </div>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:1.3em;color:#333;margin-bottom:5px;">${nome}</div>
                    <div style="color:#666;font-size:1em;display:flex;align-items:center;gap:15px;">
                        <span style="background:rgba(76,175,80,0.1);color:#2E7D32;padding:4px 12px;border-radius:20px;font-size:0.9em;font-weight:600;">${partido}</span>
                        <span style="color:#777;">📍 ${uf}</span>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;font-size:1.4em;color:#4CAF50;">R$ ${formatCurrency(entry.value)}</div>
                    <div style="color:#666;font-size:0.9em;margin-top:2px;">${anoSelecionado === 'Todos' ? 'Total geral' : `Ano ${anoSelecionado}`}</div>
                </div>
            </div>`;
        }).join('');
    }
});
