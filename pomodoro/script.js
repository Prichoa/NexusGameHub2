let studyMinutes = 25;
let breakMinutes = 5;

let time = studyMinutes * 60;
let timer;
let running = false;
let isStudyTime = true;

const timerDisplay = document.getElementById("timer");

function updateDisplay() {
  let minutes = Math.floor(time / 60);
  let seconds = time % 60;

  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  if (running) return;

  running = true;

  timer = setInterval(() => {
    if (time > 0) {
      time--;
      updateDisplay();
    } else {
      clearInterval(timer);
      running = false;

      // Som ao terminar
      const audio = new Audio(
        "https://www.soundjay.com/buttons/sounds/beep-07.mp3"
      );
      audio.play();

      if (isStudyTime) {
        alert("Tempo de estudo finalizado! Hora da pausa.");
        time = breakMinutes * 60;
      } else {
        alert("Pausa finalizada! Hora de estudar.");
        time = studyMinutes * 60;
      }

      isStudyTime = !isStudyTime;
      updateDisplay();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  running = false;
}

function resetTimer() {
  clearInterval(timer);
  running = false;

  isStudyTime = true;
  time = studyMinutes * 60;

  updateDisplay();
}

function applySettings() {
  const studyInput = document.getElementById("studyInput").value;
  const breakInput = document.getElementById("breakInput").value;

  if (studyInput > 0) {
    studyMinutes = parseInt(studyInput);
  }

  if (breakInput > 0) {
    breakMinutes = parseInt(breakInput);
  }

  resetTimer();
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

updateDisplay();
function changeStudyTime(value) {
  studyMinutes += value;

  if (studyMinutes < 1) {
    studyMinutes = 1;
  }

  document.getElementById("studyValue").textContent = studyMinutes;
}

function changeBreakTime(value) {
  breakMinutes += value;

  if (breakMinutes < 1) {
    breakMinutes = 1;
  }

  document.getElementById("breakValue").textContent = breakMinutes;
}
function goToMenu() {
  window.location.href = "index.html";
}