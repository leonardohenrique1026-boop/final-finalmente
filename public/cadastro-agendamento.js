async function buscarBarbeiro() {
  fetch("/buscar-barbeiros")
      .then((response) => {
          if (!response.ok) {
              throw new Error("Erro ao buscar barbeiros");
          }
          return response.json();
      })
      .then((barbeiros) => {
          const select = document.getElementById("barbeiroSelecionado");
          select.innerHTML = '<option value="">Selecione o Barbeiro</option>';
          barbeiros.forEach((barbeiro) => {
              const option = document.createElement("option");
              option.value = barbeiro.id;
              option.textContent = barbeiro.nome;
              select.appendChild(option);
          });
      })
      .catch((error) => {
          console.error("Erro ao carregar os barbeiros:", error);
      });
}

async function buscarServico() {
  fetch("/buscar-servicos")
      .then((response) => {
          if (!response.ok) {
              throw new Error("Erro ao buscar serviços");
          }
          return response.json();
      })
      .then((servicos) => {
          const select = document.getElementById("servicoSelecionado");
          select.innerHTML = '<option value="">Selecione o Serviço</option>';
          servicos.forEach((servico) => {
              const option = document.createElement("option");
              option.value = servico.id;
              option.textContent = servico.nome;
              select.appendChild(option);
          });
      })
      .catch((error) => {
          console.error("Erro ao carregar os serviços:", error);
      });
}

async function buscaHorariosDisponiveis() {
  const data = document.getElementById("data").value;
  const id = document.getElementById("servicoSelecionado").value;

  if (!data || !id) {
      document.getElementById("horaSelecionada").innerHTML = '<option value="">Selecione o Horário</option>';
      return;
  }

  fetch(`/horarios-disponiveis?data=${data}&id=${id}`)
      .then((response) => {
          if (!response.ok) {
              throw new Error("Erro ao buscar horários disponíveis");
          }
          return response.json();
      })
      .then((horariosDisponiveis) => {
          const selectHorario = document.getElementById("horaSelecionada");
          selectHorario.innerHTML = '<option value="">Selecione o Horário</option>';

          if (horariosDisponiveis.length > 0) {
              horariosDisponiveis.forEach((horario) => {
                  const option = document.createElement("option");
                  option.value = horario;
                  option.textContent = horario;
                  selectHorario.appendChild(option);
              });
          } else {
              alert("Não há horários disponíveis para esta data e serviço.");
          }
      })
      .catch((error) => {
          console.error("Erro ao carregar horários disponíveis:", error);
      });
}

async function cadastrarAgendamento(event) {
  event.preventDefault();

  const data = document.getElementById("data").value;
  const horario = document.getElementById("horaSelecionada").value;
  const cpf_cliente = document.getElementById("cpf_cli").value;
  const id_barbeiro = document.getElementById("barbeiroSelecionado").value;
  const id_servico = document.getElementById("servicoSelecionado").value;

  if (!data || !horario || !cpf_cliente || !id_barbeiro || !id_servico) {
      alert("Preencha todos os campos.");
      return;
  }

  try {
      const resp = await fetch("/cadastrar-agendamento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              data,
              horario,
              cpf_cliente,
              id_barbeiro,
              id_servico,
          }),
      });

      const texto = await resp.text();

      if (!resp.ok) {
          console.error("Falha no cadastro:", texto);
          alert(`Erro ao cadastrar: ${texto}`);
          return;
      }

      alert("Agendamento cadastrado com sucesso!");
      document.getElementById("filters").reset();
      document.getElementById("horaSelecionada").innerHTML = '<option value="">Selecione o Horário</option>';

      // Atualiza a lista de agendamentos após cadastro
      listarAgendamentos();
  } catch (e) {
      console.error("Erro ao cadastrar agendamento:", e);
      alert("Erro de rede ao cadastrar.");
  }
}

// Função para listar todos os agendamentos ou buscar por data (ATUALIZADA)
async function listarAgendamentos() {
  const data = document.getElementById("data").value.trim();

  let url = "/agendamentos";
  if (data) {
      url += `?date=${data}`;
  }

  try {
      const response = await fetch(url);
      const agendamentos = await response.json();

      const tabela = document.getElementById("tabela-agendamentos");
      tabela.innerHTML = "";

      if (agendamentos.length === 0) {
          tabela.innerHTML = '<tr><td colspan="7">Nenhum agendamento encontrado.</td></tr>';
      } else {
          // Carrega a lista de IDs finalizados do localStorage
          const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
          // Carrega a lista de IDs com histórico de finalização
          const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

          agendamentos.forEach(agendamento => {
              const linha = document.createElement("tr");
              linha.id = `agendamento-${agendamento.id}`;

              // Verifica se este agendamento está na lista de finalizados
              const estaFinalizado = agendamentosFinalizados.includes(agendamento.id);
              // Verifica se tem histórico de finalização
              const temHistorico = agendamentosComHistorico.includes(agendamento.id);

              if (estaFinalizado) {
                  linha.style.display = 'none';
              }

              linha.innerHTML = `
                  <td>${agendamento.id}</td>
                  <td>${agendamento.data}</td>
                  <td>${agendamento.horario}</td>
                  <td>${agendamento.cliente_nome || agendamento.cpf_cliente}</td>
                  <td>${agendamento.barbeiro_nome || agendamento.id_barbeiro}</td>
                  <td>${agendamento.servico_nome || agendamento.id_servico}</td>
                  <td>
                      <button type="button" class="btn-finalizar" onclick="finalizarAgendamento(${agendamento.id})">
                          <i class="fas ${estaFinalizado ? 'fa-undo' : 'fa-check'}"></i> ${estaFinalizado ? 'Reabrir' : 'Finalizar'}
                      </button>
                      <button type="button" class="btn-excluir" onclick="excluirAgendamento(${agendamento.id})">
                          <i class="fas fa-trash"></i> Excluir
                      </button>
                  </td>
              `;

              // Aplica a cor do botão baseado no estado e histórico
              const btnFinalizar = linha.querySelector('.btn-finalizar');
              if (estaFinalizado) {
                  // Se está finalizado - Amarelo
                  btnFinalizar.style.backgroundColor = '#ffc107';
                  btnFinalizar.style.color = '#000';
              } else if (temHistorico) {
                  // Se tem histórico mas está reaberto - Azul
                  btnFinalizar.style.backgroundColor = '#17a2b8';
                  btnFinalizar.style.color = '#fff';
              } else {
                  // Se nunca foi finalizado - Verde
                  btnFinalizar.style.backgroundColor = '#28a745';
                  btnFinalizar.style.color = '#fff';
              }

              tabela.appendChild(linha);
          });
      }
  } catch (error) {
      console.error("Erro ao listar agendamentos:", error);
  }
}

// Função para excluir agendamento (ATUALIZADA)
async function excluirAgendamento(id) {
  if (!confirm("Tem certeza que deseja excluir este agendamento?")) {
      return;
  }

  try {
      const resp = await fetch(`/excluir-agendamento/${id}`, {
          method: "DELETE",
      });

      if (!resp.ok) {
          const texto = await resp.text();
          console.error("Falha na exclusão:", texto);
          alert(`Erro ao excluir: ${texto}`);
          return;
      }

      // Remove o ID de todas as listas
      const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
      const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

      const novaListaFinalizados = agendamentosFinalizados.filter(agendamentoId => agendamentoId !== id);
      const novaListaHistorico = agendamentosComHistorico.filter(agendamentoId => agendamentoId !== id);

      localStorage.setItem('agendamentosFinalizados', JSON.stringify(novaListaFinalizados));
      localStorage.setItem('agendamentosComHistorico', JSON.stringify(novaListaHistorico));

      alert("Agendamento excluído com sucesso!");
      listarAgendamentos(); // Atualiza a lista após exclusão
  } catch (e) {
      console.error("Erro ao excluir agendamento:", e);
      alert("Erro de rede ao excluir.");
  }
}

// Função para finalizar/reabrir um agendamento
function finalizarAgendamento(id) {
  const linha = document.getElementById(`agendamento-${id}`);
  const btnFinalizar = linha.querySelector('.btn-finalizar');

  // Carrega as listas
  const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
  const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

  if (linha.style.display === 'none') {
      // Reabrir agendamento - Remove da lista de finalizados
      linha.style.display = 'table-row';
      btnFinalizar.innerHTML = '<i class="fas fa-check"></i> Finalizar';

      // Muda para cor azul (tem histórico)
      btnFinalizar.style.backgroundColor = '#17a2b8';
      btnFinalizar.style.color = '#fff';

      const novaListaFinalizados = agendamentosFinalizados.filter(agendamentoId => agendamentoId !== id);
      localStorage.setItem('agendamentosFinalizados', JSON.stringify(novaListaFinalizados));
  } else {
      // Finalizar agendamento - Adiciona à lista de finalizados
      linha.style.display = 'none';
      btnFinalizar.innerHTML = '<i class="fas fa-undo"></i> Reabrir';
      btnFinalizar.style.backgroundColor = '#ffc107';
      btnFinalizar.style.color = '#000';

      if (!agendamentosFinalizados.includes(id)) {
          agendamentosFinalizados.push(id);
          localStorage.setItem('agendamentosFinalizados', JSON.stringify(agendamentosFinalizados));
      }

      // Adiciona ao histórico se não estiver lá
      if (!agendamentosComHistorico.includes(id)) {
          agendamentosComHistorico.push(id);
          localStorage.setItem('agendamentosComHistorico', JSON.stringify(agendamentosComHistorico));
      }
  }
}

// Função para reabrir todos os agendamentos finalizados
function reabrirTodosAgendamentos() {
  // Carrega a lista atual de finalizados
  const agendamentosFinalizados = JSON.parse(localStorage.getItem('agendamentosFinalizados') || '[]');
  const agendamentosComHistorico = JSON.parse(localStorage.getItem('agendamentosComHistorico') || '[]');

  // Adiciona todos os finalizados ao histórico
  agendamentosFinalizados.forEach(id => {
      if (!agendamentosComHistorico.includes(id)) {
          agendamentosComHistorico.push(id);
      }
  });

  // Salva o histórico atualizado
  localStorage.setItem('agendamentosComHistorico', JSON.stringify(agendamentosComHistorico));

  // Limpa a lista de finalizados
  localStorage.setItem('agendamentosFinalizados', JSON.stringify([]));

  // Recarrega a lista
  listarAgendamentos();
}

// Função para buscar clientes por CPF (com sugestões)
async function buscarClientes(cpfParcial) {
    if (cpfParcial.length < 3) {
        document.getElementById('cpfClientes').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/clientes?cpf=${cpfParcial}`);
        const clientes = await response.json();

        const datalist = document.getElementById('cpfClientes');
        datalist.innerHTML = '';

        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.cpf;
            option.textContent = `${cliente.cpf} - ${cliente.nome}`;
            datalist.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
    }
}

// Função para preencher automaticamente os dados do cliente quando o CPF for selecionado
async function preencherDadosCliente(cpf) {
    if (!cpf) return;

    try {
        const response = await fetch(`/clientes?cpf=${cpf}`);
        const clientes = await response.json();

        if (clientes.length > 0) {
            const cliente = clientes[0];
            console.log('Cliente encontrado:', cliente.nome);
            // Você pode adicionar aqui alguma lógica adicional se necessário
        }
    } catch (error) {
        console.error('Erro ao buscar dados do cliente:', error);
    }
}

// Adiciona evento para preencher dados quando um CPF for selecionado
document.addEventListener('DOMContentLoaded', function() {
    const cpfInput = document.getElementById('cpf_cli');
    if (cpfInput) {
        cpfInput.addEventListener('change', function() {
            preencherDadosCliente(this.value);
        });
    }

    // Carregar barbeiros e serviços ao carregar a página
    buscarBarbeiro();
    buscarServico();
    listarAgendamentos();
});