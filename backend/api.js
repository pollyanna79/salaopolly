const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares para aceitar JSON e conexões externas
app.use(cors());
app.use(express.json());

// 1. Criando a ponte (conexão) com o MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME 
});

// Testando a conexão com o banco
db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados MySQL:', err);
        return;
    }
    console.log('Conectado ao MySQL com sucesso!');
});

// Rota inicial de teste
app.get('/detalhe_agendamento', (req, res) => {
    const nome = String(req.query.nome || '').trim();
    if (!nome) return res.status(400).json({ erro: 'Informe o nome do cliente.' });

    db.query(
        'SELECT * FROM detalhe_agendamento WHERE LOWER(cliente_nome) LIKE LOWER(?)',
        [`%${nome}%`],
        (err, resultados) => {
            if (err) {
              
                return res.status(500).json({ erro: 'Erro ao consultar reservas.' });
            }
            res.json(resultados);
        }
    );
});
app.post('/tbl_clientes', (req, res) => {
    let { cliente_nome, telefone, email, endereco, cpf, cidade, cep, id_servico, data_agenda } = req.body;
    
    if (!cliente_nome || !telefone || !email || !endereco || !cpf || !cidade || !cep || !Number.isInteger(Number(id_servico)) || !data_agenda) {
        return res.status(400).json({ status: 'erro', erro: 'Preencha todos os dados da reserva.' });
    }

    // Se a data vier no formato HTML datetime-local ou com 'T' (ex: "2026-08-21T14:00"), 
    // nós substituímos o 'T' por espaço para o MySQL aceitar no tipo DATETIME.
    if (data_agenda.includes('T')) {
        data_agenda = data_agenda.replace('T', ' ');
        if (data_agenda.length === 16) {
            data_agenda += ':00'; // Adiciona os segundos se não vierem
        }
    } 
    // Se o front-end mandar apenas a data sem horário (ex: "2026-08-21"), colocamos 10:00 como segurança
    else if (data_agenda.length === 10) {
        data_agenda += " 10:00:00"; 
    }

    const sqlCliente = `
        INSERT INTO tbl_clientes (cliente_nome, telefone, email, endereco, cpf, cidade, cep) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.beginTransaction((transactionError) => {
        if (transactionError) {
            return res.status(500).json({ status: 'erro', erro: 'Não foi possível iniciar a reserva.' });
        }

        db.query(sqlCliente, [cliente_nome, telefone, email, endereco, cpf, cidade, cep], (err, resultadoCliente) => {
            if (err) {
                console.error('Erro ao salvar cliente:', err);
                return db.rollback(() => {
                    res.status(500).json({ status: 'erro', erro: 'Erro ao cadastrar cliente no banco.' });
                });
            }

            const idCliente = resultadoCliente.insertId;

          const sqlAgenda = `
                INSERT INTO agenda_cliente (data_agenda, id_servico, id_cliente) 
                VALUES (?, ?, ?)
            `;

            db.query(sqlAgenda, [data_agenda, Number(id_servico), idCliente], (err, resultadoAgenda) => {
                if (err) {
                    console.error('Erro ao salvar agenda:', err);
                    return db.rollback(() => {
                        res.status(500).json({ status: 'erro', erro: 'Erro ao salvar a reserva na agenda.' });
                    });
                }

                db.commit((commitError) => {
                    if (commitError) {
                        return db.rollback(() => {
                            res.status(500).json({ status: 'erro', erro: 'Erro ao concluir a reserva.' });
                        });
                    }
                    res.status(201).json({ 
                        status: 'sucesso', 
                        mensagem: 'Cliente cadastrado e horário agendado com sucesso!' 
                    });
                });
            });
        });
    });
});
const porta = Number(process.env.PORT) || 3000;
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});