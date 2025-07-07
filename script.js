// Constantes do seu negócio
let NUM_OPERADORES_PADRAO; // Agora será carregado da API
const PACOTES_POR_OPERADOR_DIA_META = 450;
const DIAS_OPERACAO_SEMANA = 6; // Esta constante serve mais para informação agora, a lógica de dias úteis reflete a escala

// URL base do seu backend - MUITO IMPORTANTE!
// QUANDO FOR PARA O RENDER, ESTA URL MUDARÁ PARA O ENDEREÇO DO SEU BACKEND NO RENDER.
const API_BASE_URL = 'https://phd-dashboard-backend-python.onrender.com/api';

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

// Função para obter a META DIÁRIA para um dia específico, considerando os operadores daquele dia
function getMetaDiariaParaDia(operadores) {
    return operadores * PACOTES_POR_OPERADOR_DIA_META;
}

// --- Nova Função: Calcular KPIs para um Período ---
// Esta função encapsula a lógica de cálculo de KPIs, tornando-a reutilizável
function calculateKPIsForMonth(producoesDoMes, ano, mes, numOperadoresPadrao, pacotesPorOperadorDiaMeta) {
    let producaoAcumulada = 0;
    let diasDeOperacaoConsiderados = 0; // Dias com registros de produção que NÃO são exceção
    let totalOperadoresEmDiasOperacionais = 0; // Para o PHD médio, com base em operadores reais dos registros

    // Garante que as produções estão ordenadas por data
    producoesDoMes.sort((a, b) => new Date(a.data) - new Date(b.data));

    const hoje = new Date(); // Data atual para cálculos (horas, minutos, etc. zerados para comparação de data)
    hoje.setHours(0, 0, 0, 0);

    // --- CÁLCULO DA META MENSAL TOTAL POTENCIAL (para o mês inteiro) ---
    let metaMensalTotal = 0;
    const totalDiasNoMes = new Date(ano, mes, 0).getDate(); // Último dia do mês (ex: 31 para julho)

    for (let day = 1; day <= totalDiasNoMes; day++) {
        const currentDate = new Date(ano, mes - 1, day);
        const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Segunda...
        const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMes.find(p => p.data === dataString);
        const isExcecaoDia = registroParaEsteDia ? registroParaEsteDia.isExcecao : false;

        // Um dia contribui para a metaMensalTotal se:
        // 1. For um dia de semana (seg-sab) E não for uma exceção explícita.
        // 2. OU For um domingo E tiver um registro de produção E NÃO for uma exceção (foi trabalhado).
        if ((dayOfWeek !== 0 && !isExcecaoDia) || (dayOfWeek === 0 && registroParaEsteDia && !isExcecaoDia)) {
            // Para a meta geral do mês, usa operadores padrão, a menos que um domingo tenha sido especificamente trabalhado.
            const operatorsForMeta = (dayOfWeek === 0 && registroParaEsteDia) ? registroParaEsteDia.operadoresNoDia : numOperadoresPadrao;
            metaMensalTotal += operatorsForMeta * pacotesPorOperadorDiaMeta;
        }
    }

    // --- CÁLCULO DA META ESPERADA ATÉ HOJE (metaAcumulada) ---
    // Esta é a meta ideal acumulada para os dias que já passaram no mês (ou o mês inteiro se for um mês histórico)
    let metaAcumulada = 0;
    const isCurrentMonth = (ano === hoje.getFullYear() && mes === hoje.getMonth() + 1);

    for (let day = 1; day <= totalDiasNoMes; day++) {
        const currentDate = new Date(ano, mes - 1, day);
        currentDate.setHours(0, 0, 0, 0); // Zera hora para comparação de data

        // Se for o mês atual, só acumula a meta para dias até "hoje" (inclusive)
        // Para meses passados, acumula para o mês inteiro.
        if (isCurrentMonth && currentDate > hoje) {
            continue; // Pula dias futuros se for o mês atual
        }

        const dayOfWeek = currentDate.getDay();
        const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMes.find(p => p.data === dataString);
        const isExcecaoDia = registroParaEsteDia ? registroParaEsteDia.isExcecao : false;

        // Aplica a mesma lógica de dias úteis/trabalhados que para metaMensalTotal
        if ((dayOfWeek !== 0 && !isExcecaoDia) || (dayOfWeek === 0 && registroParaEsteDia && !isExcecaoDia)) {
            const operatorsForMeta = (dayOfWeek === 0 && registroParaEsteDia) ? registroParaEsteDia.operadoresNoDia : numOperadoresPadrao;
            metaAcumulada += operatorsForMeta * pacotesPorOperadorDiaMeta;
        }
    }

    // --- CÁLCULO DA PRODUÇÃO ACUMULADA REAL E OUTROS KPI's baseados em registros reais ---
    for (const registro of producoesDoMes) {
        if (!registro.isExcecao) { // Só considera dias que não são exceção
            producaoAcumulada += registro.producao;
            diasDeOperacaoConsiderados++;
            totalOperadoresEmDiasOperacionais += registro.operadoresNoDia;
        }
    }

    const saldoTotalAcumulado = producaoAcumulada - metaAcumulada;
    const phdMedioMensal = totalOperadoresEmDiasOperacionais > 0
        ? producaoAcumulada / totalOperadoresEmDiasOperacionais
        : 0;

    const faltaParaMetaMensal = Math.max(0, metaMensalTotal - producaoAcumulada);

    // --- CÁLCULO DE DIAS RESTANTES NO MÊS PARA PROJEÇÃO ---
    let diasRestantes = 0;
    for (let day = 1; day <= totalDiasNoMes; day++) {
        const currentDate = new Date(ano, mes - 1, day);
        currentDate.setHours(0, 0, 0, 0); // Zera hora para comparação

        // Só conta dias estritamente NO FUTURO a partir de "hoje"
        if (currentDate <= hoje) {
            continue;
        }

        const dayOfWeek = currentDate.getDay();
        const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMes.find(p => p.data === dataString);
        const isExcecaoDia = registroParaEsteDia ? registroParaEsteDia.isExcecao : false;

        // Um dia futuro é considerado "restante" se for um dia de semana (seg-sab) e não for uma exceção explícita.
        // Domigos futuros não são contados a menos que já exista um registro indicando que será trabalhado (cenário raro para futuro)
        if (dayOfWeek !== 0 && !isExcecaoDia) {
            diasRestantes++;
        } else if (dayOfWeek === 0 && registroParaEsteDia && !isExcecaoDia) { // Caso raro de domingo futuro já registrado como trabalhado
            diasRestantes++;
        }
    }

    return {
        metaMensalTotal: Math.round(metaMensalTotal),
        producaoAcumulada: producaoAcumulada,
        metaAcumulada: Math.round(metaAcumulada),
        saldoAcumulado: saldoTotalAcumulado,
        phdMedioMensal: parseFloat(phdMedioMensal.toFixed(2)),
        diasOperacaoConsiderados: diasDeOperacaoConsiderados,
        diasRestantes: diasRestantes,
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

    // Lógica de projeção aprimorada
    if (kpis.producaoAcumulada > 0 || kpis.diasOperacaoConsiderados > 0) {
        if (kpis.diasRestantes > 0) {
            const projecaoTotal = kpis.producaoAcumulada + (kpis.diasRestantes * NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META);
            const diferenca = Math.abs(projecaoTotal - kpis.metaMensalTotal);
            
            let projecaoMensagem = `Com base na sua produção atual (${kpis.phdMedioMensal.toLocaleString('pt-BR')} pacotes/operador em média), a projeção para o mês é de <strong>${projecaoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong>, ficando `;

            if (projecaoTotal >= kpis.metaMensalTotal) {
                projecaoMensagem += `<strong>ACIMA ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong> da meta mensal.`;
            } else {
                projecaoMensagem += `<strong>ABAIXO ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong> da meta mensal.`;
                
                // Adiciona a sugestão de meta diária para bater a meta
                const pacotesParaBaterMeta = kpis.metaMensalTotal - projecaoTotal;
                if (kpis.diasRestantes > 0 && NUM_OPERADORES_PADRAO > 0) {
                    const phdNecessario = pacotesParaBaterMeta / (kpis.diasRestantes * NUM_OPERADORES_PADRAO);
                    projecaoMensagem += ` Para atingir a meta, você precisaria produzir aproximadamente <strong>${pacotesParaBaterMeta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes adicionais</strong>, com um PHD médio de <strong>${phdNecessario.toFixed(2).toLocaleString('pt-BR')} pacotes/operador</strong> nos ${kpis.diasRestantes} dias restantes.`;
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
            td.classList.add('align-right'); // Alinha os valores numéricos à direita
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