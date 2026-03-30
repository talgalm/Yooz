var IDE_HOOK = false;
var VERSION = "2.2.2.box2d";

// Global variables
var score = 0;
var scoreText;
var scoreBox;
var questionBox;
var mainPoint = 8; // main score will be added for correct answer;
var bonusPoint = 2; // bonus score will be added if player put ball inside bin;
var congrats;
var ballScale = 0.3;
var bg,
  logo,
  balls,
  questionText,
  timerText,
  timerlabel,
  scoreText,
  scoreLabel,
  quesText,
  quesLabel,
  loadingText,
  hidden_h,
  hidden_h1,
  hidden_v,
  hidden_v1,
  hidden_v2,
  hidden_v3,
  basket,
  bucket,
  hitPoint,
  skip,
  coins,
  gameOver;

var audio_wrong,
  audio_correct,
  audio_applause,
  audio_ball_bounce,
  audio_ball_into_bucket,
  audio_fliper,
  audio_click,
  audio_gate;

let fliperMargin = 50;
let optionBoxMarginX = 25;
let optionBoxMarginY = 28;
let fliperAngle = 0.6;
let fliperScale = 0.4;
let arrOptionBox = [];
let arrFliper = [];
let fliper;
let sprite;

var spritesArr = [];
var moveMouse = true;
var ballInsideFunnel;
var gameWidth = window.innerWidth;
var gameHeight = window.innerHeight - 40;
var game;
var pushed = false;
var Direction = localStorage.getItem("dir"); // Use "ltr" for text direction from left to right and "rtl" for right to left
const lang = localStorage.getItem("language");
// const lang = "he";
// console.log(lang);
// console.log(Direction);

const shortIntroTextByLang = {
  he: "ענו על כל השאלות בהצלחה!",
  en: "Answer all questions successfully!",
};
document.getElementById("bonusTitle").innerHTML = texts["ballGameBonusTitle"][lang];
document.getElementById("bonusTitle").dir = Direction;
document.getElementById("bonusContent").innerHTML =
  shortIntroTextByLang[lang] || shortIntroTextByLang.en;
document.getElementById("bonusContent").dir = Direction;
document.getElementById("iStart").innerHTML =
  (texts["Continue"] && texts["Continue"][lang]) || texts["start"][lang] || "Continue";

document.getElementById("iPreloaderBg").className += lang == 'en' ? ' cHomeEn' : ' cHomeHe';
document.getElementById("phaser-example").style.display = "none";
document.querySelector(".cInstructionBg").style.display = 'flex';

var orientationEl = document.getElementById("OrientationMsg");
if (orientationEl && texts["SupportsOnlyVertical"] && texts["SupportsOnlyVertical"][lang]) {
  orientationEl.innerHTML = texts["SupportsOnlyVertical"][lang];
}


//set speed varibale for ball speed
var nSpeed = 0.6; //0.1; // Range from 0.01 to 1.0
var num;

let currentQuestionIndex = 0;
let arrQuestions = [
  "Question - 1",
  "Question - 2",
  "Question - 3",
  "Question - 4",
  "Question - 5",
  "Question - 6",
  "Question - 7",
  "Question - 8",
  "Question - 9",
  "Question - 10",
];

let arrOptions = [
  [
    { text: "Option - 1", isTrue: true },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 2", isTrue: false },
  ],

  [
    { text: "Option - 1", isTrue: false },
    { text: "Option - 2", isTrue: true },
    { text: "Option - 1", isTrue: false },
    { text: "Option - 1", isTrue: false },
  ],

  [
    { text: "Option - 1", isTrue: false },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 3", isTrue: true },
    { text: "Option - 4", isTrue: false },
  ],

  [
    { text: "Option - 1", isTrue: true },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 3", isTrue: false },
    { text: "Option - 4", isTrue: false },
  ],

  [
    { text: "Option - 1", isTrue: false },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 3", isTrue: true },
    { text: "Option - 4", isTrue: false },
  ],

  [
    { text: "Option - 1", isTrue: false },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 3", isTrue: false },
    { text: "Option - 4", isTrue: true },
  ],

  [
    { text: "Option - 1", isTrue: false },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 3", isTrue: true },
    { text: "Option - 4", isTrue: false },
  ],

  [
    { text: "Option - 1", isTrue: false },
    { text: "Option - 2", isTrue: true },
    { text: "Option - 3", isTrue: false },
    { text: "Option - 4", isTrue: false },
  ],

  [
    { text: "Option - 1", isTrue: false },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 3", isTrue: false },
    { text: "Option - 4", isTrue: true },
  ],

  [
    { text: "Option - 1", isTrue: true },
    { text: "Option - 2", isTrue: false },
    { text: "Option - 3", isTrue: false },
    { text: "Option - 4", isTrue: false },
  ],
];
var lastRunTime = 0;
var doneQuestions = [];
var doneOptions = [];

let accelaration = 5;
let opacity = 0;
let st_width = 360;
let st_height = 640;
let scale_x = 1;
let scale_y = 1;
let nGravity = 800;
let isDragging = false;
let selBall = null;
let dragStartPoints = { x: 0, y: 0 };
let dragEndPoints = { x: 0, y: 0 };
let objCustomizedTimer = null;
let nTimerDuration = 30;
let isGameLoaded = false;
let isStartClicked = false;
let hasGameStarted = false;
let bIsMuted = false;
let audioBg;
let ballBounceCurTime = 0;
let isNextQnRender = false;
let bg4Level1 = "assets/images/wall_purple.png";
let bg4Level2 = "assets/images/wall_orange.png";
let bg4Level3 = "assets/images/wall_green.png";

const defaultBallgameId = "u7HhTRF7IjznvxRQ6JXw";
const storedGameId = localStorage.getItem("currentGameId");
const ballgameId = storedGameId || defaultBallgameId;
// onStartClicked()
document.getElementById("iStart").addEventListener("click", onStartClicked);
document.getElementById("iMute").addEventListener("click", toggleMute);

// Standalone-safe wrappers so the game can run without platform backend context.
const _safeCall = (fn, ...args) => {
  try {
    if (typeof fn !== "function") return Promise.resolve();
    const result = fn(...args);
    if (result && typeof result.then === "function") return result;
    return Promise.resolve(result);
  } catch (error) {
    console.warn("Backend hook skipped:", error);
    return Promise.resolve();
  }
};

const safeUploadScoreReport = (payload) =>
  _safeCall(
    typeof uploadScoreReport !== "undefined" ? uploadScoreReport : null,
    payload
  );
const safeUploadDetailedReport = (index, payload) =>
  _safeCall(
    typeof uploadDetailedReport !== "undefined" ? uploadDetailedReport : null,
    index,
    payload
  );
const safeCompleteComponentAndNavigate = () =>
  _safeCall(
    typeof completeComponentAndNavigate !== "undefined"
      ? completeComponentAndNavigate
      : null
  );

/**
 * Initializes the game when the start button is clicked.
 * @function onStartClicked
 * @returns {void}
 */
function onStartClicked() {
  if (!isGameLoaded)
    document.getElementsByClassName("cPreloader")[0].style.display = "block";
  document.getElementById("iHome").style.display = "none";
  document.getElementById("phaser-example").style.display = "block";
  const muteBtn = document.getElementById("iMute");
  const isEmbeddedHost = !!window.__ballgameEmbedded;
  muteBtn.style.display = isEmbeddedHost ? "none" : "block";
  muteBtn.style.visibility = isEmbeddedHost ? "hidden" : "visible";
  muteBtn.style.opacity = isEmbeddedHost ? "0" : "1";
  muteBtn.classList.toggle("cMuted", bIsMuted);
  audioBg = new Audio("assets/audios/bgmusic.mp3");
  audioBg.play();
  audioBg.loop = true;
  audioBg.volume = 0.1;
  isStartClicked = true;
  if (isGameLoaded && !hasGameStarted) {
    renderGame();
    hasGameStarted = true;
    startTimer();
  } else if (isGameLoaded) {
    startTimer();
  }
}

onWindowFocusStatus = (windowVisibility) => {
  if (objCustomizedTimer) {
    if (windowVisibility == "hidden") objCustomizedTimer.pauseTimer();
    else objCustomizedTimer.playTimer(objCustomizedTimer);
  }
};

/**
 * Toggles the mute status of the game audio and updates the mute icon.
 * @function toggleMute
 * @returns {void}
 */
function toggleMute() {
  bIsMuted = !bIsMuted;
  document.getElementById("iMute").classList.toggle("cMuted");

  if (bIsMuted) {
    if (audioBg && typeof audioBg.pause === "function") audioBg.pause();
    if (audio_wrong && typeof audio_wrong.pause === "function") audio_wrong.pause();
    if (audio_correct && typeof audio_correct.pause === "function") audio_correct.pause();
    if (audio_applause && typeof audio_applause.pause === "function") audio_applause.pause();
    if (audio_ball_bounce && typeof audio_ball_bounce.pause === "function") audio_ball_bounce.pause();
    if (audio_ball_into_bucket && typeof audio_ball_into_bucket.pause === "function")
      audio_ball_into_bucket.pause();
    if (audio_fliper && typeof audio_fliper.pause === "function") audio_fliper.pause();
    if (audio_click && typeof audio_click.pause === "function") audio_click.pause();
  } else {
    if (audioBg && typeof audioBg.play === "function") audioBg.play();
  }
}

// Exposed for embedded host: index.html postMessage handler (BALLGAME_TOGGLE_MUTE).
window.toggleMute = toggleMute;

/**
 * Initializes the game by loading configurations and setting up the game environment.
 * @function init
 * @returns {void}
 */
init();
function init() {
  // game = new Phaser.Game(gameWidth, gameHeight, Phaser.CANVAS, 'phaser-example', { preload: preload, create: create, update: update, render: render }, true);// should delete that once finish
  scale_x = gameWidth / st_width;
  scale_y = gameHeight / st_height;
  const startPhaserGame = () => {
    const launch = () => {
      game = new Phaser.Game(
        gameWidth,
        gameHeight,
        Phaser.CANVAS,
        "phaser-example",
        {
          preload: preload,
          create: create,
          update: update,
          render: render,
          loadUpdate: loadUpdate,
        },
        true
      );
      startTime = new Date();
    };
    // Wait for web fonts to load so Phaser canvas text uses the correct font
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(launch);
    } else {
      launch();
    }
  };

  const hydrateFromDocs = (docs) => {
    const scoreDoc = docs && docs.scoreDoc ? docs.scoreDoc : null;
    const configurationDoc =
      docs && docs.configurationDoc ? docs.configurationDoc : null;

    num = 0;
    if (scoreDoc && scoreDoc.exists) {
      score = scoreDoc.data().gameScore || 0;
      lastRunTime = scoreDoc.data().gameTimeSecond;
      doneQuestions = scoreDoc.data().doneQuestions;
      doneOptions = scoreDoc.data().doneOptions;
      currentQuestionIndex =
        scoreDoc.data().currentQuestionIndex ||
        scoreDoc.data().currentQuestionIndex == 0
          ? scoreDoc.data().currentQuestionIndex + 1
          : 0;
    }

    if (configurationDoc && typeof configurationDoc.data === "function") {
      const configData = configurationDoc.data();
      const rawData =
        configData && Array.isArray(configData.configurations)
          ? configData.configurations
          : [];
      if (rawData.length) {
        const questions = [];
        const answers = [];
        rawData.forEach((v) => {
          questions.push(v.question);
          const options = [
            { text: v.answer, isTrue: true },
            { text: v.fakeAnswer1, isTrue: false },
          ];
          if (v.fakeAnswer2)
            options.push({ text: v.fakeAnswer2, isTrue: false });
          if (v.fakeAnswer3)
            options.push({ text: v.fakeAnswer3, isTrue: false });
          answers.push(options);
        });
        arrOptions = answers;
        arrQuestions = questions;
      }
    }
  };

  const startWithFallback = () => {
    console.warn("Running ballgame in standalone mode (no backend)");
    hydrateFromDocs(null);
    startPhaserGame();
  };

  if (typeof loadGame === "function") {
    loadGame(ballgameId)
      .then((docs) => {
        hydrateFromDocs(docs);
        startPhaserGame();
      })
      .catch((error) => {
        console.warn("loadGame failed; falling back to local data", error);
        startWithFallback();
      });
  } else {
    startWithFallback();
  }
}

/**
 * Preloads assets such as images and audio files needed for the game.
 * @function preload
 * @returns {void}
 */
function preload() {
  game.load.image("logo", "assets/images/yoozLogo.png");
  game.load.image("coins", "assets/images/coins.png");
  game.load.image("game-over", "assets/images/game-over.png");
  game.load.image("skip", "assets/images/" + (lang == "en" ? "skip_en.png" : "skip_he.png"));
  game.load.image("wall_purple", bg4Level1);
  game.load.image("wall_orange", bg4Level2);
  game.load.image("wall_green", bg4Level3);
  game.load.image("box_purple", "assets/images/box_purple.png");
  game.load.image("box_orange", "assets/images/box_orange.png");
  game.load.image("box_green", "assets/images/box_green.png");
  game.load.image("hidden_h", "assets/images/hidden_h.png");
  game.load.image("hidden_h1", "assets/images/hidden_h.png");
  game.load.image("hidden_v", "assets/images/hidden_v.png");
  game.load.image("basket_purple", "assets/images/basket_purple.png");
  game.load.image("basket_orange", "assets/images/basket_orange.png");
  game.load.image("basket_green", "assets/images/basket_green.png");
  game.load.image(
    "basket_purple_overlay",
    "assets/images/basket_purple_overlay.png"
  );
  game.load.image(
    "basket_orange_overlay",
    "assets/images/basket_orange_overlay.png"
  );
  game.load.image(
    "basket_green_overlay",
    "assets/images/basket_green_overlay.png"
  );
  game.load.image("score_box", "assets/images/score_box.png");
  if (lang == "he")
    game.load.image("question_box", "assets/images/question_box.png");
  else game.load.image("question_box", "assets/images/qnBoxForEn.png");
  game.load.image("option_box", "assets/images/option_box.png");
  game.load.image("optionBox_red", "assets/images/optionBox_red.png");
  game.load.image("optionBox_green", "assets/images/optionBox_green.png");
  game.load.image("fliper1", "assets/images/fliper1.png");
  game.load.image("fliper2", "assets/images/fliper2.png");
  game.load.image("yellowBall", "assets/images/yellowBall.png");

  game.load.spritesheet(
    "correct_anim",
    "assets/images/correct_anim.png",
    500,
    820,
    42
  );
  game.load.spritesheet(
    "incorrect_anim",
    "assets/images/incorrect_anim.png",
    500,
    820,
    40
  );

  game.load.spritesheet(
    "bucket_purple_anim",
    "assets/images/bucket_purple_anim.png",
    500,
    830,
    28
  );

  game.load.spritesheet(
    "bucket_orange_anim",
    "assets/images/bucket_orange_anim.png",
    500,
    830,
    28
  );

  game.load.spritesheet(
    "bucket_green_anim",
    "assets/images/bucket_green_anim.png",
    600,
    830,
    28
  );

  game.load.audio("wrong", "assets/audios/wrong.mp3");
  game.load.audio("correct", "assets/audios/correct.mp3");
  game.load.audio("applause", "assets/audios/applause.mp3");
  game.load.audio("ball_into_bucket", "assets/audios/ball_into_bucket.mp3");
  game.load.audio("ball_bounce", "assets/audios/ball_bounce.mp3");
  game.load.audio("fliper", "assets/audios/fliper.mp3");
  game.load.audio("click", "assets/audios/click.mp3");


}


var startTime;

/**
 * Creates the game environment after assets are loaded.
 * @function create
 * @returns {void}
 */
// ─── Nature-themed texture generation (matches Trivia/Order design) ───
var NATURE = {
  BOX_BG: '#c68652',
  BOX_BORDER: '#6c3483',
  BOX_SHADOW: '#6e3f22',
  TEXT_DARK: '#2b1609',
  BTN_RED: '#e74c3c',
  BTN_RED_DARK: '#c0392b',
  BTN_GREEN: '#2ecc71',
  BTN_GREEN_DARK: '#27ae60',
  LEAF_BG: '#3d6b4f',
  LEAF_DARK: '#2e5a3e',
  WHITE: '#ffffff',
};

function hexToNum(hex) { return parseInt(hex.replace('#', ''), 16); }

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function normalizeLabelText(rawText, isQuestion) {
  if (rawText === null || rawText === undefined) return "";
  var text = String(rawText);
  // Remove emoji/icon glyph ranges (used by symbol hints in some datasets).
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, "");
  if (isQuestion) text = text.replace(/[?؟]/g, "");
  // Normalize line breaks/spaces after cleanup.
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function drawWoodPlank(ctx, x, y, w, h, r, woodStops, borderColor) {
  var wood = ctx.createLinearGradient(x, y, x, y + h);
  for (var i = 0; i < woodStops.length; i++) {
    wood.addColorStop(woodStops[i][0], woodStops[i][1]);
  }
  ctx.fillStyle = wood;
  drawRoundRect(ctx, x, y, w, h, r);
  ctx.fill();

  // Subtle horizontal grain lines.
  ctx.save();
  ctx.beginPath();
  drawRoundRect(ctx, x + 2, y + 2, w - 4, h - 4, Math.max(4, r - 2));
  ctx.clip();
  ctx.strokeStyle = "rgba(74, 39, 14, 0.2)";
  ctx.lineWidth = 1.1;
  for (var gy = y + 10; gy < y + h - 8; gy += 10) {
    ctx.beginPath();
    ctx.moveTo(x + 8, gy);
    ctx.bezierCurveTo(x + w * 0.3, gy - 4, x + w * 0.7, gy + 4, x + w - 8, gy);
    ctx.stroke();
  }
  ctx.restore();

  // Top shine.
  var shine = ctx.createLinearGradient(x, y, x, y + h * 0.45);
  shine.addColorStop(0, "rgba(255,255,255,0.18)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  drawRoundRect(ctx, x + 2, y + 2, w - 4, h * 0.45, Math.max(4, r - 2));
  ctx.fill();

  // Border + inner edge.
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  drawRoundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.4;
  drawRoundRect(ctx, x + 3, y + 3, w - 6, h - 6, Math.max(4, r - 3));
  ctx.stroke();
}

function drawQuestionArrowRow(ctx, x, y, w) {
  var centerY = y + 12;
  ctx.strokeStyle = "rgba(108,52,131,0.72)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 18, centerY);
  ctx.lineTo(x + w - 18, centerY);
  ctx.stroke();

  ctx.lineWidth = 3;
  for (var i = 0; i < 8; i++) {
    var ax = x + 30 + i * ((w - 60) / 8);
    ctx.beginPath();
    ctx.moveTo(ax - 7, centerY - 8);
    ctx.lineTo(ax + 7, centerY);
    ctx.lineTo(ax - 7, centerY + 8);
    ctx.stroke();
  }
}

// Helper: draw a rich nature-style card with depth
function drawNatureCard(ctx, W, H, fillColor, borderColor, shadowColor, opts) {
  opts = opts || {};
  var pad = 8;
  var r = opts.radius || 18;
  var shadowDrop = opts.shadowDrop || 7;

  // Outer drop shadow (thick, offset)
  ctx.save();
  ctx.fillStyle = shadowColor;
  drawRoundRect(ctx, pad, pad + shadowDrop, W - pad * 2, H - pad * 2 - shadowDrop + 2, r);
  ctx.fill();
  ctx.restore();

  // Main fill
  ctx.save();
  drawRoundRect(ctx, pad, pad, W - pad * 2, H - pad * 2 - shadowDrop + 2, r);
  ctx.fillStyle = fillColor;
  ctx.fill();

  // Inner top highlight (subtle white shine)
  if (!opts.noShine) {
    var shineGrad = ctx.createLinearGradient(0, pad, 0, pad + (H * 0.35));
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    drawRoundRect(ctx, pad + 2, pad + 2, W - pad * 2 - 4, (H - pad * 2) * 0.4, r);
    ctx.fill();
  }

  // Thick border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = opts.borderWidth || 5;
  drawRoundRect(ctx, pad, pad, W - pad * 2, H - pad * 2 - shadowDrop + 2, r);
  ctx.stroke();

  // Inner light inset line
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, pad + 3, pad + 3, W - pad * 2 - 6, H - pad * 2 - shadowDrop - 4, r - 2);
  ctx.stroke();
  ctx.restore();
}

function generateNatureTextures() {
  // ── Question box (320x136) — white frosted card ──
  var qW = 320, qH = 136;
  var qbmd = game.make.bitmapData(qW, qH);
  var qctx = qbmd.ctx;
  var qPad = 6, qShadow = 6;

  // Drop shadow
  qctx.fillStyle = "rgba(74,101,114,0.3)";
  drawRoundRect(qctx, qPad, qPad + qShadow, qW - qPad * 2, qH - qPad * 2 - qShadow, 16);
  qctx.fill();

  var qGrad = qctx.createLinearGradient(0, qPad, 0, qH - qPad * 2 - qShadow);
  qGrad.addColorStop(0, "rgba(255,255,255,0.96)");
  qGrad.addColorStop(1, "rgba(240,245,250,0.9)");
  qctx.fillStyle = qGrad;
  drawRoundRect(qctx, qPad, qPad, qW - qPad * 2, qH - qPad * 2 - qShadow, 16);
  qctx.fill();
  qctx.strokeStyle = "#6c3483";
  qctx.lineWidth = 3;
  drawRoundRect(qctx, qPad, qPad, qW - qPad * 2, qH - qPad * 2 - qShadow, 16);
  qctx.stroke();

  qbmd.update();
  game.cache.addImage('question_box', null, qbmd.canvas);

  // ── Option box (491x280) — white frosted card ──
  var oW = 491, oH = 280;
  var obmd = game.make.bitmapData(oW, oH);
  var octx = obmd.ctx;
  var oPad = 10;
  drawRoundRect(octx, oPad, oPad + 7, oW - oPad * 2, oH - oPad * 2 - 7, 22);
  octx.fillStyle = "rgba(74,101,114,0.3)";
  octx.fill();
  var oGrad = octx.createLinearGradient(0, oPad, 0, oH - oPad * 2 - 7);
  oGrad.addColorStop(0, "rgba(255,255,255,0.96)");
  oGrad.addColorStop(1, "rgba(240,245,250,0.9)");
  octx.fillStyle = oGrad;
  drawRoundRect(octx, oPad, oPad, oW - oPad * 2, oH - oPad * 2 - 7, 22);
  octx.fill();
  octx.strokeStyle = "#6c3483";
  octx.lineWidth = 4;
  drawRoundRect(octx, oPad, oPad, oW - oPad * 2, oH - oPad * 2 - 7, 22);
  octx.stroke();
  obmd.update();
  game.cache.addImage('option_box', null, obmd.canvas);

  // ── Option box RED (491×307) — correct-wrong feedback ──
  var orbmd = game.make.bitmapData(oW, oH);
  drawNatureCard(orbmd.ctx, oW, oH, '#f5a8a0', NATURE.BTN_RED_DARK, '#8a2018', { noShine: false });
  // X mark watermark
  var orctx = orbmd.ctx;
  orctx.save();
  orctx.globalAlpha = 0.12;
  orctx.strokeStyle = NATURE.BTN_RED_DARK;
  orctx.lineWidth = 18;
  orctx.lineCap = 'round';
  orctx.beginPath();
  orctx.moveTo(oW * 0.3, oH * 0.25);
  orctx.lineTo(oW * 0.7, oH * 0.75);
  orctx.stroke();
  orctx.beginPath();
  orctx.moveTo(oW * 0.7, oH * 0.25);
  orctx.lineTo(oW * 0.3, oH * 0.75);
  orctx.stroke();
  orctx.restore();
  orbmd.update();
  game.cache.addImage('optionBox_red', null, orbmd.canvas);

  // ── Option box GREEN (491×307) ──
  var ogbmd = game.make.bitmapData(oW, oH);
  drawNatureCard(ogbmd.ctx, oW, oH, '#a8e6c0', NATURE.BTN_GREEN_DARK, '#1a7a3a', { noShine: false });
  // Checkmark watermark
  var ogctx = ogbmd.ctx;
  ogctx.save();
  ogctx.globalAlpha = 0.15;
  ogctx.strokeStyle = NATURE.BTN_GREEN_DARK;
  ogctx.lineWidth = 18;
  ogctx.lineCap = 'round';
  ogctx.lineJoin = 'round';
  ogctx.beginPath();
  ogctx.moveTo(oW * 0.28, oH * 0.5);
  ogctx.lineTo(oW * 0.45, oH * 0.68);
  ogctx.lineTo(oW * 0.72, oH * 0.3);
  ogctx.stroke();
  ogctx.restore();
  ogbmd.update();
  game.cache.addImage('optionBox_green', null, ogbmd.canvas);

  // ── Score box (500×160) — frosted glass top bar ──
  var sW = 500, sH = 160;
  var sbmd = game.make.bitmapData(sW, sH);
  var sctx = sbmd.ctx;
  var sPad = 6, sR = 14;
  // Soft shadow
  sctx.fillStyle = 'rgba(74,101,114,0.25)';
  drawRoundRect(sctx, sPad, sPad + 4, sW - sPad * 2, sH - sPad * 2 - 4, sR);
  sctx.fill();
  // Frosted white bg
  var sGrad = sctx.createLinearGradient(0, 0, 0, sH);
  sGrad.addColorStop(0, 'rgba(255,255,255,0.92)');
  sGrad.addColorStop(1, 'rgba(240,245,250,0.85)');
  sctx.fillStyle = sGrad;
  drawRoundRect(sctx, sPad, sPad, sW - sPad * 2, sH - sPad * 2 - 4, sR);
  sctx.fill();
  // Top shine
  var sShine = sctx.createLinearGradient(0, sPad, 0, sPad + 40);
  sShine.addColorStop(0, 'rgba(255,255,255,0.6)');
  sShine.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = sShine;
  drawRoundRect(sctx, sPad + 2, sPad + 2, sW - sPad * 2 - 4, 38, sR - 1);
  sctx.fill();
  // Border
  sctx.strokeStyle = NATURE.BOX_BORDER;
  sctx.lineWidth = 3;
  drawRoundRect(sctx, sPad, sPad, sW - sPad * 2, sH - sPad * 2 - 4, sR);
  sctx.stroke();
  sbmd.update();
  game.cache.addImage('score_box', null, sbmd.canvas);
}

function create() {
  generateNatureTextures();
  document.querySelector(".cPreloader").style.display = "none";
  // document.querySelector(".message").style.display = "none";
  document.getElementById("iStart").style.display = "block";
  // game.stage.visible = false;
  document.getElementById("iPreloaderBg").style.display = "none";

  isGameLoaded = true;
  if (isStartClicked && !hasGameStarted) {
    renderGame();
    hasGameStarted = true;
    startTimer();
  }
}


function back() {
  navigateToComponentScreen();
}
function renderGame() {
  if (currentQuestionIndex > arrQuestions.length - 1) {
    updateDataOnGameCompleted();
    return;
  }

  // score = 0;
  checkScreenOrientation();
  let nScale = gameWidth / 360;
  nScale = nScale > 1.5 ? 1.5 : nScale;

  addBg("wall_purple");
  addBasket("basket_purple");
  addBox("box_purple", 20);
  addSkipButton();

  // Transparent — let NatureBackground show through
  game.physics.startSystem(Phaser.Physics.BOX2D);
  game.physics.box2d.restitution = nSpeed;
  game.physics.box2d.setBoundsToWorld();
  game.physics.box2d.gravity.y = nGravity;

  addObstacles();
  addHitPoint();
  addQuestion();
  addScoreBox();
  changeLevel();
  addOptions();
  addBucket();

  audio_click = game.add.audio("click");
  audio_wrong = game.add.audio("wrong");
  audio_correct = game.add.audio("correct");
  audio_applause = game.add.audio("applause");
  audio_fliper = game.add.audio("fliper");
  audio_ball_into_bucket = game.add.audio("ball_into_bucket");
  audio_ball_bounce = game.add.audio("ball_bounce");

  updateQnNum();
}

/**
 * Adds animation to the bucket when a ball is correctly placed inside it.
 * @function addBucketAnim
 * @returns {void}
 */
function addBucketAnim() {
  updateScore(2);
  bucket.visible = false;
  basket.visible = false;
  let animX;
  if (currentQuestionIndex < 2) {
    animX = -getScaleVal4WidthPosX(5);
    bucketAnim = game.add.sprite(
      animX,
      gameHeight - getScaleVal4HeightPosY(287),
      "bucket_purple_anim"
    );
  } else if (currentQuestionIndex >= 2 && currentQuestionIndex < 6) {
    animX = gameWidth / 2 + getScaleVal4WidthPosX(10);
    bucketAnim = game.add.sprite(
      animX,
      gameHeight - getScaleVal4HeightPosY(287),
      "bucket_orange_anim"
    );
  } else if (currentQuestionIndex >= 6) {
    animX = gameWidth / 2 - getScaleVal4WidthPosX(105);
    bucketAnim = game.add.sprite(
      animX,
      gameHeight - getScaleVal4HeightPosY(287),
      "bucket_green_anim"
    );
  }

  bucketAnim.scale.setTo(
    getScaleVal4WidthPosX(0.35),
    getScaleVal4HeightPosY(0.35)
  );
  game.world.bringToTop(bucketAnim);
  let anim = bucketAnim.animations.add("run");
  anim.onComplete.add(bucketAnimationStopped, this);
  bucketAnim.play("run", 30, false);
}

/**
 * Handles the logic after the bucket animation completes.
 * @function bucketAnimationStopped
 * @returns {void}
 */
function bucketAnimationStopped() {
  bucketAnim.kill();
  bucket.destroy();
  basket.visible = true;
  if (!isNextQnRender) {
    isNextQnRender = true;
    nextQuestion();
  }
}

/**
 * Adds the game logo to the game scene.
 * @function addLogo
 * @returns {void}
 */
function addLogo() {
  logo = game.add.image(0, 0, "logo");
  logo.scale.setTo(0.3);
  logo.smoothed = true;

  logo.x = (gameWidth - logo.width) / 2;
  logo.y = gameHeight - logo.height - getScaleVal4HeightPosY(20);
}

/**
 * Adds a skip button to the game scene.
 * @function addSkipButton
 * @returns {void}
 */
function addSkipButton() {
  skip = game.add.button(0, 0, "skip");
  skip.scale.setTo(0.4);
  skip.smoothed = true;

  skip.x = getScaleVal4WidthPosX(2);
  skip.y = gameHeight - skip.height - getScaleVal4HeightPosY(2);
  skip.visible = false;
  skip.events.onInputDown.add(onSkipButtonClick, this);
  //optionBox.inputEnabled = true;
}

/**
 * Handles the logic for skipping the current question when the skip button is clicked.
 * @function onSkipButtonClick
 * @returns {void}
 */
function onSkipButtonClick() {
  objCustomizedTimer.destoryTimer();
  if (spritesArr[ballIndex]) spritesArr[ballIndex].destroy();
  balls.destroy();
  if (!bIsMuted) audio_wrong.play();

  removeItemsFromStage();
  bucket.destroy();
  if (!isNextQnRender) {
    isNextQnRender = true;
    nextQuestion();
  }
}

/**
 * Adds the background image to the game scene.
 * @function addBg
 * @param {string} bgId - The ID of the background image to add.
 * @returns {void}
 */
function addBg(bgId) {
  // Transparent — NatureBackground from React shows through the canvas
  var gfx = game.add.graphics(0, 0);
  bg = gfx;
}


/**
 * Adds the basket image to the game scene.
 * @function addBasket
 * @param {string} basketId - The ID of the basket image to add.
 * @returns {void}
 */
function addBasket(basketId) {
  basket = game.add.image(0, 0, basketId);
  basket.scale.setTo(0.335 * scale_x, 0.335 * scale_y);
  basket.smoothed = true;

  basket.y = gameHeight - basket.height;
}


/**
 * Adds a box image to the game scene at a specified position.
 * @function addBox
 * @param {string} boxId - The ID of the box image to add.
 * @param {number} xpos - The x-coordinate position of the box.
 * @returns {void}
 */
function addBox(boxId, xpos) {
  box = game.add.image(xpos, 0, boxId);
  box.scale.setTo(0.335 * scale_x, 0.335 * scale_y);
  box.smoothed = true;
  box.y = gameHeight - box.height;
}

/**
 * Adds a bucket image to the game scene.
 * @function addBucket
 * @returns {void}
 */
function addBucket() {
  let bucketId;
  if (currentQuestionIndex < 2) bucketId = "basket_purple_overlay";
  if (currentQuestionIndex >= 2 && currentQuestionIndex < 6)
    bucketId = "basket_orange_overlay";
  if (currentQuestionIndex >= 6) {
    bucketId = "basket_green_overlay";
    logo.x = getScaleVal4WidthPosX(15);
  }
  bucket = game.add.image(0, 0, bucketId);
  bucket.scale.setTo(0.335 * scale_x, 0.335 * scale_y);
  bucket.smoothed = true;
  //bucket.alpha = 1;

  bucket.y = gameHeight - bucket.height;
}

/**
 * Adds a score box to the game scene, displaying timer, question number, and score.
 * @function addScoreBox
 * @returns {void}
 */
function addScoreBox() {
  scoreBox = game.add.image(
    getScaleVal4WidthPosX(25),
    getScaleVal4WidthPosX(-5),
    "score_box"
  );
  scoreBox.scale.setTo(
    getScaleVal4WidthPosX(0.45),
    getScaleVal4HeightPosY(0.4)
  );
  scoreBox.smoothed = true;

  timerLabel = game.add.text(0, 0, texts["Timer"][lang], {
    fill: NATURE.TEXT_DARK,
    fontWeight: "bold", fontSize: "250pt", fontFamily: "'Encode Sans Expanded', Arial",
    align: "center",
    wordWrap: true,
    wordWrapWidth: 520,
    rtl: true,
  });
  timerLabel.x = 90;
  timerLabel.y = 70;

  timerText = game.add.text(0, 0, nTimerDuration, {
    fill: NATURE.TEXT_DARK,
    fontWeight: "bold", fontSize: "250pt", fontFamily: "'Encode Sans Expanded', Arial",
    align: "center",
    wordWrap: true,
    wordWrapWidth: 520,
    rtl: true,
  });
  timerText.x = timerLabel.x + (timerLabel.width - timerText.width) / 2;
  timerText.y = 25;

  quesLabel = game.add.text(0, 0, texts["question"][lang], {
    fill: NATURE.TEXT_DARK,
    fontWeight: "bold", fontSize: "250pt", fontFamily: "'Encode Sans Expanded', Arial",
    align: "center",
    wordWrap: true,
    wordWrapWidth: 520,
    rtl: true,
  });
  quesLabel.x = timerLabel.x + timerLabel.width + 20;
  quesLabel.y = 70;

  quesText = game.add.text(
    0,
    0,
    currentQuestionIndex + 1 + "/" + arrQuestions.length,
    {
      fill: NATURE.TEXT_DARK,
      fontWeight: "bold", fontSize: "250pt", fontFamily: "'Encode Sans Expanded', Arial",
      align: "center",
      wordWrap: true,
      wordWrapWidth: 520,
      rtl: true,
    }
  );
  quesText.x = quesLabel.x + (quesLabel.width - quesText.width) / 2;
  quesText.y = 25;

  scoreLabel = game.add.text(0, 0, texts["score"][lang], {
    fill: NATURE.TEXT_DARK,
    fontWeight: "bold", fontSize: "250pt", fontFamily: "'Encode Sans Expanded', Arial",
    align: "center",
    wordWrap: true,
    wordWrapWidth: 520,
    rtl: true,
  });
  scoreLabel.x = quesLabel.x + quesLabel.width + 20;
  scoreLabel.y = 70;

  scoreText = game.add.text(0, 0, Math.round(score) + '', {
    fill: NATURE.TEXT_DARK,
    fontWeight: "bold", fontSize: "250pt", fontFamily: "'Encode Sans Expanded', Arial",
    align: "center",
    wordWrap: true,
    wordWrapWidth: 520,
    rtl: true,
  });
  scoreText.x = scoreLabel.x + (scoreLabel.width - scoreText.width) / 2;
  scoreText.y = 25;

  coins = game.add.image(
    -getScaleVal4WidthPosX(30),
    getScaleVal4WidthPosX(5),
    "coins"
  );
  //coins.scale.setTo(0.5);

  scoreBox.addChild(timerLabel);
  scoreBox.addChild(timerText);
  scoreBox.addChild(quesLabel);
  scoreBox.addChild(quesText);
  scoreBox.addChild(scoreLabel);
  scoreBox.addChild(scoreText);
  scoreBox.addChild(coins);

  scoreBox.alpha = 0;
}

/**
 * Notifies parent window of current question for text overlay mode.
 */
function notifyQuestionChange() {
  if (window.__ballgameUseTextOverlay && window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        source: "yooz-ballgame",
        type: "BALLGAME_QUESTION_CHANGE",
        payload: {
          index: currentQuestionIndex,
          question: arrQuestions[currentQuestionIndex],
          answers: arrOptions[currentQuestionIndex],
        },
      },
      "*"
    );
  }
}

/**
 * Adds a question box to the game scene with the current question text.
 */
function addQuestion() {
  questionBox = game.add.image(0, 0, "question_box");
  questionBox.scale.setTo(
    getScaleVal4WidthPosX(0.9),
    getScaleVal4HeightPosY(0.8)
  );
  questionBox.smoothed = true;
  questionBox.x = (gameWidth - questionBox.width) / 2;
  questionBox.y = getScaleVal4HeightPosY(15);
  if (scoreBox) game.world.bringToTop(scoreBox);
  // HTML overlay text — not affected by canvas scaling
  var textLayer = document.getElementById('text-layer');
  if (textLayer) {
    var qEl = document.createElement('div');
    qEl.id = 'question-text-html';
    qEl.style.cssText = 'position:absolute;left:' + questionBox.x + 'px;top:' + questionBox.y + 'px;width:' + questionBox.width + 'px;height:' + questionBox.height + 'px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;font-family:"Encode Sans Expanded",Arial,sans-serif;color:#222;text-align:center;padding:0 12px;box-sizing:border-box;line-height:1.3;direction:rtl;pointer-events:none;';
    qEl.textContent = arrQuestions[currentQuestionIndex];
    textLayer.appendChild(qEl);
  }
}

/**
 * Calculates and returns the scaled value for width based on the game width and the provided value.
 * @param {number} nValue - The value to be scaled.
 * @returns {number} - The scaled value for width.
 */
function getScaleVal4WidthPosX(nValue) {
  return (nValue / st_width) * gameWidth;
}

/**
 * Calculates and returns the scaled value for height based on the game height and the provided value.
 * @param {number} nValue - The value to be scaled.
 * @returns {number} - The scaled value for height.
 */
function getScaleVal4HeightPosY(nValue) {
  return (nValue / st_height) * gameHeight;
}

/**
 * Adds obstacles (hidden objects) to the game scene.
 */
function addObstacles() {
  hidden_h = game.add.sprite(
    getScaleVal4WidthPosX(250),
    gameHeight - getScaleVal4HeightPosY(20),
    "hidden_h"
  );
  hidden_h.scale.setTo(getScaleVal4WidthPosX(5), getScaleVal4HeightPosY(1));
  hidden_h.smoothed = true;
  hidden_h.alpha = opacity;

  game.physics.box2d.enable(hidden_h, false);
  hidden_h.body.static = true;

  hidden_h1 = game.add.sprite(
    getScaleVal4WidthPosX(285),
    gameHeight - getScaleVal4HeightPosY(-10),
    "hidden_h1"
  );
  hidden_h1.scale.setTo(getScaleVal4WidthPosX(1.5), getScaleVal4HeightPosY(1));
  hidden_h1.smoothed = true;
  hidden_h1.alpha = opacity;

  game.physics.box2d.enable(hidden_h1, false);
  hidden_h1.body.static = true;

  hidden_v = game.add.sprite(
    getScaleVal4WidthPosX(130),
    gameHeight - getScaleVal4HeightPosY(100),
    "hidden_v"
  );
  hidden_v.scale.setTo(getScaleVal4WidthPosX(1), getScaleVal4HeightPosY(1.5));
  hidden_v.smoothed = true;
  hidden_v.alpha = opacity;

  game.physics.box2d.enable(hidden_v, false);
  hidden_v.body.static = true;

  hidden_v1 = game.add.sprite(
    getScaleVal4WidthPosX(15),
    gameHeight - getScaleVal4HeightPosY(70),
    "hidden_v"
  );
  hidden_v1.scale.setTo(getScaleVal4WidthPosX(1), getScaleVal4HeightPosY(1.2));
  hidden_v1.smoothed = true;
  hidden_v1.alpha = opacity;

  game.physics.box2d.enable(hidden_v1, false);
  hidden_v1.body.static = true;

  hidden_v2 = game.add.sprite(
    getScaleVal4WidthPosX(105),
    gameHeight - getScaleVal4HeightPosY(70),
    "hidden_v"
  );
  hidden_v2.scale.setTo(getScaleVal4WidthPosX(1), getScaleVal4HeightPosY(1.2));
  hidden_v2.smoothed = true;
  hidden_v2.alpha = opacity;

  game.physics.box2d.enable(hidden_v2, false);
  hidden_v2.body.static = true;

  hidden_v3 = game.add.sprite(
    -10,
    gameHeight - getScaleVal4HeightPosY(100),
    "hidden_v"
  );
  hidden_v3.scale.setTo(getScaleVal4WidthPosX(1), getScaleVal4HeightPosY(2));
  hidden_v3.smoothed = true;
  hidden_v3.alpha = opacity;

  game.physics.box2d.enable(hidden_v3, false);
  hidden_v3.body.static = true;
}

/**
 * Adds a hit point (target) to the game scene.
 */
function addHitPoint() {
  hitPoint = game.add.sprite(
    getScaleVal4WidthPosX(55),
    gameHeight - getScaleVal4HeightPosY(40),
    "hidden_h"
  );
  hitPoint.scale.setTo(getScaleVal4WidthPosX(0.5), getScaleVal4HeightPosY(0.5));
  hitPoint.smoothed = true;
  hitPoint.alpha = opacity;

  game.physics.box2d.enable(hitPoint, false);
  hitPoint.body.static = true;
}

/**
 * Shuffles the elements of an array in place.
 * @param {Array} array - The array to be shuffled.
 * @returns {Array} - The shuffled array.
 */
function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

/**
 * Adds options (answer choices) to the game scene.
 */
function addOptions() {
  let nY =
    questionBox.y +
    questionBox.height +
    /* getScaleVal4HeightPosY( */optionBoxMarginY/* ) */;
  balls = game.add.group();
  balls.enableBody = true;
  balls.physicsBodyType = Phaser.Physics.BOX2D;
  shuffle(arrOptions[currentQuestionIndex]);
  for (var i = 0; i < arrOptions[currentQuestionIndex].length; i++) {
    let optionBox = game.add.image(0, 0, "option_box");
    optionBox.events.onInputDown.add(onOptionClick, this);
    optionBox.inputEnabled = true;
    arrOptionBox.push(optionBox);
    let optionBox_red = game.add.image(0, 0, "optionBox_red");
    optionBox.red = optionBox_red;
    let optionBox_green = game.add.image(0, 0, "optionBox_green");
    optionBox.green = optionBox_green;
    optionBox.isTrue = arrOptions[currentQuestionIndex][i].isTrue;
    optionBox.index = i;
    optionBox_red.visible = false;
    optionBox.addChild(optionBox_red);
    optionBox_green.visible = false;
    optionBox.addChild(optionBox_green);

    optionBox.scale.setTo(
      getScaleVal4WidthPosX(0.32),
      getScaleVal4HeightPosY(0.32)
    );
    optionBox.smoothed = true;
    optionBox.y = /* getScaleVal4HeightPosY( */nY/* ) */;
    if ((i + 1) % 2 == 0) {
      optionBox.x =
        gameWidth - optionBox.width - getScaleVal4WidthPosX(optionBoxMarginX);
      nY += questionBox.height + /* getScaleVal4HeightPosY( */optionBoxMarginY/* ) */;
    } else {
      optionBox.x = getScaleVal4WidthPosX(optionBoxMarginX);
    }
    // HTML overlay text — positioned in CSS pixels, not affected by canvas scale
    var textLayer = document.getElementById('text-layer');
    if (textLayer) {
      var oEl = document.createElement('div');
      oEl.className = 'option-text-html';
      oEl.style.cssText = 'position:absolute;left:' + optionBox.x + 'px;top:' + optionBox.y + 'px;width:' + optionBox.width + 'px;height:' + optionBox.height + 'px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;font-family:"Encode Sans Expanded",Arial,sans-serif;color:#222;text-align:center;padding:0 8px;box-sizing:border-box;line-height:1.3;direction:rtl;pointer-events:none;';
      oEl.textContent = normalizeLabelText(arrOptions[currentQuestionIndex][i].text, false);
      textLayer.appendChild(oEl);
      optionBox.htmlEl = oEl;
    }

    fliper = game.add.sprite(
      optionBox.x + getScaleVal4WidthPosX(fliperMargin),
      optionBox.y - getScaleVal4HeightPosY(10),
      "fliper1"
    );
    fliper.scale.setTo(
      getScaleVal4WidthPosX(fliperScale),
      getScaleVal4HeightPosY(fliperScale)
    );
    fliper.smoothed = true;
    fliper.tint = 0x8e44ad;

    game.physics.box2d.enable(fliper, false);
    fliper.body.static = true;
    fliper.body.rotation = -fliperAngle;
    optionBox.fliper1 = fliper;
    arrFliper.push(fliper);

    fliper = game.add.sprite(
      optionBox.x + optionBox.width - getScaleVal4WidthPosX(fliperMargin),
      optionBox.y - getScaleVal4HeightPosY(10),
      "fliper2"
    );
    fliper.scale.setTo(
      getScaleVal4WidthPosX(fliperScale),
      getScaleVal4HeightPosY(fliperScale)
    );
    fliper.smoothed = true;
    fliper.tint = 0x8e44ad;

    game.physics.box2d.enable(fliper, false);
    fliper.body.static = true;
    fliper.body.rotation = fliperAngle;
    optionBox.fliper2 = fliper;
    arrFliper.push(fliper);

    sprite = balls.create(
      optionBox.x + optionBox.width / 2,
      optionBox.y,
      "yellowBall"
    );
    sprite.scale.setTo(getScaleVal4WidthPosX(ballScale));
    sprite.body.setCollisionCategory(2); // this is a bitmask
    sprite.body.sensor = true;
    sprite.body.setCircle(sprite.width / 2);
    sprite.body.setBodyContactCallback(hitPoint, bucketTouchCallback, this);
    sprite.body.setBodyContactCallback(hidden_h, floorWallTouchCallback, this);
    sprite.body.setBodyContactCallback(hidden_h1, floorWallTouchCallback, this);
    sprite.body.setBodyContactCallback(hidden_v, floorWallTouchCallback, this);
    sprite.body.setBodyContactCallback(hidden_v1, floorWallTouchCallback, this);
    sprite.body.setBodyContactCallback(hidden_v2, floorWallTouchCallback, this);
    sprite.body.setBodyContactCallback(hidden_v3, floorWallTouchCallback, this);
    //sprite.answer = arrOptions[i];
    sprite.index = i;
    sprite.events.onInputDown.add(onOptionClick, this);
    sprite.inputEnabled = true;
    spritesArr.push(sprite);
  }
  game.world.bringToTop(balls);
  notifyQuestionChange();
}

let collisionHappened = false;

/**
 * Callback function for when a ball touches the floor or wall.
 */
function floorWallTouchCallback(body1, body2, fixture1, fixture2, begin) {
  if (!bIsMuted) {
    let time = new Date().getTime();
    let timeDifference = time - ballBounceCurTime;
    ballBounceCurTime = time;

    if (ballBounceCurTime == 0 || timeDifference >= 400)
      audio_ball_bounce._volume = 1;
    else if (timeDifference >= 100)
      audio_ball_bounce._volume = timeDifference / 400;

    audio_ball_bounce.play();
  }
}

/**
 * Callback function for when a ball touches the bucket.
 */
function bucketTouchCallback(body1, body2, fixture1, fixture2, begin) {
  if (!collisionHappened) {
    if (!bIsMuted) audio_ball_into_bucket.play();
    collisionHappened = true;
    spritesArr[ballIndex].destroy();
    balls.destroy();
    addBucketAnim();
    spritesArr = [];
    arrOptionBox = [];
  }
}

/**
 * Updates the displayed question number in the game UI.
 */
function updateQnNum() {
  quesText.text = currentQuestionIndex + 1 + "/" + arrQuestions.length;
}

/**
 * Updates the player's score and updates the score display in the game UI.
 * @param {number} nScore - The score to be added to the player's current score.
 */
function updateScore(nScore) {
  score += nScore;
  scoreText.text = score < 10 ? "0" + Math.round(score) : Math.round(score);

  // uploadScoreReport({"doneOptions":doneOptions, "doneQuestions":doneQuestions, "gameName":"ballgame","gameScore":score, 'gameTimeSecond':diff_seconds(new Date(), startTime) + lastRunTime, 'wrongAnswers':num-numOfCorrect})
  safeUploadScoreReport({
    currentQuestionIndex: currentQuestionIndex,
    doneOptions: doneOptions,
    doneQuestions: doneQuestions,
    gameName: "ballgame",
    gameScore: score,
    gameTimeSecond: diff_seconds(new Date(), startTime) + lastRunTime,
  });
}

/**
 * Initiates the transition to the next question in the game.
 */
function nextQuestion() {
  setTimeout(() => {
    isNextQnRender = false;
  }, 2000);
  currentQuestionIndex++;
  skip.visible = false;
  if (currentQuestionIndex > arrQuestions.length - 1) {
    if (!bIsMuted) audio_applause.play();
    if (objCustomizedTimer) objCustomizedTimer.destoryTimer();
    updateDataOnGameCompleted();
    return;
  }

  updateQnNum();
  spritesArr = [];
  arrOptionBox = [];
  changeLevel();
  //addObstacles();
  //addHitPoint();
  addQuestion();
  //addScoreBox()
  setTimeout(() => {
    addOptions();
    resetTimer();
    addBucket();
  }, 1);
}

/**
 * Changes the level (background, box, basket) based on the current question index.
 */
function changeLevel() {
  if (currentQuestionIndex >= 2 && currentQuestionIndex < 6) {
    bg.destroy();
    addBg("wall_orange");
    box.destroy();
    addBox("box_orange", 0);
    basket.destroy();
    addBasket("basket_orange");
    hitPoint.body.x = gameWidth - getScaleVal4HeightPosY(65);

    hidden_h1.body.angle = 10;
    hidden_h1.body.y = getScaleVal4HeightPosY(230);

    hidden_v.body.x = -10;
    hidden_v3.body.x = -10;

    hidden_v1.body.x = gameWidth - getScaleVal4WidthPosX(20);
    hidden_v2.body.x = gameWidth - getScaleVal4WidthPosX(110);

    if (bucketAnim) bucketAnim.x = getScaleVal4WidthPosX(200);
  } else if (currentQuestionIndex >= 6) {
    bg.destroy();
    addBg("wall_green");
    box.destroy();
    addBox("box_green", 0);
    basket.destroy();
    addBasket("basket_green");
    hitPoint.body.x = gameWidth / 2;

    hidden_h1.body.angle = 0;
    hidden_h1.body.y = gameHeight - getScaleVal4HeightPosY(-10);

    hidden_v.body.x = gameWidth / 2 - getScaleVal4WidthPosX(65);
    hidden_v.body.y = gameHeight - getScaleVal4HeightPosY(90);
    game.world.bringToTop(hidden_v);

    hidden_v3.body.angle = 5;
    hidden_v3.body.x = gameWidth / 2 + getScaleVal4WidthPosX(75);
    hidden_v3.body.y = gameHeight - getScaleVal4HeightPosY(113);
    game.world.bringToTop(hidden_v3);

    hidden_v1.body.x = gameWidth / 2 + getScaleVal4WidthPosX(42);
    hidden_v2.body.x = gameWidth / 2 - getScaleVal4WidthPosX(42);
  }
  game.world.sendToBack(bg);
}

/**
 * Removes event listeners from option boxes to prevent further interaction.
 */
function removeListeners() {
  for (let i = 0; i < arrOptionBox.length; i++) {
    if (spritesArr[i]) {
      spritesArr[i].events.onInputDown.remove(onOptionClick, this);
      spritesArr[i].inputEnabled = false;
    }
    if (arrOptionBox[i]) {
      arrOptionBox[i].events.onInputDown.remove(onOptionClick, this);
      arrOptionBox[i].inputEnabled = false;
    }
  }
}

function showInstructionalVideo() {
  // Pause the game
  game.paused = true;

  // Pause the timer
  if (objCustomizedTimer) {
    objCustomizedTimer.pauseTimer();
  }

  // Create an overlay element
  const overlay = document.createElement('div');
  overlay.id = 'videoOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw'; // Viewport width
  overlay.style.height = '100vh'; // Viewport height
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  overlay.style.zIndex = '1000';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';

  // Create a video element for the video
  const video = document.createElement('video');
  video.src = "assets/videos/instructions.mp4";
  video.style.border = 'none'; // No border
  video.style.width = '100%'; // Full width
  video.style.height = '100%'; // Full height
  video.setAttribute('autoplay', ''); // Autoplay the video
  video.setAttribute('loop', ''); // Loop the video
  video.setAttribute('playsinline', ''); // Ensures inline playback on iOS
  video.muted = true; // Mute the video to autoplay in some browsers

  // Append the video to the overlay, and the overlay to the body
  overlay.appendChild(video);
  document.body.appendChild(overlay);

  // Event listener to close the video and resume the game when the video ends or overlay is clicked
  function closeVideoAndResetTimer() {
    overlay.remove();
    game.paused = false;
    // Reset the timer
    if (objCustomizedTimer) {
      objCustomizedTimer.resetTimer();
    }
  }

  video.addEventListener('ended', closeVideoAndResetTimer);
  overlay.addEventListener('click', closeVideoAndResetTimer);

  // Automatically remove the overlay and video after 12 seconds, and resume the game
  setTimeout(() => {
    overlay.remove();
    game.paused = false;
  }, 12000);
}

let ballIndex;
let incorrect;
let correct;
let bucketAnim;

/**
 * Callback function for when an option box is clicked.
 * @param {object} target - The option box that was clicked.
 */
function onOptionClick(target) {

  if (!this.videoShown) {
    setTimeout(() => {
      this.showInstructionalVideo();
      this.videoShown = true;  // Prevent further showing
    }, 1000);  // Delay to ensure it doesn't overlap with other animations
  }
  setTimeout(() => {
    skip.visible = true;
  }, 3000);
  if (!bIsMuted) audio_click.play();
  removeListeners();
  collisionHappened = false;
  ballIndex = target.index;
  newTarget = arrOptionBox[ballIndex];

  let anim;
  if (newTarget.isTrue == false) {
    doneOptions.push(arrOptions[currentQuestionIndex][ballIndex]);
    doneQuestions.push(arrQuestions[currentQuestionIndex]);
    safeUploadDetailedReport(currentQuestionIndex, {
      gameName: "ballgame",
      question: arrQuestions[currentQuestionIndex],
      userAnswer: arrOptions[currentQuestionIndex][ballIndex],
      isCorrectAnswer: false,
    });
    updateScore(0);
    newTarget.red.visible = true;
    for (let i = 0; i < arrOptionBox.length; i++) {
      const element = arrOptionBox[i];

      if (element.isTrue != false) {
        element.green.visible = true;
        break;
      }
    }
    incorrect = game.add.sprite(0, 0, "incorrect_anim");
    incorrect.scale.setTo(
      getScaleVal4WidthPosX(0.2),
      getScaleVal4HeightPosY(0.2)
    );
    incorrect.x = newTarget.x + getScaleVal4WidthPosX(25);
    incorrect.y = newTarget.y - newTarget.height + getScaleVal4HeightPosY(5);
    anim = incorrect.animations.add("run");
    incorrect.play("run", 15, false);
    if (!bIsMuted) {
      setTimeout(() => {
        audio_wrong.play();
      }, 1000);
    }
  } else {
    doneOptions.push(arrOptions[currentQuestionIndex][ballIndex]);
    doneQuestions.push(arrQuestions[currentQuestionIndex]);
    safeUploadDetailedReport(currentQuestionIndex, {
      gameName: "ballgame",
      question: arrQuestions[currentQuestionIndex],
      userAnswer: arrOptions[currentQuestionIndex][ballIndex],
      isCorrectAnswer: true,
    });
    // updateScore(8);
    updateScore(Math.round(100 / arrQuestions.length * 100) / 100);
    newTarget.green.visible = true;
    correct = game.add.sprite(0, 0, "correct_anim");
    correct.scale.setTo(
      getScaleVal4WidthPosX(0.2),
      getScaleVal4HeightPosY(0.2)
    );
    correct.x = newTarget.x + getScaleVal4WidthPosX(10);
    correct.y = newTarget.y - newTarget.height + getScaleVal4HeightPosY(5);
    anim = correct.animations.add("run");
    correct.play("run", 15, false);
    if (!bIsMuted) {
      setTimeout(() => {
        audio_correct.play();
      }, 1000);
    }
  }
  if (!bIsMuted) {
    setTimeout(() => {
      audio_fliper.play();
    }, 500);
  }
  anim.onComplete.add(animationStopped, this);

  setTimeout(() => {
    makeDraggable({
      item: spritesArr[newTarget.index],
      startCallback: handleDragStart,
      stopCallback: handleDragStop,
      updateCallback: handleDragUpdate,
    });
  }, 2000);

  newTarget.fliper1.body.static = false;
  newTarget.fliper2.body.static = false;

  newTarget.fliper1.body.x = newTarget.x + 34;
  newTarget.fliper2.body.x = newTarget.x + newTarget.width - 34;
  newTarget.fliper1.body.rotation = fliperAngle;
  newTarget.fliper2.body.rotation = -fliperAngle;
  newTarget.fliper1.body.static = true;
  newTarget.fliper2.body.static = true;
  game.time.events.add(Phaser.Timer.SECOND * 0.1, removeItemsFromStage, this);
  if (currentQuestionIndex < 2) {
    spritesArr[ballIndex].body.x = gameWidth / 2 + getScaleVal4WidthPosX(100);
  } else if (currentQuestionIndex >= 2 && currentQuestionIndex < 6) {
    spritesArr[ballIndex].body.x = getScaleVal4WidthPosX(50);
  } else if (currentQuestionIndex >= 6) {
    spritesArr[ballIndex].body.x = gameWidth - getScaleVal4WidthPosX(50);
  }
  spritesArr[ballIndex].body.y = gameHeight - getScaleVal4HeightPosY(300);
}

/**
 * Callback function for when an animation completes.
 */
function animationStopped(sprite, animation) {
  removeItemsFromStage();
}

/**
 * Removes various game elements from the stage after an interaction.
 */
function removeItemsFromStage() {
  removeQuestion();
  removeOptions();
  removeFlipers();
  removeBalls();
  removeAnimations();
}

/**
 * Removes the question box from the stage with a fade-out effect.
 */
function removeQuestion() {
  var qEl = document.getElementById('question-text-html');
  if (qEl) qEl.remove();
  let tw = game.add
    .tween(questionBox)
    .to({ alpha: 0.5 }, 2000, Phaser.Easing.Linear.None, true);
  tw.onComplete.add(onTweenCompletion, this);
}

function onTweenCompletion(target) {
  target.destroy();
  target = null;
}

function onTweenFinish() {
  alert("onTweenFinish");
}

/**
 * Removes option boxes from the stage with a fade-out effect.
 */
function removeOptions() {
  document.querySelectorAll('.option-text-html').forEach(function(el) { el.remove(); });
  for (let i = 0; i < arrOptionBox.length; i++) {
    let tw = game.add
      .tween(arrOptionBox[i])
      .to({ alpha: 0 }, 2000, Phaser.Easing.Linear.None, true);
    tw.onComplete.add(onTweenCompletion, this);
  }
}

/**
 * Removes flippers from the stage with a fade-out effect.
 */
function removeFlipers() {
  for (let i = 0; i < arrFliper.length; i++) {
    let tw = game.add
      .tween(arrFliper[i])
      .to({ alpha: 0 }, 2000, Phaser.Easing.Linear.None, true);
    tw.onComplete.add(onTweenCompletion, this);
  }
}

/**
 * Removes balls from the stage with a fade-out effect.
 */
function removeBalls() {
  for (let i = 0; i < spritesArr.length; i++) {
    if (i != ballIndex) {
      let tw = game.add
        .tween(spritesArr[i])
        .to({ alpha: 0 }, 2000, Phaser.Easing.Linear.None, true);
      tw.onComplete.add(onTweenCompletion, this);
    }
  }
}

/**
 * Removes animations from the stage with a fade-out effect.
 */
function removeAnimations() {
  let tw;
  if (correct)
    tw = game.add
      .tween(correct)
      .to({ alpha: 0 }, 2000, Phaser.Easing.Linear.None, true);
  if (incorrect)
    tw = game.add
      .tween(incorrect)
      .to({ alpha: 0 }, 2000, Phaser.Easing.Linear.None, true);

  if (tw) tw.onComplete.add(onTweenCompletion, this);
}

/**
 * Checks if the text direction is right-to-left (RTL).
 * @returns {boolean} - True if the text direction is RTL, otherwise false.
 */
function isRtl() {
  return Direction === "rtl";
}

/**
 * Updates the progress of asset loading during the game's initialization.
 */
function loadUpdate() {
  let cPreloaderBarWidth = 210;
  let cPreloaderBar = document.getElementsByClassName("cPreloaderBar")[0];
  let preloaderText = document.getElementsByClassName("cPreloaderText")[0];

  cPreloaderBar.style.width =
    (game.load.progress / 100) * cPreloaderBarWidth + "px";
  preloaderText.innerHTML = game.load.progress + "%";
}

/**
 * Function called on every frame update.
 */
function update() {
  /* if (moveMouse) {
    pointer.rotation = game.physics.arcade.moveToPointer(pointer, 60, game.input.activePointer, 500);
  } */
}

/**
 * Renders debug information for the game.
 */
function render() {
  //game.debug.box2dWorld();
}

/**
 * Calculates the difference in seconds between two Date objects.
 * @param {Date} dt2 - The later date/time.
 * @param {Date} dt1 - The earlier date/time.
 * @returns {number} - The difference in seconds.
 */
function diff_seconds(dt2, dt1) {
  var diff = (dt2.getTime() - dt1.getTime()) / 1000;
  return Math.abs(Math.round(diff));
}

/**
 * Checks the screen orientation and displays a message accordingly.
 */
function checkScreenOrientation() {
  var screenOrientation = window.orientation;
  var orientationEl = document.getElementById("OrientationMsg");
  if (!orientationEl) return;
  if (texts["SupportsOnlyVertical"] && texts["SupportsOnlyVertical"][lang]) {
    orientationEl.innerHTML = texts["SupportsOnlyVertical"][lang];
  }
  if (screenOrientation === 90 || screenOrientation === -90)
    orientationEl.style.display = "block";
  else orientationEl.style.display = "none";
}

window.onresize = function () {
  checkScreenOrientation();
};

function getVelocityCoordinate() {
  let diffX = dragEndPoints.x - dragStartPoints.x;
  let diffY = dragEndPoints.y - dragStartPoints.y;
  let coordinateX = diffX * accelaration + dragStartPoints.x;
  let coordinateY = diffY * accelaration + dragStartPoints.y;

  return { x: diffX * accelaration, y: diffY * accelaration };
  // return {x: coordinateX < 0 ? 0 : coordinateX, y: coordinateY < 0 ? 0 : coordinateY };
}

/**
 * Handles the dragging of game objects during gameplay.
 */
function handleDragStart(obj, pointer) {
  selBall = obj;
  isDragging = true;
  const p = pointer || game.input.activePointer;
  dragStartPoints.x =
    p && typeof p.worldX === "number" ? p.worldX : game.input.x;
  dragStartPoints.y =
    p && typeof p.worldY === "number" ? p.worldY : game.input.y;
}

/**
 * Handles the end of dragging of game objects during gameplay.
 */
function handleDragStop(obj, pointer) {
  isDragging = false;
  const p = pointer || game.input.activePointer;
  dragEndPoints.x =
    p && typeof p.worldX === "number" ? p.worldX : game.input.x;
  dragEndPoints.y =
    p && typeof p.worldY === "number" ? p.worldY : game.input.y;

  let velocityCoordinatePoints = getVelocityCoordinate();
  selBall.body.setZeroVelocity();
  selBall.body.velocity.x = velocityCoordinatePoints.x;
  selBall.body.velocity.y = velocityCoordinatePoints.y;
  selBall = null;
}

/**
 * Handles the updating of dragged game objects during gameplay.
 */
function handleDragUpdate(obj, pointer, x, y, snapPoint, isFirstUpdate) {
  // console.log( 'UPDATE DRAG', obj )
}

/**
 * Makes game objects draggable during gameplay.
 * @param {object} param0 - The parameters for making objects draggable.
 */
function makeDraggable({ item, startCallback, stopCallback, updateCallback }) {
  if (item.forEach) {
    item.forEach(makeDraggableObject);
  } else {
    makeDraggableObject(item);
  }

  function makeDraggableObject(obj) {
    if (obj.forEach) {
      obj.forEach(makeDraggableObject);
      return;
    }

    obj.inputEnabled = true;
    obj.input.enableDrag();
    obj.origin = new Phaser.Point(obj.x, obj.y);

    const callback = item.forEach ? handleDragUpdate : updateCallback;
    //   if ( callback ) obj.events.onDragUpdate.add( callback )
    if (startCallback) obj.events.onDragStart.add(startCallback);
    if (stopCallback) obj.events.onDragStop.add(stopCallback);
  }

  /*function handleDragUpdate ( obj, pointer, x, y, snapPoint, isFirstUpdate ) {
      if ( isFirstUpdate ) {
        obj.startDragPos = new Phaser.Point( obj.x, obj.y )
        item.startDragPos = new Phaser.Point( item.x, item.y )
      }

      item.x = item.startDragPos.x - obj.origin.x + x
      item.y = item.startDragPos.y - obj.origin.y + y
      obj.x = obj.startDragPos.x
      obj.y = obj.startDragPos.y

      if ( updateCallback ) updateCallback( obj, pointer, x, y, snapPoint, isFirstUpdate )
    }*/
}

/**
 * Updates the timer display on every second during gameplay.
 * @param {number} nTime - The remaining time on the timer.
 */
var updatePerSec = (nTime) => {
  timerText.text = nTime < 10 ? "0" + nTime : nTime;

  if (nTime == 0) {
    objCustomizedTimer.destoryTimer();
    if (spritesArr[ballIndex]) spritesArr[ballIndex].destroy();
    balls.destroy();
    if (!bIsMuted) audio_wrong.play();

    removeItemsFromStage();
    bucket.destroy();
    setTimeout(() => {
      if (!isNextQnRender) {
        isNextQnRender = true;
        updateScore(0);
        nextQuestion();
      }
    }, 1000);
  }
};

/**
 * Starts the timer for the game.
 */
function startTimer() {
  objCustomizedTimer = new CustomizedTimer(updatePerSec, nTimerDuration);
  objCustomizedTimer.startTimer();
}

/**
 * Resets the timer for the game.
 */
function resetTimer() {
  objCustomizedTimer.resetTimer(nTimerDuration);
}

/**
 * Updates data and completes the game when all questions are answered.
 */
// Game completed
function updateDataOnGameCompleted() {
  // uploadDetailedReport(currentQuestionIndex, {"gameName":"ballgame",'question':arrQuestions[currentQuestionIndex],"userAnswer":arrOptions[currentQuestionIndex][ballIndex],"isCorrectAnswer":true}).then(innerdoc => {
  safeUploadScoreReport({
    isDone: true,
    gameName: "ballgame",
    gameScore: score,
    gameTimeSecond: diff_seconds(new Date(), startTime) + lastRunTime,
  }).then(() => {
    safeCompleteComponentAndNavigate();
  });
  // });
  /* uploadDetailedReport(index, {"gameName":"ballgame",'question':question1,"userAnswer":answer,"isCorrectAnswer":true}).then(innerdoc => {
    uploadScoreReport({"doneOptions":doneOptions, "doneQuestions":doneQuestions, "isDone":true, "gameName":"ballgame","gameScore":score,'gameTimeSecond':diff_seconds(new Date(), startTime) + lastRunTime, 'wrongAnswers':num-numOfCorrect}).then(() => {
        completeComponentAndNavigate();
    })
  }); */
}


/*



function showMessage(message) {
  console.log("Showing message:", message);

  // Create a modal group
  var modalGroup = game.add.group();

  // Calculate position for the modal rectangle
  var modalWidth = game.width * 0.8;
  var modalHeight = game.height * 0.4;
  var modalX = (game.width - modalWidth) / 2;
  var modalY = (game.height - modalHeight) / 2;

  // Add background box with rounded corners
  var graphics = game.add.graphics();
  graphics.beginFill(hexToNum(NATURE.LEAF_BG), 0.92);
  graphics.drawRoundedRect(modalX, modalY, modalWidth, modalHeight, 20);
  modalGroup.add(graphics);

  // Add text to the modal
  var style = {font: "bold 32px 'Encode Sans Expanded', Arial", fill: '#ffffff', wordWrap: true, wordWrapWidth: modalWidth - 40, align: 'center'};
  var text = game.add.text(modalX + modalWidth / 2, modalY + modalHeight / 2, message, style);
  text.anchor.set(0.5);
  modalGroup.add(text);

  // Hide the modal after 5 seconds (adjust as needed)
  game.time.events.add(Phaser.Timer.SECOND * 5, function () {
    console.log("Hiding message:", message);
    modalGroup.destroy();
  }, this);
}

function showInstructionalGif() {
  console.log("Attempting to display instructional GIF");

  // Create a modal group
  var modalGroup = game.add.group();

  // Calculate position for the modal rectangle
  var modalWidth = game.width * 0.8;
  var modalHeight = game.height * 0.5; // Adjust for optimal display of the GIF
  var modalX = (game.width - modalWidth) / 2;
  var modalY = (game.height - modalHeight) / 2;

  // Add background box with rounded corners
  var graphics = game.add.graphics();
  graphics.beginFill(hexToNum(NATURE.LEAF_BG), 0.92);
  graphics.drawRoundedRect(modalX, modalY, modalWidth, modalHeight, 10);
  modalGroup.add(graphics);

  // Load and add the instructional GIF
  var gif = game.add.sprite(modalX + modalWidth / 2, modalY + modalHeight / 2, 'guideGif');
  gif.anchor.setTo(0.5);
  gif.width = modalWidth - 20; // Adjust the width slightly smaller than the modal to fit comfortably
  gif.height = modalHeight - 20; // Maintain aspect ratio or adjust based on the GIF size
  modalGroup.add(gif);

  // Debugging: Check if the sprite has the texture loaded
  if (!gif.texture.baseTexture.source) {
    console.error("GIF not found at given path, please check the file path and preload process.");
  } else if (gif.texture.baseTexture.hasLoaded) {
    console.log("GIF texture is loaded and should be visible.");
  } else {
    console.error("GIF texture is not loaded yet.");
    gif.events.onLoadComplete.addOnce(function() {
      console.log("GIF texture has finished loading.");
    });
  }

  // Hide the modal after 10 seconds
  game.time.events.add(Phaser.Timer.SECOND * 10, function() {
    console.log("Hiding instructional GIF");
    modalGroup.destroy();
  }, this);
}


 */
