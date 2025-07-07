// Configurações globais
let NUM_OPERADORES_PADRAO;
const PACOTES_POR_OPERADOR_DIA_META = 450;

// URL base da API
const API_BASE_URL = 'https://phd-dashboard-backend-python.onrender.com/api';

// Elementos HTML
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

let producoesMes = [];

let anoVisualizado;
let mesVisualizado;

// --- Funções API ---

async function fetchProducoes(ano, mes) {
  try {
    const response = await fetch(`${API_BASE_URL}/producoes?ano=${ano}&mes=${mes}`);
    if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
    const data = await response.json();
    return data.map(item => ({
      data: item.data,
      producao: parseInt(item.producao),
      isExcecao: Boolean(item.is_excecao),
      operadoresNoDia: parseInt(item.operadores_no_dia),
    }));
  } catch (e) {
    console.error(e);
    alert('Erro ao carregar dados da API.');
    return [];
  }
}

async function salvarProducaoAPI(registro) {
  try {
    const response = await fetch(`${API_BASE_URL}/producoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: registro.data,
        producao: registro.producao,
        is_excecao: Number(registro.isExcecao),
        operadores_no_dia: registro.operadoresNoDia,
      }),
    });
    if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
    return await response.json();
  } catch (e) {
    console.error(e);
    alert('Erro ao salvar produção na API.');
    return null;
  }
}

async function excluirProducaoAPI(data) {
  try {
    const response = await fetch(`${API_BASE_URL}/producoes/${data}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
    return await response.json();
  } catch (e) {
    console.error(e);
    alert('Erro ao excluir produção na API.');
    return null;
  }
}

async function getConfigsAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/config`);
    if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
    const config = await response.json();
    return {
      num_operadores_padrao: parseInt(config.num_operadores_padrao),
      pacotes_por_operador_dia_meta: parseInt(config.pacotes_por_operador_dia_meta),
    };
  } catch (e) {
    console.error(e);
    alert('Erro ao carregar configurações da API.');
    return { num_operadores_padrao: 13, pacotes_por_operador_dia_meta: 450 };
  }
}

async function updateConfigAPI(chave, valor) {
  try {
    const response = await fetch(`${API_BASE_URL}/config/${chave}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor: String(valor) }),
    });
    if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
    return await response.json();
  } catch (e) {
    console.error(e);
    alert(`Erro ao atualizar configuração '${chave}'.`);
    return null;
  }
}

// --- Funções utilitárias ---

function formatarData(dataString) {
  const [ano, mes, dia] = dataString.split('-');
  return `${dia}/${mes}/${ano}`;
}

function getNomeMes(mesNumero) {
  const data = new Date(2000, mesNumero - 1, 1);
  return data.toLocaleDateString('pt-BR', { month: 'long' });
}

function getMetaDiariaParaDia(operadores) {
  return operadores * PACOTES_POR_OPERADOR_DIA_META;
}

function getDiasUteisNoMes(ano, mes, producoes) {
  let count = 0;
  const date = new Date(ano, mes - 1, 1);
  while (date.getMonth() === mes - 1) {
    const dayOfWeek = date.getDay();
    const dataStr = formatDateISO(date);
    const registro = producoes.find(p => p.data === dataStr);
    if (dayOfWeek !== 0 && !(registro && registro.isExcecao)) count++;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

function getDiasUteisAteData(ano, mes, dia, producoes) {
  let count = 0;
  for (let d = 1; d <= dia; d++) {
    const date = new Date(ano, mes - 1, d);
    const dayOfWeek = date.getDay();
    const dataStr = formatDateISO(date);
    const registro = producoes.find(p => p.data === dataStr);
    if (dayOfWeek !== 0 && !(registro && registro.isExcecao)) count++;
  }
  return count;
}

function getDiasOperados(producoes) {
  return producoes.filter(p => !p.isExcecao).length;
}

function formatDateISO(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

// --- Eventos ---

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
  if (isExcecao) operadoresNoDia = 0;

  if (!isExcecao && producao === 0 && !confirm('Você está lançando 0 pacotes para um dia normal. Confirmar?')) {
    return;
  }

  const dataObj = new Date(data + 'T00:00:00');
  if (dataObj.getDay() === 0 && !isExcecao &&
      !confirm('Está lançando produção para domingo sem marcar exceção. Confirmar?')) {
    return;
  }

  const novoRegistro = { data, producao, isExcecao, operadoresNoDia };

  const response = await salvarProducaoAPI(novoRegistro);
  if (response) {
    await atualizarDashboard(anoVisualizado, mesVisualizado);
    dataInput.value = '';
    producaoDiariaInput.value = '';
    isExcecaoCheckbox.checked = false;
    producaoDiariaInput.disabled = false;
    operadoresNoDiaInput.disabled = false;
    operadoresNoDiaInput.value = NUM_OPERADORES_PADRAO;
  }
});

updateConfigBtn.addEventListener('click', async () => {
  const novoNumOperadores = parseInt(numOperadoresGlobalInput.value);
  if (isNaN(novoNumOperadores) || novoNumOperadores < 1) {
    alert('Número de operadores deve ser pelo menos 1.');
    return;
  }
  const resp = await updateConfigAPI('num_operadores_padrao', novoNumOperadores);
  if (resp) {
    NUM_OPERADORES_PADRAO = novoNumOperadores;
    alert(`Número de operadores padrão atualizado para ${novoNumOperadores}`);
  }
});

viewMonthBtn.addEventListener('click', async () => {
  anoVisualizado = parseInt(selectAno.value);
  mesVisualizado = parseInt(selectMes.value);
  await atualizarDashboard(anoVisualizado, mesVisualizado);
});

// --- Atualizar dashboard ---

async function atualizarDashboard(ano, mes) {
  producoesMes = await fetchProducoes(ano, mes);
  mesAtualElement.textContent = `${getNomeMes(mes).toUpperCase()} / ${ano}`;

  // Cálculo da meta mensal total considerando dias úteis e exceções
  const diasUteis = getDiasUteisNoMes(ano, mes, producoesMes);
  const metaMensalTotal = NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META * diasUteis;
  metaMensalTotalElement.textContent = metaMensalTotal;

  // Produção acumulada até hoje (ou até último dado)
  const producaoAcumulada = producoesMes.reduce((acc, item) => acc + item.producao, 0);
  producaoAcumuladaElement.textContent = producaoAcumulada;

  // Meta esperada até o dia atual (considera dias passados)
  const hoje = new Date();
  let diasPassadosNoMes = 0;
  if (ano === hoje.getFullYear() && mes === (hoje.getMonth() + 1)) {
    diasPassadosNoMes = getDiasUteisAteData(ano, mes, hoje.getDate(), producoesMes);
  } else if (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes < (hoje.getMonth() + 1))) {
    // Mês no passado = meta total para o mês (considerando exceções)
    diasPassadosNoMes = diasUteis;
  }
  const metaAcumulada = NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META * diasPassadosNoMes;
  metaAcumuladaElement.textContent = metaAcumulada;

  // Saldo acumulado = produção acumulada - meta acumulada
  const saldoAcumulado = producaoAcumulada - metaAcumulada;
  saldoAcumuladoElement.textContent = saldoAcumulado;
  saldoAcumuladoElement.className = saldoAcumulado >= 0 ? 'positivo' : 'negativo';

  // PHD médio mensal = produção acumulada / (num operadores padrão * dias operados)
  const diasOperados = getDiasOperados(producoesMes);
  diasOperacaoConsideradosElement.textContent = diasOperados;

  const phdMedioMensal = diasOperados === 0 ? 0 :
    (producaoAcumulada / (NUM_OPERADORES_PADRAO * diasOperados));
  phdMedioMensalElement.textContent = phdMedioMensal.toFixed(2);

  // Dias restantes no mês
  const totalDiasNoMes = new Date(ano, mes, 0).getDate();
  const diasRestantes = totalDiasNoMes - (diasPassadosNoMes);
  diasRestantesElement.textContent = diasRestantes;

  // Falta para meta mensal
  const faltaParaMeta = metaMensalTotal - producaoAcumulada;
  faltaParaMetaMensalElement.textContent = faltaParaMeta > 0 ? faltaParaMeta : 0;

  // Texto de projeção simples
  if (producaoAcumulada === 0) {
    projecaoTextoElement.textContent = 'Comece a lançar sua produção para ver a projeção!';
  } else {
    const projecaoFinal = producaoAcumulada + (diasRestantes * NUM_OPERADORES_PADRAO * PACOTES_POR_OPERADOR_DIA_META);
    projecaoTextoElement.textContent = `Projeção final para o mês: ${projecaoFinal} pacotes (baseada na meta diária padrão).`;
  }

  // Atualiza a tabela histórico
  preencherTabelaHistorico(producoesMes);
}

// --- Preencher tabela histórico ---

function preencherTabelaHistorico(producoes) {
  historicoTableBody.innerHTML = '';
  producoes.sort((a, b) => a.data.localeCompare(b.data));
  producoes.forEach(item => {
    const tr = document.createElement('tr');

    const dataFormatada = formatarData(item.data);
    const metaDia = item.isExcecao ? 0 : getMetaDiariaParaDia(item.operadoresNoDia);
    const phdDia = metaDia === 0 ? 0 : (item.producao / item.operadoresNoDia || 0);
    const saldoDia = item.producao - metaDia;

    tr.innerHTML = `
      <td>${dataFormatada}</td>
      <td>${item.producao}</td>
      <td>${item.operadoresNoDia}</td>
      <td>${metaDia}</td>
      <td>${phdDia.toFixed(2)}</td>
      <td class="${saldoDia >= 0 ? 'positivo' : 'negativo'}">${saldoDia}</td>
      <td>${item.isExcecao ? '<span class="excecao-dia">Exceção</span>' : 'Normal'}</td>
      <td><button class="delete-btn" data-data="${item.data}">Excluir</button></td>
    `;

    historicoTableBody.appendChild(tr);
  });

  // Add listener para exclusão
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const dataParaExcluir = e.target.getAttribute('data-data');
      if (confirm(`Confirma a exclusão do registro do dia ${formatarData(dataParaExcluir)}?`)) {
        const resp = await excluirProducaoAPI(dataParaExcluir);
        if (resp) {
          await atualizarDashboard(anoVisualizado, mesVisualizado);
        }
      }
    });
  });
}

// --- Inicialização ---

async function inicializar() {
  // Preenche selects de mês e ano
  const hoje = new Date();
  for (let m = 1; m <= 12; m++) {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = getNomeMes(m);
    selectMes.appendChild(option);
  }
  for (let a = hoje.getFullYear() - 5; a <= hoje.getFullYear() + 1; a++) {
    const option = document.createElement('option');
    option.value = a;
    option.textContent = a;
    selectAno.appendChild(option);
  }
  selectMes.value = hoje.getMonth() + 1;
  selectAno.value = hoje.getFullYear();

  // Busca config inicial
  const config = await getConfigsAPI();
  NUM_OPERADORES_PADRAO = config.num_operadores_padrao || 13;

  numOperadoresGlobalInput.value = NUM_OPERADORES_PADRAO;

  anoVisualizado = hoje.getFullYear();
  mesVisualizado = hoje.getMonth() + 1;

  await atualizarDashboard(anoVisualizado, mesVisualizado);
}

inicializar();