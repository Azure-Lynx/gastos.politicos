# Gastos Políticos Web

Uma aplicação web para visualizar gastos de parlamentares brasileiros baseada nos dados da API da Câmara dos Deputados.

## Funcionalidades

- **Busca por Parlamentar**: Digite o nome do parlamentar para encontrá-lo rapidamente
- **Filtro por Ano**: Selecione o ano desejado (2008-2025)
- **Visualização em Gráfico**: Gráfico de pizza mostrando a distribuição dos gastos por categoria
- **Lista Detalhada**: Lista ordenada de gastos por categoria com ícones e valores
- **Compartilhamento**: Funcionalidade de compartilhar os resultados
- **Design Responsivo**: Funciona bem em desktop e dispositivos móveis

## Como Usar

1. **Abra o arquivo `index.html` em um navegador**
2. **Digite o nome de um parlamentar** no campo de busca
3. **Selecione o ano** que deseja consultar
4. **Clique em "Buscar"** para visualizar os gastos
5. **Use o botão de compartilhar** para compartilhar os resultados

## Estrutura do Projeto

```
gastos_politicos_web/
├── index.html                          # Página inicial (Home)
├── pages/                              # Páginas da aplicação
│   ├── gastos-por-parlamentar.html     # ✅ Gastos por Parlamentar (Implementado)
│   ├── ranking-partidos.html           # 🚧 Ranking Partidos (Em desenvolvimento)
│   ├── gastos-por-categoria.html       # 🚧 Gastos por Categoria (Em desenvolvimento)
│   ├── ranking-medias-anuais.html      # 🚧 Ranking Médias Anuais (Em desenvolvimento)
│   └── ranking-geral.html              # 🚧 Ranking Geral (Em desenvolvimento)
├── css/                                # Arquivos de estilo
│   ├── main.css                        # Estilos da página inicial
│   ├── gastos-por-parlamentar.css      # Estilos específicos da página
│   ├── shared.css                      # Estilos compartilhados
│   └── [outras-paginas].css            # Estilos das outras páginas
├── js/                                 # Arquivos JavaScript
│   ├── main.js                         # Script da página inicial
│   ├── gastos-por-parlamentar.js       # Script da página de gastos
│   └── [outras-paginas].js             # Scripts das outras páginas
├── assets/
│   └── data/
│       ├── gastos_por_parlamentar.json # Dados dos gastos por parlamentar
│       └── rankings.json               # Dados dos rankings (se existir)
└── README.md                           # Este arquivo
```

## Páginas Disponíveis

### ✅ **Implementadas**
- **Home (index.html)**: Página inicial com navegação para todas as seções
- **Gastos por Parlamentar**: Busca e visualização de gastos individuais

### 🚧 **Em Desenvolvimento**
- **Ranking Partidos**: Ranking dos partidos por gastos totais
- **Gastos por Categoria**: Análise de gastos por categoria de despesa  
- **Ranking Médias Anuais**: Comparação de médias anuais
- **Ranking Geral**: Ranking completo de todos os parlamentares

## URLs Estruturadas

- **Home**: `/` ou `/index.html`
- **Gastos por Parlamentar**: `/pages/gastos-por-parlamentar.html`
- **Ranking Partidos**: `/pages/ranking-partidos.html`
- **Gastos por Categoria**: `/pages/gastos-por-categoria.html`
- **Ranking Médias Anuais**: `/pages/ranking-medias-anuais.html`
- **Ranking Geral**: `/pages/ranking-geral.html`

## Tecnologias Utilizadas

- **HTML5**: Estrutura da página
- **CSS3**: Estilos e design responsivo
- **JavaScript ES6+**: Lógica da aplicação
- **Chart.js**: Gráficos interativos
- **Font Awesome**: Ícones

## Funcionalidades Implementadas (adaptadas do Flutter)

✅ **Filtro por parlamentar e ano**  
✅ **Exibição de gastos em lista com ícones**  
✅ **Design similar ao Flutter com cards e cores**  
✅ **Autocomplete para busca de parlamentares**  
✅ **Gráfico de pizza para visualização dos gastos**  
✅ **Formatação de moeda brasileira**  
✅ **Funcionalidade de compartilhamento**  
✅ **Design responsivo**  

## Deploy no GitHub Pages

Para hospedar no GitHub Pages:

1. Faça o upload de todos os arquivos para um repositório GitHub
2. Vá nas configurações do repositório
3. Na seção "Pages", selecione a branch principal como fonte
4. A aplicação estará disponível em `https://seu-usuario.github.io/nome-do-repositorio`

## Vantagens da Abordagem com JSON

- ✅ **Carregamento rápido**: Sem chamadas de API externas
- ✅ **Funciona offline**: Após o carregamento inicial
- ✅ **Sem problemas de CORS**: Dados locais
- ✅ **Controle total**: Dados sempre disponíveis
- ✅ **Compatível com GitHub Pages**: Hospedagem estática

## Categorias de Gastos Suportadas

- Assinatura de Publicações
- Combustíveis e Lubrificantes
- Consultorias, Pesquisas e Trabalhos Técnicos
- Divulgação da Atividade Parlamentar
- Fornecimento de Alimentação do Parlamentar
- Hospedagem (exceto no DF)
- Locomoção, Alimentação e Hospedagem
- Locação de Veículos/Embarcações
- Manutenção de Escritório
- Passagens Aéreas
- Passagens Terrestres/Marítimas/Fluviais
- Serviços de Segurança
- Táxi, Pedágio e Estacionamento
- Serviços Postais
- Telefonia
- Outros Serviços
