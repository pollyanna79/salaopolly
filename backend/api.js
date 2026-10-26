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

app.get('/detalhe_agendamento', (req, res) => {
    const busca = String(req.query.busca || req.query.Nome || req.query.nome || req.query.email || '').trim();
    if (!busca) return res.status(400).json({ erro: 'Informe seu nome ou e-mail.' });

    const pareceEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(busca);
    if (busca.includes('@') && !pareceEmail) {
        return res.status(400).json({ erro: 'Informe um e-mail válido ou seu nome.' });
    }

    const nomeBusca = `%${busca.replace(/[\\%_]/g, '\\$&')}%`;
    const sql = `
        SELECT reservas.*
        FROM mydb.detalhe_agendamento AS reservas
        INNER JOIN mydb.tbl_clientes AS clientes
            ON clientes.idclientes = reservas.Cod
        WHERE LOWER(TRIM(clientes.email)) = LOWER(TRIM(?))
           OR LOWER(TRIM(clientes.cliente_nome)) LIKE LOWER(?)
    `;

    db.query({ sql, timeout: 10000 }, [busca, nomeBusca], (err, resultados) => {
        if (err) {
            console.error('Erro ao consultar agendamentos:', err);
            const tempoEsgotado = err.code === 'PROTOCOL_SEQUENCE_TIMEOUT';
            return res.status(tempoEsgotado ? 504 : 500).json({
                erro: tempoEsgotado
                    ? 'A consulta demorou mais que o esperado. Tente novamente.'
                    : 'Não foi possível consultar as reservas.'
            });
        }
        res.json(resultados);
    });
});

const cidadesAtendidas = new Set([
    'maua',
    'santo andre',
    'sao bernardo do campo',
    'diadema',
    'ribeirao pires',
    'sao caetano do sul'
]);

function normalizarTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function cidadeAtendida(cidadeInformada, cidadeCep) {
    const cidadeDigitada = normalizarTexto(cidadeInformada);
    const municipioCep = normalizarTexto(cidadeCep);

    if (cidadeDigitada === 'capuava') {
        return municipioCep === 'maua' || municipioCep === 'santo andre';
    }

    const cidadeCanonica = cidadeDigitada === 'sao bernardo'
        || cidadeDigitada === 'sao bernado'
        || cidadeDigitada === 'sao bernado do campo'
        ? 'sao bernardo do campo'
        : cidadeDigitada === 'sao caetano'
            ? 'sao caetano do sul'
            : cidadeDigitada;

    return cidadesAtendidas.has(cidadeCanonica) && cidadeCanonica === municipioCep;
}

async function validarCepCidade(cep, cidade) {
    if (!/^\d{8}$/.test(cep)) {
        return { valido: false, status: 400, erro: 'Informe um CEP válido com 8 números.' };
    }

    let resposta;
    try {
        resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            signal: AbortSignal.timeout(5000)
        });
    } catch (erro) {
        console.error('Não foi possível validar o CEP no ViaCEP:', erro);
        return {
            valido: false,
            status: 503,
            erro: 'Não foi possível validar seu CEP agora. Tente novamente em instantes.'
        };
    }

    if (!resposta.ok) {
        return {
            valido: false,
            status: 503,
            erro: 'Não foi possível validar seu CEP agora. Tente novamente em instantes.'
        };
    }

    let endereco;
    try {
        endereco = await resposta.json();
    } catch (erro) {
        console.error('Resposta inválida ao validar CEP no ViaCEP:', erro);
        return {
            valido: false,
            status: 503,
            erro: 'Não foi possível validar seu CEP agora. Tente novamente em instantes.'
        };
    }
    if (endereco.erro || !endereco.localidade || !endereco.uf) {
        return { valido: false, status: 400, erro: 'CEP não encontrado. Confira os números informados.' };
    }

    if (endereco.uf !== 'SP' || !cidadeAtendida(cidade, endereco.localidade)) {
        return {
            valido: false,
            status: 400,
            erro: 'Sentimos muito, mas não podemos te atender devido à distância 😔. Atendemos Mauá, Santo André, Capuava, São Bernardo do Campo, Diadema, Ribeirão Pires e São Caetano do Sul. Confira se a cidade e o CEP estão corretos.'
        };
    }

    return { valido: true, cidade: endereco.localidade };
}

app.post('/tbl_clientes', async (req, res) => {
    let { cliente_nome, telefone, email, endereco, cpf, cidade, cep, id_servico, data_agenda } = req.body;

    cliente_nome = String(cliente_nome || '').trim();
    email = String(email || '').trim();
    cidade = String(cidade || '').trim();
    cep = String(cep || '').replace(/\D/g, '');

    if (!cliente_nome || !telefone || !email || !endereco || !cpf || !cidade || !cep || !Number.isInteger(Number(id_servico)) || !data_agenda) {
        return res.status(400).json({ status: 'erro', erro: 'Preencha todos os dados da reserva.' });
    }

    if (!/^[\p{L}][\p{L}\p{M}\s'.-]{1,99}$/u.test(cliente_nome) || cliente_nome.trim().split(/\s+/).length < 2) {
        return res.status(400).json({ status: 'erro', erro: 'Informe seu nome completo usando pelo menos nome e sobrenome.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ status: 'erro', erro: 'Informe um endereço de e-mail válido.' });
    }

    const validacaoEndereco = await validarCepCidade(cep, cidade);
    if (!validacaoEndereco.valido) {
        return res.status(validacaoEndereco.status).json({ status: 'erro', erro: validacaoEndereco.erro });
    }
    cidade = validacaoEndereco.cidade;

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