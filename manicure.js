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

        // Interação manual
        nextBtn.addEventListener('click', () => { 
            clearInterval(autoPlay); 
            mover(indexAtual + 1); 
        });
        
        prevBtn.addEventListener('click', () => { 
            clearInterval(autoPlay); 
            mover(indexAtual - 1); 
        });

        return { mover }; // Retorna a função para o select controlar
    }
        
    // Lógica do Formulário de Coleta
    document.getElementById('form-coleta-dados').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dados = {
            nome: document.getElementById('cli-nome').value,
            tel: document.getElementById('cli-tel').value,
            email: document.getElementById('cli-email').value,
            ...agendamentoPendente
        };

        const response = await fetch('agendar.php', {
            method: 'POST',
            body: JSON.stringify(dados)
        });

        const res = await response.json();
        if(res.status === "sucesso") {
            alert("Agendamento realizado! Entraremos em contato em 48h.");
            location.reload();
        }
    });
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
        
        // Mapeamento de serviço para índice do slide
        const mapaIndices = {
            "simples": 0, "decorada": 1, "francesinha": 2, "pedicure": 3, "mao": 4, "gel": 0, "fibra": 1, "acrilico": 2,
            "design": 0, "henna": 1, "microblading": 2, "sobrancelha-fio-a-fio": 3
        };

        // Limitar datas em 2 meses
        const hoje = new Date();
        const dataMaxima = new Date();
        dataMaxima.setMonth(hoje.getMonth() + 2);
        inputData.setAttribute('min', hoje.toISOString().split('T')[0]);
        inputData.setAttribute('max', dataMaxima.toISOString().split('T')[0]);

        selectServico.addEventListener('change', (e) => {
            // Mostra galeria e para o automático no slide correspondente
            // Move o carrossel para o índice correspondente
    if(carrosselObj) {
        carrosselObj.mover(mapaIndices[e.target.value] || 0);
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

        function resetsPrecedentes() {
            inputData.value = '';
            gridHorarios.innerHTML = '';
            btnConfirmar.classList.add('hidden');
        }

        btnConfirmar.addEventListener('click', () => {
            alert(`Agendado com sucesso para dia ${inputData.value} às ${btnConfirmar.dataset.hora}!`);
        });
    }

    // Inicializa lógica para as duas seções passando o objeto do carrossel correspondente
    configurarAgendamento('servico-unha', 'agendamento-unha', 'data-unha', 'horarios-unha', 'btn-agendar-unha', carrosselUnhas);
    configurarAgendamento('servico-sobrancelha', 'agendamento-sobrancelha', 'data-sobrancelha', 'horarios-sobrancelha', 'btn-agendar-sobrancelha', carrosselSobrancelhas);
});