async function cadastrarServico(event) {
    event.preventDefault();

    const servico = {
        nome: document.getElementById("nome").value,
        preco: document.getElementById("preco").value,
        duracao: document.getElementById("duracao").value,
        descricao: document.getElementById("descricao").value
    };

    // Validação básica
    if (!servico.nome || !servico.preco) {
        alert("Nome e preço são obrigatórios!");
        return;
    }

    try {
        const response = await fetch('/servicos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(servico)
        });

        if (response.ok) {
            alert("Serviço cadastrado com sucesso!");
            document.getElementById("cliente-form").reset();
            listarServicos(); // Atualiza a lista após cadastro
        } else {
            const errorMessage = await response.text();
            alert(`Erro: ${errorMessage}`);
        }
    } catch (err) {
        console.error("Erro na solicitação:", err);
        alert("Erro ao cadastrar Serviço.");
    }
}

// Função para listar todos os serviços ou buscar serviços por nome
async function listarServicos() {
    const nome = document.getElementById('nome').value.trim();

    let url = '/servicos';

    if (nome) {
        url += `?nome=${encodeURIComponent(nome)}`;
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const servicos = await response.json();
        const tabela = document.getElementById('tabela-clientes');
        tabela.innerHTML = '';

        if (servicos.length === 0) {
            tabela.innerHTML = '<tr><td colspan="5">Nenhum serviço encontrado.</td></tr>';
        } else {
            servicos.forEach(servico => {
                const linha = document.createElement('tr');
                linha.innerHTML = `
                    <td>${servico.id}</td>
                    <td>${servico.nome}</td>
                    <td>R$ ${servico.preco}</td>
                    <td>${servico.duracao || '-'}</td>
                    <td>${servico.descricao || '-'}</td>
                `;
                tabela.appendChild(linha);
            });
        }
    } catch (error) {
        console.error('Erro ao listar serviços:', error);
        alert('Erro ao carregar serviços. Verifique o console para detalhes.');
    }
}

// Função para atualizar as informações do serviço
async function atualizarServico() {
    const nome = document.getElementById('nome').value;
    const preco = document.getElementById('preco').value;
    const duracao = document.getElementById('duracao').value;
    const descricao = document.getElementById('descricao').value;

    if (!nome) {
        alert("Nome é obrigatório para atualizar o serviço.");
        return;
    }

    const servicoAtualizado = {
        nome,
        preco,
        duracao,
        descricao
    };

    try {
        const response = await fetch(`/servicos/nome/${encodeURIComponent(nome)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(servicoAtualizado)
        });

        if (response.ok) {
            alert('Serviço atualizado com sucesso!');
            listarServicos(); // Atualiza a lista após a atualização
        } else {
            const errorMessage = await response.text();
            alert('Erro ao atualizar serviço: ' + errorMessage);
        }
    } catch (error) {
        console.error('Erro ao atualizar serviço:', error);
        alert('Erro ao atualizar serviço.');
    }
}

async function limparServico() {
    document.getElementById('nome').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('duracao').value = '';
    document.getElementById('descricao').value = '';
}

// Carregar serviços quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    listarServicos();
});