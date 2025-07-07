// Constantes do seu negócio
let NUM_OPERADORES_PADRAO; // Agora será carregado da API
const PACOTES_POR_OPERADOR_DIA_META = 450;
const DIAS_OPERACAO_SEMANA = 6; // Esta constante serve mais para informação agora, a lógica de dias úteis reflete a escala

// URL base do seu backend - MUITO IMPORTANTE!
// QUANDO FOR PARA O RENDER, ESTA URL MUDARÁ PARA O ENDEREÇO DO SEU BACKEND NO RENDER.
const API_BASE_URL = 'https://phd-dashboard-backend-python.onrender.com/api';

// Elementos HTML (seletores) - Declarados globalmente, mas inicializados DENTRO do DOMContentLoaded
let dataInput;
let producaoDiariaInput;
let isExcecaoCheckbox;
let operadoresNoDiaInput;
let addProducaoBtn;
let historicoTableBody;

let mesAtualElement;
let metaMensalTotalElement;
let producaoAcumuladaElement;
let metaAcumuladaElement;
let saldoAcumuladoElement;
let faltaParaMetaMensalElement;
let phdMedioMensalElement;
let totalDiasOperacionaisPrevistosElement;
let diasOperacaoConsideradosElement;
let diasRestantesElement;
let projecaoTextoElement;

let selectMes;
let selectAno;
let visualizarMesBtn;

let numOperadoresGlobalInput;
let updateConfigBtn;

// Elementos do Relatório Analítico
let dashboardSection;
let reportSection;
let showDashboardBtn;
let showReportBtn;
let reportMesesSelect;
let reportAnoSelect;
let generateReportBtn;
let exportCsvBtn;
let reportTable;
let reportTableHeader;
let reportTableBody;
let reportStatusElement;


let anoVisualizado;
let mesVisualizado;

// --- Funções de API ---
async function getConfigsAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/configs`);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn('Configurações não encontradas, tentando criar padrão...');
                const createResponse = await fetch(`${API_BASE_URL}/configs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ num_operadores_padrao: 13 }),
                });
                if (!createResponse.ok) {
                    throw new Error(`Erro ao criar configurações padrão: ${createResponse.statusText}`);
                }
                return await createResponse.json();
            }
            throw new Error(`Erro ao buscar configurações: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na comunicação com a API de configurações:', error);
        return { num_operadores_padrao: 13 };
    }
}

async function updateConfigsAPI(numOperadores) {
    try {
        const response = await fetch(`${API_BASE_URL}/configs`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ num_operadores_padrao: numOperadores }),
        });
        if (!response.ok) {
            throw new Error(`Erro ao atualizar configurações: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na comunicação com a API de atualização de configurações:', error);
        alert('Erro ao salvar as configurações. Verifique o console para mais detalhes.');
        return null;
    }
}

async function getProducoesAPI(mes, ano) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes?mes=${mes}&ano=${ano}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar produções: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na comunicação com a API de produções:', error);
        return [];
    }
}

async function addProducaoAPI(producaoData) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(producaoData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Erro ao adicionar produção: ${errorData.message || response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro na comunicação com a API de adicionar produção:', error);
        alert(`Erro ao adicionar produção: ${error.message}. Verifique se a data já foi lançada.`);
        return null;
    }
}

async function deleteProducaoAPI(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`Erro ao deletar produção: ${response.statusText}`);
        }
        return true;
    } catch (error) {
        console.error('Erro na comunicação com a API de deletar produção:', error);
        alert('Erro ao deletar produção. Verifique o console para mais detalhes.');
        return false;
    }
}

// --- Funções de Utilitários e Lógica ---
function getNomeMes(numeroMes) {
    const data = new Date(2000, numeroMes - 1, 1);
    return data.toLocaleString('pt-BR', { month: 'long' });
}

function getDiasNoMes(mes, ano) {
    return new Date(ano, mes, 0).getDate();
}

function calculaDiasUteisNoMes(mes, ano) {
    let diasUteis = 0;
    const totalDias = getDiasNoMes(mes, ano);
    for (let i = 1; i <= totalDias; i++) {
        const data = new Date(ano, mes - 1, i);
        const diaDaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
        if (diaDaSemana !== 0) { // Se não for domingo
            diasUteis++;
        }
    }
    return diasUteis;
}

async function calculaKPIs(historicoProducao) {
    const kpis = {
        metaMensalTotal: 0,
        producaoAcumulada: 0,
        metaEsperadaAteHoje: 0,
        saldoAcumulado: 0,
        faltaParaMetaMensal: 0,
        phdMedioMensal: 0,
        totalDiasOperacionaisPrevistos: 0,
        diasOperacaoConsiderados: 0,
        diasRestantes: 0,
    };

    const totalDiasNoMes = getDiasNoMes(mesVisualizado, anoVisualizado);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataUltimoDiaMesVisualizado = new Date(anoVisualizado, mesVisualizado - 1, totalDiasNoMes);

    const historicoProducaoFiltrado = historicoProducao.filter(p => {
        const pDate = new Date(p.data);
        return pDate.getFullYear() === anoVisualizado && pDate.getMonth() + 1 === mesVisualizado;
    });

    kpis.producaoAcumulada = historicoProducaoFiltrado.reduce((sum, p) => sum + p.producaoDiaria, 0);

    let totalOperadoresEmDiasOperacionais = 0;
    kpis.diasOperacaoConsiderados = 0;
    let maxDiaHistorico = 0;

    historicoProducaoFiltrado.forEach(p => {
        const pDate = new Date(p.data);
        if (pDate.getDate() > maxDiaHistorico) {
            maxDiaHistorico = pDate.getDate();
        }

        if (p.tipoDia !== 'Exceção') {
            totalOperadoresEmDiasOperacionais += p.operadoresNoDia;
            kpis.diasOperacaoConsiderados++;
        }
    });

    if (kpis.producaoAcumulada > 0 && totalOperadoresEmDiasOperacionais > 0) {
        kpis.phdMedioMensal = kpis.producaoAcumulada / totalOperadoresEmDiasOperacionais;
    }

    kpis.totalDiasOperacionaisPrevistos = calculaDiasUteisNoMes(mesVisualizado, anoVisualizado);

    kpis.metaMensalTotal = kpis.totalDiasOperacionaisPrevistos * NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META;

    // Meta Esperada até Hoje: Considera apenas dias com produção lançada e não exceção.
    kpis.metaEsperadaAteHoje = kpis.diasOperacaoConsiderados * (NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META);

    kpis.saldoAcumulado = kpis.producaoAcumulada - kpis.metaEsperadaAteHoje;
    kpis.faltaParaMetaMensal = Math.max(0, kpis.metaMensalTotal - kpis.producaoAcumulada);

    kpis.diasRestantes = 0;
    if (new Date(anoVisualizado, mesVisualizado - 1, 1) <= hoje) {
        let diaAtualDoLoop = hoje.getDate() + 1;
        if (anoVisualizado > hoje.getFullYear() || (anoVisualizado === hoje.getFullYear() && mesVisualizado > (hoje.getMonth() + 1))) {
            diaAtualDoLoop = 1;
        }

        for (let i = diaAtualDoLoop; i <= totalDiasNoMes; i++) {
            const dataIteracao = new Date(anoVisualizado, mesVisualizado - 1, i);
            const diaDaSemana = dataIteracao.getDay();

            const excecaoParaEsteDia = historicoProducaoFiltrado.find(p => {
                const pDate = new Date(p.data);
                return pDate.getFullYear() === dataIteracao.getFullYear() &&
                       pDate.getMonth() === dataIteracao.getMonth() &&
                       pDate.getDate() === dataIteracao.getDate() &&
                       p.tipoDia === 'Exceção';
            });

            if (diaDaSemana !== 0 && !excecaoParaEsteDia) {
                kpis.diasRestantes++;
            }
        }
    } else {
        kpis.diasRestantes = 0;
    }

    return kpis;
}


function exibeKPIs(kpis) {
    mesAtualElement.textContent = `${getNomeMes(mesVisualizado)} de ${anoVisualizado}`;
    metaMensalTotalElement.textContent = kpis.metaMensalTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' pacotes';
    producaoAcumuladaElement.textContent = kpis.producaoAcumulada.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' pacotes';
    metaAcumuladaElement.textContent = kpis.metaEsperadaAteHoje.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' pacotes';
    saldoAcumuladoElement.textContent = kpis.saldoAcumulado.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' pacotes';
    faltaParaMetaMensalElement.textContent = kpis.faltaParaMetaMensal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' pacotes';
    phdMedioMensalElement.textContent = kpis.phdMedioMensal.toFixed(2).toLocaleString('pt-BR') + ' pacotes/operador';
    totalDiasOperacionaisPrevistosElement.textContent = kpis.totalDiasOperacionaisPrevistos + ' dias';
    diasOperacaoConsideradosElement.textContent = kpis.diasOperacaoConsiderados + ' dias';
    diasRestantesElement.textContent = kpis.diasRestantes + ' dias';

    // Lógica de projeção aprimorada
    if (kpis.producaoAcumulada > 0 || kpis.diasOperacaoConsiderados > 0) {
        if (kpis.diasRestantes > 0) {
            const projecaoTotal = kpis.producaoAcumulada + (kpis.diasRestantes * NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META);
            const diferenca = Math.abs(projecaoTotal - kpis.metaMensalTotal);
            
            let projecaoMensagem = `Com a produção atual, e mantendo o ritmo de ${(NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes/dia (com ${NUM_OPERADORES_PADRAO} operadores), a projeção para o mês é de <strong>${projecaoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong>, ficando `;

            if (projecaoTotal >= kpis.metaMensalTotal) {
                projecaoMensagem += `<strong>ACIMA ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong> da meta mensal.`;
                
                const pacotesParaAtingirMetaExata = Math.max(0, kpis.metaMensalTotal - kpis.producaoAcumulada);
                if (kpis.diasRestantes > 0 && NUM_OPERADORES_PADRAO > 0) {
                    const metaDiariaMinimaAjustada = pacotesParaAtingirMetaExata / kpis.diasRestantes;
                    const phdMinimoPorOperador = metaDiariaMinimaAjustada / NUM_OPERADORES_PADRAO;
                    projecaoMensagem += ` Continuem assim! Para *apenas* atingir a meta mensal, vocês precisam de uma média de <strong>${metaDiariaMinimaAjustada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes por dia</strong> (equivalente a ${phdMinimoPorOperador.toFixed(2).toLocaleString('pt-BR')} PHD) nos ${kpis.diasRestantes} dias de operação restantes.`;
                }

            } else { // Below meta
                projecaoMensagem += `<strong>ABAIXO ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong> da meta mensal.`;
                
                const pacotesParaRecuperar = kpis.metaMensalTotal - projecaoTotal;
                if (kpis.diasRestantes > 0 && NUM_OPERADORES_PADRAO > 0) {
                    const phdNecessario = pacotesParaRecuperar / (kpis.diasRestantes * NUM_OPERADORES_PADRAO);
                    projecaoMensagem += ` Para atingir a meta, você precisaria produzir aproximadamente <strong>${pacotesParaRecuperar.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes adicionais</strong>, com um PHD médio de <strong>${phdNecessario.toFixed(2).toLocaleString('pt-BR')} pacotes/operador</strong> nos ${kpis.diasRestantes} dias restantes.`;
                }
            }
            projecaoTextoElement.innerHTML = projecaoMensagem;
            
        } else {
            // Mês finalizado
            const status = kpis.producaoAcumulada >= kpis.metaMensalTotal ? 'ACIMA' : 'ABAIXO';
            const diferenca = Math.abs(kpis.producaoAcumulada - kpis.metaMensalTotal);
            projecaoTextoElement.innerHTML = `O mês de ${getNomeMes(mesVisualizado)} de ${anoVisualizado} foi finalizado com <strong>${kpis.producaoAcumulada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong>, ficando <strong>${status} ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong> da meta mensal.`;
        }
    } else {
        projecaoTextoElement.textContent = 'Comece a lançar sua produção para ver a projeção!';
    }
}

function exibeHistorico(historicoProducao) {
    historicoTableBody.innerHTML = '';
    const historicoProducaoFiltrado = historicoProducao.filter(p => {
        const pDate = new Date(p.data);
        return pDate.getFullYear() === anoVisualizado && pDate.getMonth() + 1 === mesVisualizado;
    });

    historicoProducaoFiltrado.sort((a, b) => new Date(a.data) - new Date(b.data));

    historicoProducaoFiltrado.forEach(producao => {
        const row = historicoTableBody.insertRow();
        const data = new Date(producao.data);
        const dataFormatada = `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;

        const metaDiariaPadrao = NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META;
        let phdDiario = 0;
        let saldoDiario = 0;
        if (producao.tipoDia !== 'Exceção' && producao.operadoresNoDia > 0) {
            phdDiario = producao.producaoDiaria / producao.operadoresNoDia;
            saldoDiario = producao.producaoDiaria - (producao.operadoresNoDia * PACOTES_POR_OPERADOR_DIA_META);
        } else if (producao.tipoDia === 'Exceção') {
             phdDiario = 0;
             saldoDiario = 0;
        }

        row.insertCell(0).textContent = dataFormatada;
        row.insertCell(1).textContent = producao.producaoDiaria.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        row.insertCell(2).textContent = producao.operadoresNoDia;
        row.insertCell(3).textContent = metaDiariaPadrao.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        row.insertCell(4).textContent = phdDiario.toFixed(2).toLocaleString('pt-BR');
        row.insertCell(5).textContent = saldoDiario.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        row.insertCell(6).textContent = producao.tipoDia;

        const acoesCell = row.insertCell(7);
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = async () => {
            if (confirm(`Tem certeza que deseja excluir a produção de ${dataFormatada}?`)) {
                await deleteProducaoAPI(producao.id);
                carregarEExibirDados();
            }
        };
        acoesCell.appendChild(deleteBtn);
    });
}

async function carregarEExibirDados() {
    const historico = await getProducoesAPI(mesVisualizado, anoVisualizado);
    const kpis = await calculaKPIs(historico);
    exibeKPIs(kpis);
    exibeHistorico(historico);
}

// --- Funções e Event Listeners para o Relatório Analítico ---

// Função para alternar visibilidade das seções
function toggleSections(showSectionId) {
    dashboardSection.classList.remove('active');
    reportSection.classList.remove('active');
    showDashboardBtn.classList.remove('active');
    showReportBtn.classList.remove('active');

    if (showSectionId === 'dashboard') {
        dashboardSection.classList.add('active');
        showDashboardBtn.classList.add('active');
        carregarEExibirDados(); // Recarrega o dashboard
    } else if (showSectionId === 'report') {
        reportSection.classList.add('active');
        showReportBtn.classList.add('active');
        // Não atualiza automaticamente o relatório, espera o usuário gerar
    }
}

// Event listener para gerar o relatório
generateReportBtn.addEventListener('click', async () => {
    reportStatusElement.textContent = 'Gerando relatório...';
    reportTableBody.innerHTML = '';
    reportTableHeader.innerHTML = '<th>KPI</th>'; // Reseta o cabeçalho

    const selectedMonths = Array.from(reportMesesSelect.selectedOptions).map(option => parseInt(option.value));
    const selectedYear = parseInt(reportAnoSelect.value);

    if (selectedMonths.length === 0 || isNaN(selectedYear)) {
        alert('Por favor, selecione pelo menos um mês e um ano para gerar o relatório.');
        reportStatusElement.textContent = '';
        return;
    }

    const allKPIs = {}; // Objeto para armazenar KPIs por mês/ano

    // Iterar sobre os meses selecionados e buscar/calcular KPIs
    for (const mes of selectedMonths) {
        const producoes = await getProducoesAPI(mes, selectedYear);
        const kpisDoMes = await calculaKPIs(producoes);
        allKPIs[`${getNomeMes(mes)}/${selectedYear}`] = kpisDoMes;
    }

    // Nomes dos KPIs para exibir na primeira coluna
    const kpiNames = {
        metaMensalTotal: 'Meta Mensal Total (Pacotes)',
        producaoAcumulada: 'Produção Acumulada (Pacotes)',
        metaEsperadaAteHoje: 'Meta Esperada até Hoje (Pacotes)',
        saldoAcumulado: 'Saldo Acumulado (Pacotes)',
        faltaParaMetaMensal: 'Falta para Meta (Pacotes)',
        phdMedioMensal: 'PHD Médio Mensal (Pacotes/Operador)',
        totalDiasOperacionaisPrevistos: 'Total Dias Operacionais Previstos',
        diasOperacaoConsiderados: 'Dias de Operação Considerados',
        diasRestantes: 'Dias Restantes no Mês'
    };

    // Adicionar cabeçalhos de coluna para os meses selecionados
    for (const mesLabel in allKPIs) {
        const th = document.createElement('th');
        th.textContent = mesLabel;
        reportTableHeader.appendChild(th);
    }

    // Preencher as linhas da tabela com os valores dos KPIs
    for (const kpiKey in kpiNames) {
        const tr = document.createElement('tr');
        const th = document.createElement('th'); // Primeira coluna é o nome do KPI
        th.textContent = kpiNames[kpiKey];
        tr.appendChild(th);

        for (const mesLabel in allKPIs) {
            const td = document.createElement('td');
            let value = allKPIs[mesLabel][kpiKey];

            if (kpiKey === 'phdMedioMensal') {
                 td.textContent = value.toFixed(2).toLocaleString('pt-BR');
            } else {
                 td.textContent = value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
            }
            td.classList.add('align-right');
            tr.appendChild(td);
        }
        reportTableBody.appendChild(tr);
    }

    reportStatusElement.textContent = 'Relatório gerado com sucesso!';
});

// Event listener para exportar para CSV
exportCsvBtn.addEventListener('click', () => {
    const table = reportTable;
    let csv = [];
    
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText);
    csv.push(headers.join(';'));

    table.querySelectorAll('tbody tr').forEach(row => {
        const rowData = [];
        rowData.push(row.querySelector('th').innerText); 
        Array.from(row.querySelectorAll('td')).forEach(cell => {
            let formattedValue = cell.innerText;
            if (formattedValue.includes(',')) {
                formattedValue = formattedValue.replace(/\./g, '').replace(',', '.');
            } else {
                formattedValue = formattedValue.replace(/\./g, '');
            }
            rowData.push(formattedValue);
        });
        csv.push(rowData.join(';'));
    });

    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.download = `relatorio_phd_${reportAnoSelect.value}.csv`;
    document.body.appendChild(downloadLink);
    document.body.removeChild(downloadLink);
    alert('Relatório exportado para CSV!');
});


// --- Inicialização da página ---
function popularSeletoresDeMesAno() {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    // Garante que selectMes e selectAno já foram definidos antes de usar
    if (selectMes) { // Adicionado verificação
        selectMes.innerHTML = meses.map((mes, index) => `<option value="${index + 1}">${mes}</option>`).join('');
    }

    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 5; i++) {
        anos.push(i);
    }
    if (selectAno) { // Adicionado verificação
        selectAno.innerHTML = anos.map(ano => `<option value="${ano}">${ano}</option>`).join('');
    }

    // Popula seletores do Relatório Analítico
    if (reportMesesSelect) { // Adicionado verificação
        reportMesesSelect.innerHTML = '';
        meses.forEach((nome, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = nome;
            reportMesesSelect.appendChild(option);
        });
    }

    if (reportAnoSelect) { // Adicionado verificação
        reportAnoSelect.innerHTML = '';
        for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            reportAnoSelect.appendChild(option);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. SELEÇÃO DE TODOS OS ELEMENTOS HTML ---
    // Dashboard elements
    dataInput = document.getElementById('data');
    producaoDiariaInput = document.getElementById('producaoDiaria');
    isExcecaoCheckbox = document.getElementById('isExcecao');
    operadoresNoDiaInput = document.getElementById('operadoresNoDia');
    addProducaoBtn = document.getElementById('addProducaoBtn');
    historicoTableBody = document.getElementById('historicoTableBody');

    mesAtualElement = document.getElementById('mesAtual');
    metaMensalTotalElement = document.getElementById('metaMensalTotal');
    producaoAcumuladaElement = document.getElementById('producaoAcumulada');
    metaAcumuladaElement = document.getElementById('metaAcumulada');
    saldoAcumuladoElement = document.getElementById('saldoAcumulado');
    faltaParaMetaMensalElement = document.getElementById('faltaParaMetaMensal');
    phdMedioMensalElement = document.getElementById('phdMedioMensal');
    totalDiasOperacionaisPrevistosElement = document.getElementById('totalDiasOperacionaisPrevistos');
    diasOperacaoConsideradosElement = document.getElementById('diasOperacaoConsiderados');
    diasRestantesElement = document.getElementById('diasRestantes');
    projecaoTextoElement = document.getElementById('projecaoTexto');

    selectMes = document.getElementById('selectMes');
    selectAno = document.getElementById('selectAno');
    visualizarMesBtn = document.getElementById('visualizarMesBtn');

    numOperadoresGlobalInput = document.getElementById('numOperadores');
    updateConfigBtn = document.getElementById('updateConfigBtn');

    // Report elements
    dashboardSection = document.getElementById('dashboardSection');
    reportSection = document.getElementById('reportSection');
    showDashboardBtn = document.getElementById('showDashboardBtn');
    showReportBtn = document.getElementById('showReportBtn');
    reportMesesSelect = document.getElementById('reportMeses');
    reportAnoSelect = document.getElementById('reportAno');
    generateReportBtn = document.getElementById('generateReportBtn');
    exportCsvBtn = document.getElementById('exportCsvBtn');
    reportTable = document.getElementById('reportTable');
    reportTableHeader = document.getElementById('reportTableHeader');
    reportTableBody = document.getElementById('reportTableBody');
    reportStatusElement = document.getElementById('reportStatus');

    // DEBUGGING: Check if elements are found
    console.log("addProducaoBtn:", addProducaoBtn);
    console.log("visualizarMesBtn:", visualizarMesBtn);
    console.log("updateConfigBtn:", updateConfigBtn);
    console.log("selectMes:", selectMes);
    console.log("selectAno:", selectAno);
    console.log("reportMesesSelect:", reportMesesSelect);
    console.log("reportAnoSelect:", reportAnoSelect);
    console.log("generateReportBtn:", generateReportBtn);
    console.log("exportCsvBtn:", exportCsvBtn);


    // --- 2. CARREGA CONFIGURAÇÕES DA API ---
    const configs = await getConfigsAPI();
    NUM_OPERADORES_PADRAO = configs.num_operadores_padrao;

    // --- 3. POPULA SELETORES DE MÊS E ANO (AGORA QUE selectMes e selectAno estão inicializados) ---
    popularSeletoresDeMesAno();

    // --- 4. CONFIGURA VALORES INICIAIS NOS INPUTS E VARIÁVEIS DE VISUALIZAÇÃO ---
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    dataInput.value = `${ano}-${mes}-${dia}`;

    operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
    numOperadoresGlobalInput.value = NUM_OPERADORES_PADRAO;

    anoVisualizado = ano;
    mesVisualizado = parseInt(mes);

    selectMes.value = mesVisualizado;
    selectAno.value = anoVisualizado;

    // --- 5. ADIÇÃO DOS LISTENERS DE EVENTOS ---
    // Adiciona verificação antes de adicionar o listener
    if (addProducaoBtn) {
        addProducaoBtn.addEventListener('click', async () => {
            const data = dataInput.value;
            const producaoDiaria = parseInt(producaoDiariaInput.value);
            const operadoresNoDia = parseInt(operadoresNoDiaInput.value);
            const isExcecao = isExcecaoCheckbox.checked;

            if (!data || isNaN(producaoDiaria) || producaoDiaria < 0 || isNaN(operadoresNoDia) || operadoresNoDia < 0) {
                alert('Por favor, preencha todos os campos com valores válidos.');
                return;
            }

            const dataObj = new Date(data + 'T12:00:00');
            const diaDaSemana = dataObj.getDay();
            const isDomingo = diaDaSemana === 0;

            const tipoDia = isExcecao ? 'Exceção' : (isDomingo ? 'Trabalhado - Domingo' : 'Normal');

            const producaoData = {
                data: data,
                producao_diaria: producaoDiaria,
                operadores_no_dia: operadoresNoDia,
                tipo_dia: tipoDia
            };

            await addProducaoAPI(producaoData);
            await carregarEExibirDados();
            producaoDiariaInput.value = '';
            isExcecaoCheckbox.checked = false;
        });
    } else {
        console.error("Erro: addProducaoBtn é null. O listener não pode ser adicionado.");
    }

    if (visualizarMesBtn) {
        visualizarMesBtn.addEventListener('click', async () => {
            anoVisualizado = parseInt(selectAno.value);
            mesVisualizado = parseInt(selectMes.value);
            await carregarEExibirDados();
        });
    } else {
        console.error("Erro: visualizarMesBtn é null. O listener não pode ser adicionado.");
    }

    if (updateConfigBtn) {
        updateConfigBtn.addEventListener('click', async () => {
            const novoNumOperadores = parseInt(numOperadoresGlobalInput.value);
            if (isNaN(novoNumOperadores) || novoNumOperadores < 1) {
                alert('Por favor, insira um número de operadores padrão válido (maior que zero).');
                return;
            }
            const updatedConfig = await updateConfigsAPI(novoNumOperadores);
            if (updatedConfig) {
                NUM_OPERADORES_PADRAO = updatedConfig.num_operadores_padrao;
                operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
                alert('Número de Operadores Padrão atualizado com sucesso!');
                carregarEExibirDados();
            }
        });
    } else {
        console.error("Erro: updateConfigBtn é null. O listener não pode ser adicionado.");
    }

    if (showDashboardBtn) {
        showDashboardBtn.addEventListener('click', () => toggleSections('dashboard'));
    } else {
        console.error("Erro: showDashboardBtn é null. O listener não pode ser adicionado.");
    }
    
    if (showReportBtn) {
        showReportBtn.addEventListener('click', () => toggleSections('report'));
    } else {
        console.error("Erro: showReportBtn é null. O listener não pode ser adicionado.");
    }

    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', async () => { /* ... */ }); // Conteúdo já está na função
    } else {
        console.error("Erro: generateReportBtn é null. O listener não pode ser adicionado.");
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => { /* ... */ }); // Conteúdo já está na função
    } else {
        console.error("Erro: exportCsvBtn é null. O listener não pode ser adicionado.");
    }


    // --- 6. CARREGA E EXIBE DADOS INICIAIS ---
    await carregarEExibirDados();
});
