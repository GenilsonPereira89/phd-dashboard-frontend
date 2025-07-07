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

// Novos seletores para a seleção de mês/ano
const selectMes = document.getElementById('selectMes');
const selectAno = document.getElementById('selectAno');
const viewMonthBtn = document.getElementById('viewMonthBtn');

// Variáveis para armazenar os dados (agora virão da API)
// NOVO FORMATO: { data: 'YYYY-MM-DD', producao: 12345, isExcecao: true/false, operadoresNoDia: 13 }
let producoesMes = []; // Esta variável agora conterá os dados filtrados do mês/ano visualizado

// Variáveis para controlar o mês/ano que está sendo visualizado
let anoVisualizado;
let mesVisualizado; // 1-12

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

async function atualizarProducaoAPI(data, registro) {
    try {
        const response = await fetch(`${API_BASE_URL}/producoes/${data}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                producao: registro.producao,
                is_excecao: Number(registro.isExcecao),
                operadores_no_dia: registro.operadoresNoDia
            })
        });
        if (!response.ok) {
            throw new Error(`Erro ao atualizar produção: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao atualizar produção na API:', error);
        alert('Erro ao atualizar produção. Verifique o servidor backend.');
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

// Função para carregar os dados de um registro para edição no formulário
function editarProducao(registro) {
    dataInput.value = registro.data;
    producaoDiariaInput.value = registro.producao;
    isExcecaoCheckbox.checked = registro.isExcecao;
    operadoresNoDiaInput.value = registro.operadoresNoDia;

    // Atualiza o estado de disabled dos inputs com base na exceção
    producaoDiariaInput.disabled = registro.isExcecao;
    operadoresNoDiaInput.disabled = registro.isExcecao;

    // Altera o texto do botão para indicar "Atualizar"
    addProducaoBtn.textContent = 'Atualizar Produção';
    // Adiciona um atributo para saber que estamos em modo de edição
    addProducaoBtn.dataset.editing = 'true';
}


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

    let response = null;
    if (addProducaoBtn.dataset.editing === 'true') {
        // Se estiver em modo de edição, chama a função de atualização
        response = await atualizarProducaoAPI(data, novoRegistro);
        addProduacaoBtn.textContent = 'Adicionar/Atualizar Produção'; // Volta o texto original
        delete addProducaoBtn.dataset.editing; // Remove o atributo de edição
    } else {
        // Caso contrário, adiciona um novo registro
        response = await salvarProducaoAPI(novoRegistro);
    }
    
    if (response) {
        // Se a API salvou/atualizou com sucesso, atualiza o dashboard
        await atualizarDashboard(anoVisualizado, mesVisualizado); // Aguarda a atualização dos dados
        // Limpa o formulário após a operação
        dataInput.value = '';
        producaoDiariaInput.value = '';
        isExcecaoCheckbox.checked = false;
        producaoDiariaInput.disabled = false;
        operadoresNoDiaInput.disabled = false; // Reabilita o campo de operadores
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

// Event listener para o botão 'Visualizar Mês'
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

    let producaoAcumulada = 0;
    let diasDeOperacaoConsiderados = 0;
    let metaAcumulada = 0;
    let saldoTotalAcumulado = 0;
    let totalOperadoresEmDiasOperacionais = 0; // Para o PHD médio

    const nomeMes = getNomeMes(mesVisualizado);
    mesAtualElement.textContent = `${nomeMes} de ${anoVisualizado}`;

    // produzõesDoMesVisualizado agora é a própria producoesMes (já filtrada e carregada da API)
    const producoesDoMesVisualizado = producoesMes; 

    // --- CÁLCULO DA META MENSAL TOTAL ---
    // A meta mensal total agora soma as metas diárias para CADA DIA do mês,
    // considerando o número de operadores no dia, se já lançado.
    // Se o dia ainda não foi lançado, usa o NUM_OPERADORES_PADRAO para dias de semana (Mon-Sat).
    // Domingos futuros (sem lançamento) NÃO contribuem para a meta mensal.
    let metaMensalTotal = 0;
    const date = new Date(anoVisualizado, mesVisualizado - 1, 1);
    while (date.getMonth() === mesVisualizado - 1) {
        const dayOfWeek = date.getDay();
        const dataString = `${anoVisualizado}-${String(mesVisualizado).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMesVisualizado.find(p => p.data === dataString);

        if (registroParaEsteDia) {
            // Se o dia tem um registro e NÃO é uma exceção, adiciona sua meta
            if (!registroParaEsteDia.isExcecao) {
                metaMensalTotal += getMetaDiariaParaDia(registroParaEsteDia.operadoresNoDia);
            }
        } else {
            // Se o dia não tem registro (é um dia futuro)
            // Apenas adiciona meta para dias de semana (Mon-Sat) com base no padrão de operadores
            if (dayOfWeek !== 0) { // Se não for domingo
                metaMensalTotal += getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
            }
        }
        date.setDate(date.getDate() + 1);
    }
    metaMensalTotalElement.textContent = metaMensalTotal.toLocaleString('pt-BR');


    // --- PREENCHIMENTO DA TABELA E CÁLCULOS ACUMULADOS ---
    producoesDoMesVisualizado.forEach(registro => {
        const metaDiariaDoRegistro = getMetaDiariaParaDia(registro.operadoresNoDia);

        // Se NÃO é um dia de exceção, considera para produção acumulada e dias operacionais
        if (!registro.isExcecao) {
            producaoAcumulada += registro.producao;
            metaAcumulada += metaDiariaDoRegistro;
            diasDeOperacaoConsiderados++; // Conta dias que foram lançados e são operacionais (incluindo domingos trabalhados)
            totalOperadoresEmDiasOperacionais += registro.operadoresNoDia; // Soma operadores para PHD
        }

        const phdDiario = (registro.producao > 0 && registro.operadoresNoDia > 0) ? (registro.producao / registro.operadoresNoDia).toFixed(2) : '0.00';

        let saldoDiario;
        if (registro.isExcecao) { // Se é uma exceção, o saldo é 0
            saldoDiario = 0;
        } else { // Caso contrário (dia normal ou domingo trabalhado), calcula o saldo
            saldoDiario = registro.producao - metaDiariaDoRegistro;
        }

        const row = historicoTableBody.insertRow();
        row.insertCell().textContent = formatarData(registro.data);
        row.insertCell().textContent = registro.producao.toLocaleString('pt-BR');
        row.insertCell().textContent = registro.operadoresNoDia; // Coluna de operadores
        row.insertCell().textContent = metaDiariaDoRegistro.toLocaleString('pt-BR'); // Meta Diária do dia
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
                tipoCell.textContent = 'Domingo Trabalhado'; // Novo texto para domingos com produção
            } else {
                tipoCell.textContent = 'Normal';
            }
        }

        const acoesCell = row.insertCell();
        
        // Botão Editar
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.classList.add('acao-btn', 'edit-btn'); // Adiciona as classes 'acao-btn' e 'edit-btn'
        editBtn.onclick = () => editarProducao(registro); // Chama a nova função de edição
        acoesCell.appendChild(editBtn);

        // Botão Excluir
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.classList.add('acao-btn', 'delete-btn'); // Adiciona as classes 'acao-btn' e 'delete-btn'
        deleteBtn.onclick = () => excluirProducao(registro.data); // Chama a função que usa a API
        acoesCell.appendChild(deleteBtn);
    });

    // Saldo Total Acumulado
    saldoTotalAcumulado = producaoAcumulada - metaAcumulada;

    // NOVO CÁLCULO: Falta para a Meta Mensal
    const faltaParaMetaMensal = metaMensalTotal - producaoAcumulada;
    faltaParaMetaMensalElement.textContent = faltaParaMetaMensal.toLocaleString('pt-BR');

    // Dias Restantes no Mês (dias operacionais ainda sem lançamento)
    let diasRestantesParaProjecao = getDiasDeOperacaoNoMes(anoVisualizado, mesVisualizado, producoesMes) - diasDeOperacaoConsiderados;
    if (diasRestantesParaProjecao < 0) {
        diasRestantesParaProjecao = 0;
    }

    // PHD Médio Mensal (baseado na produção e operadores DOS DIAS CONSIDERADOS)
    const phdMedioMensal = (producaoAcumulada > 0 && totalOperadoresEmDiasOperacionais > 0) ? (producaoAcumulada / totalOperadoresEmDiasOperacionais).toFixed(2) : '0.00';


    producaoAcumuladaElement.textContent = producaoAcumulada.toLocaleString('pt-BR');
    metaAcumuladaElement.textContent = metaAcumulada.toLocaleString('pt-BR');
    saldoAcumuladoElement.textContent = saldoTotalAcumulado.toLocaleString('pt-BR');
    phdMedioMensalElement.textContent = phdMedioMensal;
    diasOperacaoConsideradosElement.textContent = diasDeOperacaoConsiderados;
    diasRestantesElement.textContent = diasRestantesParaProjecao;

    saldoAcumuladoElement.classList.remove('positivo', 'negativo');
    if (saldoTotalAcumulado > 0) {
        saldoAcumuladoElement.classList.add('positivo');
        saldoAcumuladoElement.innerHTML += ' (Positivo)';
    } else if (saldoTotalAcumulado < 0) {
        saldoAcumuladoElement.classList.add('negativo');
        saldoAcumuladoElement.innerHTML += ' (Negativo)';
    } else {
        saldoAcumuladoElement.style.color = '#333';
        saldoAcumuladoElement.innerHTML += ' (Na Meta)';
    }

    // --- Projeção Aprimorada ---
    if (diasRestantesParaProjecao > 0) {
        const metaDiariaPadrao = getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
        let projecaoTexto = '';

        if (producaoAcumulada === 0 && diasDeOperacaoConsiderados === 0) {
            projecaoTextoElement.textContent = `Ainda não há lançamentos de produção para ${nomeMes} de ${anoVisualizado}. A meta para o mês é de ${metaMensalTotal.toLocaleString('pt-BR')} pacotes. Comece a registrar a produção!`;
            projecaoTextoElement.style.color = 'blue';
        } else {
            // CORREÇÃO AQUI: Cálculo da projeção de superação
            const producaoTotalProjetada = producaoAcumulada + (metaDiariaPadrao * diasRestantesParaProjecao);
            let projecaoSuperar = producaoTotalProjetada - metaMensalTotal;

            if (projecaoSuperar < 0) { // Se a projeção de superação é negativa, significa que a meta não será atingida.
                const pacotesParaRecuperar = Math.abs(projecaoSuperar); // Quanto ainda precisa para bater a meta
                const pacotesPorDiaParaRecuperar = pacotesParaRecuperar / diasRestantesParaProjecao;
                const metaDiariaAjustadaParaRecuperar = metaDiariaPadrao + pacotesPorDiaParaRecuperar;
                const phdAdicionalPorOperador = (pacotesPorDiaParaRecuperar / NUM_OPERADORES_PADRAO).toFixed(2);

                projecaoTexto = `Para atingir a meta mensal, vocês precisam fazer uma média de ${Math.round(metaDiariaAjustadaParaRecuperar).toLocaleString('pt-BR')} pacotes por dia (ou seja, aproximadamente ${phdAdicionalPorOperador} pacotes a mais por operador por dia, considerando ${NUM_OPERADORES_PADRAO} operadores) nos próximos ${diasRestantesParaProjecao} dias de operação.`;
                projecaoTextoElement.style.color = 'red';
            } else { // Projeção é positiva ou zero (vai atingir/superar)
                projecaoTexto = `Com a produção atual, e mantendo o ritmo de ${metaDiariaPadrao.toLocaleString('pt-BR')} pacotes/dia (com ${NUM_OPERADORES_PADRAO} operadores), a projeção é de superar a meta mensal em ${projecaoSuperar.toLocaleString('pt-BR')} pacotes! Continuem assim!`;
                projecaoTextoElement.style.color = 'green';

                // Adicionar a informação da meta diária mínima para atingir o objetivo, APENAS SE A PROJEÇÃO É POSITIVA
                // Isso evita redundância quando a projeção já é sobre "atingir a meta" (no caso negativo)
                const pacotesFaltantesParaMetaMensal = metaMensalTotal - producaoAcumulada; // Recalcula para este bloco
                let metaDiariaMinimaAjustada = 0;
                let phdMinimoPorOperador = 0;

                if (pacotesFaltantesParaMetaMensal > 0 && diasRestantesParaProjecao > 0) {
                    metaDiariaMinimaAjustada = pacotesFaltantesParaMetaMensal / diasRestantesParaProjecao;
                    if (NUM_OPERADORES_PADRAO > 0) {
                        phdMinimoPorOperador = (metaDiariaMinimaAjustada / NUM_OPERADORES_PADRAO).toFixed(2);
                    }
                }

                if (pacotesFaltantesParaMetaMensal > 0 && diasRestantesParaProjecao > 0) {
                    projecaoTexto += ` Para *apenas* atingir a meta mensal, vocês precisam de uma média de ${Math.round(metaDiariaMinimaAjustada).toLocaleString('pt-BR')} pacotes por dia (equivalente a ${phdMinimoPorOperador} PHD) nos ${diasRestantesParaProjecao} dias de operação restantes.`;
                }
            }

            projecaoTextoElement.textContent = projecaoTexto;
        }
    } else { // Não há mais dias restantes para projeção (mês encerrado)
        if (saldoTotalAcumulado < 0) {
            projecaoTextoElement.textContent = 'Mês encerrado com saldo negativo. Analisar desempenho para o próximo mês.';
            projecaoTextoElement.style.color = 'orange';
        } else {
            projecaoTextoElement.textContent = 'Mês encerrado com a meta atingida ou superada! Parabéns!';
            projecaoTextoElement.style.color = 'blue';
        }
    }
}


// Inicialização: carregar dados e atualizar a interface ao carregar a página
document.addEventListener('DOMContentLoaded', async () => { // Marcado como async
    // Carrega as configurações (incluindo NUM_OPERADORES_PADRAO) da API
    const configs = await getConfigsAPI();
    NUM_OPERADORES_PADRAO = configs.num_operadores_padrao;
    // PACOTES_POR_OPERADOR_DIA_META também pode vir da API se você quiser que seja configurável

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

    // Finalmente, atualiza o dashboard com os dados do mês/ano atual
    await atualizarDashboard(anoVisualizado, mesVisualizado); // Aguarda a atualização
});