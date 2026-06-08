document.addEventListener('DOMContentLoaded', () => {

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

        return { mover }; // Retorna a função para o select controlar
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

            const diaSemana = new Date(dataStr + 'T00:00:00').getDay();
            let horaInicio = (diaSemana === 0 || diaSemana === 6) ? 10 : 9;
            let horaFim = (diaSemana === 0 || diaSemana === 6) ? 15 : 18;

            if (diaSemana === 1) {
                gridHorarios.innerHTML = '<p>Estamos fechados às segundas-feiras.</p>';
                return;
            }

            for (let hora = horaInicio; hora < horaFim; hora++) {
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