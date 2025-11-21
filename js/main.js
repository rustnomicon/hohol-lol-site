import { Pig } from './Pig.js';

// ---------- ПОДКЛЮЧЕНИЕ MATTER.JS ----------
const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint, Body } = Matter;

// ---------- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ----------
let pictureBoxes = [];
let pigs = [];
let walls = [];
let frameW = 0;
let frameH = 0;
let render; // чтобы был доступен в resize

// ---------- АУДИО ПЕРЕМЕННЫЕ ----------
let audioContext;
let analyser;
let source;
let dataArray;
let isPlaying = false;

// ---------- ЗАГРУЗКА ИЗОБРАЖЕНИЙ ----------
const pigImages = [];
const pigImagePromises = [];

console.log('https://github.com/rustnomicon/hohol-lol-site');
console.log('https://gitverse.ru/rustnomicon/hohol-lol-site');

for (let i = 1; i <= 8; i++) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = `./assets/pigs/pig${i}.jpg`;
    pigImagePromises.push(
        new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.error(`Failed to load: ./assets/pigs/pig${i}.jpg`);
                reject(new Error(`Failed to load image ${i}`));
            };
        })
    );
    pigImages.push(img);
}

const matterCanvas = document.getElementById('matter-canvas');
const pigsCanvas = document.getElementById('pigs-canvas');
const pigsCtx = pigsCanvas.getContext('2d');
const backgroundVideo = document.getElementById('background-video');

const DPR = Math.max(1, window.devicePixelRatio || 1);

function resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    matterCanvas.width = w;
    matterCanvas.height = h;
    matterCanvas.style.width = w + 'px';
    matterCanvas.style.height = h + 'px';

    pigsCanvas.width = w * DPR;
    pigsCanvas.height = h * DPR;
    pigsCanvas.style.width = w + 'px';
    pigsCanvas.style.height = h + 'px';
    pigsCtx.imageSmoothingEnabled = false;
}

window.addEventListener('resize', resizeCanvases);
resizeCanvases();

// ---------- ФИЗИЧЕСКИЙ ДВИЖОК ----------
const engine = Engine.create();
engine.world.gravity.y = 0.8;

// ---------- ЗАГРУЗКА СПРАЙТА ДЛЯ СВИНОК ----------
const PIG_SPRITE_SRC = './assets/pig.png';
const pigSprite = new Image();
pigSprite.src = PIG_SPRITE_SRC;

pigSprite.onload = () => {
    frameW = pigSprite.width / 3;
    frameH = pigSprite.height / 4;

    const dirs = ['up', 'down', 'left', 'right'];
    const MIN_PIGS = 5;
    const MAX_PIGS = 30;
    const count = Math.floor(MIN_PIGS + Math.random() * (MAX_PIGS - MIN_PIGS + 1));

    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < count; i++) {
        const margin = 50;
        const x = margin + Math.random() * (w - 2 * margin);
        const y = margin + Math.random() * (h - 2 * margin);
        const speed = 40 + Math.random() * 80;
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        pigs.push(new Pig(x, y, speed, dir));
    }

    startPigsLoop();
};

// ---------- ИГРОВОЙ ЦИКЛ ДЛЯ СВИНОК ----------
let lastPigsTime = 0;

function startPigsLoop() {
    function pigsLoop(timestamp) {
        const dt = (timestamp - lastPigsTime) / 1000;
        lastPigsTime = timestamp;

        pigsCtx.clearRect(0, 0, pigsCanvas.width, pigsCanvas.height);

        pigs.forEach(pig => {
            pig.update(dt, window.innerWidth, window.innerHeight);
            pig.draw(pigsCtx, pigSprite, frameW, frameH, DPR);
        });

        requestAnimationFrame(pigsLoop);
    }
    requestAnimationFrame(pigsLoop);
}

// ---------- СОЗДАНИЕ СТЕН ----------
function createWalls(width, height) {
    const thickness = 50;
    return [
        Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
        Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
        Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
        Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true })
    ];
}

// ---------- СОЗДАНИЕ КВАДРАТОВ ----------
function createPictureBoxes(width, height, numBoxes) {
    const boxes = [];
    const boxSize = 80;

    for (let i = 0; i < numBoxes; i++) {
        const randomImg = pigImages[Math.floor(Math.random() * pigImages.length)];
        const x = boxSize + Math.random() * (width - 2 * boxSize);
        const y = boxSize + Math.random() * (height / 3);

        const box = Bodies.rectangle(x, y, boxSize, boxSize, {
            restitution: 0.6,
            friction: 0.01,
            frictionAir: 0.005,
            render: {
                sprite: {
                    texture: randomImg.src,
                    xScale: boxSize / randomImg.width,
                    yScale: boxSize / randomImg.height
                }
            }
        });

        boxes.push(box);
    }

    return boxes;
}

// ---------- АУДИО АНАЛИЗАТОР ----------
async function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        console.log('AudioContext created, state:', audioContext.state);
    }

    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext resumed, state:', audioContext.state);
    }
}

function connectAudioSource() {
    if (!source && audioContext && analyser) {
        try {
            source = audioContext.createMediaElementSource(backgroundVideo);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            console.log('MediaElementSource connected successfully');
        } catch (error) {
            console.error('Error creating MediaElementSource:', error);
        }
    }
}

function getAverageVolume() {
    if (!analyser || !dataArray) {
        // Analyser ещё не готов
        return 0;
    }
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    // console.log('Average volume:', avg);
    return avg;
}

// ---------- РЕАКЦИЯ НА БИТЫ ----------
let lastBeatTime = 0;
const BEAT_THRESHOLD = 40;
const BEAT_COOLDOWN = 150;

function checkForBeat(volumeLevel) {
    if (volumeLevel > BEAT_THRESHOLD) {
        const now = Date.now();
        if (now - lastBeatTime > BEAT_COOLDOWN) {
            lastBeatTime = now;
            console.log('Beat detected! Volume:', volumeLevel, 'Boxes:', pictureBoxes.length);

            if (pictureBoxes && pictureBoxes.length > 0) {
                let affectedCount = 0;
                pictureBoxes.forEach((box) => {
                    if (Math.random() > 0.7) {
                        const forceX = (Math.random() - 0.5) * 0.15;
                        const forceY = -Math.random() * 0.40;
                        Body.applyForce(box, box.position, { x: forceX, y: forceY });
                        affectedCount++;
                    }
                });
                console.log('Affected boxes:', affectedCount);
            }

            const dirs = ['up', 'down', 'left', 'right'];
            pigs.forEach(pig => {
                if (Math.random() > 0.5) {
                    pig.speed *= 2;
                    pig.dir = dirs[Math.floor(Math.random() * dirs.length)];
                    setTimeout(() => {
                        pig.speed /= 2;
                    }, 200);
                }
            });
        }
    }
}

function startAudioLoop() {
    function audioLoop() {
        if (!isPlaying) return;
        const vol = getAverageVolume();
        checkForBeat(vol);
        requestAnimationFrame(audioLoop);
    }
    console.log('Starting audio loop...');
    audioLoop();
}

// ---------- ЗАПУСК ПРИЛОЖЕНИЯ ----------
Promise.all(pigImagePromises).then(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    walls = createWalls(width, height);
    pictureBoxes = createPictureBoxes(width, height, 50);

    Composite.add(engine.world, [...walls, ...pictureBoxes]);

    render = Render.create({
        canvas: matterCanvas,
        engine: engine,
        options: {
            width,
            height,
            wireframes: false,
            background: 'transparent'
        }
    });

    const mouse = Mouse.create(matterCanvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    });

    Composite.add(engine.world, mouseConstraint);
    Render.run(render);
    Runner.run(engine);

    // Запуск видео
    startBackgroundVideo();
});

// ---------- УПРАВЛЕНИЕ ВИДЕО ----------
async function startBackgroundVideo() {
    await initAudio();
    backgroundVideo.volume = 0.5;

    try {
        await backgroundVideo.play();
        isPlaying = true;
        console.log('Video started successfully, connecting audio...');
        connectAudioSource();
        startAudioLoop();
    } catch (e) {
        console.log('Autoplay blocked, waiting for click...', e.message);

        const clickHandler = async function () {
            console.log('Click detected, attempting to play video...');
            await initAudio();
            try {
                await backgroundVideo.play();
                isPlaying = true;
                console.log('Video started after click, connecting audio...');
                connectAudioSource();
                startAudioLoop();
                document.removeEventListener('click', clickHandler);
                console.log('Click handler removed');
            } catch (err) {
                console.error('Failed to play video after click:', err);
            }
        };

        document.addEventListener('click', clickHandler, { once: true });
    }
}

// ---------- RESIZE ----------
window.addEventListener('resize', () => {
    const newW = window.innerWidth;
    const newH = window.innerHeight;

    if (render && render.canvas) {
        render.canvas.width = newW;
        render.canvas.height = newH;
        render.options.width = newW;
        render.options.height = newH;
    }

    walls.forEach(w => Composite.remove(engine.world, w));
    walls = createWalls(newW, newH);
    Composite.add(engine.world, walls);

    resizeCanvases();
});
