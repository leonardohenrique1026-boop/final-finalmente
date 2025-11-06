const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = process.env.PORT || 5000;

// Serve os arquivos estáticos da pasta "public"
const path = require("path");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

// Configura o body-parser para ler JSON
app.use(bodyParser.json());

// Conexão com o banco de dados SQLite
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erro ao conectar ao banco de dados:", err.message);
    } else {
        console.log("Conectado ao banco de dados SQLite.");
    }
});

// Criação das tabelas
db.serialize(() => {
    // Tabela de barbeiros
    db.run(`
        CREATE TABLE IF NOT EXISTS barbeiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            telefone TEXT,
            especialidade TEXT,
            endereco TEXT,
            cargo TEXT NOT NULL CHECK (cargo IN ('Barbeiro', 'Cabeleireiro', 'Recepcionista', 'Gerente', 'Outro')) DEFAULT 'Barbeiro'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT NOT NULL UNIQUE,
            email TEXT,
            telefone TEXT,
            endereco TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            preco TEXT NOT NULL,
            duracao TEXT,
            descricao TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data DATE NOT NULL,
            horario TIME NOT NULL,
            cpf_cliente VARCHAR(11) NOT NULL,
            id_barbeiro INTEGER NOT NULL,
            id_servico INTEGER NOT NULL,
            FOREIGN KEY (cpf_cliente) REFERENCES clientes (cpf),
            FOREIGN KEY (id_barbeiro) REFERENCES barbeiros (id),
            FOREIGN KEY (id_servico) REFERENCES servicos (id)
        )
    `);

    // Inserir usuário admin padrão na tabela de barbeiros
    db.get("SELECT COUNT(*) as count FROM barbeiros WHERE cargo = 'Gerente'", (err, row) => {
        if (err) {
            console.error("Erro ao verificar barbeiros:", err);
            return;
        }

        if (row.count === 0) {
            db.run(`
                INSERT INTO barbeiros (nome, cpf, email, telefone, cargo) 
                VALUES ('Administrador do Sistema', '12345678900', 'admin@sistema.com', '(00) 00000-0000', 'Gerente')
            `, function(err) {
                if (err) {
                    console.error("Erro ao inserir admin padrão:", err);
                } else {
                    console.log("Usuário admin padrão criado: CPF 12345678900");
                }
            });
        }
    });

    console.log("Tabelas criadas com sucesso.");
});

// Rota de teste para verificar se o servidor está funcionando
app.get("/test", (req, res) => {
    res.json({ message: "Servidor funcionando!" });
});

// Login de barbeiro (nome e CPF)
app.post("/login-barbeiro", (req, res) => {
    const { nome, cpf } = req.body;

    if (!nome || !cpf) {
        return res.status(400).json({ 
            success: false, 
            message: "Nome e CPF são obrigatórios." 
        });
    }

    if (cpf.length !== 11) {
        return res.status(400).json({ 
            success: false, 
            message: "CPF deve conter 11 números." 
        });
    }

    const query = `SELECT * FROM barbeiros WHERE cpf = ? AND nome LIKE ?`;
    db.get(query, [cpf, `%${nome}%`], (err, barbeiro) => {
        if (err) {
            console.error("Erro ao buscar barbeiro:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Erro interno do servidor." 
            });
        }

        if (barbeiro) {
            return res.json({
                success: true,
                user: {
                    id: barbeiro.id,
                    nome: barbeiro.nome,
                    cpf: barbeiro.cpf,
                    cargo: barbeiro.cargo,
                    email: barbeiro.email,
                    telefone: barbeiro.telefone,
                    especialidade: barbeiro.especialidade,
                    endereco: barbeiro.endereco
                }
            });
        }

        res.status(401).json({
            success: false,
            message: "Nome ou CPF incorretos."
        });
    });
});

// Cadastrar barbeiro
app.post("/barbeiros", (req, res) => {
    const { nome, cpf, email, telefone, especialidade, endereco, cargo } = req.body;

    if (!nome || !cpf) {
        return res.status(400).send("Nome e CPF são obrigatórios.");
    }

    const query = `INSERT INTO barbeiros (nome, cpf, email, telefone, especialidade, endereco, cargo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(
        query,
        [nome, cpf, email, telefone, especialidade, endereco, cargo || 'Barbeiro'],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).send("CPF já cadastrado no sistema.");
                }
                return res.status(500).send("Erro ao cadastrar barbeiro.");
            }
            res.status(201).send({
                id: this.lastID,
                message: "Barbeiro cadastrado com sucesso.",
            });
        },
    );
});

// Listar barbeiros
app.get("/barbeiros", (req, res) => {
    const cpf = req.query.cpf || "";

    if (cpf) {
        const query = `SELECT * FROM barbeiros WHERE cpf LIKE ? ORDER BY id DESC`;
        db.all(query, [`%${cpf}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar barbeiros." });
            }
            res.json(rows);
        });
    } else {
        const query = `SELECT * FROM barbeiros ORDER BY id DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar barbeiros." });
            }
            res.json(rows);
        });
    }
});

// Buscar barbeiros para agendamentos
app.get("/buscar-barbeiros", (req, res) => {
    const query = `SELECT * FROM barbeiros WHERE cargo IN ('Barbeiro', 'Cabeleireiro') ORDER BY nome`;
    db.all(query, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar barbeiros." });
        }
        res.json(rows);
    });
});

// Listar serviços
app.get("/servicos", (req, res) => {
    const nome = req.query.nome || "";

    if (nome) {
        const query = `SELECT * FROM servicos WHERE nome LIKE ? ORDER BY id DESC`;
        db.all(query, [`%${nome}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar serviços." });
            }
            res.json(rows);
        });
    } else {
        const query = `SELECT * FROM servicos ORDER BY id DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar serviços." });
            }
            res.json(rows);
        });
    }
});

// Atualizar serviço
app.put("/servicos/nome/:nome", (req, res) => {
    const nomeOriginal = req.params.nome;
    const { nome, preco, duracao, descricao } = req.body;

    if (!nome || !preco) {
        return res.status(400).send("Nome e preço são obrigatórios.");
    }

    const query = `UPDATE servicos SET nome = ?, preco = ?, duracao = ?, descricao = ? WHERE nome = ?`;
    db.run(query, [nome, preco, duracao, descricao, nomeOriginal], function(err) {
        if (err) {
            console.error("Erro ao atualizar serviço:", err);
            return res.status(500).send("Erro ao atualizar serviço.");
        }

        if (this.changes === 0) {
            return res.status(404).send("Serviço não encontrado.");
        }

        res.send("Serviço atualizado com sucesso.");
    });
});

// Buscar serviços
app.get("/buscar-servicos", (req, res) => {
    const query = `SELECT * FROM servicos ORDER BY nome`;
    db.all(query, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar serviços." });
        }
        res.json(rows);
    });
});

// Buscar clientes
app.get("/clientes", (req, res) => {
    const cpf = req.query.cpf || "";

    if (cpf) {
        const query = `SELECT * FROM clientes WHERE cpf LIKE ? ORDER BY nome`;
        db.all(query, [`%${cpf}%`], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar clientes." });
            }
            res.json(rows);
        });
    } else {
        const query = `SELECT * FROM clientes ORDER BY nome`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar clientes." });
            }
            res.json(rows);
        });
    }
});

// Buscar horários disponíveis
app.get("/horarios-disponiveis", (req, res) => {
    const { data, id } = req.query;

    if (!data || !id) {
        return res.status(400).json({ message: "Data e ID do serviço são obrigatórios." });
    }

    const query = `SELECT horario FROM agendamentos WHERE data = ? AND id_servico = ?`;
    db.all(query, [data, id], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Erro ao buscar horários." });
        }

        const horariosOcupados = rows.map(row => row.horario);
        const todosHorarios = [];

        for (let hora = 8; hora <= 18; hora++) {
            for (let minuto = 0; minuto < 60; minuto += 30) {
                const horario = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
                if (!horariosOcupados.includes(horario)) {
                    todosHorarios.push(horario);
                }
            }
        }

        res.json(todosHorarios);
    });
});

// Cadastrar agendamento
app.post("/cadastrar-agendamento", (req, res) => {
    const { data, horario, cpf_cliente, id_barbeiro, id_servico } = req.body;

    if (!data || !horario || !cpf_cliente || !id_barbeiro || !id_servico) {
        return res.status(400).send("Todos os campos são obrigatórios.");
    }

    const verificaBarbeiroQuery = `SELECT cargo FROM barbeiros WHERE id = ? AND cargo IN ('Barbeiro', 'Cabeleireiro')`;
    db.get(verificaBarbeiroQuery, [id_barbeiro], (err, barbeiro) => {
        if (err) {
            console.error("Erro ao verificar barbeiro:", err);
            return res.status(500).send("Erro interno do servidor.");
        }

        if (!barbeiro) {
            return res.status(400).send("Barbeiro selecionado não está autorizado a realizar serviços.");
        }

        const verificaHorarioQuery = `SELECT * FROM agendamentos WHERE data = ? AND horario = ? AND id_barbeiro = ?`;
        db.get(verificaHorarioQuery, [data, horario, id_barbeiro], (err, agendamentoExistente) => {
            if (err) {
                console.error("Erro ao verificar horário:", err);
                return res.status(500).send("Erro interno do servidor.");
            }

            if (agendamentoExistente) {
                return res.status(400).send("Já existe um agendamento para este barbeiro no horário selecionado.");
            }

            const query = `INSERT INTO agendamentos (data, horario, cpf_cliente, id_barbeiro, id_servico) VALUES (?, ?, ?, ?, ?)`;
            db.run(query, [data, horario, cpf_cliente, id_barbeiro, id_servico], function(err) {
                if (err) {
                    console.error("Erro ao cadastrar agendamento:", err);
                    return res.status(500).send("Erro ao cadastrar agendamento.");
                }
                res.status(201).send("Agendamento cadastrado com sucesso.");
            });
        });
    });
});

// Listar agendamentos
app.get("/agendamentos", (req, res) => {
    const date = req.query.date;

    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
    `;

    if (date) {
        query += ` WHERE a.data = ? ORDER BY a.horario`;
        db.all(query, [date], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar agendamentos." });
            }
            res.json(rows);
        });
    } else {
        query += ` ORDER BY a.data DESC, a.horario DESC`;
        db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Erro ao buscar agendamentos." });
            }
            res.json(rows);
        });
    }
});

// ROTA CORRIGIDA - RELATÓRIO FINANCEIRO
app.get("/relatorio-financeiro", (req, res) => {
    console.log("Rota /relatorio-financeiro chamada com sucesso!");

    const { cpf_cliente, servico, dataInicio, dataFim } = req.query;
    console.log("Parâmetros:", { cpf_cliente, servico, dataInicio, dataFim });

    let query = `
        SELECT 
            a.id,
            a.data,
            a.horario,
            a.cpf_cliente,
            c.nome as cliente_nome,
            a.id_barbeiro,
            b.nome as barbeiro_nome,
            a.id_servico,
            s.nome as servico_nome,
            s.preco as servico_preco
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cpf_cliente = c.cpf
        LEFT JOIN barbeiros b ON a.id_barbeiro = b.id
        LEFT JOIN servicos s ON a.id_servico = s.id
        WHERE 1=1
    `;

    const params = [];

    if (cpf_cliente && cpf_cliente.trim() !== '') {
        query += ` AND a.cpf_cliente LIKE ?`;
        params.push(`%${cpf_cliente}%`);
    }

    if (servico && servico.trim() !== '') {
        query += ` AND s.nome LIKE ?`;
        params.push(`%${servico}%`);
    }

    if (dataInicio && dataInicio.trim() !== '') {
        query += ` AND a.data >= ?`;
        params.push(dataInicio);
    }

    if (dataFim && dataFim.trim() !== '') {
        query += ` AND a.data <= ?`;
        params.push(dataFim);
    }

    query += ` ORDER BY a.data DESC, a.horario DESC`;

    console.log("Query SQL:", query);
    console.log("Parâmetros SQL:", params);

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro na consulta:", err);
            return res.status(500).json({ 
                success: false,
                message: "Erro no banco de dados",
                error: err.message 
            });
        }

        console.log(`Consulta retornou ${rows.length} registros`);
        res.json(rows);
    });
});

// Excluir agendamento
app.delete("/excluir-agendamento/:id", (req, res) => {
    const id = req.params.id;
    const query = `DELETE FROM agendamentos WHERE id = ?`;

    db.run(query, [id], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao excluir agendamento.");
        }

        if (this.changes === 0) {
            return res.status(404).send("Agendamento não encontrado.");
        }

        res.send("Agendamento excluído com sucesso.");
    });
});

// Cadastrar cliente
app.post("/clientes", (req, res) => {
    const { nome, cpf, email, telefone, endereco } = req.body;

    if (!nome || !cpf) {
        return res.status(400).send("Nome e CPF são obrigatórios.");
    }

    const query = `INSERT INTO clientes (nome, cpf, email, telefone, endereco) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [nome, cpf, email, telefone, endereco], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).send("CPF já cadastrado no sistema.");
            }
            return res.status(500).send("Erro ao cadastrar cliente.");
        }
        res.status(201).send({
            id: this.lastID,
            message: "Cliente cadastrado com sucesso.",
        });
    });
});

// Cadastrar serviço
app.post("/servicos", (req, res) => {
    const { nome, preco, duracao, descricao } = req.body;

    if (!nome || !preco) {
        return res.status(400).send("Nome e preço são obrigatórios.");
    }

    const query = `INSERT INTO servicos (nome, preco, duracao, descricao) VALUES (?, ?, ?, ?)`;
    db.run(query, [nome, preco, duracao, descricao], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).send("Serviço já cadastrado no sistema.");
            }
            return res.status(500).send("Erro ao cadastrar serviço.");
        }
        res.status(201).send({
            id: this.lastID,
            message: "Serviço cadastrado com sucesso.",
        });
    });
});

// Rota padrão
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Iniciar servidor
app.listen(port, "0.0.0.0", () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Rotas disponíveis:`);
    console.log(`- GET  /test (teste do servidor)`);
    console.log(`- GET  /relatorio-financeiro (relatório financeiro)`);
    console.log(`- GET  /agendamentos`);
    console.log(`- GET  /clientes`);
    console.log(`- GET  /servicos`);
    console.log(`- GET  /barbeiros`);
});