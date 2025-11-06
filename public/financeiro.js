// Função para carregar clientes
function carregarClientes() {
    fetch('/clientes')
        .then(response => response.json())
        .then(clientes => {
            const datalist = document.getElementById('clientes-list');
            datalist.innerHTML = '';
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.cpf;
                option.textContent = `${cliente.nome} - ${cliente.cpf}`;
                datalist.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar clientes:', error));
}

// Função para carregar serviços
function carregarServicos() {
    fetch('/servicos')
        .then(response => response.json())
        .then(servicos => {
            const select = document.getElementById('servico');
            select.innerHTML = '<option value="">Todos os serviços</option>';
            servicos.forEach(servico => {
                const option = document.createElement('option');
                option.value = servico.nome;
                option.textContent = servico.nome;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Erro ao carregar serviços:', error));
}

// Função para formatar valor em Real
function formatarReal(valor) {
    if (!valor || isNaN(valor)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// Função para buscar relatório
function buscarAgendamentos() {
    const cpf = document.getElementById("cpf").value;
    const servico = document.getElementById("servico").value;
    const dataInicio = document.getElementById("dataInicio").value;
    const dataFim = document.getElementById("dataFim").value;

    let url = `/relatorio-financeiro?`;
    if (cpf) url += `cpf_cliente=${cpf}&`;
    if (servico) url += `servico=${servico}&`;
    if (dataInicio) url += `dataInicio=${dataInicio}&`;
    if (dataFim) url += `dataFim=${dataFim}&`;

    url = url.replace(/[&?]$/, '');

    console.log("Buscando em:", url);

    const tabela = document.getElementById("tabela-agendamentos");
    tabela.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Erro ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log("Dados recebidos:", data);
            renderizarTabela(data);
            calcularResumo(data);
        })
        .catch(error => {
            console.error('Erro:', error);
            tabela.innerHTML = `<tr><td colspan="5">Erro: ${error.message}</td></tr>`;
        });
}

// Função para renderizar tabela
function renderizarTabela(data) {
    const tabela = document.getElementById("tabela-agendamentos");
    tabela.innerHTML = '';

    if (!data || data.length === 0) {
        tabela.innerHTML = '<tr><td colspan="5">Nenhum agendamento encontrado.</td></tr>';
        return;
    }

    data.forEach(agendamento => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${agendamento.id || '—'}</td>
            <td>${agendamento.cliente_nome || '—'} (${agendamento.cpf_cliente || '—'})</td>
            <td>${agendamento.servico_nome || '—'}</td>
            <td>${formatarReal(agendamento.servico_preco)}</td>
            <td>${agendamento.data ? new Date(agendamento.data).toLocaleDateString('pt-BR') : '—'}</td>
        `;
        tabela.appendChild(tr);
    });
}

// Função para calcular resumo
function calcularResumo(data) {
    let totalFiltrado = 0;
    let totalHoje = 0;
    const hoje = new Date().toISOString().split('T')[0];
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    data.forEach(agendamento => {
        const preco = parseFloat(agendamento.servico_preco) || 0;
        totalFiltrado += preco;

        if (agendamento.data === hoje) {
            totalHoje += preco;
        }
    });

    document.getElementById('total-filtrado').textContent = formatarReal(totalFiltrado);
    document.getElementById('total-hoje').textContent = formatarReal(totalHoje);
    document.getElementById('total-mes').textContent = formatarReal(totalFiltrado);
    document.getElementById('total-ano').textContent = formatarReal(totalFiltrado);
}

// Função para limpar filtros
function limparFiltros() {
    document.getElementById("cpf").value = '';
    document.getElementById("servico").value = '';
    document.getElementById("dataInicio").value = '';
    document.getElementById("dataFim").value = '';
    buscarAgendamentos();
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando página financeiro...");

    carregarClientes();
    carregarServicos();

    // Buscar dados iniciais
    setTimeout(() => {
        buscarAgendamentos();
    }, 1000);

    // Adicionar botão limpar
    const filtersDiv = document.querySelector('.filters');
    const limparBtn = document.createElement('button');
    limparBtn.type = 'button';
    limparBtn.textContent = 'Limpar';
    limparBtn.className = 'alinhaBtns';
    limparBtn.style.background = '#6c757d';
    limparBtn.onclick = limparFiltros;
    filtersDiv.appendChild(limparBtn);
});