document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURAÇÃO DOS CARROSSÉIS ---
    function inicializarCarrossel(idContainer) {
        const container = document.getElementById(idContainer);
        const slidesTrack = container.querySelector('.carousel-slides');
        const slides = container.querySelectorAll('.slide');
        const nextBtn = container.querySelector('.next');
        const prevBtn = container.querySelector('.prev');
   

        let agendamentoPendente = {};
        
        let indexAtual = 0;
        
        // Carrossel Automático
        let autoPlay = setInterval(() => mover(indexAtual + 1), 3000);

        function mover(index) {
            indexAtual = (index + slides.length) % slides.length;
            slidesTrack.style.transform = `translateX(-${indexAtual * 100}%)`;
        }
        // Função para travar/parar o autoplay quando o usuário escolher manualmente
        function pararAutoPlay() {
            clearInterval(autoPlay);
        }

        // Interação manual
        nextBtn.addEventListener('click', () => { 
            pararAutoPlay();
            clearInterval(autoPlay); 
            mover(indexAtual + 1); 
        });
        
        prevBtn.addEventListener('click', () => { 
            pararAutoPlay();
            clearInterval(autoPlay); 
            mover(indexAtual - 1); 
        });

        return { mover, pararAutoPlay }; // Retorna a função para o select controlar
    }

 // Inicializa carrosséis e guarda as referências
    const carrosselUnhas = inicializarCarrossel('carousel-unhas');
    const carrosselSobrancelhas = inicializarCarrossel('carousel-sobrancelhas');
     // --- 2. LÓGICA DO FORMULÁRIO DE COLETA (GLOBAL) ---
    const formColeta = document.getElementById('form-coleta-dados');
    const modalContainer = document.getElementById('modal-agendamento');
        
    // Lógica do Formulário de Coleta
    if (formColeta) {
        formColeta.addEventListener('submit', async (e) => {
            e.preventDefault();
        
        const dados = {
            cliente_nome: document.getElementById('cli-nome').value,
            telefone: document.getElementById('cli-tel').value,
            email: document.getElementById('cli-email').value,
            endereco: document.getElementById('cli-end').value,
            cpf: document.getElementById('cli-cpf').value,
            cidade: document.getElementById('cli-cidade').value,
            cep: document.getElementById('cli-cep').value,
            ...(window.agendamentoPendente || {})
        };

     try {
                const response = await fetch('http://localhost:3000/tbl_clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const res = await response.json().catch(() => ({}));

                // Considera sucesso se o status HTTP for 2xx ou se a API retornar sucesso
                if (response.ok) {
                    alert("Agendamento realizado com sucesso! Entraremos em contato em breve.");
                    
                    // Fecha o modal e limpa os campos
                    if (modalContainer) {
                        modalContainer.classList.add('hidden');
                        modalContainer.setAttribute('aria-hidden', 'true');
                    }
                    formColeta.reset();
                    window.agendamentoPendente = null;

                    // Opcional: recarrega após fechar para resetar os estados da tela
                    setTimeout(() => location.reload(), 500);
                } else {
                    alert("Erro: " + (res.erro || "Falha ao salvar dados no servidor."));
                }
            } catch (err) {
                console.error(err);
                alert("Erro de conexão com o servidor. Verifique se a API está rodando.");
            }
        });
    }
   
   

    // --- 2. LÓGICA DE AGENDAMENTO ---
    function configurarAgendamento(idSelect, idAgendamentoCont, idData, idHorarios, idBtnConfirmar, carrosselObj) {
        const selectServico = document.getElementById(idSelect);
        const containerAgendamento = document.getElementById(idAgendamentoCont);
        const inputData = document.getElementById(idData);
        const gridHorarios = document.getElementById(idHorarios);
        const btnConfirmar = document.getElementById(idBtnConfirmar);
        
        // Mapeamento de serviço para índice do slide
     const mapaIndices = {
    "decorada": 0,
    "peemao": 1,
    "pedicure": 2,
    "mao": 3,
    "unhadegel": 4,
    "unhadefibra": 5,
    "unhaacrilico": 6,
    "design": 0, // Ajuste conforme a seção de sobrancelhas se necessário
    "henna": 1,
    "microblading": 2,
    "sobrancelha-fio-a-fio": 3
};
        // Limitar datas em 1 mes
        const hoje = new Date();
        const dataMaxima = new Date();
        dataMaxima.setMonth(hoje.getMonth() + 1);
        inputData.setAttribute('min', hoje.toISOString().split('T')[0]);
        inputData.setAttribute('max', dataMaxima.toISOString().split('T')[0]);

        selectServico.addEventListener('change', (e) => {
            // Mostra galeria e para o automático no slide correspondente
            const opcaoSelecionada = e.target.options[e.target.selectedIndex];
    const chave = opcaoSelecionada.getAttribute('data-chave');
            // Move o carrossel para o índice correspondente
    if(carrosselObj) {
        carrosselObj.pararAutoPlay();
        carrosselObj.mover(mapaIndices[chave] || 0);
    }
    
    containerAgendamento.classList.remove('hidden');
});

        // Evento de selecionar data
        inputData.addEventListener('change', (e) => {
            gerarHorarios(e.target.value);
            btnConfirmar.classList.add('hidden');
        });

        function gerarHorarios(dataStr) {
            gridHorarios.innerHTML = '';
            if (!dataStr) return;

            const agora = new Date();
// Ajusta para o fuso horário local corretamente
    const dataSelecionada = new Date(dataStr + 'T00:00:00');
    const diaSemana = dataSelecionada.getDay();
    
    // Regra de bloqueio da segunda-feira
    if (diaSemana === 1) {
        gridHorarios.innerHTML = '<p>Estamos fechados às segundas-feiras.</p>';
        return;
    }

    const horaInicio = (diaSemana === 0 || diaSemana === 6) ? 10 : 9;
    const horaFim = (diaSemana === 0 || diaSemana === 6) ? 15 : 18;

    // Calcula a hora mínima (agora + 2 horas)
    const dataLimite = new Date(agora.getTime() + (2 * 60 * 60 * 1000));
    
    // Verifica se a data selecionada é hoje
    const isHoje = dataStr === agora.toISOString().split('T')[0];

    for (let hora = horaInicio; hora < horaFim; hora++) {
        // 1. Regra do Almoço
        if (hora === 13) continue;

        // 2. Regra das 2 horas de antecedência//
        if (isHoje && hora < dataLimite.getHours()) {
            continue; // Pula horários que já passaram ou estão dentro das 2h de tolerância
        }

        const btn = document.createElement('button');
        btn.className = 'hora-btn';
        btn.innerText = `${String(hora).padStart(2, '0')}:00`;
        
        btn.onclick = () => {
            gridHorarios.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            btnConfirmar.classList.remove('hidden');
            btnConfirmar.dataset.hora = btn.innerText;
        };
        gridHorarios.appendChild(btn);
    }

    if (gridHorarios.innerHTML === '') {
        gridHorarios.innerHTML = '<p>Não há horários disponíveis para hoje.</p>';
    }
            
        }

  

        btnConfirmar.addEventListener('click', () => {
            const opcaoSelecionada = selectServico.options[selectServico.selectedIndex];
            const chave = opcaoSelecionada.getAttribute('data-chave');
            
            // Mapeamento dos IDs numéricos dos serviços no banco (ajuste os números conforme sua tabela id_servico)
            const mapaIdsServicos = {
              "decorada": 0,"peemao": 1, "pedicure": 2,"mao": 3,"unhadegel":4 ,"unhadefibra": 5, "unhaacrilico": 6, 
            "design": 7, "henna": 8, "microblading": 9, "sobrancelha-fio-a-fio": 10
            };

            // Salva os dados pendentes para enviar no submit do formulário de cadastro
            window.agendamentoPendente = {
                id_servico: mapaIdsServicos[chave] || Number(selectServico.value) || 1,
                data_agenda: `${inputData.value} ${btnConfirmar.dataset.hora}:00`
            };

            // Encontra e exibe o modal de cadastro de clientes que está escondido no HTML
            const modalContainer = document.getElementById('modal-agendamento');
            if (modalContainer) {
                modalContainer.classList.remove('hidden');
                modalContainer.setAttribute('aria-hidden', 'false');
            }
        });
    }

    // Inicializa lógica para as duas seções passando o objeto do carrossel correspondente
    configurarAgendamento('servico-unha', 'agendamento-unha', 'data-unha', 'horarios-unha', 'btn-agendar-unha', carrosselUnhas);
    configurarAgendamento('servico-sobrancelha', 'agendamento-sobrancelha', 'data-sobrancelha', 'horarios-sobrancelha', 'btn-agendar-sobrancelha', carrosselSobrancelhas);
// --- 4. LÓGICA DE CONSULTA DE RESERVAS ---
    const btnAbrirConsulta = document.getElementById('btn-consultar-reserva');
    const modalConsulta = document.getElementById('modal-consulta');
    const btnFecharConsulta = document.getElementById('fechar-consulta');
    const formConsulta = document.getElementById('form-consulta');
    const inputConsultaNome = document.getElementById('consulta-nome');
    const divResultadoConsulta = document.getElementById('resultado-consulta');

    if (btnAbrirConsulta && modalConsulta) {
        btnAbrirConsulta.addEventListener('click', () => {
            modalConsulta.classList.remove('hidden');
            modalConsulta.setAttribute('aria-hidden', 'false');
        });
    }

    if (btnFecharConsulta && modalConsulta) {
        btnFecharConsulta.addEventListener('click', () => {
            modalConsulta.classList.add('hidden');
            modalConsulta.setAttribute('aria-hidden', 'true');
            divResultadoConsulta.innerHTML = '';
            inputConsultaNome.value = '';
        });
    }

    if (formConsulta) {
        formConsulta.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nomeCliente = inputConsultaNome.value.trim();
            
            if (!nomeCliente) return;

            divResultadoConsulta.innerHTML = '<p>Buscando reservas...</p>';

            try {
                const response = await fetch(`http://localhost:3000/detalhe_agendamento?Nome=${encodeURIComponent(nomeCliente)}`);
                const resultados = await response.json();

                if (!response.ok) {
                    throw new Error(resultados.erro || 'Erro ao consultar reservas.');
                }

                if (resultados.length === 0) {
                    divResultadoConsulta.innerHTML = '<p>Nenhuma reserva encontrada para este nome.</p>';
                    return;
                }

                let html = '<ul style="list-style: none; padding: 0; margin-top: 15px;">';
                resultados.forEach(reserva => {
                    const dataFormatada = new Date(reserva.Data_servico).toLocaleString('pt-BR');
                    html += `
                        <li style="background: #f9f9f9; padding: 10px; margin-bottom: 8px; border-radius: 5px; border: 1px solid #ddd;">
                            <strong>Cliente:</strong> ${reserva.Nome} <br>
                            <strong>Serviço:</strong> ${reserva.Servico} <br>
                            <strong>Data/Hora:</strong> ${dataFormatada} <br>
                            <strong>Profissional:</strong> ${reserva.Profissional}
                        </li>
                    `;
                });
                html += '</ul>';

                divResultadoConsulta.innerHTML = html;
            } catch (error) {
                divResultadoConsulta.innerHTML = `<p style="color: red;">${error.message}</p>`;
            }
        });
    }
});


