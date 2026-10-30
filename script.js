
const canvas = document.getElementById("universo");
const ctx = canvas.getContext("2d");

const conectar = document.getElementById("conectar");
const status = document.getElementById("status");
const frequenciaTexto = document.getElementById("frequencia");

let largura = 0;
let altura = 0;

let audioContext = null;
let analisador = null;
let fonteAudio = null;

let streamAudio = null;
let dados = null;

let conectado = false;
let tempo = 0;
let ultimoFrame = 0;

let graves = 0;
let medios = 0;
let agudos = 0;

let gravesSuaves = 0;
let mediosSuaves = 0;
let agudosSuaves = 0;

let energia = 0;
let cor = 205;

const particulas = [];

const QUANTIDADE = 450;


// ===================================
// CANVAS
// ===================================

function ajustarCanvas() {

    const dpr = Math.min(
        window.devicePixelRatio || 1,
        1.5
    );

    largura = window.innerWidth;
    altura = window.innerHeight;

    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);

    canvas.style.width = largura + "px";
    canvas.style.height = altura + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    criarParticulas();
}

window.addEventListener("resize", ajustarCanvas);


// ===================================
// PARTÍCULAS
// ===================================

class Particula {

    constructor() {

        this.x = Math.random() * largura;
        this.y = Math.random() * altura;

        this.vx = 0;
        this.vy = 0;

        this.tamanho = Math.random() * 1.5 + 0.4;

        this.fase = Math.random() * Math.PI * 2;

        this.velocidade = Math.random() * 0.4 + 0.15;

        this.opacidade = Math.random() * 0.5 + 0.2;
    }

    atualizar(dt) {

        const centroX = largura / 2;
        const centroY = altura / 2;

        const dx = this.x - centroX;
        const dy = this.y - centroY;

        const distancia = Math.sqrt(dx * dx + dy * dy);

        const angulo = Math.atan2(dy, dx);

        // Movimento orgânico das partículas
        const fluxo = Math.sin(
            distancia * 0.008 -
            tempo * 0.8 +
            this.fase
        );

        const curva = Math.cos(
            angulo +
            fluxo * 0.7 +
            this.fase
        );

        // A música altera a intensidade do movimento
        const forca =
            0.15 +
            mediosSuaves * 0.7 +
            gravesSuaves * 1.5;

        const aceleracaoX =
            Math.cos(angulo + curva) *
            fluxo *
            forca;

        const aceleracaoY =
            Math.sin(angulo + curva) *
            fluxo *
            forca;

        // Movimento contínuo
        this.vx += aceleracaoX * dt;
        this.vy += aceleracaoY * dt;

        // Velocidade natural
        this.vx += Math.cos(this.fase) * this.velocidade * dt;
        this.vy += Math.sin(this.fase) * this.velocidade * dt;

        // Resistência suave
        this.vx *= Math.pow(0.985, dt);
        this.vy *= Math.pow(0.985, dt);

        this.x += this.vx * dt;
        this.y += this.vy * dt;

        this.fase += 0.2 * dt;

        // Reaparecer do outro lado
        if (this.x < -10) this.x = largura + 10;
        if (this.x > largura + 10) this.x = -10;

        if (this.y < -10) this.y = altura + 10;
        if (this.y > altura + 10) this.y = -10;
    }

    desenhar() {

        const brilho =
            this.opacidade +
            agudosSuaves * 0.35;

        const tamanho =
            this.tamanho +
            gravesSuaves * 1.5;

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            tamanho,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = `hsla(
            ${cor + this.fase * 3},
            85%,
            75%,
            ${Math.min(brilho, 0.95)}
        )`;

        ctx.fill();
    }
}


// ===================================
// CRIAR PARTÍCULAS
// ===================================

function criarParticulas() {

    particulas.length = 0;

    for (let i = 0; i < QUANTIDADE; i++) {

        particulas.push(new Particula());
    }
}


// ===================================
// CAPTURAR SPOTIFY
// ===================================

async function conectarSpotify() {

    try {

        status.textContent =
            "Escolha a aba do Spotify e compartilhe o áudio...";

        // O Chrome abre a janela de compartilhamento
        streamAudio = await navigator.mediaDevices.getDisplayMedia({

            video: true,

            audio: {
                suppressLocalAudioPlayback: false
            },

            preferCurrentTab: false,

            selfBrowserSurface: "exclude",

            systemAudio: "exclude"
        });

        const trilhaAudio = streamAudio.getAudioTracks();

        if (!trilhaAudio.length) {

            streamAudio.getTracks().forEach(
                trilha => trilha.stop()
            );

            streamAudio = null;

            status.textContent =
                "Você precisa ativar o compartilhamento de áudio.";

            return;
        }

        // Criar o contexto de áudio
        audioContext = new AudioContext();

        await audioContext.resume();

        fonteAudio = audioContext.createMediaStreamSource(
            streamAudio
        );

        analisador = audioContext.createAnalyser();

        analisador.fftSize = 2048;

        analisador.smoothingTimeConstant = 0.85;

        // Conectar a fonte ao analisador
        fonteAudio.connect(analisador);

        // Manter o áudio audível
        analisador.connect(audioContext.destination);

        dados = new Uint8Array(
            analisador.frequencyBinCount
        );

        conectado = true;

        conectar.textContent = "Desconectar";

        status.textContent =
            "Spotify conectado. Sentindo o som.";

        // Se o usuário parar o compartilhamento pelo Chrome
        streamAudio.getVideoTracks()[0].addEventListener(
            "ended",
            desconectarSpotify
        );

    } catch (erro) {

        console.error(erro);

        status.textContent =
            "Conexão cancelada ou não permitida.";
    }
}


// ===================================
// DESCONECTAR
// ===================================

function desconectarSpotify() {

    conectado = false;

    if (streamAudio) {

        streamAudio.getTracks().forEach(
            trilha => trilha.stop()
        );

        streamAudio = null;
    }

    if (audioContext) {

        audioContext.close();

        audioContext = null;
    }

    analisador = null;
    fonteAudio = null;
    dados = null;

    graves = 0;
    medios = 0;
    agudos = 0;

    conectar.textContent = "Conectar Spotify";

    status.textContent =
        "Aguardando conexão com o Spotify";
}


// ===================================
// ANALISAR FREQUÊNCIAS
// ===================================

function analisarAudio() {

    if (!analisador || !dados) {

        energia *= 0.96;

        gravesSuaves *= 0.96;
        mediosSuaves *= 0.96;
        agudosSuaves *= 0.96;

        return;
    }

    analisador.getByteFrequencyData(dados);

    const quantidade = dados.length;

    const limiteGraves = Math.floor(quantidade * 0.08);
    const limiteMedios = Math.floor(quantidade * 0.4);

    let somaGraves = 0;
    let somaMedios = 0;
    let somaAgudos = 0;

    for (let i = 0; i < limiteGraves; i++) {

        somaGraves += dados[i];
    }

    for (
        let i = limiteGraves;
        i < limiteMedios;
        i++
    ) {

        somaMedios += dados[i];
    }

    for (
        let i = limiteMedios;
        i < quantidade;
        i++
    ) {

        somaAgudos += dados[i];
    }

    graves = somaGraves / (limiteGraves * 255);

    medios = somaMedios /
        ((limiteMedios - limiteGraves) * 255);

    agudos = somaAgudos /
        ((quantidade - limiteMedios) * 255);

    // Suavização
    gravesSuaves +=
        (graves - gravesSuaves) * 0.12;

    mediosSuaves +=
        (medios - mediosSuaves) * 0.10;

    agudosSuaves +=
        (agudos - agudosSuaves) * 0.08;

    energia =
        gravesSuaves * 1.5 +
        mediosSuaves * 0.6 +
        agudosSuaves * 0.3;

    energia = Math.min(energia, 1);

    // Mudança gradual de cor
    cor +=
        agudosSuaves * 0.15 +
        mediosSuaves * 0.04;

    if (cor >= 360) {

        cor -= 360;
    }

    document.documentElement.style.setProperty(
        "--cor",
        cor
    );

    frequenciaTexto.textContent =
        Math.round(energia * 100) + " %";
}


// ===================================
// ONDAS FLUIDAS
// ===================================

function desenharOndas() {

    const centroX = largura / 2;
    const centroY = altura / 2;

    const quantidade = 4;

    for (let onda = 0; onda < quantidade; onda++) {

        const raioBase = 75 + onda * 42;

        const amplitude =
            12 +
            gravesSuaves * 55;

        ctx.beginPath();

        for (
            let angulo = 0;
            angulo <= Math.PI * 2 + 0.03;
            angulo += 0.025
        ) {

            const frequencia =
                Math.sin(
                    angulo * 5 -
                    tempo * 1.2 +
                    onda
                ) * amplitude;

            const frequencia2 =
                Math.sin(
                    angulo * 9 +
                    tempo * 0.7
                ) * agudosSuaves * 18;

            const raio =
                raioBase +
                frequencia +
                frequencia2;

            const x =
                centroX +
                Math.cos(angulo) * raio;

            const y =
                centroY +
                Math.sin(angulo) * raio;

            if (angulo === 0) {

                ctx.moveTo(x, y);

            } else {

                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();

        ctx.strokeStyle = `hsla(
            ${cor + onda * 18},
            80%,
            70%,
            ${0.12 + energia * 0.25}
        )`;

        ctx.lineWidth = 1 + gravesSuaves * 2;

        ctx.stroke();
    }
}


// ===================================
// ANIMAÇÃO
// ===================================

function animar(timestamp) {

    requestAnimationFrame(animar);

    // Limitar o delta para evitar saltos
    const delta = ultimoFrame
        ? Math.min((timestamp - ultimoFrame) / 16.67, 2)
        : 1;

    ultimoFrame = timestamp;

    tempo += delta * 0.012;

    analisarAudio();

    ctx.clearRect(
        0,
        0,
        largura,
        altura
    );

    desenharOndas();

    for (const particula of particulas) {

        particula.atualizar(delta);

        particula.desenhar();
    }
}


// ===================================
// EVENTOS
// ===================================

conectar.addEventListener("click", () => {

    if (conectado) {

        desconectarSpotify();

    } else {

        conectarSpotify();
    }
});


// ===================================
// INICIAR
// ===================================

ajustarCanvas();

requestAnimationFrame(animar);
