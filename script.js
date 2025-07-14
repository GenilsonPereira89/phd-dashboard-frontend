// Constantes do seu negócio
let NUM_OPERADORES_PADRAO;
const PACOTES_POR_OPERADOR_DIA_META = 450;
const DIAS_OPERACAO_SEMANA = 6; // Esta constante serve mais para informação agora, a lógica de dias úteis reflete a escala

// URL base do seu backend - MUITO IMPORTANTE!
// QUANDO FOR PARA O RENDER, ESTA URL MUDARÁ PARA O ENDEREÇO DO SEU BACKEND NO RENDER.
const API_BASE_URL = 'https://phd-dashboard-backend-python.onrender.com/api'; // <-- ESTA DEVE SER A URL DO SEU BACKEND EXISTENTE NO RENDER!

// Elementos HTML (seletores)
const dataInput = document.getElementById('data');
const producaoDiariaInput = document.getElementById('producaoDiaria');
const isExcecaoCheckbox = document.getElementById('isExcecao');
const operadoresNoDiaInput = document.getElementById('operadoresNoDia');
const diaristasNoDiaInput = document.getElementById('diaristasNoDia');
const addProducaoBtn = document.getElementById('addProducaoBtn');
const historicoTableBody = document.getElementById('historicoTableBody');

const mesAtualElement = document.getElementById('mesAtual');
const metaMensalTotalElement = document.getElementById('metaMensalTotal'); // Este ID será renomeado no HTML para metaRealDoMes
const producaoAcumuladaElement = document.getElementById('producaoAcumulada');
const metaAcumuladaElement = document.getElementById('metaAcumulada');
const saldoAcumuladoElement = document.getElementById('saldoAcumulado');
const phdMedioMensalElement = document.getElementById('phdMedioMensal');
const diasOperacaoConsideradosElement = document.getElementById('diasOperacaoConsiderados');
const diasRestantesElement = document.getElementById('diasRestantes');
const projecaoTextoElement = document.getElementById('projecaoTexto');
const faltaParaMetaMensalElement = document.getElementById('faltaParaMetaMensal');
const totalDiaristasMesElement = document.getElementById('totalDiaristasMes');

// Elementos para KPIs quinzenais
const quinzenaAtualPeriodoElement = document.getElementById('quinzenaAtualPeriodo');
const metaQuinzenaTotalElement = document.getElementById('metaQuinzenaTotal');
const producaoAcumuladaQuinzenaElement = document.getElementById('producaoAcumuladaQuinzena');
const saldoQuinzenaElement = document.getElementById('saldoQuinzena');
const diasOperacaoRestantesQuinzenaElement = document.getElementById('diasOperacaoRestantesQuinzena');
const projecaoQuinzenaTextoElement = document.getElementById('projecaoQuinzenaTexto');

// Elementos para KPIs semanais
const semanaAtualPeriodoElement = document.getElementById('semanaAtualPeriodo');
const metaSemanalTotalElement = document.getElementById('metaSemanalTotal');
const producaoAcumuladaSemanalElement = document.getElementById('producaoAcumuladaSemanal');
const saldoSemanalElement = document.getElementById('saldoSemanal');
const diasOperacaoRestantesSemanaElement = document.getElementById('diasOperacaoRestantesSemana');
const projecaoSemanalTextoElement = document.getElementById('projecaoSemanalTexto');


const numOperadoresGlobalInput = document.getElementById('numOperadores');
const updateConfigBtn = document.getElementById('updateConfigBtn');

const selectMes = document.getElementById('selectMes');
const selectAno = document.getElementById('selectAno');
const viewMonthBtn = document.getElementById('viewMonthBtn');

// Seletores para os botões de exclusão por período
const excluirMesBtn = document.getElementById('excluirMesBtn');
const excluirQuinzenaBtn = document.getElementById('excluirQuinzenaBtn');
const excluirSemanaBtn = document.getElementById('excluirSemanaBtn');

// SELETORES PARA O RELATÓRIO COMPARATIVO
const selectMesRelatorioInicio = document.getElementById('selectMesRelatorioInicio');
const selectMesRelatorioFim = document.getElementById('selectMesRelatorioFim');
const selectAnoRelatorio = document.getElementById('selectAnoRelatorio'); 
const gerarRelatorioComparativoBtn = document.getElementById('gerarRelatorioComparativoBtn');
const relatorioComparativoOutput = document.getElementById('relatorioComparativoOutput');
const exportarRelatorioCsvBtn = document.getElementById('exportarRelatorioCsvBtn'); 
// O botão limparRelatorioBtn não existia nesta versão, então não o selecionamos aqui.


// Variáveis para armazenar os dados
let producoesMes = [];
let ultimoRelatorioGerado = []; // Armazena os dados do último relatório para exportação

// Variáveis para controlar o mês/ano que está sendo visualizado
let anoVisualizado;
let mesVisualizado;

// --- Funções para Interagir com a API ---

async function fetchProducoes(ano, mes) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes?ano=${ano}&mes=${mes}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar produções: ${response.statusText}`);
        }
        const data = await response.json();
        return data.map(item => ({
            data: item.data,
            producao: parseInt(item.producao),
            isExcecao: Boolean(item.is_excecao),
            operadoresNoDia: parseInt(item.operadores_no_dia),
            diaristasNoDia: parseInt(item.diaristas_no_dia || 0)
        }));
    } catch (error) {
        console.error('Erro ao carregar produções da API:', error);
        alert('Erro ao carregar dados de produção. Verifique o servidor backend.');
        return [];
    }
}

// Buscar produções por período (agora sem alert em caso de erro de fetch)
async function fetchProducoesByPeriodAPI(dataInicio, dataFim) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes/periodo?data_inicio=${dataInicio}&data_fim=${dataFim}`);
        if (!response.ok) {
            // Apenas loga o erro no console, sem alert para o usuário
            console.error(`Erro ao buscar produções por período (${dataInicio} a ${dataFim}): ${response.statusText}`);
            return []; // Retorna array vazio para que o cálculo de KPIs resulte em zero
        }
        const data = await response.json();
        return data.map(item => ({
            data: item.data,
            producao: parseInt(item.producao),
            isExcecao: Boolean(item.is_excecao),
            operadoresNoDia: parseInt(item.operadores_no_dia),
            diaristasNoDia: parseInt(item.diaristas_no_dia || 0)
        }));
    } catch (error) {
        // Apenas loga o erro no console, sem alert para o usuário
        console.error(`Erro inesperado ao carregar produções por período (${dataInicio} a ${dataFim}):`, error);
        return []; // Retorna array vazio para que o cálculo de KPIs resulte em zero
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
                is_excecao: Number(registro.isExcecao),
                operadores_no_dia: registro.operadoresNoDia,
                diaristas_no_dia: registro.diaristasNoDia
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

// Excluir produções por período
async function excluirProducoesPorPeriodoAPI(dataInicio, dataFim) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes/periodo?data_inicio=${dataInicio}&data_fim=${dataFim}`, {
            method: 'DELETE'
        });

        if (response.status === 404) {
            const message = (await response.json()).message;
            return { message: message || 'Nenhum registro encontrado para o período especificado.' };
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao excluir produções por período: ${response.statusText} - ${errorData.error || ''}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao excluir produções por período na API:', error);
        alert(`Erro ao excluir produções por período. Verifique o servidor backend. Detalhes: ${error.message}`);
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
        return {
            num_operadores_padrao: parseInt(config.num_operadores_padrao),
            pacotes_por_operador_dia_meta: parseInt(config.pacotes_por_operador_dia_meta)
        };
    } catch (error) {
        console.error('Erro ao carregar configurações da API:', error);
        alert('Erro ao carregar configurações. Verifique o servidor backend.');
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
            body: JSON.stringify({ valor: String(valor) })
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

// Funções de Lógica de Negócio

function formatarData(dataString) {
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Função auxiliar para formatar uma data Date para string YYYY-MM-DD
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getNomeMes(mesNumero) {
    const data = new Date(2000, mesNumero - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long' });
}

// A meta diária agora considera o total de pessoas (operadores + diaristas)
function getMetaDiariaParaDia(totalPessoas) {
    return totalPessoas * PACOTES_POR_OPERADOR_DIA_META;
}

// Retorna o número de dias de operação (não exceção e não domingo, a menos que seja domingo trabalhado)
// em um determinado período.
function getDiasDeOperacaoNoPeriodo(dataInicio, dataFim, producoes) {
    let count = 0;
    const current = new Date(dataInicio.getTime()); // Cria uma cópia para não modificar a original
    current.setHours(0, 0, 0, 0); // Garante que a hora seja 00:00:00 para comparação correta

    const finalDate = new Date(dataFim.getTime());
    finalDate.setHours(23, 59, 59, 999); // Garante que inclua o dia final

    while (current <= finalDate) {
        const dayOfWeek = current.getDay();
        const dataString = formatDateToYYYYMMDD(current);
        const registroParaEsteDia = producoes.find(p => p.data === dataString);

        if ((dayOfWeek !== 0 && !(registroParaEsteDia && registroParaEsteDia.isExcecao)) ||
            (dayOfWeek === 0 && registroParaEsteDia && !registroParaEsteDia.isExcecao)) {
            count++;
        }
        current.setDate(current.getDate() + 1); // Avança para o próximo dia
    }
    return count;
}

// Calcula KPIs para um período específico
function calcularKpisParaPeriodo(producoesDoPeriodo, dataInicioPeriodo, dataFimPeriodo, numOperadoresPadrao) {
    let producaoAcumulada = 0;
    let metaAcumulada = 0;
    let diasOperacaoConsiderados = 0;
    let totalOperadoresEmDiasOperacionais = 0;
    let totalDiaristas = 0;

    const dataAtualCalculo = new Date();
    dataAtualCalculo.setHours(0, 0, 0, 0);

    // Itera por todos os dias do período, não apenas os que têm produção lançada
    const tempDate = new Date(dataInicioPeriodo.getTime());
    tempDate.setHours(0,0,0,0); // Zera hora para comparação

    const finalDateForLoop = new Date(dataFimPeriodo.getTime());
    finalDateForLoop.setHours(23,59,59,999); // Garante que inclua o dia final

    while (tempDate <= finalDateForLoop) {
        const dataStringTemp = formatDateToYYYYMMDD(tempDate);
        const registroParaEsteDia = producoesDoPeriodo.find(p => p.data === dataStringTemp);
        const dayOfWeekTemp = tempDate.getDay();

        let operadoresCalculo = 0;
        let diaristasCalculo = 0;
        let metaDiariaCalculada = 0;

        if (registroParaEsteDia) {
            if (!registroParaEsteDia.isExcecao) {
                operadoresCalculo = registroParaEsteDia.operadoresNoDia;
                diaristasCalculo = registroParaEsteDia.diaristasNoDia;
                producaoAcumulada += registroParaEsteDia.producao;
                
                const totalPessoasNoDia = operadoresCalculo + diaristasCalculo;
                metaDiariaCalculada = getMetaDiariaParaDia(totalPessoasNoDia);
                metaAcumulada += metaDiariaCalculada;

                if (dayOfWeekTemp !== 0) { // Conta dias de segunda a sábado
                    diasOperacaoConsiderados++;
                } else { // Se for domingo trabalhado, também conta
                    diasOperacaoConsiderados++;
                }
                totalOperadoresEmDiasOperacionais += operadoresCalculo;
                totalDiaristas += registroParaEsteDia.diaristasNoDia;
            } else { // Se for exceção, diaristas ainda podem ser contados
                totalDiaristas += registroParaEsteDia.diaristasNoDia;
            }
        } else { // Se não há registro para o dia
            if (dayOfWeekTemp !== 0) { // Se não for domingo, usa operadores padrão para meta
                metaDiariaCalculada = getMetaDiariaParaDia(numOperadoresPadrao);
                metaAcumulada += metaDiariaCalculada;
                diasOperacaoConsiderados++; // Conta como dia de operação padrão
            }
            // Se for domingo e não tem registro, meta para o dia é 0 e não conta como dia de operação
        }
        tempDate.setDate(tempDate.getDate() + 1);
    }

    const saldoTotal = producaoAcumulada - metaAcumulada;
    const phdMedio = (producaoAcumulada > 0 && totalOperadoresEmDiasOperacionais > 0) ? (producaoAcumulada / totalOperadoresEmDiasOperacionais).toFixed(2) : '0.00';

    return {
        producaoAcumulada: producaoAcumulada,
        metaAcumulada: metaAcumulada,
        saldoTotal: saldoTotal,
        phdMedio: phdMedio,
        diasOperacaoConsiderados: diasOperacaoConsiderados,
        totalDiaristas: totalDiaristas
    };
}


// Event listener para a checkbox "Dia de Exceção"
isExcecaoCheckbox.addEventListener('change', () => {
    if (isExcecaoCheckbox.checked) {
        producaoDiariaInput.value = 0;
        producaoDiariaInput.disabled = true;
        operadoresNoDiaInput.disabled = true; // Desabilita operadores
        diaristasNoDiaInput.disabled = true; // Desabilita diaristas
        diaristasNoDiaInput.value = 0; // Zera diaristas
        operadoresNoDiaInput.value = 0; // Zera operadores
    } else {
        producaoDiariaInput.disabled = false;
        producaoDiariaInput.value = '';
        operadoresNoDiaInput.disabled = false; // Reabilita operadores
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO; // Volta para o padrão
        diaristasNoDiaInput.disabled = false;
        diaristasNoDiaInput.value = 0; // Volta diaristas para 0
    }
});

addProducaoBtn.addEventListener('click', async () => {
    const data = dataInput.value;
    const producao = parseInt(producaoDiariaInput.value);
    const isExcecao = isExcecaoCheckbox.checked;
    let operadoresNoDia = parseInt(operadoresNoDiaInput.value);
    let diaristasNoDia = parseInt(diaristasNoDiaInput.value);

    if (!data || isNaN(producao) || producao < 0) {
        alert('Por favor, insira uma data e uma produção diária válida (número não negativo).');
        return;
    }
    
    if (!isExcecao) {
        if (isNaN(operadoresNoDia) || operadoresNoDia < 0) {
            alert('Por favor, insira um número válido de operadores para o dia (não negativo).');
            return;
        }
        if (isNaN(diaristasNoDia) || diaristasNoDia < 0) {
            alert('Por favor, insira um número válido de diaristas para o dia (não negativo).');
            return;
        }
        // A validação de total de pessoas > 0 ainda é importante para dias normais de operação
        if ((operadoresNoDia + diaristasNoDia) <= 0) {
            alert('Para um dia normal de operação, o total de operadores e diaristas deve ser maior que zero.');
            return;
        }
    } else {
        // Se for exceção, a produção é 0, operadoresNoDia e diaristasNoDia são 0
        operadoresNoDia = 0;
        diaristasNoDia = 0;
    }

    if (!isExcecao && producao === 0) {
        if (!confirm('Você está lançando 0 pacotes para um dia normal de operação. Tem certeza que deseja fazer isso?')) {
            return;
        }
    }

    const dataObj = new Date(data + 'T00:00:00');
    if (dataObj.getDay() === 0 && !isExcecao) {
        if (!confirm('Você está tentando lançar produção para um domingo sem marcar como exceção. Este dia será considerado um "Domingo Trabalhado" e contará para as metas. Deseja continuar?')) {
            return;
        }
    }

    const novoRegistro = {
        data: data,
        producao: producao,
        isExcecao: isExcecao,
        operadoresNoDia: operadoresNoDia,
        diaristasNoDia: diaristasNoDia
    };

    const response = await salvarProducaoAPI(novoRegistro);
    if (response) {
        await atualizarDashboard(anoVisualizado, mesVisualizado);
        dataInput.value = '';
        producaoDiariaInput.value = '';
        isExcecaoCheckbox.checked = false;
        producaoDiariaInput.disabled = false;
        operadoresNoDiaInput.disabled = false;
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
        diaristasNoDiaInput.disabled = false;
        diaristasNoDiaInput.value = 0;
    }
});

updateConfigBtn.addEventListener('click', async () => {
    const novoNumOperadores = parseInt(numOperadoresGlobalInput.value);

    if (isNaN(novoNumOperadores) || novoNumOperadores < 1) {
        alert('Por favor, insira um número válido de operadores padrão (pelo menos 1).');
        return;
    }

    const response = await updateConfigAPI('num_operadores_padrao', novoNumOperadores);
    if (response) {
        NUM_OPERADORES_PADRAO = novoNumOperadores;
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
        await atualizarDashboard(anoVisualizado, mesVisualizado);
        alert('Número de operadores padrão atualizado!');
    }
});

async function excluirProducao(dataParaExcluir) {
    if (confirm(`Tem certeza que deseja excluir a produção de ${formatarData(dataParaExcluir)}?`)) {
        const response = await excluirProducaoAPI(dataParaExcluir);
        if (response) {
            await atualizarDashboard(anoVisualizado, mesVisualizado);
        }
    }
}

// FUNÇÕES PARA EXCLUIR POR PERÍODO
excluirMesBtn.addEventListener('click', async () => {
    const nomeMes = getNomeMes(mesVisualizado);
    const dataInicioMes = new Date(anoVisualizado, mesVisualizado - 1, 1);
    const dataFimMes = new Date(anoVisualizado, mesVisualizado, 0); // Último dia do mês

    const dataInicioStr = formatDateToYYYYMMDD(dataInicioMes); // Data no formato YYYY-MM-DD para a API
    const dataFimStr = formatDateToYYYYMMDD(dataFimMes);     // Data no formato YYYY-MM-DD para a API

    if (confirm(`ATENÇÃO: Tem certeza que deseja apagar TODOS os registros de produção do mês de ${nomeMes} de ${anoVisualizado}? Esta ação é IRREVERSÍVEL!`)) {
        const response = await excluirProducoesPorPeriodoAPI(dataInicioStr, dataFimStr);
        if (response) {
            let alertMessage = response.message;
            // Se a mensagem contém as datas no formato YYYY-MM-DD, formata-as
            if (alertMessage.includes("registros excluídos com sucesso para o período de")) {
                const formattedDataInicio = formatarData(dataInicioStr);
                const formattedDataFim = formatarData(dataFimStr);
                alertMessage = alertMessage.replace(dataInicioStr, formattedDataInicio).replace(dataFimStr, formattedDataFim);
            }
            alert(alertMessage); // Exibe a mensagem formatada
            await atualizarDashboard(anoVisualizado, mesVisualizado);
        }
    }
});

excluirQuinzenaBtn.addEventListener('click', async () => {
    const dataAtualCalculo = new Date();
    dataAtualCalculo.setHours(0, 0, 0, 0);

    let dataInicioQuinzena;
    let dataFimQuinzena;
    let nomeQuinzena;

    if (dataAtualCalculo.getDate() <= 15) {
        dataInicioQuinzena = new Date(anoVisualizado, mesVisualizado - 1, 1);
        dataFimQuinzena = new Date(anoVisualizado, mesVisualizado - 1, 15);
        nomeQuinzena = "1ª Quinzena";
    } else {
        dataInicioQuinzena = new Date(anoVisualizado, mesVisualizado - 1, 16);
        dataFimQuinzena = new Date(anoVisualizado, mesVisualizado, 0);
        nomeQuinzena = "2ª Quinzena";
    }

    const dataInicioStr = formatDateToYYYYMMDD(dataInicioQuinzena);
    const dataFimStr = formatDateToYYYYMMDD(dataFimQuinzena);

    if (confirm(`ATENÇÃO: Tem certeza que deseja apagar TODOS os registros de produção da ${nomeQuinzena} (${formatarData(dataInicioStr)} a ${formatarData(dataFimStr)})? Esta ação é IRREVERSÍVEL!`)) {
        const response = await excluirProducoesPorPeriodoAPI(dataInicioStr, dataFimStr);
        if (response) {
            let alertMessage = response.message;
            // Se a mensagem contém as datas no formato YYYY-MM-DD, formata-as
            if (alertMessage.includes("registros excluídos com sucesso para o período de")) {
                const formattedDataInicio = formatarData(dataInicioStr);
                const formattedDataFim = formatarData(dataFimStr);
                alertMessage = alertMessage.replace(dataInicioStr, formattedDataInicio).replace(dataFimStr, formattedDataFim);
            }
            alert(alertMessage);
            await atualizarDashboard(anoVisualizado, mesVisualizado);
        }
    }
});

excluirSemanaBtn.addEventListener('click', async () => {
    const dataAtualCalculo = new Date();
    dataAtualCalculo.setHours(0, 0, 0, 0);

    const diaDaSemanaHoje = dataAtualCalculo.getDay();
    const inicioSemana = new Date(dataAtualCalculo);
    inicioSemana.setDate(dataAtualCalculo.getDate() - (diaDaSemanaHoje === 0 ? 6 : diaDaSemanaHoje - 1));
    inicioSemana.setHours(0, 0, 0, 0);

    const finalSemana = new Date(inicioSemana);
    finalSemana.setDate(inicioSemana.getDate() + 6);
    finalSemana.setHours(23, 59, 59, 999);

    const dataInicioStr = formatDateToYYYYMMDD(inicioSemana);
    const dataFimStr = formatDateToYYYYMMDD(finalSemana);

    if (confirm(`ATENÇÃO: Tem certeza que deseja apagar TODOS os registros de produção da semana atual (${formatarData(dataInicioStr)} a ${formatarData(dataFimStr)})? Esta ação é IRREVERSÍVEL!`)) {
        const response = await excluirProducoesPorPeriodoAPI(dataInicioStr, dataFimStr);
        if (response) {
            let alertMessage = response.message;
            // Se a mensagem contém as datas no formato YYYY-MM-DD, formata-as
            if (alertMessage.includes("registros excluídos com sucesso para o período de")) {
                const formattedDataInicio = formatarData(dataInicioStr);
                const formattedDataFim = formatarData(dataFimStr);
                alertMessage = alertMessage.replace(dataInicioStr, formattedDataInicio).replace(dataFimStr, formattedDataFim);
            }
            alert(alertMessage);
            await atualizarDashboard(anoVisualizado, mesVisualizado);
        }
    }
});


function popularSeletoresDeMesAno() {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

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
}

// Popula os seletores de mês e ANO para o relatório comparativo
function popularSeletoresDeMesAnoRelatorio() {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    selectMesRelatorioInicio.innerHTML = '';
    selectMesRelatorioFim.innerHTML = '';
    selectAnoRelatorio.innerHTML = ''; // Limpa o seletor de ano do relatório

    meses.forEach((nome, index) => {
        const optionInicio = document.createElement('option');
        optionInicio.value = index + 1;
        optionInicio.textContent = nome;
        selectMesRelatorioInicio.appendChild(optionInicio);

        const optionFim = document.createElement('option');
        optionFim.value = index + 1;
        optionFim.textContent = nome;
        selectMesRelatorioFim.appendChild(optionFim);
    });

    const anoAtual = new Date().getFullYear();
    for (let i = anoAtual - 2; i <= anoAtual + 3; i++) { // Mesma faixa de anos do dashboard principal
        const optionAno = document.createElement('option');
        optionAno.value = i;
        optionAno.textContent = i;
        selectAnoRelatorio.appendChild(optionAno);
    }

    // Define o mês atual como padrão para o seletor de fim e o ano atual para o seletor de ano
    const hoje = new Date();
    selectMesRelatorioFim.value = hoje.getMonth() + 1;
    selectAnoRelatorio.value = hoje.getFullYear();
}


viewMonthBtn.addEventListener('click', async () => {
    anoVisualizado = parseInt(selectAno.value);
    mesVisualizado = parseInt(selectMes.value);
    await atualizarDashboard(anoVisualizado, mesVisualizado);
});

// Gerar Relatório Comparativo (agora usa o ano do seletor do relatório e gerencia visibilidade dos botões)
gerarRelatorioComparativoBtn.addEventListener('click', async () => {
    const mesInicio = parseInt(selectMesRelatorioInicio.value);
    const mesFim = parseInt(selectMesRelatorioFim.value);
    const anoRelatorio = parseInt(selectAnoRelatorio.value); 

    if (mesInicio > mesFim) {
        alert('O mês inicial não pode ser maior que o mês final para o relatório comparativo.');
        return;
    }

    relatorioComparativoOutput.innerHTML = '<p>Gerando relatório...</p>';
    exportarRelatorioCsvBtn.style.display = 'none'; // Esconde o botão de exportar enquanto gera
    // O botão limparRelatorioBtn não existia nesta versão, então não o manipulamos aqui.

    const kpisParaComparar = [
        { id: 'producaoAcumulada', label: 'Produção Total (Pacotes)', format: 'number' },
        { id: 'metaAcumulada', label: 'Meta Total do Período (Pacotes)', format: 'number' },
        { id: 'saldoTotal', label: 'Saldo Total', format: 'number' },
        { id: 'phdMedio', label: 'PHD Médio (Pacotes/Operador)', format: 'decimal' },
        { id: 'diasOperacaoConsiderados', label: 'Dias de Operação Considerados', format: 'number' },
        { id: 'totalDiaristas', label: 'Total de Diaristas Utilizados', format: 'number' }
    ];

    const resultadosPorMes = [];
    const mesesNomes = [];

    for (let currentMonth = mesInicio; currentMonth <= mesFim; currentMonth++) {
        const dataInicioMes = new Date(anoRelatorio, currentMonth - 1, 1); 
        const dataFimMes = new Date(anoRelatorio, currentMonth, 0); 

        const producoesDoMes = await fetchProducoesByPeriodAPI(
            formatDateToYYYYMMDD(dataInicioMes),
            formatDateToYYYYMMDD(dataFimMes)
        );

        const kpisDoMes = calcularKpisParaPeriodo(
            producoesDoMes,
            dataInicioMes,
            dataFimMes,
            NUM_OPERADORES_PADRAO
        );
        resultadosPorMes.push(kpisDoMes);
        mesesNomes.push(getNomeMes(currentMonth));
    }

    if (resultadosPorMes.length === 0) {
        relatorioComparativoOutput.innerHTML = '<p>Nenhum dado encontrado para o período selecionado.</p>';
        return;
    }

    // Armazena os dados brutos e formatados para exportação
    ultimoRelatorioGerado = {
        kpis: kpisParaComparar,
        mesesNomes: mesesNomes,
        resultados: resultadosPorMes
    };

    // Cria a tabela HTML para exibição
    let tableHtml = '<table class="comparative-report-table"><thead><tr><th>Indicador</th>';
    mesesNomes.forEach(mes => {
        tableHtml += `<th>${mes}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    kpisParaComparar.forEach(kpi => {
        tableHtml += `<tr><td>${kpi.label}</td>`;
        resultadosPorMes.forEach(mesResult => {
            let valor = mesResult[kpi.id];
            if (kpi.format === 'number') {
                valor = valor.toLocaleString('pt-BR');
            } else if (kpi.format === 'decimal') {
                valor = parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            tableHtml += `<td>${valor}</td>`;
        });
        tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    relatorioComparativoOutput.innerHTML = tableHtml;
    exportarRelatorioCsvBtn.style.display = 'block'; // Mostra o botão de exportar
});

// Exportar tabela para CSV
function exportTableToCSV(filename) {
    if (!ultimoRelatorioGerado || ultimoRelatorioGerado.resultados.length === 0) {
        alert('Nenhum relatório para exportar. Gere um relatório primeiro.');
        return;
    }

    let csv = [];
    const headers = ['Indicador', ...ultimoRelatorioGerado.mesesNomes];
    csv.push(headers.join(';')); // Usa ponto e vírgula como delimitador para CSV em pt-BR

    ultimoRelatorioGerado.kpis.forEach(kpi => {
        let row = [kpi.label];
        ultimoRelatorioGerado.resultados.forEach(mesResult => {
            let valor = mesResult[kpi.id];
            // Para CSV, queremos o valor numérico puro ou com ponto como separador decimal,
            // e depois substituímos o ponto por vírgula para compatibilidade com Excel BR.
            if (kpi.format === 'number') {
                valor = valor; 
            } else if (kpi.format === 'decimal') {
                valor = parseFloat(valor).toFixed(2).replace('.', ','); // Formata decimal para CSV pt-BR
            }
            row.push(valor);
        });
        csv.push(row.join(';'));
    });

    const csvString = csv.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    // Cria um link temporário para download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Botão de Exportar CSV
exportarRelatorioCsvBtn.addEventListener('click', () => {
    const mesInicio = getNomeMes(parseInt(selectMesRelatorioInicio.value));
    const mesFim = getNomeMes(parseInt(selectMesRelatorioFim.value));
    const ano = parseInt(selectAnoRelatorio.value); 
    let filename = `Relatorio_PHD_${mesInicio}_${mesFim}_${ano}.csv`;
    if (selectMesRelatorioInicio.value === selectMesRelatorioFim.value) {
        filename = `Relatorio_PHD_${mesInicio}_${ano}.csv`;
    }
    exportTableToCSV(filename);
});


async function atualizarDashboard(ano, mes) {
    const anoRef = ano || new Date().getFullYear();
    const mesRef = mes || new Date().getMonth() + 1;

    anoVisualizado = anoRef;
    mesVisualizado = mesRef;

    selectMes.value = mesVisualizado;
    selectAno.value = anoVisualizado;

    producoesMes = await fetchProducoes(anoVisualizado, mesVisualizado);
    producoesMes.sort((a, b) => new Date(a.data) - new Date(b.data));

    historicoTableBody.innerHTML = '';

    let producaoAcumuladaMensal = 0;
    // diasDeOperacaoConsideradosMensal agora conta apenas dias de segunda a sábado que não foram exceção
    let diasDeOperacaoConsideradosMensal = 0; 
    let metaAcumuladaMensal = 0;
    let saldoTotalAcumuladoMensal = 0;
    let totalOperadoresEmDiasOperacionaisMensal = 0;
    let totalDiaristasMes = 0;

    const nomeMes = getNomeMes(mesVisualizado);
    mesAtualElement.textContent = `${nomeMes} de ${anoVisualizado}`;

    const dataAtualCalculo = new Date();
    dataAtualCalculo.setHours(0, 0, 0, 0);

    const producoesDoMesVisualizado = producoesMes; 

    // --- CÁLCULO DA META MENSAL TOTAL (FIXA, COM BASE EM DIAS ÚTEIS PADRÃO) ---
    let metaMensalTotal = 0;
    const ultimoDiaDoMes = new Date(anoVisualizado, mesVisualizado, 0).getDate();
    let totalStandardWorkingDaysInMonth = 0; // Contagem de dias de segunda a sábado no mês
    for (let i = 1; i <= ultimoDiaDoMes; i++) {
        const dataIteracao = new Date(anoVisualizado, mesVisualizado - 1, i);
        const dayOfWeek = dataIteracao.getDay();
        if (dayOfWeek !== 0) { // Se não for domingo
            totalStandardWorkingDaysInMonth++;
        }
    }
    // A meta mensal total é fixa, baseada nos dias úteis padrão e operadores padrão
    metaMensalTotal = totalStandardWorkingDaysInMonth * getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
    metaMensalTotalElement.textContent = metaMensalTotal.toLocaleString('pt-BR');


    // --- PREENCHIMENTO DA TABELA E CÁLCULOS ACUMULADOS MENSAIS ---
    producoesDoMesVisualizado.forEach(registro => {
        const operadoresCalculo = registro.isExcecao ? 0 : registro.operadoresNoDia;
        const diaristasCalculo = registro.isExcecao ? 0 : registro.diaristasNoDia;
        
        // MODIFICAÇÃO AQUI: Incluindo diaristas no cálculo da meta diária do registro
        const totalPessoasNoDia = operadoresCalculo + diaristasCalculo;
        const metaDiariaDoRegistro = getMetaDiariaParaDia(totalPessoasNoDia);

        const dataRegistroObj = new Date(registro.data + 'T00:00:00');
        const dayOfWeekRegistro = dataRegistroObj.getDay();

        if (!registro.isExcecao) {
            producaoAcumuladaMensal += registro.producao;
            metaAcumuladaMensal += metaDiariaDoRegistro;
            // diasDeOperacaoConsideradosMensal AGORA SÓ CONTA DIAS DE SEGUNDA A SÁBADO NÃO EXCEÇÃO
            if (dayOfWeekRegistro !== 0) { 
                diasDeOperacaoConsideradosMensal++;
            }
            totalOperadoresEmDiasOperacionaisMensal += operadoresCalculo;
            totalDiaristasMes += registro.diaristasNoDia;
        } else {
            totalDiaristasMes += registro.diaristasNoDia;
        }

        const phdDiario = (registro.producao > 0 && operadoresCalculo > 0) ? (registro.producao / operadoresCalculo).toFixed(2) : '0.00';

        let saldoDiario;
        if (registro.isExcecao) {
            saldoDiario = 0;
        } else {
            saldoDiario = registro.producao - metaDiariaDoRegistro;
        }

        const row = historicoTableBody.insertRow();
        row.insertCell().textContent = formatarData(registro.data);
        row.insertCell().textContent = registro.producao.toLocaleString('pt-BR');
        row.insertCell().textContent = registro.operadoresNoDia;
        row.insertCell().textContent = registro.diaristasNoDia;
        row.insertCell().textContent = metaDiariaDoRegistro.toLocaleString('pt-BR');
        row.insertCell().textContent = phdDiario;
        const saldoCell = row.insertCell();
        saldoCell.textContent = saldoDiario.toLocaleString('pt-BR');
        saldoCell.style.color = saldoDiario >= 0 ? 'green' : 'red';
        saldoCell.style.fontWeight = 'bold';

        const tipoCell = row.insertCell();
        if (registro.isExcecao) {
            tipoCell.textContent = 'Exceção';
            tipoCell.classList.add('excecao-dia');
        } else {
            const diaDaSemana = new Date(registro.data + 'T00:00:00').getDay();
            if (diaDaSemana === 0) {
                tipoCell.textContent = 'Domingo Trabalhado';
            } else {
                tipoCell.textContent = 'Normal';
            }
        }

        const acoesCell = row.insertCell();
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.onclick = () => excluirProducao(registro.data);
        acoesCell.appendChild(deleteBtn);
    });

    saldoTotalAcumuladoMensal = producaoAcumuladaMensal - metaAcumuladaMensal;

    const faltaParaMetaMensal = metaMensalTotal - producaoAcumuladaMensal;
    faltaParaMetaMensalElement.textContent = faltaParaMetaMensal.toLocaleString('pt-BR');

    // --- Dias Restantes Mensal (Para a projeção da Meta Mensal FIXA) ---
    // Contamos os dias de segunda a sábado que ainda não foram considerados na meta acumulada
    let diasRestantesMensal = totalStandardWorkingDaysInMonth - diasDeOperacaoConsideradosMensal;
    if (diasRestantesMensal < 0) {
        diasRestantesMensal = 0;
    }
    diasRestantesElement.textContent = diasRestantesMensal;


    const phdMedioMensal = (producaoAcumuladaMensal > 0 && totalOperadoresEmDiasOperacionaisMensal > 0) ? (producaoAcumuladaMensal / totalOperadoresEmDiasOperacionaisMensal).toFixed(2) : '0.00';

    producaoAcumuladaElement.textContent = producaoAcumuladaMensal.toLocaleString('pt-BR');
    metaAcumuladaElement.textContent = metaAcumuladaMensal.toLocaleString('pt-BR');
    saldoAcumuladoElement.textContent = saldoTotalAcumuladoMensal.toLocaleString('pt-BR');
    phdMedioMensalElement.textContent = phdMedioMensal;
    diasOperacaoConsideradosElement.textContent = diasDeOperacaoConsideradosMensal;
    diasRestantesElement.textContent = diasRestantesMensal;
    totalDiaristasMesElement.textContent = totalDiaristasMes.toLocaleString('pt-BR');

    saldoAcumuladoElement.classList.remove('positivo', 'negativo');
    if (saldoTotalAcumuladoMensal > 0) {
        saldoAcumuladoElement.classList.add('positivo');
        saldoAcumuladoElement.innerHTML += ' (Positivo)';
    } else if (saldoTotalAcumuladoMensal < 0) {
        saldoAcumuladoElement.classList.add('negativo');
        saldoAcumuladoElement.innerHTML += ' (Negativo)';
    } else {
        saldoAcumuladoElement.style.color = '#333';
        saldoAcumuladoElement.innerHTML += ' (Na Meta)';
    }

    // --- Projeção Mensal ---
    if (diasRestantesMensal > 0) {
        const metaDiariaPadraoParaProjecao = getMetaDiariaParaDia(NUM_OPERADORES_PADRAO); 
        let projecaoTextoMensal = '';

        if (producaoAcumuladaMensal === 0 && diasDeOperacaoConsideradosMensal === 0) {
            projecaoTextoMensal = `Ainda não há lançamentos de produção para ${nomeMes} de ${anoVisualizado}. A meta para o mês é de ${metaMensalTotal.toLocaleString('pt-BR')} pacotes. Comece a registrar a produção!`;
            projecaoTextoElement.style.color = 'blue';
        } else {
            // A projeção agora se baseia na diferença entre a meta FIXA e a produção acumulada
            const producaoTotalProjetada = producaoAcumuladaMensal + (metaDiariaPadraoParaProjecao * diasRestantesMensal);
            let projecaoSuperar = producaoTotalProjetada - metaMensalTotal;

            if (projecaoSuperar < 0) {
                const pacotesParaRecuperar = Math.abs(projecaoSuperar);
                const pacotesPorDiaParaRecuperar = pacotesParaRecuperar / diasRestantesMensal;
                const metaDiariaAjustadaParaRecuperar = metaDiariaPadraoParaProjecao + pacotesPorDiaParaRecuperar;
                
                const totalPessoasPadraoProjecao = NUM_OPERADORES_PADRAO;
                const phdAdicionalPorPessoa = totalPessoasPadraoProjecao > 0 ? (pacotesPorDiaParaRecuperar / totalPessoasPadraoProjecao).toFixed(2) : '0.00';

                projecaoTextoMensal = `Para atingir a meta mensal, vocês precisam fazer uma média de ${Math.round(metaDiariaAjustadaParaRecuperar).toLocaleString('pt-BR')} pacotes por dia (ou seja, aproximadamente ${phdAdicionalPorPessoa} pacotes a mais por pessoa por dia, considerando ${NUM_OPERADORES_PADRAO} operadores) nos próximos ${diasRestantesMensal} dias de operação.`;
                projecaoTextoElement.style.color = 'red';
            } else {
                projecaoTextoMensal = `Com a produção atual, e mantendo o ritmo de ${metaDiariaPadraoParaProjecao.toLocaleString('pt-BR')} pacotes/dia (com ${NUM_OPERADORES_PADRAO} operadores), a projeção é de superar a meta mensal em ${projecaoSuperar.toLocaleString('pt-BR')} pacotes! Continuem assim!`;
                projecaoTextoElement.style.color = 'green';

                const pacotesFaltantesParaMetaMensal = metaMensalTotal - producaoAcumuladaMensal;
                let metaDiariaMinimaAjustada = 0;
                let phdMinimoPorPessoa = 0;

                if (pacotesFaltantesParaMetaMensal > 0 && diasRestantesMensal > 0) {
                    metaDiariaMinimaAjustada = pacotesFaltantesParaMetaMensal / diasRestantesMensal;
                    const totalPessoasParaMeta = NUM_OPERADORES_PADRAO;
                    if (totalPessoasParaMeta > 0) {
                        phdMinimoPorPessoa = (metaDiariaMinimaAjustada / totalPessoasParaMeta).toFixed(2);
                    }
                }

                if (pacotesFaltantesParaMetaMensal > 0 && diasRestantesMensal > 0) {
                    projecaoTextoMensal += ` Para *apenas* atingir a meta mensal, vocês precisam de uma média de ${Math.round(metaDiariaMinimaAjustada).toLocaleString('pt-BR')} pacotes por dia (equivalente a ${phdMinimoPorPessoa} PHD por pessoa) nos ${diasRestantesMensal} dias de operação restantes.`;
                }
            }
            projecaoTextoElement.textContent = projecaoTextoMensal;
        }
    } else {
        if (saldoTotalAcumuladoMensal < 0) {
            projecaoTextoElement.textContent = 'Mês encerrado com saldo negativo. Analisar desempenho para o próximo mês.';
            projecaoTextoElement.style.color = 'orange';
        } else {
            projecaoTextoElement.textContent = 'Mês encerrado com a meta atingida ou superada! Parabéns!';
            projecaoTextoElement.style.color = 'blue';
        }
    }

    // --- CÁLCULOS E PROJEÇÕES QUINZENAIS (DINÂMICAS) ---
    let dataInicioQuinzena;
    let dataFimQuinzena;
    let nomeQuinzena;

    if (dataAtualCalculo.getDate() <= 15) {
        dataInicioQuinzena = new Date(anoVisualizado, mesVisualizado - 1, 1);
        dataFimQuinzena = new Date(anoVisualizado, mesVisualizado - 1, 15);
        nomeQuinzena = "1ª Quinzena";
    } else {
        dataInicioQuinzena = new Date(anoVisualizado, mesVisualizado - 1, 16);
        dataFimQuinzena = new Date(anoVisualizado, mesVisualizado, 0);
        nomeQuinzena = "2ª Quinzena";
    }

    quinzenaAtualPeriodoElement.textContent = `${nomeQuinzena} (${formatarData(dataInicioQuinzena.toISOString().split('T')[0])} a ${formatarData(dataFimQuinzena.toISOString().split('T')[0])})`;

    let producaoAcumuladaQuinzena = 0;
    let metaAcumuladaQuinzena = 0;
    let diasOperacaoConsideradosQuinzena = 0;
    let totalOperadoresEmDiasOperacionaisQuinzena = 0;
    let metaQuinzenaTotal = 0; // Dinâmica

    const producoesDaQuinzena = producoesMes.filter(p => {
        const pDate = new Date(p.data + 'T00:00:00');
        return pDate >= dataInicioQuinzena && pDate <= dataFimQuinzena;
    });

    const tempDateForQuinzenaMeta = new Date(dataInicioQuinzena.getTime());
    while (tempDateForQuinzenaMeta <= dataFimQuinzena) {
        const dataStringTemp = `${tempDateForQuinzenaMeta.getFullYear()}-${String(tempDateForQuinzenaMeta.getMonth() + 1).padStart(2, '0')}-${String(tempDateForQuinzenaMeta.getDate()).padStart(2, '0')}`;
        const registroParaEsteDiaQuinzena = producoesDaQuinzena.find(p => p.data === dataStringTemp);
        const dayOfWeekTemp = tempDateForQuinzenaMeta.getDay();

        if (registroParaEsteDiaQuinzena) {
            if (!registroParaEsteDiaQuinzena.isExcecao) {
                // MODIFICAÇÃO AQUI: Incluindo diaristas no cálculo da meta diária da quinzena (se houver registro)
                metaQuinzenaTotal += getMetaDiariaParaDia(registroParaEsteDiaQuinzena.operadoresNoDia + registroParaEsteDiaQuinzena.diaristasNoDia);
                if (tempDateForQuinzenaMeta <= dataAtualCalculo) {
                    producaoAcumuladaQuinzena += registroParaEsteDiaQuinzena.producao;
                    // MODIFICAÇÃO AQUI: Incluindo diaristas no cálculo da meta acumulada da quinzena
                    metaAcumuladaQuinzena += getMetaDiariaParaDia(registroParaEsteDiaQuinzena.operadoresNoDia + registroParaEsteDiaQuinzena.diasNoDia);
                    diasOperacaoConsideradosQuinzena++;
                    totalOperadoresEmDiasOperacionaisQuinzena += registroParaEsteDiaQuinzena.operadoresNoDia;
                }
            }
        } else {
            if (dayOfWeekTemp !== 0) { // Se não for domingo
                metaQuinzenaTotal += getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
            }
            // Se for domingo e não tem registro, meta para o dia é 0
        }
        tempDateForQuinzenaMeta.setDate(tempDateForQuinzenaMeta.getDate() + 1);
    }


    const saldoQuinzena = producaoAcumuladaQuinzena - metaAcumuladaQuinzena;
    
    let diasOperacaoRestantesQuinzena = 0;
    const tempDateForRemainingQuinzenaDays = new Date(dataAtualCalculo.getTime());
    // tempDateForRemainingQuinzenaDays.setDate(dataAtualCalculo.getDate() + 1); // REMOVIDO
    while (tempDateForRemainingQuinzenaDays <= dataFimQuinzena) {
        const dataStringTemp = `${tempDateForRemainingQuinzenaDays.getFullYear()}-${String(tempDateForRemainingQuinzenaDays.getMonth() + 1).padStart(2, '0')}-${String(tempDateForRemainingQuinzenaDays.getDate()).padStart(2, '0')}`;
        const registroParaEsteDiaQuinzenaFuturo = producoesDaQuinzena.find(p => p.data === dataStringTemp);
        if (!registroParaEsteDiaQuinzenaFuturo || !registroParaEsteDiaQuinzenaFuturo.isExcecao) {
            if (tempDateForRemainingQuinzenaDays.getDay() !== 0) { // Se não for domingo
                diasOperacaoRestantesQuinzena++;
            }
        }
        tempDateForRemainingQuinzenaDays.setDate(tempDateForRemainingQuinzenaDays.getDate() + 1);
    }
    if (diasOperacaoRestantesQuinzena < 0) diasOperacaoRestantesQuinzena = 0;


    metaQuinzenaTotalElement.textContent = metaQuinzenaTotal.toLocaleString('pt-BR');
    producaoAcumuladaQuinzenaElement.textContent = producaoAcumuladaQuinzena.toLocaleString('pt-BR');
    saldoQuinzenaElement.textContent = saldoQuinzena.toLocaleString('pt-BR');
    diasOperacaoRestantesQuinzenaElement.textContent = diasOperacaoRestantesQuinzena;

    saldoQuinzenaElement.classList.remove('positivo', 'negativo');
    if (saldoQuinzena > 0) {
        saldoQuinzenaElement.classList.add('positivo');
        saldoQuinzenaElement.innerHTML += ' (Positivo)';
    } else if (saldoQuinzena < 0) {
        saldoQuinzenaElement.classList.add('negativo');
        saldoQuinzenaElement.innerHTML += ' (Negativo)';
    } else {
        saldoQuinzenaElement.style.color = '#333';
        saldoQuinzenaElement.innerHTML += ' (Na Meta)';
    }

    let projecaoQuinzenaTexto = '';
    if (diasOperacaoRestantesQuinzena > 0) {
        // A projeção para o futuro continua usando o NUM_OPERADORES_PADRAO
        const metaDiariaPadraoParaProjecao = getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
        const producaoNecessariaParaMetaQuinzena = metaQuinzenaTotal - producaoAcumuladaQuinzena;

        if (producaoNecessariaParaMetaQuinzena > 0) {
            const pacotesPorDiaNecessarios = producaoNecessariaParaMetaQuinzena / diasOperacaoRestantesQuinzena;
            const pessoasNecessarias = Math.ceil(pacotesPorDiaNecessarios / PACOTES_POR_OPERADOR_DIA_META);

            projecaoQuinzenaTexto = `Para atingir a meta da ${nomeQuinzena}, vocês precisam fazer uma média de ${Math.round(pacotesPorDiaNecessarios).toLocaleString('pt-BR')} pacotes por dia nos próximos ${diasOperacaoRestantesQuinzena} dias de operação. Isso exigiria aproximadamente **${pessoasNecessarias} operadores** por dia, considerando o PHD de meta.`;
            projecaoQuinzenaTextoElement.style.color = 'red';
        } else {
            projecaoQuinzenaTexto = `A meta da ${nomeQuinzena} foi atingida ou superada! Continuem assim!`;
            projecaoQuinzenaTextoElement.style.color = 'green';
        }
    } else {
        if (saldoQuinzena < 0) {
            projecaoQuinzenaTexto = `A ${nomeQuinzena} encerrou com saldo negativo. Analisar desempenho.`;
            projecaoQuinzenaTextoElement.style.color = 'orange';
        } else {
            projecaoQuinzenaTexto = `A ${nomeQuinzena} encerrou com a meta atingida ou superada! Parabéns!`;
            projecaoQuinzenaTextoElement.style.color = 'blue';
        }
    }
    projecaoQuinzenaTextoElement.textContent = projecaoQuinzenaTexto;


    // --- CÁLCULOS E PROJEÇÕES SEMANAIS (DINÂMICAS) ---
    const diaDaSemanaHoje = dataAtualCalculo.getDay();
    const inicioSemana = new Date(dataAtualCalculo);
    inicioSemana.setDate(dataAtualCalculo.getDate() - (diaDaSemanaHoje === 0 ? 6 : diaDaSemanaHoje - 1));
    inicioSemana.setHours(0, 0, 0, 0);

    const finalSemana = new Date(inicioSemana);
    finalSemana.setDate(inicioSemana.getDate() + 6);
    finalSemana.setHours(23, 59, 59, 999);

    semanaAtualPeriodoElement.textContent = `${formatarData(inicioSemana.toISOString().split('T')[0])} a ${formatarData(finalSemana.toISOString().split('T')[0])}`;

    let producaoAcumuladaSemanal = 0;
    let metaAcumuladaSemanal = 0;
    let diasOperacaoConsideradosSemanal = 0;
    let totalOperadoresEmDiasOperacionaisSemanal = 0;
    let metaSemanalTotal = 0; // Dinâmica

    const producoesDaSemana = producoesMes.filter(p => {
        const pDate = new Date(p.data + 'T00:00:00');
        return pDate >= inicioSemana && pDate <= finalSemana;
    });

    const tempDateForWeeklyMeta = new Date(inicioSemana.getTime());
    while (tempDateForWeeklyMeta <= finalSemana) {
        const dataStringTemp = `${tempDateForWeeklyMeta.getFullYear()}-${String(tempDateForWeeklyMeta.getMonth() + 1).padStart(2, '0')}-${String(tempDateForWeeklyMeta.getDate()).padStart(2, '0')}`;
        const registroParaEsteDiaSemana = producoesDaSemana.find(p => p.data === dataStringTemp);
        const dayOfWeekTemp = tempDateForWeeklyMeta.getDay();

        if (registroParaEsteDiaSemana) {
            if (!registroParaEsteDiaSemana.isExcecao) {
                // MODIFICAÇÃO AQUI: Incluindo diaristas no cálculo da meta diária da semana (se houver registro)
                metaSemanalTotal += getMetaDiariaParaDia(registroParaEsteDiaSemana.operadoresNoDia + registroParaEsteDiaSemana.diaristasNoDia);
                if (tempDateForWeeklyMeta <= dataAtualCalculo) {
                    producaoAcumuladaSemanal += registroParaEsteDiaSemana.producao;
                    // MODIFICAÇÃO AQUI: Incluindo diaristas no cálculo da meta acumulada da semana
                    metaAcumuladaSemanal += getMetaDiariaParaDia(registroParaEsteDiaSemana.operadoresNoDia + registroParaEsteDiaSemana.diaristasNoDia);
                    diasOperacaoConsideradosSemanal++;
                    totalOperadoresEmDiasOperacionaisSemanal += registroParaEsteDiaSemana.operadoresNoDia;
                }
            }
        } else {
            if (dayOfWeekTemp !== 0) { // Se não for domingo
                metaSemanalTotal += getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
            }
            // Se for domingo e não tem registro, meta para o dia é 0
        }
        tempDateForWeeklyMeta.setDate(tempDateForWeeklyMeta.getDate() + 1);
    }

    const saldoSemanal = producaoAcumuladaSemanal - metaAcumuladaSemanal;
    
    let diasOperacaoRestantesSemana = 0;
    const tempDateForRemainingDays = new Date(dataAtualCalculo.getTime());
    // tempDateForRemainingDays.setDate(dataAtualCalculo.getDate() + 1); // REMOVIDO
    while (tempDateForRemainingDays <= finalSemana) {
        const dataStringTemp = `${tempDateForRemainingDays.getFullYear()}-${String(tempDateForRemainingDays.getMonth() + 1).padStart(2, '0')}-${String(tempDateForRemainingDays.getDate()).padStart(2, '0')}`;
        const registroParaEsteDiaSemanaFuturo = producoesDaSemana.find(p => p.data === dataStringTemp);
        if (!registroParaEsteDiaSemanaFuturo || !registroParaEsteDiaSemanaFuturo.isExcecao) {
            if (tempDateForRemainingDays.getDay() !== 0) { // Se não for domingo
                diasOperacaoRestantesSemana++;
            }
        }
        tempDateForRemainingDays.setDate(tempDateForRemainingDays.getDate() + 1);
    }


    metaSemanalTotalElement.textContent = metaSemanalTotal.toLocaleString('pt-BR');
    producaoAcumuladaSemanalElement.textContent = producaoAcumuladaSemanal.toLocaleString('pt-BR');
    saldoSemanalElement.textContent = saldoSemanal.toLocaleString('pt-BR');
    diasOperacaoRestantesSemanaElement.textContent = diasOperacaoRestantesSemana;

    saldoSemanalElement.classList.remove('positivo', 'negativo');
    if (saldoSemanal > 0) {
        saldoSemanalElement.classList.add('positivo');
        saldoSemanalElement.innerHTML += ' (Positivo)';
    } else if (saldoSemanal < 0) {
        saldoSemanalElement.classList.add('negativo');
        saldoSemanalElement.innerHTML += ' (Negativo)';
    } else {
        saldoSemanalElement.style.color = '#333';
        saldoSemanalElement.innerHTML += ' (Na Meta)';
    }

    let projecaoSemanalTexto = '';
    if (diasOperacaoRestantesSemana > 0) {
        // A projeção para o futuro continua usando o NUM_OPERADORES_PADRAO
        const metaDiariaPadraoParaProjecao = getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
        const producaoNecessariaParaMetaSemanal = metaSemanalTotal - producaoAcumuladaSemanal;

        if (producaoNecessariaParaMetaSemanal > 0) {
            const pacotesPorDiaNecessarios = producaoNecessariaParaMetaSemanal / diasOperacaoRestantesSemana;
            const pessoasNecessarias = Math.ceil(pacotesPorDiaNecessarios / PACOTES_POR_OPERADOR_DIA_META);

            projecaoSemanalTexto = `Para atingir a meta semanal, vocês precisam fazer uma média de ${Math.round(pacotesPorDiaNecessarios).toLocaleString('pt-BR')} pacotes por dia nos próximos ${diasOperacaoRestantesSemana} dias de operação. Isso exigiria aproximadamente **${pessoasNecessarias} operadores** por dia, considerando o PHD de meta.`;
            projecaoSemanalTextoElement.style.color = 'red';
        } else {
            projecaoSemanalTexto = `A meta semanal foi atingida ou superada! Continuem assim!`;
            projecaoSemanalTextoElement.style.color = 'green';
        }
    } else {
        if (saldoSemanal < 0) {
            projecaoSemanalTexto = 'Semana encerrada com saldo negativo. Analisar desempenho.';
            projecaoSemanalTextoElement.style.color = 'orange';
        } else {
            projecaoSemanalTexto = 'Semana encerrada com a meta atingida ou superada! Parabéns!';
            projecaoSemanalTextoElement.style.color = 'blue';
        }
    }
    projecaoSemanalTextoElement.textContent = projecaoSemanalTexto;
}


// Inicialização: carregar dados e atualizar a interface ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    const configs = await getConfigsAPI();
    NUM_OPERADORES_PADRAO = configs.num_operadores_padrao;

    popularSeletoresDeMesAno();
    popularSeletoresDeMesAnoRelatorio(); // Chama a nova função para popular os seletores do relatório

    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    dataInput.value = `${ano}-${mes}-${dia}`;

    operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
    diaristasNoDiaInput.value = 0;
    numOperadoresGlobalInput.value = NUM_OPERADORES_PADRAO;

    anoVisualizado = ano;
    mesVisualizado = parseInt(mes);

    selectMes.value = mesVisualizado;
    selectAno.value = anoVisualizado;

    await atualizarDashboard(anoVisualizado, mesVisualizado);
});
