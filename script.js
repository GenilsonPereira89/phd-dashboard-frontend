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
const operadoresNoDiaInput = document.getElementById('operadoresNoDia');
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

const numOperadoresGlobalInput = document.getElementById('numOperadores');
const updateConfigBtn = document.getElementById('updateConfigBtn');

const selectMes = document.getElementById('selectMes');
const selectAno = document.getElementById('selectAno');
const viewMonthBtn = document.getElementById('viewMonthBtn');

// --- Elementos do Modal de Edição ---
const editModal = document.getElementById('editModal');
const closeButton = editModal.querySelector('.close-button');
const modalDataDisplay = document.getElementById('modalDataDisplay');
const modalProducaoDiariaInput = document.getElementById('modalProducaoDiaria');
const modalOperadoresNoDiaInput = document.getElementById('modalOperadoresNoDia');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let currentEditingRecord = null; // Armazena o registro completo sendo editado

let producoesMes = [];
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
            operadoresNoDia: parseInt(item.operadores_no_dia)
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
                is_excecao: Number(registro.isExcecao), // Mantém o status de exceção original
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

function getDiasDeOperacaoNoMes(ano, mes, producoesDoMes) {
    let count = 0;
    const date = new Date(ano, mes - 1, 1);
    while (date.getMonth() === mes - 1) {
        const dayOfWeek = date.getDay();
        const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMes.find(p => p.data === dataString);

        if ((dayOfWeek !== 0 && !(registroParaEsteDia && registroParaEsteDia.isExcecao)) ||
            (dayOfWeek === 0 && registroParaEsteDia && !registroParaEsteDia.isExcecao)) {
            count++;
        }
        date.setDate(date.getDate() + 1);
    }
    return count;
}

function getMetaDiariaParaDia(operadores) {
    return operadores * PACOTES_POR_OPERADOR_DIA_META;
}

// Event listener para a checkbox "Dia de Exceção" do formulário PRINCIPAL
isExcecaoCheckbox.addEventListener('change', () => {
    if (isExcecaoCheckbox.checked) {
        producaoDiariaInput.value = 0;
        producaoDiariaInput.disabled = true;
        operadoresNoDiaInput.disabled = true;
    } else {
        producaoDiariaInput.disabled = false;
        producaoDiariaInput.value = '';
        operadoresNoDiaInput.disabled = false;
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
    }
});

// --- NOVO: Função para abrir o Modal de Edição ---
function editarProducao(registro) {
    currentEditingRecord = registro; // Armazena o registro completo

    modalDataDisplay.textContent = formatarData(registro.data);
    modalProducaoDiariaInput.value = registro.producao;
    modalOperadoresNoDiaInput.value = registro.operadoresNoDia;

    // Se o registro for uma exceção, desabilita os campos de produção/operadores no modal
    // Pois não faz sentido editar produção/operadores em um dia de exceção.
    if (registro.isExcecao) {
        modalProducaoDiariaInput.disabled = true;
        modalOperadoresNoDiaInput.disabled = true;
    } else {
        modalProducaoDiariaInput.disabled = false;
        modalOperadoresNoDiaInput.disabled = false;
    }

    editModal.style.display = 'flex'; // Exibe o modal (usando flex para centralizar)
}

// Event listener para o botão de adicionar produção diária (APENAS ADICIONAR AGORA)
addProducaoBtn.addEventListener('click', async () => {
    const data = dataInput.value;
    const producao = parseInt(producaoDiariaInput.value);
    const isExcecao = isExcecaoCheckbox.checked;
    let operadoresNoDia = parseInt(operadoresNoDiaInput.value);

    if (!data || isNaN(producao) || producao < 0) {
        alert('Por favor, insira uma data e uma produção diária válida (número não negativo).');
        return;
    }
    if (!isExcecao && (isNaN(operadoresNoDia) || operadoresNoDia < 1)) {
        alert('Por favor, insira um número válido de operadores para o dia (pelo menos 1), ou marque como exceção.');
        return;
        }

    if (isExcecao) {
        operadoresNoDia = 0;
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
        operadoresNoDia: operadoresNoDia
    };
    
    const response = await salvarProducaoAPI(novoRegistro); // APENAS SALVAR
    
    if (response) {
        await atualizarDashboard(anoVisualizado, mesVisualizado);
        // Limpa o formulário após a operação
        dataInput.value = '';
        producaoDiariaInput.value = '';
        isExcecaoCheckbox.checked = false;
        producaoDiariaInput.disabled = false;
        operadoresNoDiaInput.disabled = false;
        operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
    }
});

// Event listener para o botão de atualizar configurações (número de operadores GLOBAL)
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

    let producaoAcumulada = 0;
    let diasDeOperacaoConsiderados = 0;
    let metaAcumulada = 0;
    let saldoTotalAcumulado = 0;
    let totalOperadoresEmDiasOperacionais = 0;

    const nomeMes = getNomeMes(mesVisualizado);
    mesAtualElement.textContent = `${nomeMes} de ${anoVisualizado}`;

    const producoesDoMesVisualizado = producoesMes; 

    let metaMensalTotal = 0;
    const date = new Date(anoVisualizado, mesVisualizado - 1, 1);
    while (date.getMonth() === mesVisualizado - 1) {
        const dayOfWeek = date.getDay();
        const dataString = `${anoVisualizado}-${String(mesVisualizado).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const registroParaEsteDia = producoesDoMesVisualizado.find(p => p.data === dataString);

        if (registroParaEsteDia) {
            if (!registroParaEsteDia.isExcecao) {
                metaMensalTotal += getMetaDiariaParaDia(registroParaEsteDia.operadoresNoDia);
            }
        } else {
            if (dayOfWeek !== 0) {
                metaMensalTotal += getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
            }
        }
        date.setDate(date.getDate() + 1);
    }
    metaMensalTotalElement.textContent = metaMensalTotal.toLocaleString('pt-BR');

    producoesDoMesVisualizado.forEach(registro => {
        const metaDiariaDoRegistro = getMetaDiariaParaDia(registro.operadoresNoDia);

        if (!registro.isExcecao) {
            producaoAcumulada += registro.producao;
            metaAcumulada += metaDiariaDoRegistro;
            diasDeOperacaoConsiderados++;
            totalOperadoresEmDiasOperacionais += registro.operadoresNoDia;
        }

        const phdDiario = (registro.producao > 0 && registro.operadoresNoDia > 0) ? (registro.producao / registro.operadoresNoDia).toFixed(2) : '0.00';

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
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Editar';
        editBtn.classList.add('acao-btn', 'edit-btn');
        editBtn.onclick = () => editarProducao(registro); // Chama a função que abre o modal
        acoesCell.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.classList.add('acao-btn', 'delete-btn');
        deleteBtn.onclick = () => excluirProducao(registro.data);
        acoesCell.appendChild(deleteBtn);
    });

    saldoTotalAcumulado = producaoAcumulada - metaAcumulada;

    const faltaParaMetaMensal = metaMensalTotal - producaoAcumulada;
    faltaParaMetaMensalElement.textContent = faltaParaMetaMensal.toLocaleString('pt-BR');

    let diasRestantesParaProjecao = getDiasDeOperacaoNoMes(anoVisualizado, mesVisualizado, producoesMes) - diasDeOperacaoConsiderados;
    if (diasRestantesParaProjecao < 0) {
        diasRestantesParaProjecao = 0;
    }

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

    if (diasRestantesParaProjecao > 0) {
        const metaDiariaPadrao = getMetaDiariaParaDia(NUM_OPERADORES_PADRAO);
        let projecaoTexto = '';

        if (producaoAcumulada === 0 && diasDeOperacaoConsiderados === 0) {
            projecaoTextoElement.textContent = `Ainda não há lançamentos de produção para ${nomeMes} de ${anoVisualizado}. A meta para o mês é de ${metaMensalTotal.toLocaleString('pt-BR')} pacotes. Comece a registrar a produção!`;
            projecaoTextoElement.style.color = 'blue';
        } else {
            const producaoTotalProjetada = producaoAcumulada + (metaDiariaPadrao * diasRestantesParaProjecao);
            let projecaoSuperar = producaoTotalProjetada - metaMensalTotal;

            if (projecaoSuperar < 0) {
                const pacotesParaRecuperar = Math.abs(projecaoSuperar);
                const pacotesPorDiaParaRecuperar = pacotesParaRecuperar / diasRestantesParaProjecao;
                const metaDiariaAjustadaParaRecuperar = metaDiariaPadrao + pacotesPorDiaParaRecuperar;
                const phdAdicionalPorOperador = (pacotesPorDiaParaRecuperar / NUM_OPERADORES_PADRAO).toFixed(2);

                projecaoTexto = `Para atingir a meta mensal, vocês precisam fazer uma média de ${Math.round(metaDiariaAjustadaParaRecuperar).toLocaleString('pt-BR')} pacotes por dia (ou seja, aproximadamente ${phdAdicionalPorOperador} pacotes a mais por operador por dia, considerando ${NUM_OPERADORES_PADRAO} operadores) nos próximos ${diasRestantesParaProjecao} dias de operação.`;
                projecaoTextoElement.style.color = 'red';
            } else {
                projecaoTexto = `Com a produção atual, e mantendo o ritmo de ${metaDiariaPadrao.toLocaleString('pt-BR')} pacotes/dia (com ${NUM_OPERADORES_PADRAO} operadores), a projeção é de superar a meta mensal em ${projecaoSuperar.toLocaleString('pt-BR')} pacotes! Continuem assim!`;
                projecaoTextoElement.style.color = 'green';

                const pacotesFaltantesParaMetaMensal = metaMensalTotal - producaoAcumulada;
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
    } else {
        if (saldoTotalAcumulado < 0) {
            projecaoTextoElement.textContent = 'Mês encerrado com saldo negativo. Analisar desempenho para o próximo mês.';
            projecaoTextoElement.style.color = 'orange';
        } else {
            projecaoTextoElement.textContent = 'Mês encerrado com a meta atingida ou superada! Parabéns!';
            projecaoTextoElement.style.color = 'blue';
        }
    }
}

// --- Event Listeners do Modal ---
closeButton.addEventListener('click', () => {
    editModal.style.display = 'none';
});

cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Fecha o modal se o usuário clicar fora do conteúdo
window.addEventListener('click', (event) => {
    if (event.target == editModal) {
        editModal.style.display = 'none';
    }
});

saveEditBtn.addEventListener('click', async () => {
    if (!currentEditingRecord) return; // Garante que há um registro sendo editado

    const producao = parseInt(modalProducaoDiariaInput.value);
    const operadoresNoDia = parseInt(modalOperadoresNoDiaInput.value);

    // Validação básica dos campos do modal
    if (isNaN(producao) || producao < 0) {
        alert('Por favor, insira uma produção diária válida (número não negativo) no modal.');
        return;
    }
    // Não valida operadores se for dia de exceção (eles estarão disabled)
    if (!currentEditingRecord.isExcecao && (isNaN(operadoresNoDia) || operadoresNoDia < 1)) {
        alert('Por favor, insira um número válido de operadores (pelo menos 1) no modal, ou certifique-se de que o dia não é uma exceção.');
        return;
    }

    const updatedRecord = {
        producao: producao,
        isExcecao: currentEditingRecord.isExcecao, // Mantém o status de exceção original
        operadoresNoDia: operadoresNoDia
    };

    const response = await atualizarProducaoAPI(currentEditingRecord.data, updatedRecord);

    if (response) {
        editModal.style.display = 'none'; // Fecha o modal
        await atualizarDashboard(anoVisualizado, mesVisualizado); // Atualiza o dashboard
        alert('Lançamento atualizado com sucesso!');
    }
});


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
    numOperadoresGlobalInput.value = NUM_OPERADORES_PADRAO;

    anoVisualizado = ano;
    mesVisualizado = parseInt(mes);

    selectMes.value = mesVisualizado;
    selectAno.value = anoVisualizado;

    await atualizarDashboard(anoVisualizado, mesVisualizado);
});