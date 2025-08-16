document.addEventListener('DOMContentLoaded', function() {
    // Party mapping based on Flutter code
    const PARTIDO_MAP = {
        "AVANTE": {
            "nome": "Avante",
            "urlLogo": "../assets/images/AVANTE.gif"
        },
        "CIDADANIA": {
            "nome": "Cidadania",
            "urlLogo": "../assets/images/CIDADANIA.png"
        },
        "MDB": {
            "nome": "Movimento Democrático Brasileiro",
            "urlLogo": "../assets/images/MDB.png"
        },
        "NOVO": {
            "nome": "Partido Novo",
            "urlLogo": "../assets/images/NOVO.png"
        },
        "PCdoB": {
            "nome": "Partido Comunista do Brasil",
            "urlLogo": "../assets/images/PCdoB.png"
        },
        "PDT": {
            "nome": "Partido Democrático Trabalhista",
            "urlLogo": "../assets/images/PDT.png"
        },
        "PL": {
            "nome": "Partido Liberal",
            "urlLogo": "../assets/images/PL.png"
        },
        "PODE": {
            "nome": "Podemos",
            "urlLogo": "../assets/images/PODE.png"
        },
        "PP": {
            "nome": "Progressistas",
            "urlLogo": "../assets/images/PP.png"
        },
        "PRD": {
            "nome": "Partido Renovação Democrática",
            "urlLogo": "../assets/images/PRD.png"
        },
        "PSB": {
            "nome": "Partido Socialista Brasileiro",
            "urlLogo": "../assets/images/PSB.png"
        },
        "PSD": {
            "nome": "Partido Social Democrático",
            "urlLogo": "../assets/images/PSD.png"
        },
        "PSDB": {
            "nome": "Partido da Social Democracia Brasileira",
            "urlLogo": "../assets/images/PSDB.png"
        },
        "PSOL": {
            "nome": "Partido Socialismo e Liberdade",
            "urlLogo": "../assets/images/PSOL.jpg"
        },
        "PT": {
            "nome": "Partido dos Trabalhadores",
            "urlLogo": "../assets/images/PT.png"
        },
        "REPUBLICANOS": {
            "nome": "Republicanos",
            "urlLogo": "../assets/images/REPUBLICANOS.png"
        },
        "UNIÃO": {
            "nome": "União Brasil",
            "urlLogo": "../assets/images/UNIAO.png"
        }
    };

    // DOM elements
    const anoSelect = document.getElementById('ano-select');
    const ordenacaoSelect = document.getElementById('ordenacao-select');
    const limparFiltrosBtn = document.getElementById('limpar-filtros');
    const rankingHeader = document.getElementById('ranking-header');
    const rankingList = document.getElementById('ranking-list');

    // State variables
    let rankings = {};
    let dadosParlamentares = {};
    let anosDisponiveis = [];
    let anoSelecionado = 'totalGeral';
    let ordenacao = 'maior';
    let todosPartidos = [];
    let contadorParlamentares = {};

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

    // Background color for ranking positions
    function backgroundForIndex(index) {
        if (index === 0) return 'rgba(255,215,0,0.12)'; // Gold
        if (index === 1) return 'rgba(192,192,192,0.12)'; // Silver
        if (index === 2) return 'rgba(205,127,50,0.12)'; // Bronze
        return '#fff';
    }

    // Load data and initialize
    async function loadData() {
        try {
            // Show loading state
            rankingList.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><br>Carregando dados...</div>';

            // Try to load rankings.json first
            let rankingsMap = {};
            try {
                const rankingsResponse = await fetch('../assets/data/rankings.json');
                if (rankingsResponse.ok) {
                    rankingsMap = await rankingsResponse.json();
                }
            } catch (e) {
                console.warn('Warning: Could not load rankings.json:', e);
            }

            // Load gastos_por_parlamentar.json as fallback/metadata
            const dadosResponse = await fetch('../assets/data/gastos_por_parlamentar.json');
            if (!dadosResponse.ok) {
                throw new Error('Could not load gastos_por_parlamentar.json');
            }
            const dadosMap = await dadosResponse.json();

            // Populate available years
            let anos = [];
            const totalPartido = rankingsMap['Total_partido'];
            if (totalPartido && Object.keys(totalPartido).length > 0) {
                anos = Object.keys(totalPartido).filter(k => k !== 'totalGeral').sort();
            } else {
                // Fallback: extract years from raw data
                const anosSet = new Set();
                Object.values(dadosMap).forEach(entry => {
                    if (typeof entry === 'object' && entry.gastos) {
                        Object.keys(entry.gastos).forEach(ano => anosSet.add(ano));
                    }
                });
                anos = Array.from(anosSet).sort();
            }

            rankings = rankingsMap;
            dadosParlamentares = dadosMap;
            anosDisponiveis = anos;

            // Populate year dropdown
            populateYearSelect();
            
            // Calculate initial ranking
            computeTopForYear(anoSelecionado);

        } catch (error) {
            console.error('Error loading data:', error);
            rankingList.innerHTML = '<div class="no-data">Erro ao carregar dados. Tente novamente mais tarde.</div>';
        }
    }

    function populateYearSelect() {
        const anosOptions = ['totalGeral', ...anosDisponiveis];
        anoSelect.innerHTML = '';
        
        anosOptions.forEach(ano => {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano === 'totalGeral' ? 'Total Geral' : ano;
            anoSelect.appendChild(option);
        });
        
        anoSelect.value = anoSelecionado;
    }

    function computeTopForYear(anoKey) {
        const mapPartidoToValue = {};
        const mapPartidoToCount = {};

        const totalPartidoMap = rankings['Total_partido'] || {};

        if (anoKey === 'totalGeral') {
            // Try to use totalGeral field
            if (totalPartidoMap.totalGeral) {
                Object.entries(totalPartidoMap.totalGeral).forEach(([partidoSigla, v]) => {
                    mapPartidoToValue[partidoSigla] = toDouble(v);
                });

                // Count parliamentarians for totalGeral
                Object.values(dadosParlamentares).forEach(info => {
                    const partido = (info.partido || '').toString();
                    if (partido && partido !== 'none' && partido.trim() !== '') {
                        mapPartidoToCount[partido] = (mapPartidoToCount[partido] || 0) + 1;
                    }
                });
            } else {
                // Fallback: sum all years from totalPartidoMap
                Object.entries(totalPartidoMap).forEach(([ano, data]) => {
                    if (ano === 'totalGeral') return;
                    Object.entries(data).forEach(([partido, v]) => {
                        mapPartidoToValue[partido] = (mapPartidoToValue[partido] || 0) + toDouble(v);
                    });
                });

                // Count parliamentarians for fallback
                Object.values(dadosParlamentares).forEach(info => {
                    const partido = (info.partido || '').toString();
                    if (partido && partido !== 'none' && partido.trim() !== '') {
                        mapPartidoToCount[partido] = (mapPartidoToCount[partido] || 0) + 1;
                    }
                });
            }
        } else {
            if (totalPartidoMap[anoKey]) {
                Object.entries(totalPartidoMap[anoKey]).forEach(([partidoSigla, v]) => {
                    mapPartidoToValue[partidoSigla] = toDouble(v);
                });

                // Count parliamentarians with expenses in specific year
                Object.values(dadosParlamentares).forEach(info => {
                    const partido = (info.partido || '').toString();
                    const gastos = info.gastos || {};
                    const anoMap = gastos[anoKey];

                    if (partido && partido !== 'none' && partido.trim() !== '' && anoMap && typeof anoMap === 'object') {
                        let soma = 0.0;
                        Object.values(anoMap).forEach(v => soma += toDouble(v));
                        if (soma > 0) {
                            mapPartidoToCount[partido] = (mapPartidoToCount[partido] || 0) + 1;
                        }
                    }
                });
            } else {
                // Fallback: calculate from dadosParlamentares
                Object.values(dadosParlamentares).forEach(info => {
                    const partido = (info.partido || '').toString();
                    const gastos = info.gastos || {};
                    const anoMap = gastos[anoKey];
                    
                    if (!partido || partido === 'none' || partido.trim() === '') return;
                    
                    let soma = 0.0;
                    if (anoMap && typeof anoMap === 'object') {
                        Object.values(anoMap).forEach(v => soma += toDouble(v));
                    }
                    
                    mapPartidoToValue[partido] = (mapPartidoToValue[partido] || 0) + soma;
                    
                    if (soma > 0) {
                        mapPartidoToCount[partido] = (mapPartidoToCount[partido] || 0) + 1;
                    }
                });
            }
        }

        // Remove empty or 'none' entries
        Object.keys(mapPartidoToValue).forEach(k => {
            if (!k || k.trim() === '' || k === 'none') {
                delete mapPartidoToValue[k];
                delete mapPartidoToCount[k];
            }
        });

        const list = Object.entries(mapPartidoToValue);
        list.sort((a, b) => {
            if (ordenacao === 'maior') {
                return b[1] - a[1];
            } else {
                return a[1] - b[1];
            }
        });

        todosPartidos = list;
        contadorParlamentares = mapPartidoToCount;
        renderRanking();
    }

    function renderRanking() {
        // Header
        const yearLabel = anoSelecionado === 'totalGeral' ? 'Total Geral' : anoSelecionado;
        const orderLabel = ordenacao === 'maior' ? 'Maiores' : 'Menores';
        
        rankingHeader.innerHTML = `
            <div class="ranking-title">
                <i class="fas fa-flag"></i>
                Ranking Gastos por Partidos — ${yearLabel} (${orderLabel} Gastos)
            </div>
        `;

        // List
        if (!todosPartidos.length) {
            rankingList.innerHTML = '<div class="no-data">Nenhum dado encontrado para a seleção.</div>';
            return;
        }

        rankingList.innerHTML = todosPartidos.map((entry, index) => {
            const [sigla, value] = entry;
            const count = contadorParlamentares[sigla] || 0;
            const partidoMeta = PARTIDO_MAP[sigla];
            const nomePartido = partidoMeta ? partidoMeta.nome : sigla;
            const urlLogo = partidoMeta ? partidoMeta.urlLogo : null;

            const backgroundColor = backgroundForIndex(index);

            return `
                <div class="ranking-item" style="background: ${backgroundColor};">
                    <div class="party-logo">
                        ${urlLogo ? 
                            `<img src="${urlLogo}" alt="${sigla}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                             <div class="party-initials" style="display:none;">${sigla.substring(0, Math.min(2, sigla.length))}</div>` :
                            `<div class="party-initials">${sigla.substring(0, Math.min(2, sigla.length))}</div>`
                        }
                    </div>
                    <div class="party-info">
                        <div class="party-name">${nomePartido}</div>
                        <div class="party-details">
                            <span class="party-acronym">${sigla}</span>
                            <span class="party-members">
                                <i class="fas fa-users"></i>
                                ${count} parlamentar${count !== 1 ? 'es' : ''}
                            </span>
                        </div>
                    </div>
                    <div class="party-amount">
                        <div class="amount-value">R$ ${formatCurrency(value)}</div>
                        <div class="amount-label">Total de gastos</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Event listeners
    anoSelect.addEventListener('change', (e) => {
        anoSelecionado = e.target.value;
        computeTopForYear(anoSelecionado);
    });

    ordenacaoSelect.addEventListener('change', (e) => {
        ordenacao = e.target.value;
        computeTopForYear(anoSelecionado);
    });

    limparFiltrosBtn.addEventListener('click', () => {
        anoSelecionado = 'totalGeral';
        ordenacao = 'maior';
        
        anoSelect.value = 'totalGeral';
        ordenacaoSelect.value = 'maior';
        
        computeTopForYear(anoSelecionado);
    });

    // Initialize
    loadData();
});
