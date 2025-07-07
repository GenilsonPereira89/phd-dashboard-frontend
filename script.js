// Constantes do seu negócio
let NUM_OPERADORES_PADRAO; // Agora será carregado da API
const PACOTES_POR_OPERADOR_DIA_META = 450;
const DIAS_OPERACAO_SEMANA = 6; // Esta constante serve mais para informação agora, a lógica de dias úteis reflete a escala

// URL base do seu backend - MUITO IMPORTANTE!
// QUANDO FOR PARA O RENDER, ESTA URL MUDARÁ PARA O ENDEREÇO DO SEU BACKEND NO RENDER.
const API_BASE_URL = 'https://phd-dashboard-backend-python.onrender.com/api'; // <-- ALTERAÇÃO AQUI!

// Elementos HTML (seletores) - AGORA SERÃO DEFINIDOS DENTRO DO DOMContentLoaded
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

let anoVisualizado;
let mesVisualizado;

// --- Funções de API (mantidas iguais) ---
async function getConfigsAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/configs`);
        if (!response.ok) {
            // Se a resposta não for 2xx, verifica se é um 404 para criar as configurações padrão
            if (response.status === 404) {
                console.warn('Configurações não encontradas, criando padrão...');
                // Tenta criar as configurações padrão no backend
                const createResponse = await fetch(`${API_BASE_URL}/configs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ num_operadores_padrao: 13 }), // Valor padrão inicial
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
        // Retorna um valor padrão seguro em caso de falha completa
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
            // Tenta ler o erro do backend se disponível
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

// --- Funções de Utilitários e Lógica (alteradas onde indicado) ---
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
    hoje.setHours(0, 0, 0, 0); // Zera as horas para comparação
    const dataUltimoDiaMesVisualizado = new Date(anoVisualizado, mesVisualizado - 1, totalDiasNoMes);

    // Filtrar o histórico para o mês/ano visualizado
    const historicoProducaoFiltrado = historicoProducao.filter(p => {
        const pDate = new Date(p.data);
        return pDate.getFullYear() === anoVisualizado && pDate.getMonth() + 1 === mesVisualizado;
    });

    kpis.producaoAcumulada = historicoProducaoFiltrado.reduce((sum, p) => sum + p.producaoDiaria, 0);

    let totalOperadoresEmDiasOperacionais = 0;
    kpis.diasOperacaoConsiderados = 0; // Reinicia a contagem de dias considerados
    let maxDiaHistorico = 0; // Para saber qual o último dia com lançamento

    historicoProducaoFiltrado.forEach(p => {
        const pDate = new Date(p.data);
        if (pDate.getDate() > maxDiaHistorico) {
            maxDiaHistorico = pDate.getDate();
        }

        if (p.tipoDia !== 'Exceção') {
            totalOperadoresEmDiasOperacionais += p.operadoresNoDia;
            kpis.diasOperacaoConsiderados++; // Conta apenas dias não exceção com produção
        }
    });

    // Calcula PHD Médio Mensal apenas se houver produção e operadores
    if (kpis.producaoAcumulada > 0 && totalOperadoresEmDiasOperacionais > 0) {
        kpis.phdMedioMensal = kpis.producaoAcumulada / totalOperadoresEmDiasOperacionais;
    }

    // Calcula Total Dias Operacionais Previstos (para o mês visualizado)
    kpis.totalDiasOperacionaisPrevistos = calculaDiasUteisNoMes(mesVisualizado, anoVisualizado);

    // Calcula Meta Mensal Total
    kpis.metaMensalTotal = kpis.totalDiasOperacionaisPrevistos * NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META;

    // --- ALTERAÇÃO AQUI: CÁLCULO DA META ESPERADA ATÉ HOJE ---
    // Agora, a Meta Esperada até Hoje considera apenas os dias que tiveram produção lançada
    // e que não foram marcados como exceção.
    kpis.metaEsperadaAteHoje = kpis.diasOperacaoConsiderados * (NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META);
    // --------------------------------------------------------

    kpis.saldoAcumulado = kpis.producaoAcumulada - kpis.metaEsperadaAteHoje;
    kpis.faltaParaMetaMensal = Math.max(0, kpis.metaMensalTotal - kpis.producaoAcumulada);

    // Calcula Dias Restantes no Mês
    kpis.diasRestantes = 0;
    if (new Date(anoVisualizado, mesVisualizado - 1, 1) <= hoje) { // Só calcula se o mês visualizado já começou ou é o atual
        let diaAtualDoLoop = hoje.getDate() + 1; // Começa a contar do dia seguinte ao atual
        if (anoVisualizado > hoje.getFullYear() || (anoVisualizado === hoje.getFullYear() && mesVisualizado > (hoje.getMonth() + 1))) {
            // Se o mês visualizado é no futuro, conta todos os dias úteis do mês
            diaAtualDoLoop = 1; // Começa do primeiro dia do mês para meses futuros
        }

        for (let i = diaAtualDoLoop; i <= totalDiasNoMes; i++) {
            const dataIteracao = new Date(anoVisualizado, mesVisualizado - 1, i);
            const diaDaSemana = dataIteracao.getDay(); // 0 = Domingo, 6 = Sábado

            // Verifica se o dia é uma exceção (feriado, folga, etc.) no histórico
            const excecaoParaEsteDia = historicoProducaoFiltrado.find(p => {
                const pDate = new Date(p.data);
                return pDate.getFullYear() === dataIteracao.getFullYear() &&
                       pDate.getMonth() === dataIteracao.getMonth() &&
                       pDate.getDate() === dataIteracao.getDate() &&
                       p.tipoDia === 'Exceção';
            });

            // Se não é domingo e não é exceção, é um dia operacional restante
            if (diaDaSemana !== 0 && !excecaoParaEsteDia) {
                kpis.diasRestantes++;
            }
        }
    } else { // Se o mês visualizado é no passado
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
            // A projeção usa o ritmo padrão para os dias futuros
            const projecaoTotal = kpis.producaoAcumulada + (kpis.diasRestantes * NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META);
            const diferenca = Math.abs(projecaoTotal - kpis.metaMensalTotal);
            
            let projecaoMensagem = `Com a produção atual, e mantendo o ritmo de ${(NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes/dia (com ${NUM_OPERADORES_PADRAO} operadores), a projeção para o mês é de <strong>${projecaoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong>, ficando `;

            if (projecaoTotal >= kpis.metaMensalTotal) {
                projecaoMensagem += `<strong>ACIMA ${diferenca.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes</strong> da meta mensal.`;
                
                // Calculate the daily production needed to hit the exact meta
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
    historicoTableBody.innerHTML = ''; // Limpa o corpo da tabela
    const historicoProducaoFiltrado = historicoProducao.filter(p => {
        const pDate = new Date(p.data);
        return pDate.getFullYear() === anoVisualizado && pDate.getMonth() + 1 === mesVisualizado;
    });

    historicoProducaoFiltrado.sort((a, b) => new Date(a.data) - new Date(b.data)); // Ordena por data

    historicoProducaoFiltrado.forEach(producao => {
        const row = historicoTableBody.insertRow();
        const data = new Date(producao.data);
        const dataFormatada = `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;

        // Calcula Meta Diária, PHD Diário e Saldo Diário para cada linha do histórico
        // A meta diária baseada no NUM_OPERADORES_PADRAO, mas a comparação pode ser com os operadores do dia
        const metaDiariaPadrao = NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META;
        // Se o dia não for exceção e tiver operadores, calcula PHD e Saldo com base nos operadores do dia
        let phdDiario = 0;
        let saldoDiario = 0;
        if (producao.tipoDia !== 'Exceção' && producao.operadoresNoDia > 0) {
            phdDiario = producao.producaoDiaria / producao.operadoresNoDia;
            saldoDiario = producao.producaoDiaria - (producao.operadoresNoDia * PACOTES_POR_OPERADOR_DIA_META);
        } else if (producao.tipoDia === 'Exceção') {
             // Para dias de exceção, PHD e Saldo não são aplicáveis no mesmo contexto
             phdDiario = 0; // Ou 'N/A' se quiser exibir texto
             saldoDiario = 0; // Ou 'N/A' se quiser exibir texto
        }


        row.insertCell(0).textContent = dataFormatada;
        row.insertCell(1).textContent = producao.producaoDiaria.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        row.insertCell(2).textContent = producao.operadoresNoDia;
        row.insertCell(3).textContent = metaDiariaPadrao.toLocaleString('pt-BR', { maximumFractionDigits: 0 }); // Exibe a meta padrão
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
                carregarEExibirDados(); // Recarrega os dados após a exclusão
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

// --- Listeners de Eventos ---
// Os listeners de eventos agora são adicionados DENTRO do DOMContentLoaded
// para garantir que os elementos já existem.

// --- Inicialização da página ---
function popularSeletoresDeMesAno() {
    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    selectMes.innerHTML = meses.map((mes, index) => `<option value="${index + 1}">${mes}</option>`).join('');

    const anoAtual = new Date().getFullYear();
    const anos = [];
    for (let i = anoAtual - 5; i <= anoAtual + 5; i++) { // Últimos 5 anos e próximos 5 anos
        anos.push(i);
    }
    selectAno.innerHTML = anos.map(ano => `<option value="${ano}">${ano}</option>`).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    // SELEÇÃO DOS ELEMENTOS HTML MOVIDA PARA AQUI
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
    // FIM DA SELEÇÃO DOS ELEMENTOS HTML

    // Carrega as configurações (incluindo NUM_OPERADORES_PADRAO) da API
    const configs = await getConfigsAPI();
    NUM_OPERADORES_PADRAO = configs.num_operadores_padrao;

    popularSeletoresDeMesAno(); // Popula os dropdowns de mês e ano

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

    // ADIÇÃO DOS LISTENERS DE EVENTOS MOVIDA PARA AQUI
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

    visualizarMesBtn.addEventListener('click', async () => {
        anoVisualizado = parseInt(selectAno.value);
        mesVisualizado = parseInt(selectMes.value);
        await carregarEExibirDados();
    });

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
    // FIM DA ADIÇÃO DOS LISTENERS DE EVENTOS

    await carregarEExibirDados(); // Carrega e exibe os dados iniciais
});