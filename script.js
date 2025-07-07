// Constantes do seu negócio
let NUM_OPERADORES_PADRAO; // Agora será carregado da API
const PACOTES_POR_OPERADOR_DIA_META = 450;
const DIAS_OPERACAO_SEMANA = 6; // Esta constante serve mais para informação agora, a lógica de dias úteis reflete a escala

// URL base do seu backend - MUITO IMPORTANTE!
// QUANDO FOR PARA O RENDER, ESTA URL MUDARÁ PARA O ENDEREÇO DO SEU BACKEND NO RENDER.
const API_BASE_URL = 'https://phd-dashboard-backend-python.onrender.com/api'; // <-- ALTERAÇÃO AQUI!

// Elementos HTML (seletores)
const dataInput = document.getElementById('data');
const producaoDiariaInput = document.getElementById('producaoDiaria');
const isExcecaoCheckbox = document.getElementById('isExcecao');
const operadoresNoDiaInput = document.getElementById('operadoresNoDia'); // NOVO: Input para operadores do dia
const addProducaoBtn = document.getElementById('addProducaoBtn');
const historicoTableBody = document.getElementById('historicoTableBody');

const mesAtualElement = document.getElementById('mesAtual');
const metaMensalTotalElement = document.getElementById('metaMensalTotal');
const producaoAcumuladaElement = document.getElementById('producaoAcumulada');
const metaAcumuladaElement = document.getElementById('metaAcumulada'); // Agora exibe "Meta Esperada até Hoje" no HTML
const saldoAcumuladoElement = document.getElementById('saldoAcumulado');
const phdMedioMensalElement = document.getElementById('phdMedioMensal');
const diasOperacaoConsideradosElement = document.getElementById('diasOperacaoConsiderados');
const diasRestantesElement = document.getElementById('diasRestantes');
const projecaoTextoElement = document.getElementById('projecaoTexto');
const faltaParaMetaMensalElement = document.getElementById('faltaParaMetaMensal');

const numOperadoresGlobalInput = document.getElementById('numOperadores'); // Renomeado para clareza
const updateConfigBtn = document.getElementById('updateConfigBtn');

// Novos seletores para a seleção de mês/ano do dashboard principal
const selectMes = document.getElementById('selectMes');
const selectAno = document.getElementById('selectAno');
const viewMonthBtn = document.getElementById('viewMonthBtn');

// Variáveis para armazenar os dados (agora virão da API)
// NOVO FORMATO: { data: 'YYYY-MM-DD', producao: 12345, isExcecao: true/false, operadoresNoDia: 13 }
let producoesMes = []; // Esta variável agora conterá os dados filtrados do mês/ano visualizado

// Variáveis para controlar o mês/ano que está sendo visualizado no dashboard
let anoVisualizado;
let mesVisualizado; // 1-12

// --- NOVOS ELEMENTOS PARA O RELATÓRIO ANALÍTICO ---
const dashboardSection = document.getElementById('dashboardSection');
const reportSection = document.getElementById('reportSection');
const showDashboardBtn = document.getElementById('showDashboardBtn');
const showReportBtn = document.getElementById('showReportBtn');

const reportMesesSelect = document.getElementById('reportMeses');
const reportAnoSelect = document.getElementById('reportAno');
const generateReportBtn = document.getElementById('generateReportBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const reportTable = document.getElementById('reportTable');
const reportTableHeader = document.getElementById('reportTableHeader');
const reportTableBody = document.getElementById('reportTableBody');
const reportStatusElement = document.getElementById('reportStatus');


// --- Funções para Interagir com a API ---

async function fetchProducoes(ano, mes) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes?ano=${ano}&mes=${mes}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar produções: ${response.statusText}`);
        }
        const data = await response.json();
        return data.map(item => ({
            data: item.data, // Mantém a data como está
            producao: parseInt(item.producao), // Garante que produção é um número
            isExcecao: Boolean(item.is_excecao), // Converte 0/1 para true/false
            operadoresNoDia: parseInt(item.operadores_no_dia) // <-- MUDANÇA AQUI: Garante que é um número
        }));
    } catch (error) {
        console.error('Erro ao carregar produções da API:', error);
        alert('Erro ao carregar dados de produção. Verifique o servidor backend.');
        return [];
    }
}

async function salvarProducaoAPI(registro) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: registro.data,
                producao: registro.producao,
                is_excecao: Number(registro.isExcecao), // Envia 0 ou 1 para o backend
                operadores_no_dia: registro.operadoresNoDia
            })
        });
        if (!response.ok) {
            throw new Error(`Erro ao salvar produção: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao salvar produção na API:', error);
        alert('Erro ao salvar produção. Verifique o servidor backend.');
        return null;
    }
}

async function excluirProducaoAPI(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes/${data}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Erro ao excluir produção: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao excluir produção da API:', error);
        alert('Erro ao excluir produção. Verifique o servidor backend.');
        return null;
    }
}

async function getConfigsAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar configurações: ${response.statusText}`);
        }
        const config = await response.json();
        // Converte valores para o tipo correto se necessário
        return {
            num_operadores_padrao: parseInt(config.num_operadores_padrao),
            pacotes_por_operador_dia_meta: parseInt(config.pacotes_por_operador_dia_meta)
            // Adicione outras configurações aqui se tiver
        };
    } catch (error) {
        console.error('Erro ao carregar configurações da API:', error);
        alert('Erro ao carregar configurações. Verifique o servidor backend.');
        // Retorna valores padrão em caso de erro para não quebrar a aplicação
        return { num_operadores_padrao: 13, pacotes_por_operador_dia_meta: 450 };
    }
}

async function updateConfigAPI(chave, valor) {
    try {
        const response = await fetch(`${API_BASE_URL}/config/${chave}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ valor: String(valor) }) // Envia como string
        });
        if (!response.ok) {
            throw new Error(`Erro ao atualizar configuração: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro ao atualizar configuração '${chave}' na API:`, error);
        alert(`Erro ao atualizar configuração '${chave}'. Verifique o servidor backend.`);
        return null;
    }
}

// --- Funções de Lógica de Negócio (a maioria permanece igual) ---

// Função para formatar a data para exibição
function formatarData(dataString) {
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Função para obter o nome do mês
function getNomeMes(mesNumero) {
    const data = new Date(2000, mesNumero - 1, 1); // Ano e dia fictícios
    return data.toLocaleDateString('pt-BR', { month: 'long' });
}

// Função para calcular dias de operação no mês, *ignorando os feriados já lançados*
// Agora leva em conta os operadoresNoDia de cada registro para calcular a meta do mês
function getDiasDeOperacaoNoMes(ano, mes, producoesDoMes) {
    let count = 0;
    const date = new Date(ano, mes - 1, 1);
    while (date.getMonth() === mes - 1) {
        const dayOfWeek = date.getDay();
        const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMes.find(p => p.data === dataString);

        // Um dia é considerado operacional se:
        // 1. Não for domingo E não for uma exceção lançada
        // OU
        // 2. For domingo E tiver um registro de produção E NÃO for uma exceção (ou seja, foi trabalhado)
        if ((dayOfWeek !== 0 && !(registroParaEsteDia && registroParaEsteDia.isExcecao)) ||
            (dayOfWeek === 0 && registroParaEsteDia && !registroParaEsteDia.isExcecao)) {
            count++;
        }
        date.setDate(date.getDate() + 1);
    }
    return count;
}

// Função para obter a META DIÁRIA para um dia específico, considerando os operadores daquele dia
function getMetaDiariaParaDia(operadores) {
    return operadores * PACOTES_POR_OPERADOR_DIA_META;
}

// --- Nova Função: Calcular KPIs para um Período ---
// Esta função encapsula a lógica de cálculo de KPIs, tornando-a reutilizável
function calculateKPIsForMonth(producoesDoMes, ano, mes, numOperadoresPadrao, pacotesPorOperadorDiaMeta) {
    let producaoAcumulada = 0;
    let diasDeOperacaoConsiderados = 0;
    let metaAcumulada = 0; // Meta esperada até o dia atual (ou o último dia do mês para relatório)
    let saldoTotalAcumulado = 0;
    let totalOperadoresEmDiasOperacionais = 0; // Para o PHD médio

    // Garante que as produções estão ordenadas por data
    producoesDoMes.sort((a, b) => new Date(a.data) - new Date(b.data));

    // --- CÁLCULO DA META MENSAL TOTAL E KPI's Diários ---
    let metaMensalTotal = 0;
    let diasUteisRestantes = 0;
    
    const hoje = new Date(); // Data atual para cálculo de dias restantes e meta acumulada
    // Ajuste para usar o último dia do mês para o cálculo de meta acumulada em relatórios históricos
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate(); // Último dia do mês (1 a 31)

    const dataIteracao = new Date(ano, mes - 1, 1); // Começa no primeiro dia do mês
    while (dataIteracao.getMonth() === mes - 1) {
        const dayOfWeek = dataIteracao.getDay();
        const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(dataIteracao.getDate()).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMes.find(p => p.data === dataString);

        let operadoresNoDiaAtual = numOperadoresPadrao; // Padrão
        let isExcecaoDia = false;

        if (registroParaEsteDia) {
            isExcecaoDia = registroParaEsteDia.isExcecao;
            if (!isExcecaoDia) { // Se tem registro e NÃO é exceção
                operadoresNoDiaAtual = registroParaEsteDia.operadoresNoDia;
                producaoAcumulada += registroParaEsteDia.producao; // Acumula produção para o mês
                diasDeOperacaoConsiderados++;
                totalOperadoresEmDiasOperacionais += operadoresNoDiaAtual;
            }
        } else { // Dia futuro ou sem registro
            // Se for domingo, não considera para operadores padrão a menos que tenha sido lançado como trabalhado
            if (dayOfWeek === 0) { // Domingo
                operadoresNoDiaAtual = 0;
            }
            // Para dias úteis (seg-sab) que ainda não têm registro
            // operadoresNoDiaAtual já é o NUM_OPERADORES_PADRAO
        }

        const metaDiariaCalculada = operadoresNoDiaAtual * pacotesPorOperadorDiaMeta;

        // Se o dia não é exceção (ou seja, é um dia de trabalho ou um domingo trabalhado)
        if (!isExcecaoDia) {
            metaMensalTotal += metaDiariaCalculada;
        }

        // Calcula a meta acumulada (meta esperada até este dia do mês)
        // A meta acumulada deve considerar apenas os dias até "hoje" ou até o último dia do mês para o relatório completo
        const dataAtualIteracao = new Date(dataString + 'T00:00:00');
        if (dataAtualIteracao <= hoje || dataIteracao.getDate() <= ultimoDiaDoMes) { // Verifica se o dia já passou ou é o dia atual
            if (!isExcecaoDia) {
                metaAcumulada += metaDiariaCalculada;
            }
        }
        
        // Contagem de dias úteis restantes (apenas para o mês atual, não para meses históricos completos)
        // Se o dia é futuro e não é domingo, considera-o um dia útil restante
        if (dataIteracao > hoje && dayOfWeek !== 0 && !isExcecaoDia) {
            diasUteisRestantes++;
        }
        
        dataIteracao.setDate(dataIteracao.getDate() + 1);
    }

    // Recalcula saldoTotalAcumulado após loop completo para precisão
    saldoTotalAcumulado = producaoAcumulada - metaAcumulada;

    const phdMedioMensal = totalOperadoresEmDiasOperacionais > 0
        ? producaoAcumulada / totalOperadoresEmDiasOperacionais
        : 0;

    const faltaParaMetaMensal = Math.max(0, metaMensalTotal - producaoAcumulada);

    return {
        metaMensalTotal: Math.round(metaMensalTotal),
        producaoAcumulada: producaoAcumulada,
        metaAcumulada: Math.round(metaAcumulada),
        saldoAcumulado: saldoTotalAcumulado,
        phdMedioMensal: parseFloat(phdMedioMensal.toFixed(2)),
        diasOperacaoConsiderados: diasDeOperacaoConsiderados,
        diasRestantes: diasUteisRestantes, // Isso será 0 para meses passados
        faltaParaMetaMensal: Math.round(faltaParaMetaMensal)
    };
}


// Event listener para a checkbox "Dia de Exceção"
isExcecaoCheckbox.addEventListener('change', () => {
    if (isExcecaoCheckbox.checked) {
        producaoDiariaInput.value = 0; // Define a produção para 0
        producaoDiariaInput.disabled = true; // Desabilita o campo para evitar digitação
        operadoresNoDiaInput.disabled = true; // Desabilita o campo de operadores para exceção
    } else {
        producaoDiariaInput.disabled = false; // Habilita o campo novamente
        producaoDiariaInput.value = ''; // Limpa o campo (ou você pode manter o último valor)
        operadoresNoDiaInput.disabled = false; // Habilita o campo de operadores
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO; // Volta para o padrão
    }
});

// Event listener para o botão de adicionar produção diária
addProducaoBtn.addEventListener('click', async () => { // Marcado como async
    const data = dataInput.value;
    const producao = parseInt(producaoDiariaInput.value);
    const isExcecao = isExcecaoCheckbox.checked;
    let operadoresNoDia = parseInt(operadoresNoDiaInput.value); // Pega operadores do input

    if (!data || isNaN(producao) || producao < 0) {
        alert('Por favor, insira uma data e uma produção diária válida (número não negativo).');
        return;
    }
    if (!isExcecao && (isNaN(operadoresNoDia) || operadoresNoDia < 1)) {
        alert('Por favor, insira um número válido de operadores para o dia (pelo menos 1), ou marque como exceção.');
        return;
    }

    // Se for exceção, o número de operadores no dia é irrelevante, podemos definir como 0.
    if (isExcecao) {
        operadoresNoDia = 0;
    }

    if (!isExcecao && producao === 0) {
        if (!confirm('Você está lançando 0 pacotes para um dia normal de operação. Tem certeza que deseja fazer isso?')) {
            return;
        }
    }

    const dataObj = new Date(data + 'T00:00:00');
    if (dataObj.getDay() === 0 && !isExcecao) { // Se for domingo e não for exceção
        if (!confirm('Você está tentando lançar produção para um domingo sem marcar como exceção. Este dia será considerado um "Domingo Trabalhado" e contará para as metas. Deseja continuar?')) {
            return;
        }
    }

    const novoRegistro = {
        data: data,
        producao: producao,
        isExcecao: isExcecao,
        operadoresNoDia: operadoresNoDia // Salva os operadores para este dia
    };

    const response = await salvarProducaoAPI(novoRegistro); // Chama a API para salvar
    if (response) {
        // Se a API salvou com sucesso, atualiza o dashboard
        await atualizarDashboard(anoVisualizado, mesVisualizado); // Aguarda a atualização dos dados
        dataInput.value = '';
        producaoDiariaInput.value = '';
        isExcecaoCheckbox.checked = false;
        producaoDiariaInput.disabled = false;
        operadoresNoDiaInput.disabled = false;
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO; // Volta para o padrão
    }
});

// Event listener para o botão de atualizar configurações (número de operadores GLOBAL)
updateConfigBtn.addEventListener('click', async () => { // Marcado como async
    const novoNumOperadores = parseInt(numOperadoresGlobalInput.value);

    if (isNaN(novoNumOperadores) || novoNumOperadores < 1) {
        alert('Por favor, insira um número válido de operadores padrão (pelo menos 1).');
        return;
    }

    const response = await updateConfigAPI('num_operadores_padrao', novoNumOperadores);
    if (response) {
        NUM_OPERADORES_PADRAO = novoNumOperadores; // Atualiza a variável local
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO; // Atualiza o campo de lançamento
        await atualizarDashboard(anoVisualizado, mesVisualizado); // Aguarda a atualização dos dados
        alert('Número de operadores padrão atualizado!');
    }
});

// Função para EXCLUIR uma produção do histórico
async function excluirProducao(dataParaExcluir) { // Marcado como async
    if (confirm(`Tem certeza que deseja excluir a produção de ${formatarData(dataParaExcluir)}?`)) {
        const response = await excluirProducaoAPI(dataParaExcluir); // Chama a API para excluir
        if (response) {
            await atualizarDashboard(anoVisualizado, mesVisualizado); // Aguarda a atualização dos dados
        }
    }
}

// Função para popular os dropdowns de mês e ano
function popularSeletoresDeMesAno() {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Popula seletores do Dashboard principal
    selectMes.innerHTML = '';
    meses.forEach((nome, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = nome;
        selectMes.appendChild(option);
    });

    selectAno.innerHTML = '';
    const anoAtual = new Date().getFullYear();
    for (let i = anoAtual - 2; i <= anoAtual + 3; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        selectAno.appendChild(option);
    }

    // Popula seletores do Relatório Analítico
    reportMesesSelect.innerHTML = '';
    meses.forEach((nome, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = nome;
        reportMesesSelect.appendChild(option);
    });

    reportAnoSelect.innerHTML = '';
    for (let i = anoAtual - 5; i <= anoAtual + 1; i++) { // Mais anos para histórico no relatório
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        reportAnoSelect.appendChild(option);
    }
}

// Event listener para o botão 'Visualizar Mês' do Dashboard principal
viewMonthBtn.addEventListener('click', async () => { // Marcado como async
    anoVisualizado = parseInt(selectAno.value);
    mesVisualizado = parseInt(selectMes.value);
    await atualizarDashboard(anoVisualizado, mesVisualizado); // Aguarda a atualização
});

// Função principal para atualizar o dashboard e o histórico
async function atualizarDashboard(ano, mes) { // Marcado como async
    const anoRef = ano || new Date().getFullYear();
    const mesRef = mes || new Date().getMonth() + 1;
    anoVisualizado = anoRef;
    mesVisualizado = mesRef;

    // Garante que os seletores de mês e ano reflitam o mês visualizado
    selectMes.value = mesVisualizado;
    selectAno.value = anoVisualizado;

    // --- AQUI É ONDE OS DADOS SÃO CARREGADOS DA API ---
    producoesMes = await fetchProducoes(anoVisualizado, mesVisualizado);
    producoesMes.sort((a, b) => new Date(a.data) - new Date(b.data)); // Garante a ordenação
    historicoTableBody.innerHTML = '';

    const kpis = calculateKPIsForMonth(producoesMes, anoVisualizado, mesVisualizado, NUM_OPERADORES_PADRAO, PACOTES_POR_OPERADOR_DIA_META);

    mesAtualElement.textContent = `${getNomeMes(mesVisualizado)} de ${anoVisualizado}`;
    metaMensalTotalElement.textContent = kpis.metaMensalTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais
    producaoAcumuladaElement.textContent = kpis.producaoAcumulada.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais
    metaAcumuladaElement.textContent = kpis.metaAcumulada.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais

    saldoAcumuladoElement.textContent = kpis.saldoAcumulado.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais
    if (kpis.saldoAcumulado >= 0) {
        saldoAcumuladoElement.classList.remove('negativo');
        saldoAcumuladoElement.classList.add('positivo');
    } else {
        saldoAcumuladoElement.classList.remove('positivo');
        saldoAcumuladoElement.classList.add('negativo');
    }

    phdMedioMensalElement.textContent = kpis.phdMedioMensal.toLocaleString('pt-BR'); // Mantém decimais para PHD
    diasOperacaoConsideradosElement.textContent = kpis.diasOperacaoConsiderados;
    diasRestantesElement.textContent = kpis.diasRestantes;
    faltaParaMetaMensalElement.textContent = kpis.faltaParaMetaMensal.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais

    // Lógica de projeção
    const diasCorridos = new Date().getDate();
    const totalDiasNoMes = new Date(anoVisualizado, mesVisualizado, 0).getDate(); // Último dia do mês
    const mediaDiariaAtual = kpis.producaoAcumulada / kpis.diasOperacaoConsiderados;

    if (kpis.producaoAcumulada > 0 && kpis.diasOperacaoConsiderados > 0) {
        if (kpis.diasRestantes > 0) {
            const projecaoTotal = kpis.producaoAcumulada + (mediaDiariaAtual * kpis.diasRestantes);
            const status = projecaoTotal >= kpis.metaMensalTotal ? 'ACIMA' : 'ABAIXO';
            const diferenca = Math.abs(projecaoTotal - kpis.metaMensalTotal);
            projecaoTextoElement.innerHTML = `Com base na sua produção atual (${mediaDiariaAtual.toFixed(2).toLocaleString('pt-BR')} pacotes/dia em média), a projeção para o mês é de <strong>${projecaoTotal.toFixed(0).toLocaleString('pt-BR')} pacotes</strong>, ficando <strong>${status} ${diferenca.toFixed(0).toLocaleString('pt-BR')} pacotes</strong> da meta mensal.`;
        } else {
            // Mês finalizado
            const status = kpis.producaoAcumulada >= kpis.metaMensalTotal ? 'ACIMA' : 'ABAIXO';
            const diferenca = Math.abs(kpis.producaoAcumulada - kpis.metaMensalTotal);
            projecaoTextoElement.innerHTML = `O mês de ${getNomeMes(mesVisualizado)} de ${anoVisualizado} foi finalizado com <strong>${kpis.producaoAcumulada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong>, ficando <strong>${status} ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong> da meta mensal.`;
        }
    } else {
        projecaoTextoElement.textContent = 'Comece a lançar sua produção para ver a projeção!';
    }

    // Preenche o histórico da tabela
    producoesMes.forEach(registro => {
        const row = historicoTableBody.insertRow();
        const tipoDia = registro.isExcecao ? 'Exceção' : (new Date(registro.data + 'T00:00:00').getDay() === 0 ? 'Domingo Trabalhado' : 'Normal');
        const metaDiariaRegistro = registro.isExcecao ? 0 : getMetaDiariaParaDia(registro.operadoresNoDia);
        const phdDiarioRegistro = registro.operadoresNoDia > 0 ? registro.producao / registro.operadoresNoDia : 0;
        const saldoDiarioRegistro = registro.producao - metaDiariaRegistro;

        row.insertCell(0).textContent = formatarData(registro.data);
        row.insertCell(1).textContent = registro.producao.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais
        row.insertCell(2).textContent = registro.operadoresNoDia;
        row.insertCell(3).textContent = metaDiariaRegistro.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais
        row.insertCell(4).textContent = phdDiarioRegistro.toFixed(2).toLocaleString('pt-BR');
        row.insertCell(5).textContent = saldoDiarioRegistro.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais
        row.insertCell(6).textContent = tipoDia;

        const acoesCell = row.insertCell(7);
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Excluir';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = () => excluirProducao(registro.data);
        acoesCell.appendChild(deleteButton);
    });
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
        atualizarDashboard(anoVisualizado, mesVisualizado); // Recarrega o dashboard
    } else if (showSectionId === 'report') {
        reportSection.classList.add('active');
        showReportBtn.classList.add('active');
        // Não atualiza automaticamente o relatório, espera o usuário gerar
    }
}

showDashboardBtn.addEventListener('click', () => toggleSections('dashboard'));
showReportBtn.addEventListener('click', () => toggleSections('report'));

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
        const producoes = await fetchProducoes(selectedYear, mes);
        const kpisDoMes = calculateKPIsForMonth(producoes, selectedYear, mes, NUM_OPERADORES_PADRAO, PACOTES_POR_OPERADOR_DIA_META);
        allKPIs[`${getNomeMes(mes)}/${selectedYear}`] = kpisDoMes;
    }

    // Nomes dos KPIs para exibir na primeira coluna
    const kpiNames = {
        metaMensalTotal: 'Meta Mensal Total (Pacotes)',
        producaoAcumulada: 'Produção Acumulada (Pacotes)',
        metaAcumulada: 'Meta Esperada até Hoje (Pacotes)',
        saldoAcumulado: 'Saldo Acumulado (Pacotes)',
        faltaParaMetaMensal: 'Falta para Meta (Pacotes)',
        phdMedioMensal: 'PHD Médio Mensal (Pacotes/Operador)',
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

            // Formatação específica para Saldo e PHD Médio
            if (kpiKey === 'phdMedioMensal') {
                 td.textContent = value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            } else {
                 td.textContent = value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Sem decimais para outros KPIs
            }
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
    
    // Adiciona o cabeçalho
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText);
    csv.push(headers.join(';')); // Usa ; como separador

    // Adiciona as linhas do corpo
    table.querySelectorAll('tbody tr').forEach(row => {
        const rowData = [];
        // Pega o nome do KPI da primeira célula <th>
        rowData.push(row.querySelector('th').innerText); 
        // Pega os valores das demais células <td>
        Array.from(row.querySelectorAll('td')).forEach(cell => {
            // Remove ponto de milhar e troca vírgula por ponto para CSV numérico (apenas se for PHD, outros são inteiros)
            let formattedValue = cell.innerText;
            if (cell.innerText.includes(',')) { // Checa se tem vírgula (provavelmente um decimal)
                formattedValue = formattedValue.replace(/\./g, '').replace(',', '.'); // Remove milhar e troca decimal
            } else {
                formattedValue = formattedValue.replace(/\./g, ''); // Remove apenas milhar para inteiros
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
    downloadLink.click();
    document.body.removeChild(downloadLink);
    alert('Relatório exportado para CSV!');
});


// --- Inicialização ao carregar a página ---
document.addEventListener('DOMContentLoaded', async () => { // Marcado como async
    // Carrega as configurações (incluindo NUM_OPERADORES_PADRAO) da API
    const configs = await getConfigsAPI();
    NUM_OPERADORES_PADRAO = configs.num_operadores_padrao;
    // PACOTES_POR_OPERADOR_DIA_META já é uma constante, mas pode vir da API se quiser que seja configurável

    popularSeletoresDeMesAno(); // Popula os dropdowns de mês e ano

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    dataInput.value = `${ano}-${mes}-${dia}`;

    // Inicializa o campo de operadores do dia com o valor padrão carregado
    operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
    numOperadoresGlobalInput.value = NUM_OPERADORES_PADRAO; // Garante que o input de configuração também reflita o padrão

    // Define o mês e ano visualizados como o mês/ano atual
    anoVisualizado = ano;
    mesVisualizado = parseInt(mes); // Garante que seja um número inteiro

    // Define os valores dos seletores de mês e ano para o mês/ano atual
    // Isso garante que os dropdowns mostrem o mês e ano corretos visualmente
    selectMes.value = mesVisualizado;
    selectAno.value = anoVisualizado;

    // Inicialmente mostra o dashboard
    toggleSections('dashboard');
});