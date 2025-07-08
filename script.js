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
const metaMensalTotalElement = document.getElementById('metaMensalTotal');
const producaoAcumuladaElement = document.getElementById('producaoAcumulada');
const metaAcumuladaElement = document.getElementById('metaAcumulada');
const saldoAcumuladoElement = document.getElementById('saldoAcumulado');
const phdMedioMensalElement = document.getElementById('phdMedioMensal');
const diasOperacaoConsideradosElement = document.getElementById('diasOperacaoConsiderados');
const diasRestantesElement = document.getElementById('diasRestantes');
const projecaoTextoElement = document.getElementById('projecaoTexto');
const faltaParaMetaMensalElement = document.getElementById('faltaParaMetaMensal');
const totalDiaristasMesElement = document.getElementById('totalDiaristasMes');

// Novos elementos para KPIs semanais
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

// Variáveis para armazenar os dados
let producoesMes = [];

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

// --- Funções de Lógica de Negócio ---

function formatarData(dataString) {
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
}

function getNomeMes(mesNumero) {
    const data = new Date(2000, mesNumero - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long' });
}

function getMetaDiariaParaDia(operadores, diaristas) {
    return (operadores + diaristas) * PACOTES_POR_OPERADOR_DIA_META;
}

// Retorna o número de dias de operação (não exceção e não domingo, a menos que seja domingo trabalhado)
// em um determinado período.
function getDiasDeOperacaoNoPeriodo(dataInicio, dataFim, producoes) {
    let count = 0;
    const current = new Date(dataInicio.getTime()); // Cria uma cópia para não modificar a original
    while (current <= dataFim) {
        const dayOfWeek = current.getDay();
        const dataString = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        const registroParaEsteDia = producoes.find(p => p.data === dataString);

        if ((dayOfWeek !== 0 && !(registroParaEsteDia && registroParaEsteDia.isExcecao)) ||
            (dayOfWeek === 0 && registroParaEsteDia && !registroParaEsteDia.isExcecao)) {
            count++;
        }
        current.setDate(current.getDate() + 1); // Avança para o próximo dia
    }
    return count;
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
        diaristasNoDiaInput.disabled = false; // Reabilita diaristas
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

viewMonthBtn.addEventListener('click', async () => {
    anoVisualizado = parseInt(selectAno.value);
    mesVisualizado = parseInt(selectMes.value);
    await atualizarDashboard(anoVisualizado, mesVisualizado);
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
    let diasDeOperacaoConsideradosMensal = 0;
    let metaAcumuladaMensal = 0;
    let saldoTotalAcumuladoMensal = 0;
    let totalPessoasEmDiasOperacionaisMensal = 0;
    let totalDiaristasMes = 0;

    const nomeMes = getNomeMes(mesVisualizado);
    mesAtualElement.textContent = `${nomeMes} de ${anoVisualizado}`;

    // RENOMEADO 'hoje' para 'dataAtualCalculo' para evitar conflito
    const dataAtualCalculo = new Date();
    dataAtualCalculo.setHours(0, 0, 0, 0); // Zera hora para comparação de datas

    const producoesDoMesVisualizado = producoesMes; 

    // --- CÁLCULO DA META MENSAL TOTAL ---
    let metaMensalTotal = 0;
    const ultimoDiaDoMes = new Date(anoVisualizado, mesVisualizado, 0).getDate();
    for (let i = 1; i <= ultimoDiaDoMes; i++) {
        const dataString = `${anoVisualizado}-${String(mesVisualizado).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dataIteracao = new Date(dataString + 'T00:00:00');
        const dayOfWeek = dataIteracao.getDay();
        const registroParaEsteDia = producoesDoMesVisualizado.find(p => p.data === dataString);

        if (registroParaEsteDia) {
            if (!registroParaEsteDia.isExcecao) {
                metaMensalTotal += getMetaDiariaParaDia(registroParaEsteDia.operadoresNoDia, registroParaEsteDia.diaristasNoDia);
            }
        } else {
            if (dayOfWeek !== 0) { // Domingo é 0
                metaMensalTotal += getMetaDiariaParaDia(NUM_OPERADORES_PADRAO, 0);
            }
        }
    }
    metaMensalTotalElement.textContent = metaMensalTotal.toLocaleString('pt-BR');


    // --- PREENCHIMENTO DA TABELA E CÁLCULOS ACUMULADOS MENSAIS ---
    producoesDoMesVisualizado.forEach(registro => {
        const operadoresCalculo = registro.isExcecao ? 0 : registro.operadoresNoDia;
        const diaristasCalculo = registro.isExcecao ? 0 : registro.diaristasNoDia;
        
        const metaDiariaDoRegistro = getMetaDiariaParaDia(operadoresCalculo, diaristasCalculo);

        if (!registro.isExcecao) {
            producaoAcumuladaMensal += registro.producao;
            metaAcumuladaMensal += metaDiariaDoRegistro;
            diasDeOperacaoConsideradosMensal++;
            totalPessoasEmDiasOperacionaisMensal += (operadoresCalculo + diaristasCalculo);
            totalDiaristasMes += registro.diaristasNoDia;
        } else {
            totalDiaristasMes += registro.diaristasNoDia;
        }

        const totalPessoasNoDia = registro.operadoresNoDia + registro.diaristasNoDia;
        const phdDiario = (registro.producao > 0 && totalPessoasNoDia > 0) ? (registro.producao / totalPessoasNoDia).toFixed(2) : '0.00';

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

    let diasRestantesMensal = 0;
    // Se o mês visualizado é o mês atual, calcula dias restantes a partir de hoje
    if (anoVisualizado === dataAtualCalculo.getFullYear() && mesVisualizado === (dataAtualCalculo.getMonth() + 1)) {
        for (let i = dataAtualCalculo.getDate() + 1; i <= ultimoDiaDoMes; i++) {
            const dataIteracao = new Date(anoVisualizado, mesVisualizado - 1, i);
            if (dataIteracao.getDay() !== 0) { // Se não for domingo
                diasRestantesMensal++;
            }
        }
    } else {
        // Se o mês visualizado não é o mês atual, calcula todos os dias úteis não lançados
        diasRestantesMensal = getDiasDeOperacaoNoPeriodo(new Date(anoVisualizado, mesVisualizado - 1, 1), new Date(anoVisualizado, mesVisualizado, 0), producoesDoMesVisualizado) - diasDeOperacaoConsideradosMensal;
    }
    if (diasRestantesMensal < 0) {
        diasRestantesMensal = 0; // Garante que não seja negativo
    }


    const phdMedioMensal = (producaoAcumuladaMensal > 0 && totalPessoasEmDiasOperacionaisMensal > 0) ? (producaoAcumuladaMensal / totalPessoasEmDiasOperacionaisMensal).toFixed(2) : '0.00';

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
        const metaDiariaPadraoParaProjecao = getMetaDiariaParaDia(NUM_OPERADORES_PADRAO, 0); 
        let projecaoTextoMensal = '';

        if (producaoAcumuladaMensal === 0 && diasDeOperacaoConsideradosMensal === 0) {
            projecaoTextoMensal = `Ainda não há lançamentos de produção para ${nomeMes} de ${anoVisualizado}. A meta para o mês é de ${metaMensalTotal.toLocaleString('pt-BR')} pacotes. Comece a registrar a produção!`;
            projecaoTextoElement.style.color = 'blue';
        } else {
            const producaoTotalProjetada = producaoAcumuladaMensal + (metaDiariaPadraoParaProjecao * diasRestantesMensal);
            let projecaoSuperar = producaoTotalProjetada - metaMensalTotal;

            if (projecaoSuperar < 0) {
                const pacotesParaRecuperar = Math.abs(projecaoSuperar);
                const pacotesPorDiaParaRecuperar = pacotesParaRecuperar / diasRestantesMensal;
                const metaDiariaAjustadaParaRecuperar = metaDiariaPadraoParaProjecao + pacotesPorDiaParaRecuperar;
                
                const totalPessoasPadraoProjecao = NUM_OPERADORES_PADRAO + 0;
                const phdAdicionalPorPessoa = (pacotesPorDiaParaRecuperar / totalPessoasPadraoProjecao).toFixed(2);


                projecaoTextoMensal = `Para atingir a meta mensal, vocês precisam fazer uma média de ${Math.round(metaDiariaAjustadaParaRecuperar).toLocaleString('pt-BR')} pacotes por dia (ou seja, aproximadamente ${phdAdicionalPorPessoa} pacotes a mais por pessoa por dia, considerando ${NUM_OPERADORES_PADRAO} operadores e 0 diaristas) nos próximos ${diasRestantesMensal} dias de operação.`;
                projecaoTextoElement.style.color = 'red';
            } else {
                projecaoTextoMensal = `Com a produção atual, e mantendo o ritmo de ${metaDiariaPadraoParaProjecao.toLocaleString('pt-BR')} pacotes/dia (com ${NUM_OPERADORES_PADRAO} operadores e 0 diaristas), a projeção é de superar a meta mensal em ${projecaoSuperar.toLocaleString('pt-BR')} pacotes! Continuem assim!`;
                projecaoTextoElement.style.color = 'green';

                const pacotesFaltantesParaMetaMensal = metaMensalTotal - producaoAcumuladaMensal;
                let metaDiariaMinimaAjustada = 0;
                let phdMinimoPorPessoa = 0;

                if (pacotesFaltantesParaMetaMensal > 0 && diasRestantesMensal > 0) {
                    metaDiariaMinimaAjustada = pacotesFaltantesParaMetaMensal / diasRestantesMensal;
                    const totalPessoasParaMeta = NUM_OPERADORES_PADRAO + 0;
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

    // --- CÁLCULOS E PROJEÇÕES SEMANAIS ---
    // Usamos 'dataAtualCalculo' aqui
    const diaDaSemanaHoje = dataAtualCalculo.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const inicioSemana = new Date(dataAtualCalculo);
    inicioSemana.setDate(dataAtualCalculo.getDate() - (diaDaSemanaHoje === 0 ? 6 : diaDaSemanaHoje - 1)); // Se for domingo, volta 6 dias. Senão, volta (dia-1) dias.
    inicioSemana.setHours(0, 0, 0, 0);

    const finalSemana = new Date(inicioSemana);
    finalSemana.setDate(inicioSemana.getDate() + 6);
    finalSemana.setHours(23, 59, 59, 999);

    semanaAtualPeriodoElement.textContent = `${formatarData(inicioSemana.toISOString().split('T')[0])} a ${formatarData(finalSemana.toISOString().split('T')[0])}`;

    let producaoAcumuladaSemanal = 0;
    let metaAcumuladaSemanal = 0;
    let diasOperacaoConsideradosSemanal = 0;
    let totalPessoasEmDiasOperacionaisSemanal = 0;
    let metaSemanalTotal = 0;

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
                metaSemanalTotal += getMetaDiariaParaDia(registroParaEsteDiaSemana.operadoresNoDia, registroParaEsteDiaSemana.diaristasNoDia);
                if (tempDateForWeeklyMeta <= dataAtualCalculo) { // Compara com dataAtualCalculo
                    producaoAcumuladaSemanal += registroParaEsteDiaSemana.producao;
                    metaAcumuladaSemanal += getMetaDiariaParaDia(registroParaEsteDiaSemana.operadoresNoDia, registroParaEsteDiaSemana.diaristasNoDia);
                    diasOperacaoConsideradosSemanal++;
                    totalPessoasEmDiasOperacionaisSemanal += (registroParaEsteDiaSemana.operadoresNoDia + registroParaEsteDiaSemana.diaristasNoDia);
                }
            }
        } else {
            if (dayOfWeekTemp !== 0) {
                metaSemanalTotal += getMetaDiariaParaDia(NUM_OPERADORES_PADRAO, 0);
            }
        }
        tempDateForWeeklyMeta.setDate(tempDateForWeeklyMeta.getDate() + 1);
    }

    const saldoSemanal = producaoAcumuladaSemanal - metaAcumuladaSemanal;
    
    let diasOperacaoRestantesSemana = 0;
    const tempDateForRemainingDays = new Date(dataAtualCalculo.getTime()); // Começa a partir de dataAtualCalculo
    tempDateForRemainingDays.setDate(dataAtualCalculo.getDate() + 1); // Próximo dia
    while (tempDateForRemainingDays <= finalSemana) {
        const dataStringTemp = `${tempDateForRemainingDays.getFullYear()}-${String(tempDateForRemainingDays.getMonth() + 1).padStart(2, '0')}-${String(tempDateForRemainingDays.getDate()).padStart(2, '0')}`;
        const registroParaEsteDiaSemanaFuturo = producoesDaSemana.find(p => p.data === dataStringTemp);
        if (!registroParaEsteDiaSemanaFuturo || !registroParaEsteDiaSemanaFuturo.isExcecao) {
            if (tempDateForRemainingDays.getDay() !== 0) {
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
        const metaDiariaPadraoParaProjecao = getMetaDiariaParaDia(NUM_OPERADORES_PADRAO, 0);
        const producaoNecessariaParaMetaSemanal = metaSemanalTotal - producaoAcumuladaSemanal;

        if (producaoNecessariaParaMetaSemanal > 0) {
            const pacotesPorDiaNecessarios = producaoNecessariaParaMetaSemanal / diasOperacaoRestantesSemana;
            const pessoasNecessarias = Math.ceil(pacotesPorDiaNecessarios / PACOTES_POR_OPERADOR_DIA_META);

            projecaoSemanalTexto = `Para atingir a meta semanal, vocês precisam fazer uma média de ${Math.round(pacotesPorDiaNecessarios).toLocaleString('pt-BR')} pacotes por dia nos próximos ${diasOperacaoRestantesSemana} dias de operação. Isso exigiria aproximadamente **${pessoasNecessarias} operadores/diaristas** por dia, considerando o PHD de meta.`;
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