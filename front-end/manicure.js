document.addEventListener('DOMContentLoaded', () => {
    const reservaStorageKey = 'beautifulpolly-reserva-pendente';
    let agendamentoPendente = JSON.parse(sessionStorage.getItem(reservaStorageKey) || '{}');
    // --- 1. CONFIGURAÇÃO DOS CARROSSÉIS ---
    function inicializarCarrossel(idContainer) {
        const container = document.getElementById(idContainer);
        const slidesTrack = container.querySelector('.carousel-slides');
        const slides = container.querySelectorAll('.slide');
        const nextBtn = container.querySelector('.next');
        const prevBtn = container.querySelector('.prev');
        let indexAtual = 0;
        
        // Carrossel Automático
        let autoPlay = setInterval(() => mover(indexAtual + 1), 3000);

        function mover(index) {
            indexAtual = (index + slides.length) % slides.length;
            slidesTrack.style.transform = `translateX(-${indexAtual * 100}%)`;
        }

        // Interação manual
        nextBtn.addEventListener('click', () => { 
            clearInterval(autoPlay); 
            mover(indexAtual + 1); 
        });
        
        prevBtn.addEventListener('click', () => { 
            clearInterval(autoPlay); 
            mover(indexAtual - 1); 
        });

        return { mover, pausar: () => clearInterval(autoPlay) };
    }
    // Inicializa carrosséis e guarda as referências
    const carrosselUnhas = inicializarCarrossel('carousel-unhas');
    const carrosselSobrancelhas = inicializarCarrossel('carousel-sobrancelhas');

    // --- 2. LÓGICA DE AGENDAMENTO ---
    function configurarAgendamento(idSelect, idAgendamentoCont, idData, idHorarios, idBtnConfirmar, carrosselObj) {
        const selectServico = document.getElementById(idSelect);
        const containerAgendamento = document.getElementById(idAgendamentoCont);
        const inputData = document.getElementById(idData);
        const gridHorarios = document.getElementById(idHorarios);
        const btnConfirmar = document.getElementById(idBtnConfirmar);
        
        const mapaIndices = {
            "decorada": 0, "francesinha": 4, "pedicure": 2, "mao": 3, "gel": 1, "fibra": 2, "acrilico": 3,
            "design": 0, "henna": 1, "microblading": 2, "sobrancelha-fio-a-fio": 3
        };
        const hoje = new Date();
        const dataMaxima = new Date();
        dataMaxima.setMonth(hoje.getMonth() + 2);
        inputData.setAttribute('min', hoje.toISOString().split('T')[0]);
        inputData.setAttribute('max', dataMaxima.toISOString().split('T')[0]);

        selectServico.addEventListener('change', (e) => {
            if (carrosselObj) {
                carrosselObj.mover(mapaIndices[e.target.selectedOptions[0].dataset.chave] || 0);
                carrosselObj.pausar();
            }
            containerAgendamento.classList.remove('hidden');
        });

        inputData.addEventListener('change', (e) => {
            gerarHorarios(e.target.value);
            btnConfirmar.classList.add('hidden');
        });
        function gerarHorarios(dataStr) {
            gridHorarios.innerHTML = '';
            if (!dataStr) return;

            const agora = new Date();
            const dataSelecionada = new Date(dataStr + 'T00:00:00');
            const diaSemana = dataSelecionada.getDay();
            
            if (diaSemana === 1) {
                gridHorarios.innerHTML = '<p>Estamos fechados às segundas-feiras.</p>';
                return;
            }
            const horaInicio = (diaSemana === 0 || diaSemana === 6) ? 10 : 9;
            const horaFim = (diaSemana === 0 || diaSemana === 6) ? 15 : 18;
            const dataLimite = new Date(agora.getTime() + (2 * 60 * 60 * 1000));
            const isHoje = dataStr === agora.toISOString().split('T')[0];

            for (let hora = horaInicio; hora < horaFim; hora++) {
                if (hora === 13) continue;
                if (isHoje && hora < dataLimite.getHours()) continue;

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

        // Ao clicar em confirmar a data/hora/serviço
        btnConfirmar.addEventListener('click', () => {
            // Salva as informações pendentes
            agendamentoPendente = {
                id_servico: Number(selectServico.value),
                data_agenda: `${inputData.value} ${btnConfirmar.dataset.hora}:00`
            };
            sessionStorage.setItem(reservaStorageKey, JSON.stringify(agendamentoPendente));

            const modalAgendamento = document.getElementById('modal-agendamento');
            modalAgendamento.classList.remove('hidden');
            modalAgendamento.setAttribute('aria-hidden', 'false');
            document.getElementById('form-coleta-dados').scrollIntoView({ behavior: 'smooth' });
        });
    }

    configurarAgendamento('servico-unha', 'agendamento-unha', 'data-unha', 'horarios-unha', 'btn-agendar-unha', carrosselUnhas);
    configurarAgendamento('servico-sobrancelha', 'agendamento-sobrancelha', 'data-sobrancelha', 'horarios-sobrancelha', 'btn-agendar-sobrancelha', carrosselSobrancelhas);

 // --- 3. LÓGICA DO ENVIO FINAL (CADASTRO + RESERVA) ---
const formColeta = document.getElementById('form-coleta-dados');
if (formColeta) {
    formColeta.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Valida se o cliente chegou a escolher o serviço/horário antes
        if (!Number.isInteger(Number(agendamentoPendente.id_servico)) || !agendamentoPendente.data_agenda) {
            alert('Por favor, selecione um serviço, data e horário antes de finalizar o cadastro!');
            return;
        }

       // Junta tudo em um único objeto para enviar de uma vez só
        const dadosCompletos = {
            cliente_nome: document.getElementById('cli-nome').value,
            telefone: document.getElementById('cli-tel').value,
            email: document.getElementById('cli-email').value,
            endereco: document.getElementById('cli-end').value,
            cpf: document.getElementById('cli-cpf').value,
            cidade: document.getElementById('cli-cidade').value,
            cep: document.getElementById('cli-cep').value,
            id_servico: agendamentoPendente.id_servico,
            data_agenda: agendamentoPendente.data_agenda
        };

       try {
            const response = await fetch('http://localhost:3000/tbl_clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosCompletos)
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.erro || 'Erro ao realizar o cadastro e agendamento.');
            }
 // Sucesso geral
            sessionStorage.removeItem(reservaStorageKey);
            alert("Reserva realizada com sucesso!");
            location.reload();

        } catch (erro) {
            console.error('Erro na requisição:', erro);
            alert('Erro: ' + (erro.message || 'Não foi possível conectar ao servidor da API.'));
        }
    });
}

    const modalConsulta = document.getElementById('modal-consulta');
    document.getElementById('btn-consultar-reserva').addEventListener('click', () => {
        modalConsulta.classList.remove('hidden');
        modalConsulta.setAttribute('aria-hidden', 'false');
    });
    document.getElementById('fechar-consulta').addEventListener('click', () => {
        modalConsulta.classList.add('hidden');
        modalConsulta.setAttribute('aria-hidden', 'true');
    });
    document.getElementById('form-consulta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('consulta-nome').value.trim();
        const resultado = document.getElementById('resultado-consulta');
        resultado.textContent = 'Buscando...';
        try {
            const response = await fetch(`http://localhost:3000/detalhe_agendamento?nome=${encodeURIComponent(nome)}`);
            const dados = await response.json();
            resultado.innerHTML = response.ok && dados.length
                ? dados.map(item => `<p><strong>${item.servico || item.nome || 'Serviço'}</strong><br>${item.data_servico || 'Data não informada'}</p>`).join('')
                : 'Nenhuma reserva encontrada.';
        } catch (erro) {
            resultado.textContent = 'Não foi possível consultar as reservas.';
        }
    });
});
        
    