document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'https://phd-dashboard-backend-python.onrender.com/api';

    // Elementos do Dashboard Principal
    const mainContentWrapper = document.getElementById('main-content-wrapper');
    const toggleRelatorioBtn = document.getElementById('toggleRelatorioBtn');

    // Elementos da Seção de Relatórios
    const relatorioSection = document.getElementById('relatorio-section');
    const closeRelatorioBtn = document.getElementById('closeRelatorioBtn');
    const mesComparar1Select = document.getElementById('mesComparar1');
    const anoComparar1Select = document.getElementById('anoComparar1');
    const mesComparar2Select = document.getElementById('mesComparar2');
    const anoComparar2Select = document.getElementById('anoComparar2');
    const btnCompararMeses = document.getElementById('btnCompararMeses');
    const exportRelatorioBtn = document.getElementById('exportRelatorioBtn');
    const tabelaComparativoMensal = document.getElementById('tabelaComparativoMensal').getElementsByTagName('tbody')[0];
    const headerMes1 = document.getElementById('headerMes1');
    const headerMes2 = document.getElementById('headerMes2');


    // Configurações
    const numOperadoresPadraoInput = document.getElementById('numOperadoresPadrao');
    const salvarConfigBtn = document.getElementById('salvarConfigBtn');

    // Registro de Produção
    const dataProducaoInput = document.getElementById('dataProducao');
    const producaoDiariaInput = document.getElementById('producaoDiaria');
    const operadoresNoDiaInput = document.getElementById('operadoresNoDia');
    const isExcecaoCheckbox = document.getElementById('isExcecao');
    const addProducaoBtn = document.getElementById('addProducaoBtn');

    // Filtro de Mês/Ano
    const selectMonth = document.getElementById('selectMonth');
    const selectYear = document.getElementById('selectYear');
    const filterDataBtn = document.getElementById('filterDataBtn');

    // KPIs
    const metaMensalElement = document.getElementById('metaMensal');
    const producaoAcumuladaElement = document.getElementById('producaoAcumulada');
    const saldoAcumuladoElement = document.getElementById('saldoAcumulado');
    const phdMedioElement = document.getElementById('phdMedio');
    const diasUteisTrabalhadosElement = document.getElementById('diasUteisTrabalhados');
    const mediaOperadoresDiaElement = document.getElementById('mediaOperadoresDia');
    const projecaoTextoElement = document.getElementById('projecaoTexto');

    // Histórico
    const historicoTableBody = document.getElementById('historicoTableBody');

    let numOperadoresPadrao = 13; // Valor padrão inicial, será carregado do backend
    const pacotesPorOperadorDiaMeta = 450; // Meta de pacotes por operador por dia

    // --- Funções de Inicialização e Carregamento ---

    // Popula os selects de mês e ano
    function populateMonthAndYearSelects() {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // Mês atual (1-12)

        // Popula meses
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        selectMonth.innerHTML = '';
        mesComparar1Select.innerHTML = '';
        mesComparar2Select.innerHTML = '';
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = (index + 1).toString().padStart(2, '0'); // Garante 2 dígitos (01, 02...)
            option.textContent = month;
            selectMonth.appendChild(option);

            const option1 = option.cloneNode(true);
            mesComparar1Select.appendChild(option1);
            const option2 = option.cloneNode(true);
            mesComparar2Select.appendChild(option2);
        });

        // Popula anos (5 anos para trás e 1 para frente, por exemplo)
        selectYear.innerHTML = '';
        anoComparar1Select.innerHTML = '';
        anoComparar2Select.innerHTML = '';
        for (let i = currentYear - 5; i <= currentYear + 1; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            selectYear.appendChild(option);

            const option1 = option.cloneNode(true);
            anoComparar1Select.appendChild(option1);
            const option2 = option.cloneNode(true);
            anoComparar2Select.appendChild(option2);
        }

        // Define o mês e ano atuais como selecionados
        selectMonth.value = currentMonth.toString().padStart(2, '0');
        selectYear.value = currentYear;
        mesComparar1Select.value = currentMonth.toString().padStart(2, '0');
        anoComparar1Select.value = currentYear;
        mesComparar2Select.value = (currentMonth - 1 > 0 ? currentMonth - 1 : 12).toString().padStart(2, '0'); // Mês anterior
        anoComparar2Select.value = (currentMonth - 1 > 0 ? currentYear : currentYear - 1); // Ano do mês anterior
        
        // Define a data atual no input de produção
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        dataProducaoInput.value = `${year}-${month}-${day}`;
    }

    // Carrega as configurações do backend
    async function loadConfigs() {
        try {
            const response = await fetch(`${backendUrl}/config`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const configs = await response.json();
            numOperadoresPadrao = parseInt(configs.num_operadores_padrao || '13');
            numOperadoresPadraoInput.value = numOperadoresPadrao;
            fetchProducoes(); // Recarrega os dados com a nova configuração
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            alert('Erro ao carregar configurações. Usando valores padrão.');
        }
    }

    // Carrega as produções do backend para o mês/ano selecionado
    async function fetchProducoes() {
        const ano = selectYear.value;
        const mes = selectMonth.value;
        try {
            const response = await fetch(`${backendUrl}/producoes?ano=${ano}&mes=${mes}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const producoes = await response.json();
            updateDashboard(producoes, ano, mes);
            renderHistorico(producoes);
        } catch (error) {
            console.error('Erro ao buscar produções:', error);
            alert('Erro ao buscar dados de produção.');
        }
    }

    // --- Funções de Cálculo e Atualização do Dashboard ---

    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    function isWeekend(dateString) {
        const date = new Date(dateString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário
        const day = date.getDay();
        return day === 0 || day === 6; // Domingo (0) ou Sábado (6)
    }

    function updateDashboard(producoes, ano, mes) {
        const totalDiasNoMes = getDaysInMonth(parseInt(ano), parseInt(mes));
        let producaoAcumulada = 0;
        let diasUteisTrabalhados = 0;
        let totalOperadoresRegistrados = 0;
        let totalPHD = 0;
        let saldoAcumuladoTotal = 0; // Vai acumular os saldos diários

        const diasComProducao = new Set();

        producoes.forEach(prod => {
            producaoAcumulada += prod.producao;
            diasComProducao.add(prod.data); // Para contar dias com registro
            
            const metaDiaria = prod.operadores_no_dia * pacotesPorOperadorDiaMeta;
            const saldoDiario = prod.producao - metaDiaria;

            if (!prod.is_excecao) {
                diasUteisTrabalhados++;
                totalOperadoresRegistrados += prod.operadores_no_dia;
                const phdDiario = prod.operadores_no_dia > 0 ? (prod.producao / prod.operadores_no_dia) : 0; // Evita divisão por zero
                totalPHD += phdDiario;
                saldoAcumuladoTotal += saldoDiario; // Acumula o saldo diário apenas para dias não exceção
            } else {
                // Se for um dia de exceção, não conta para a meta diária, então o saldo é a própria produção
                // mas não contribui para o saldo acumulado de dias úteis regulares
                // Se a intenção é que dias de exceção também contribuam, a lógica aqui precisaria ser ajustada.
                // Mantendo como estava, dias de exceção não influenciam o saldo acumulado que se baseia na meta de 450.
            }
        });

        // Calcula a meta mensal (esta parte permanece a mesma, pois é a meta geral do mês)
        let metaMensal = 0;
        for (let i = 1; i <= totalDiasNoMes; i++) {
            const dataAtual = `${ano}-${mes.padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            const producaoDoDia = producoes.find(p => p.data === dataAtual);

            if (producaoDoDia && producaoDoDia.is_excecao) {
                continue;
            }

            if (!isWeekend(dataAtual)) {
                if (producaoDoDia) {
                    metaMensal += producaoDoDia.operadores_no_dia * pacotesPorOperadorDiaMeta;
                } else {
                    metaMensal += numOperadoresPadrao * pacotesPorOperadorDiaMeta;
                }
            }
        }

        const phdMedio = diasUteisTrabalhados > 0 ? (totalPHD / diasUteisTrabalhados) : 0;
        const mediaOperadoresDia = diasUteisTrabalhados > 0 ? (totalOperadoresRegistrados / diasUteisTrabalhados) : 0;
        
        metaMensalElement.textContent = metaMensal.toLocaleString('pt-BR');
        producaoAcumuladaElement.textContent = producaoAcumulada.toLocaleString('pt-BR');
        
        saldoAcumuladoElement.textContent = saldoAcumuladoTotal.toLocaleString('pt-BR'); // Usa o saldo acumulado dos saldos diários
        // Aplica classe para cor do saldo acumulado
        saldoAcumuladoElement.classList.remove('positivo', 'negativo');
        if (saldoAcumuladoTotal > 0) {
            saldoAcumuladoElement.classList.add('positivo');
        } else if (saldoAcumuladoTotal < 0) {
            saldoAcumuladoElement.classList.add('negativo');
        }

        phdMedioElement.textContent = phdMedio.toFixed(2);
        diasUteisTrabalhadosElement.textContent = diasUteisTrabalhados;
        mediaOperadoresDiaElement.textContent = mediaOperadoresDia.toFixed(1);

        // A projeção ainda deve se basear na meta mensal total e produção acumulada para saber o que falta
        // ou precisaria ser redefinida para projetar o saldo diário necessário nos dias futuros
        // Por enquanto, mantenho a projeção como a diferença para a meta mensal total.
        updateProjecao(producaoAcumulada, metaMensal, ano, mes, diasUteisTrabalhados, producoes);
    }

    function updateProjecao(producaoAcumulada, metaMensal, ano, mes, diasUteisTrabalhados, producoes) {
        const hoje = new Date();
        const mesAtualNum = parseInt(mes);
        const anoAtualNum = parseInt(ano);
        const totalDiasNoMes = getDaysInMonth(anoAtualNum, mesAtualNum);

        let diasRestantesMes = 0;
        let metaRestante = metaMensal - producaoAcumulada; // A projeção é sobre a meta total vs produção total

        // Calcula os dias úteis restantes no mês, considerando exceções e fins de semana
        // Só faz a projeção se for o mês/ano atual
        if (anoAtualNum === hoje.getFullYear() && mesAtualNum === (hoje.getMonth() + 1)) {
            for (let i = hoje.getDate() + 1; i <= totalDiasNoMes; i++) {
                const dataFutura = `${anoAtualNum}-${mes.padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
                const producaoDoDia = producoes.find(p => p.data === dataFutura);

                // Se for um dia no futuro e não for fim de semana E não for um dia de exceção já registrado
                if (new Date(dataFutura + 'T00:00:00') > hoje && !isWeekend(dataFutura) && !(producaoDoDia && producaoDoDia.is_excecao)) {
                    diasRestantesMes++;
                }
            }
        } else {
            // Se não é o mês/ano atual, não há dias restantes para projetar
            diasRestantesMes = 0;
        }


        let projecaoTexto = '';
        if (metaRestante <= 0) {
            projecaoTexto = `Parabéns! A meta mensal de ${metaMensal.toLocaleString('pt-BR')} pacotes já foi atingida. Saldo de ${saldoAcumuladoElement.textContent} pacotes.`;
        } else if (diasRestantesMes > 0) {
            const producaoNecessariaPorDia = metaRestante / diasRestantesMes;
            const phdNecessarioPorOperador = producaoNecessariaPorDia / numOperadoresPadrao; // Usando operadores padrão para projeção

            projecaoTexto = `Para atingir a meta mensal, você precisa produzir uma média de <strong>${producaoNecessariaPorDia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pacotes/dia</strong> nos próximos ${diasRestantesMes} dias úteis. Isso significa um PHD de <strong>${phdNecessarioPorOperador.toFixed(2)}</strong>.`;
        } else {
            projecaoTexto = `Não há mais dias úteis restantes neste mês para atingir a meta. Saldo final de ${saldoAcumuladoElement.textContent} pacotes.`;
        }
        projecaoTextoElement.innerHTML = projecaoTexto;
    }

    // Renderiza o histórico na tabela
    function renderHistorico(producoes) {
        historicoTableBody.innerHTML = '';
        if (producoes.length === 0) {
            historicoTableBody.innerHTML = '<tr><td colspan="8">Nenhum registro de produção para o mês selecionado.</td></tr>';
            return;
        }

        producoes.forEach(prod => {
            const row = historicoTableBody.insertRow();
            const metaDiaria = prod.operadores_no_dia * pacotesPorOperadorDiaMeta;
            const phdDiario = prod.operadores_no_dia > 0 ? (prod.producao / prod.operadores_no_dia) : 0; // Evita divisão por zero
            const saldoDiario = prod.producao - metaDiaria;
            const tipoDia = prod.is_excecao ? 'Dia de Exceção' : (isWeekend(prod.data) ? 'Fim de Semana' : 'Dia Útil');

            row.insertCell(0).textContent = new Date(prod.data + 'T00:00:00').toLocaleDateString('pt-BR');
            row.insertCell(1).textContent = prod.producao.toLocaleString('pt-BR');
            row.insertCell(2).textContent = prod.operadores_no_dia;
            row.insertCell(3).textContent = metaDiaria.toLocaleString('pt-BR');
            row.insertCell(4).textContent = phdDiario.toFixed(2);
            
            const saldoCell = row.insertCell(5);
            saldoCell.textContent = saldoDiario.toLocaleString('pt-BR');
            // Aplica classe para cor do saldo diário
            if (saldoDiario > 0) {
                saldoCell.classList.add('positivo');
            } else if (saldoDiario < 0) {
                saldoCell.classList.add('negativo');
            }

            const tipoDiaCell = row.insertCell(6);
            tipoDiaCell.textContent = tipoDia;
            if (prod.is_excecao) {
                tipoDiaCell.classList.add('excecao-dia');
            }

            const actionsCell = row.insertCell(7);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.onclick = () => deleteProducao(prod.data);
            actionsCell.appendChild(deleteBtn);
        });
    }

    // --- Funções de Interação com o Backend (CRUD) ---

    // Salva/Atualiza configuração
    salvarConfigBtn.addEventListener('click', async () => {
        const novoNumOperadores = parseInt(numOperadoresPadraoInput.value);
        if (isNaN(novoNumOperadores) || novoNumOperadores <= 0) {
            alert('Por favor, insira um número de operadores válido (maior que zero).');
            return;
        }
        try {
            const response = await fetch(`${backendUrl}/config/num_operadores_padrao`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valor: novoNumOperadores.toString() })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            alert(result.message);
            loadConfigs(); // Recarrega as configurações e dados
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            alert('Erro ao salvar configuração.');
        }
    });

    // Adiciona/Atualiza produção
    addProducaoBtn.addEventListener('click', async () => {
        const data = dataProducaoInput.value;
        const producao = parseInt(producaoDiariaInput.value);
        const operadores = parseInt(operadoresNoDiaInput.value);
        const isExcecao = isExcecaoCheckbox.checked;

        if (!data || isNaN(producao) || producao < 0 || isNaN(operadores) || operadores <= 0) {
            alert('Por favor, preencha todos os campos corretamente (Produção >= 0, Operadores > 0).');
            return;
        }

        try {
            const response = await fetch(`${backendUrl}/producoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, producao, is_excecao: isExcecao, operadores_no_dia: operadores })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            alert(result.message);
            fetchProducoes(); // Recarrega os dados após a adição/atualização
            // Limpa o formulário
            // dataProducaoInput.value = ''; // Não limpa a data para facilitar lançamentos sequenciais
            producaoDiariaInput.value = '';
            operadoresNoDiaInput.value = '';
            isExcecaoCheckbox.checked = false;
        } catch (error) {
            console.error('Erro ao adicionar/atualizar produção:', error);
            alert('Erro ao adicionar/atualizar produção.');
        }
    });

    // Exclui produção
    async function deleteProducao(data) {
        if (!confirm(`Tem certeza que deseja excluir a produção do dia ${new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')}?`)) {
            return;
        }
        try {
            const response = await fetch(`${backendUrl}/producoes/${data}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            alert(result.message);
            fetchProducoes(); // Recarrega os dados após a exclusão
        } catch (error) {
            console.error('Erro ao excluir produção:', error);
            alert('Erro ao excluir produção.');
        }
    }

    // --- Event Listeners ---

    filterDataBtn.addEventListener('click', fetchProducoes);

    // --- Lógica para alternar entre Dashboard e Relatórios ---
    toggleRelatorioBtn.addEventListener('click', () => {
        if (mainContentWrapper.style.display === 'none') {
            // Se o dashboard está oculto, mostra ele e oculta o relatório
            mainContentWrapper.style.display = 'block';
            relatorioSection.style.display = 'none';
            toggleRelatorioBtn.textContent = 'Ver Relatórios';
            fetchProducoes(); // Recarrega os dados do dashboard ao voltar
        } else {
            // Se o dashboard está visível, oculta ele e mostra o relatório
            mainContentWrapper.style.display = 'none';
            relatorioSection.style.display = 'block';
            toggleRelatorioBtn.textContent = 'Voltar ao Dashboard';
            // Chama a função para popular e exibir o relatório
            populateMonthAndYearSelects(); // Garante que os selects de comparação estejam atualizados
            renderComparativoMensal(null, null, null, null); // Limpa a tabela ao entrar na seção
        }
    });

    closeRelatorioBtn.addEventListener('click', () => {
        mainContentWrapper.style.display = 'block';
        relatorioSection.style.display = 'none';
        toggleRelatorioBtn.textContent = 'Ver Relatórios';
        fetchProducoes(); // Recarrega os dados do dashboard ao voltar
    });

    // --- Funções e Event Listeners para o Relatório ---

    // Função para calcular os KPIs para um dado conjunto de produções
    function calculateKPIsForMonth(producoes, ano, mes, operadoresPadrao) {
        const totalDiasNoMes = getDaysInMonth(parseInt(ano), parseInt(mes));
        let producaoAcumulada = 0;
        let diasUteisTrabalhados = 0;
        let totalOperadoresRegistrados = 0;
        let totalPHD = 0;
        let saldoAcumuladoKPI = 0; // Saldo acumulado para o relatório

        producoes.forEach(prod => {
            producaoAcumulada += prod.producao;
            const metaDiaria = prod.operadores_no_dia * pacotesPorOperadorDiaMeta;
            const saldoDiario = prod.producao - metaDiaria;

            if (!prod.is_excecao) {
                diasUteisTrabalhados++;
                totalOperadoresRegistrados += prod.operadores_no_dia;
                const phdDiario = prod.operadores_no_dia > 0 ? (prod.producao / prod.operadores_no_dia) : 0;
                totalPHD += phdDiario;
                saldoAcumuladoKPI += saldoDiario; // Acumula o saldo diário
            }
        });

        let metaMensal = 0;
        for (let i = 1; i <= totalDiasNoMes; i++) {
            const dataAtual = `${ano}-${mes.padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            const producaoDoDia = producoes.find(p => p.data === dataAtual);

            if (producaoDoDia && producaoDoDia.is_excecao) {
                continue;
            }

            if (!isWeekend(dataAtual)) {
                if (producaoDoDia) {
                    metaMensal += producaoDoDia.operadores_no_dia * pacotesPorOperadorDiaMeta;
                } else {
                    metaMensal += operadoresPadrao * pacotesPorOperadorDiaMeta;
                }
            }
        }

        const phdMedio = diasUteisTrabalhados > 0 ? (totalPHD / diasUteisTrabalhados) : 0;
        const mediaOperadoresDia = diasUteisTrabalhados > 0 ? (totalOperadoresRegistrados / diasUteisTrabalhados) : 0;
        
        return {
            metaMensal: metaMensal,
            producaoAcumulada: producaoAcumulada,
            saldoAcumulado: saldoAcumuladoKPI, // Usa o saldo acumulado dos saldos diários
            phdMedio: phdMedio,
            diasUteisTrabalhados: diasUteisTrabalhados,
            mediaOperadoresDia: mediaOperadoresDia
        };
    }

    // Função para buscar dados para o relatório comparativo
    btnCompararMeses.addEventListener('click', async () => {
        const ano1 = anoComparar1Select.value;
        const mes1 = mesComparar1Select.value;
        const ano2 = anoComparar2Select.value;
        const mes2 = mesComparar2Select.value;

        if (!ano1 || !mes1 || !ano2 || !mes2) {
            alert('Por favor, selecione ambos os meses e anos para comparação.');
            return;
        }

        try {
            // Busca dados para o Mês 1
            const response1 = await fetch(`${backendUrl}/producoes?ano=${ano1}&mes=${mes1}`);
            if (!response1.ok) throw new Error(`Erro ao buscar dados para ${mes1}/${ano1}`);
            const producoes1 = await response1.json();

            // Busca dados para o Mês 2
            const response2 = await fetch(`${backendUrl}/producoes?ano=${ano2}&mes=${mes2}`);
            if (!response2.ok) throw new Error(`Erro ao buscar dados para ${mes2}/${ano2}`);
            const producoes2 = await response2.json();

            // Calcula KPIs para ambos os meses
            const kpis1 = calculateKPIsForMonth(producoes1, ano1, mes1, numOperadoresPadrao);
            const kpis2 = calculateKPIsForMonth(producoes2, ano2, mes2, numOperadoresPadrao);

            renderComparativoMensal(kpis1, kpis2, `${mes1}/${ano1}`, `${mes2}/${ano2}`);

        } catch (error) {
            console.error('Erro ao comparar meses:', error);
            alert(`Erro ao carregar dados para comparação: ${error.message}`);
        }
    });

    // Função para renderizar a tabela comparativa
    function renderComparativoMensal(kpis1, kpis2, label1, label2) {
        tabelaComparativoMensal.innerHTML = ''; // Limpa a tabela

        if (!kpis1 || !kpis2) {
            tabelaComparativoMensal.innerHTML = '<tr><td colspan="3">Selecione dois meses e anos para comparar a produtividade.</td></tr>';
            headerMes1.textContent = 'Mês 1';
            headerMes2.textContent = 'Mês 2';
            return;
        }

        headerMes1.textContent = label1;
        headerMes2.textContent = label2;

        const kpiLabels = {
            metaMensal: 'Meta Mensal',
            producaoAcumulada: 'Produção Acumulada',
            saldoAcumulado: 'Saldo Acumulado',
            phdMedio: 'PHD Médio',
            diasUteisTrabalhados: 'Dias Úteis Trabalhados',
            mediaOperadoresDia: 'Média Operadores/Dia'
        };

        // Formata os valores para exibição na tabela
        function formatValue(key, value) {
            if (['metaMensal', 'producaoAcumulada', 'saldoAcumulado'].includes(key)) {
                return value.toLocaleString('pt-BR');
            } else if (['phdMedio', 'mediaOperadoresDia'].includes(key)) {
                return value.toFixed(2);
            }
            return value; // Para diasUteisTrabalhados
        }

        for (const key in kpiLabels) {
            const row = tabelaComparativoMensal.insertRow();
            row.insertCell(0).textContent = kpiLabels[key];
            const cell1 = row.insertCell(1);
            cell1.textContent = formatValue(key, kpis1[key]);
            const cell2 = row.insertCell(2);
            cell2.textContent = formatValue(key, kpis2[key]);

            // Adiciona a classe de cor para o Saldo Acumulado na tabela de relatório
            if (key === 'saldoAcumulado') {
                if (kpis1[key] > 0) cell1.classList.add('positivo');
                else if (kpis1[key] < 0) cell1.classList.add('negativo');
                if (kpis2[key] > 0) cell2.classList.add('positivo');
                else if (kpis2[key] < 0) cell2.classList.add('negativo');
            }
        }
    }

    // Função para exportar para CSV
    exportRelatorioBtn.addEventListener('click', () => {
        const table = document.getElementById('tabelaComparativoMensal');
        let csv = [];
        // Adiciona cabeçalhos (KPI, Mês 1, Mês 2)
        let headerRow = [];
        for(let i=0; i<table.rows[0].cells.length; i++) {
            headerRow.push(table.rows[0].cells[i].textContent);
        }
        csv.push(headerRow.join(';')); // Usa ponto e vírgula como separador para CSV em português

        // Adiciona os dados do corpo da tabela
        for (let i = 1; i < table.rows.length; i++) { // Começa do 1 para pular o cabeçalho
            let row = [];
            for (let j = 0; j < table.rows[i].cells.length; j++) {
                let cellText = table.rows[i].cells[j].textContent;
                // Escapa ponto e vírgula e aspas duplas dentro do texto da célula
                cellText = cellText.replace(/"/g, '""'); // Substitui " por ""
                if (cellText.includes(';') || cellText.includes('\n')) {
                    cellText = `"${cellText}"`; // Coloca entre aspas se contiver ponto e vírgula ou quebra de linha
                }
                row.push(cellText);
            }
            csv.push(row.join(';')); // Usa ponto e vírgula como separador
        }
        const csvString = csv.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'relatorio_comparativo_phd.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });


    // --- Inicialização ---
    populateMonthAndYearSelects();
    loadConfigs(); // Carrega as configurações ao iniciar
    // O fetchProducoes é chamado dentro de loadConfigs para garantir que a configuração seja carregada primeiro.
});