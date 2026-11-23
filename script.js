
"use strict";

// HIKKI FIT 0.5

const $ = id => document.getElementById(id);

const KEYS = {
  exercises: "hikki_fit_exercises_v1",
  workouts: "hikki_fit_workouts_v1",
  history: "hikki_fit_history_v1",
  theme: "hikki_fit_theme"
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

let exercises = load(KEYS.exercises);
let workouts = load(KEYS.workouts);
let history = load(KEYS.history);
let editingExercise = null;
let editingWorkout = null;
let session = null;
let timerInterval = null;
let timerRemaining = 0;
let timerDeadline = 0;
let timerRunning = false;
let toastTimeout;

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(error);
    toast("Não foi possível salvar os dados.");
    return false;
  }
}

function el(tag, content, className = "") {
  const node = document.createElement(tag);
  node.textContent = content;
  if (className) node.className = className;
  return node;
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("toast").classList.remove("show"), 3000
  );
}

function button(text, className, action) {
  const b = el("button", text, className);
  b.type = "button";
  b.addEventListener("click", action);
  return b;
}

function showPage(page) {
  if (session && page !== "training") {
    toast("Finalize ou saia do treino primeiro.");
    return;
  }

  document.querySelectorAll(".page").forEach(p => {
    p.classList.toggle("active", p.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.page === page);
  });

  document.querySelector(".bottom-nav").hidden =
    page === "training";

  if (page === "home") renderHome();
  if (page === "routine") renderWorkouts();
  if (page === "profile") renderStats();
  if (page === "history") renderHistory();

  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-btn").forEach(b => {
  b.addEventListener("click", () => showPage(b.dataset.page));
});

$("openHistory").onclick = () => showPage("history");

// TEMA

let theme = "dark";
try {
  if (localStorage.getItem(KEYS.theme) === "light") {
    theme = "light";
  }
} catch {}

function applyTheme() {
  document.body.classList.toggle("light", theme === "light");
  $("themeBtn").textContent = theme === "light" ? "☾" : "☀";
}

$("themeBtn").onclick = () => {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme();
  try {
    localStorage.setItem(KEYS.theme, theme);
  } catch {
    toast("Não foi possível salvar o tema.");
  }
};

applyTheme();

// EXERCÍCIOS

const exerciseDialog = $("exerciseDialog");
const exerciseForm = $("exerciseForm");

function updateExerciseType() {
  const timed = $("exerciseType").value === "time";
  $("timeField").hidden = !timed;
  $("repsField").hidden = timed;
  $("exerciseDuration").required = timed;
  $("exerciseReps").required = !timed;
}

$("exerciseType").onchange = updateExerciseType;

function openExercise(exercise = null) {
  exerciseForm.reset();
  editingExercise = exercise?.id || null;

  $("exerciseFormTitle").textContent =
    exercise ? "Editar exercício" : "Novo exercício";

  if (exercise) {
    $("exerciseName").value = exercise.name;
    $("exerciseSets").value = exercise.sets;
    $("exerciseType").value = exercise.type;
    $("exerciseReps").value = exercise.reps || 10;
    $("exerciseDuration").value = exercise.duration || 60;
    $("exerciseDescription").value = exercise.description || "";
  }

  updateExerciseType();
  exerciseDialog.showModal();
}

$("addExerciseBtn").onclick = () => openExercise();
$("closeExerciseDialog").onclick = () => exerciseDialog.close();

exerciseForm.onsubmit = event => {
  event.preventDefault();

  const type = $("exerciseType").value;
  const sets = Number($("exerciseSets").value);
  const reps = Number($("exerciseReps").value);
  const duration = Number($("exerciseDuration").value);
  const amount = type === "time" ? duration : reps;
  const max = type === "time" ? 86400 : 10000;
  const name = $("exerciseName").value.trim();

  if (!name || !Number.isInteger(sets) ||
      sets < 1 || sets > 100 ||
      !Number.isInteger(amount) ||
      amount < 1 || amount > max) {
    toast("Confira os dados do exercício.");
    return;
  }

  const item = {
    id: editingExercise || crypto.randomUUID(),
    name,
    sets,
    type,
    reps: type === "reps" ? reps : null,
    duration: type === "time" ? duration : null,
    description: $("exerciseDescription").value.trim()
  };

  const next = editingExercise
    ? exercises.map(e => e.id === editingExercise ? item : e)
    : [...exercises, item];

  if (!save(KEYS.exercises, next)) return;

  exercises = next;
  exerciseDialog.close();
  renderExercises();
  renderWorkouts();
  renderHome();
  toast("Exercício salvo! 💜");
};

function renderExercises() {
  const list = $("exerciseList");
  list.replaceChildren();
  $("exerciseCount").textContent =
    `${exercises.length} exercício(s) cadastrado(s)`;

  if (!exercises.length) {
    list.append(el("div", "🐱 Nenhum exercício ainda.", "empty-state"));
    return;
  }

  exercises.forEach(e => {
    const card = el("article", "", "exercise-card");
    const detail = e.type === "time"
      ? `${e.sets} séries • ${e.duration}s por série`
      : `${e.sets} séries • ${e.reps} repetições`;

    card.append(el("h3", e.name), el("p", detail, "muted"));

    if (e.description) {
      card.append(el("p", e.description, "muted small"));
    }

    const actions = el("div", "", "exercise-actions");
    actions.append(
      button("✏️ Editar", "secondary-btn", () => openExercise(e)),
      button("🗑 Excluir", "danger-btn", () => {
        if (!confirm(`Excluir "${e.name}"?`)) return;

        // Evita apagar uma referência usada por um treino.
        if (workouts.some(w => w.exerciseIds.includes(e.id))) {
          toast("Remova o exercício dos treinos antes de excluir.");
          return;
        }

        const next = exercises.filter(x => x.id !== e.id);
        if (!save(KEYS.exercises, next)) return;
        exercises = next;
        renderExercises();
        toast("Exercício excluído.");
      })
    );

    card.append(actions);
    list.append(card);
  });
}

// ROTINA SEMANAL

const workoutDialog = $("workoutDialog");
const workoutForm = $("workoutForm");

function openWorkout(workout = null) {
  if (!exercises.length) {
    toast("Cadastre um exercício primeiro.");
    return;
  }

  workoutForm.reset();
  editingWorkout = workout?.id || null;
  $("workoutFormTitle").textContent =
    workout ? "Editar treino" : "Criar treino";
  $("workoutName").value = workout?.name || "";

  document.querySelectorAll("#workoutDays input").forEach(input => {
    input.checked = workout
      ? workout.days.includes(Number(input.value))
      : false;
  });

  const options = $("workoutExerciseOptions");
  options.replaceChildren();

  exercises.forEach(e => {
    const label = el("label", "", "workout-option");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.value = e.id;
    check.checked = workout
      ? workout.exerciseIds.includes(e.id)
      : false;
    label.append(check, el("span", e.name));
    options.append(label);
  });

  workoutDialog.showModal();
}

$("addWorkoutBtn").onclick = () => openWorkout();
$("closeWorkoutDialog").onclick = () => workoutDialog.close();

workoutForm.onsubmit = event => {
  event.preventDefault();

  const name = $("workoutName").value.trim();
  const days = [...document.querySelectorAll(
    "#workoutDays input:checked"
  )].map(x => Number(x.value));

  const exerciseIds = [...document.querySelectorAll(
    "#workoutExerciseOptions input:checked"
  )].map(x => x.value);

  if (!name || !days.length || !exerciseIds.length) {
    toast("Informe nome, dias e exercícios.");
    return;
  }

  const item = {
    id: editingWorkout || crypto.randomUUID(),
    name, days, exerciseIds
  };

  const next = editingWorkout
    ? workouts.map(w => w.id === editingWorkout ? item : w)
    : [...workouts, item];

  if (!save(KEYS.workouts, next)) return;

  workouts = next;
  workoutDialog.close();
  renderWorkouts();
  renderHome();
  toast("Treino salvo! 💜");
};

function renderWorkouts() {
  const list = $("workoutList");
  list.replaceChildren();

  if (!workouts.length) {
    list.append(el("div", "Nenhum treino cadastrado.", "empty-state"));
  }

  workouts.forEach(w => {
    const card = el("article", "", "exercise-card");
    card.append(
      el("h3", w.name),
      el("p", w.days.map(d => DAYS[d]).join(", "), "workout-days-label")
    );

    w.exerciseIds.forEach(id => {
      const exercise = exercises.find(e => e.id === id);
      card.append(el(
        "div",
        `• ${exercise?.name || "Exercício indisponível"}`,
        "workout-exercise-item"
      ));
    });

    const actions = el("div", "", "exercise-actions");

    actions.append(
      button("▶ Iniciar", "secondary-btn", () => startWorkout(w.id)),
      button("✏️ Editar", "secondary-btn", () => openWorkout(w)),
      button("🗑 Excluir", "danger-btn", () => {
        if (!confirm(`Excluir "${w.name}"?`)) return;
        const next = workouts.filter(x => x.id !== w.id);
        if (!save(KEYS.workouts, next)) return;
        workouts = next;
        renderWorkouts();
        renderHome();
      })
    );

    card.append(actions);
    list.append(card);
  });

  const week = $("weekOverview");
  week.replaceChildren();
  const today = new Date().getDay();

  DAYS.forEach((day, index) => {
    const count = workouts.filter(w => w.days.includes(index)).length;
    const box = el("div", "", "week-day");

    if (count) box.classList.add("has-workout");
    if (index === today) box.classList.add("today");

    box.append(
      el("strong", day),
      el("span", count ? String(count) : "–")
    );

    week.append(box);
  });
}

// INÍCIO

function renderHome() {
  const today = new Date().getDay();
  const scheduled = workouts.filter(w => w.days.includes(today));
  const buttons = $("todayButtons");
  buttons.replaceChildren();

  if (!scheduled.length) {
    $("todayTitle").textContent = "Hoje é dia de descansar? 🌙";
    $("todayDescription").textContent =
      "Nenhum treino planejado para hoje. Você também pode iniciar um treino pela aba Rotina.";
  } else {
    $("todayTitle").textContent =
      scheduled.length === 1 ? scheduled[0].name : "Seus treinos de hoje";
    $("todayDescription").textContent =
      `${scheduled.length} treino(s) planejado(s) para hoje.`;

    scheduled.forEach(w => {
      buttons.append(button(
        `▶ ${w.name}`, "primary-btn", () => startWorkout(w.id)
      ));
    });
  }

  renderStats();
}

// EXECUÇÃO DE TREINOS

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}

function resetTimer() {
  stopTimer();
  const e = session?.items[session.index];
  timerRemaining = e?.type === "time" ? e.duration : 0;
  updateTimerDisplay();
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:` +
    `${String(s % 60).padStart(2, "0")}`;
}

function updateTimerDisplay() {
  $("timerDisplay").textContent = formatTime(timerRemaining);
  $("timerToggle").textContent =
    timerRunning ? "Ⅱ Pausar" : "▶ Iniciar";
}

function tickTimer() {
  timerRemaining = Math.max(
    0, Math.ceil((timerDeadline - Date.now()) / 1000)
  );

  if (timerRemaining === 0) {
    stopTimer();
    toast("Tempo concluído! Marque Feito. 💜");
  }

  updateTimerDisplay();
}

$("timerToggle").onclick = () => {
  if (!session) return;

  if (timerRunning) {
    tickTimer();
    stopTimer();
  } else if (timerRemaining > 0) {
    timerDeadline = Date.now() + timerRemaining * 1000;
    timerRunning = true;
    timerInterval = setInterval(tickTimer, 250);
  }

  updateTimerDisplay();
};

$("timerReset").onclick = resetTimer;

function startWorkout(id) {
  if (session) return;

  const workout = workouts.find(w => w.id === id);
  if (!workout) return;

  const items = workout.exerciseIds
    .map(exerciseId => exercises.find(e => e.id === exerciseId))
    .filter(Boolean)
    .map(e => ({ ...e }));

  if (!items.length) {
    toast("Esse treino não possui exercícios disponíveis.");
    return;
  }

  session = {
    id: crypto.randomUUID(),
    workoutId: workout.id,
    name: workout.name,
    startedAt: new Date().toISOString(),
    startMs: Date.now(),
    index: 0,
    items,
    completed: []
  };

  showPage("training");
  renderTraining();
}

function renderTraining() {
  if (!session) return;

  resetTimer();

  const e = session.items[session.index];
  const total = session.items.length;
  const completed = session.completed.length;

  $("trainingName").textContent = session.name;
  $("trainingProgressText").textContent =
    `${completed} de ${total} exercícios concluídos`;

  const percent = Math.round(completed / total * 100);
  $("trainingPercent").textContent = `${percent}%`;
  $("trainingProgressBar").style.width = `${percent}%`;

  $("currentExerciseName").textContent = e.name;
  $("currentExerciseDetails").textContent = e.type === "time"
    ? `${e.sets} séries de ${e.duration} segundos`
    : `${e.sets} séries de ${e.reps} repetições`;

  $("exerciseInstructions").textContent =
    e.description || "Sem instruções cadastradas.";

  $("timerArea").hidden = e.type !== "time";

  const done = session.completed.some(x => x.index === session.index);
  $("completeExercise").textContent = done
    ? "✓ Exercício concluído"
    : "✓ Feito";
  $("completeExercise").disabled = done;

  $("nextExercise").textContent =
    session.index === total - 1 ? "Finalizar treino →" : "Próximo →";
}

$("completeExercise").onclick = () => {
  if (!session) return;

  const index = session.index;
  if (session.completed.some(x => x.index === index)) return;

  stopTimer();

  session.completed.push({
    index,
    exercise: { ...session.items[index] },
    completedAt: new Date().toISOString()
  });

  toast("Exercício concluído! 💜");
  renderTraining();
};

$("nextExercise").onclick = () => {
  if (!session) return;

  const done = session.completed.some(
    x => x.index === session.index
  );

  if (!done) {
    toast("Marque Feito antes de avançar.");
    return;
  }

  if (session.index < session.items.length - 1) {
    session.index++;
    renderTraining();
  } else {
    finishWorkout();
  }
};

function finishWorkout() {
  if (!session) return;
  if (session.completed.length !== session.items.length) return;

  stopTimer();

  const record = {
    id: session.id,
    workoutId: session.workoutId,
    name: session.name,
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    durationSeconds: Math.max(
      0, Math.round((Date.now() - session.startMs) / 1000)
    ),
    exercises: session.completed.map(x => ({
      ...x.exercise,
      completedAt: x.completedAt
    }))
  };

  const next = [...history, record];

  if (!save(KEYS.history, next)) {
    toast("Falha ao salvar. Tente finalizar novamente.");
    return;
  }

  history = next;
  session = null;
  showPage("home");
  toast("Treino finalizado! Parabéns! 🎉");
}

$("backTraining").onclick = () => {
  if (!session) return;

  if (!confirm(
    "Sair do treino? O progresso desta sessão será descartado."
  )) return;

  stopTimer();
  session = null;
  showPage("home");
};

window.addEventListener("beforeunload", event => {
  if (session) {
    event.preventDefault();
    event.returnValue = "";
  }
});

// HISTÓRICO E ESTATÍSTICAS

function renderStats() {
  const totalExercises = history.reduce(
    (sum, record) => sum + record.exercises.length, 0
  );

  $("totalWorkouts").textContent = history.length;
  $("totalExercises").textContent = totalExercises;

  const totalSeconds = history.reduce(
    (sum, record) => sum + record.durationSeconds, 0
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  $("profileSummary").textContent =
    `${history.length} treino(s) concluído(s) • ` +
    `${totalExercises} exercício(s) realizado(s) • ` +
    `${minutes}min ${seconds}s de treino registrado.`;
}

function renderHistory() {
  const list = $("historyList");
  list.replaceChildren();

  if (!history.length) {
    list.append(el(
      "div", "🐱 Nenhum treino concluído ainda.", "empty-state"
    ));
    return;
  }

  [...history].reverse().forEach(record => {
    const card = el("article", "", "exercise-card");
    const date = new Date(record.completedAt);
    const duration = formatTime(record.durationSeconds);

    card.append(
      el("h3", record.name),
      el("p", date.toLocaleString("pt-BR"), "muted"),
      el("p", `⏱ ${duration} • ${record.exercises.length} exercícios`,
        "muted")
    );

    record.exercises.forEach(e => {
      card.append(el(
        "div", `✓ ${e.name}`, "workout-exercise-item"
      ));
    });

    list.append(card);
  });
}

// INICIALIZAÇÃO

renderExercises();
renderWorkouts();
renderHome();
renderHistory();
