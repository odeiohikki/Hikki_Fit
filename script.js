
"use strict";

// HIKKI FIT v0.6.2
// Correção dos lembretes automáticos

const $ = id => document.getElementById(id);

const KEYS = {
  exercises: "hikki_fit_exercises_v1",
  workouts: "hikki_fit_workouts_v1",
  history: "hikki_fit_history_v1",
  theme: "hikki_fit_theme",
  reminders: "hikki_fit_reminders_v1",
  reminderSent: "hikki_fit_reminder_sent_v1",
  reminderDismissed: "hikki_fit_reminder_dismissed_v1"
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function load(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function loadArray(key) {
  const data = load(key);
  return Array.isArray(data) ? data : [];
}

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

let exercises = loadArray(KEYS.exercises);
let workouts = loadArray(KEYS.workouts);
let history = loadArray(KEYS.history);

const defaultReminders = {
  enabled: false,
  time: "18:00",
  days: [1, 3, 5]
};

let reminders = load(KEYS.reminders, defaultReminders);
let theme = load(KEYS.theme, "dark");

if (theme !== "light") theme = "dark";

let editingExercise = null;
let editingWorkout = null;
let session = null;

let timerInterval = null;
let timerRemaining = 0;
let timerDeadline = 0;
let timerRunning = false;
let toastTimeout = null;

// =====================================
// UTILITÁRIOS
// =====================================

function el(tag, content = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = content;
  if (className) node.className = className;
  return node;
}

function button(label, className, callback) {
  const node = el("button", label, className);
  node.type = "button";
  node.addEventListener("click", callback);
  return node;
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    element.classList.remove("show");
  }, 3500);
}

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function clockTime(date) {
  return String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0");
}

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds));

  return String(Math.floor(value / 60)).padStart(2, "0") +
    ":" +
    String(value % 60).padStart(2, "0");
}

// =====================================
// NAVEGAÇÃO
// =====================================

function showPage(page) {
  if (session && page !== "training") {
    toast("Finalize ou saia do treino primeiro.");
    return;
  }

  document.querySelectorAll(".page").forEach(node => {
    node.classList.toggle("active", node.id === page);
  });

  document.querySelectorAll(".nav-btn").forEach(node => {
    node.classList.toggle(
      "active",
      node.dataset.page === page
    );
  });

  document.querySelector(".bottom-nav").hidden =
    page === "training";

  if (page === "home") renderHome();
  if (page === "routine") renderWorkouts();
  if (page === "exercises") renderExercises();
  if (page === "history") renderHistory();

  if (page === "profile") {
    renderStats();
    renderReminderSettings();
  }

  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-btn").forEach(node => {
  node.onclick = () => showPage(node.dataset.page);
});

$("openHistory").onclick = () => showPage("history");

// =====================================
// TEMA
// =====================================

function applyTheme() {
  document.body.classList.toggle(
    "light",
    theme === "light"
  );

  $("themeBtn").textContent =
    theme === "light" ? "☾" : "☀";
}

$("themeBtn").onclick = () => {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme();
  save(KEYS.theme, theme);
};

applyTheme();

// =====================================
// EXERCÍCIOS
// =====================================

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
    $("exerciseDescription").value =
      exercise.description || "";
  }

  updateExerciseType();
  exerciseDialog.showModal();
}

$("addExerciseBtn").onclick = () => openExercise();

$("closeExerciseDialog").onclick = () => {
  exerciseDialog.close();
};

exerciseForm.onsubmit = event => {
  event.preventDefault();

  const name = $("exerciseName").value.trim();
  const type = $("exerciseType").value;
  const sets = Number($("exerciseSets").value);
  const reps = Number($("exerciseReps").value);
  const duration = Number($("exerciseDuration").value);

  const amount = type === "time" ? duration : reps;
  const maximum = type === "time" ? 86400 : 10000;

  if (
    !name ||
    !Number.isInteger(sets) ||
    sets < 1 ||
    sets > 100 ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > maximum
  ) {
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
    ? exercises.map(exercise =>
        exercise.id === editingExercise ? item : exercise
      )
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
    list.append(
      el("div", "🐱 Nenhum exercício ainda.", "empty-state")
    );
    return;
  }

  exercises.forEach(exercise => {
    const card = el("article", "", "exercise-card");

    const details = exercise.type === "time"
      ? `${exercise.sets} séries • ${exercise.duration}s por série`
      : `${exercise.sets} séries • ${exercise.reps} repetições`;

    card.append(
      el("h3", exercise.name),
      el("p", details, "muted")
    );

    if (exercise.description) {
      card.append(
        el("p", exercise.description, "muted small")
      );
    }

    const actions = el("div", "", "exercise-actions");

    actions.append(
      button("✏️ Editar", "secondary-btn", () => {
        openExercise(exercise);
      }),

      button("🗑 Excluir", "danger-btn", () => {
        if (
          workouts.some(workout =>
            workout.exerciseIds.includes(exercise.id)
          )
        ) {
          toast("Remova o exercício dos treinos primeiro.");
          return;
        }

        if (!confirm(`Excluir "${exercise.name}"?`)) {
          return;
        }

        const next = exercises.filter(
          item => item.id !== exercise.id
        );

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

// =====================================
// ROTINA
// =====================================

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

  document.querySelectorAll(
    "#workoutDays input"
  ).forEach(input => {
    input.checked = workout
      ? workout.days.includes(Number(input.value))
      : false;
  });

  const options = $("workoutExerciseOptions");
  options.replaceChildren();

  exercises.forEach(exercise => {
    const label = el("label", "", "workout-option");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = exercise.id;

    checkbox.checked = workout
      ? workout.exerciseIds.includes(exercise.id)
      : false;

    label.append(
      checkbox,
      el("span", exercise.name)
    );

    options.append(label);
  });

  workoutDialog.showModal();
}

$("addWorkoutBtn").onclick = () => openWorkout();

$("closeWorkoutDialog").onclick = () => {
  workoutDialog.close();
};

workoutForm.onsubmit = event => {
  event.preventDefault();

  const name = $("workoutName").value.trim();

  const days = [
    ...document.querySelectorAll(
      "#workoutDays input:checked"
    )
  ].map(input => Number(input.value));

  const exerciseIds = [
    ...document.querySelectorAll(
      "#workoutExerciseOptions input:checked"
    )
  ].map(input => input.value);

  if (!name || !days.length || !exerciseIds.length) {
    toast("Informe nome, dias e exercícios.");
    return;
  }

  const item = {
    id: editingWorkout || crypto.randomUUID(),
    name,
    days,
    exerciseIds
  };

  const next = editingWorkout
    ? workouts.map(workout =>
        workout.id === editingWorkout ? item : workout
      )
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
    list.append(
      el(
        "div",
        "Nenhum treino cadastrado.",
        "empty-state"
      )
    );
  }

  workouts.forEach(workout => {
    const card = el("article", "", "exercise-card");

    card.append(
      el("h3", workout.name),
      el(
        "p",
        workout.days.map(day => DAYS[day]).join(", "),
        "workout-days-label"
      )
    );

    workout.exerciseIds.forEach(id => {
      const exercise = exercises.find(
        item => item.id === id
      );

      card.append(
        el(
          "div",
          `• ${exercise?.name || "Exercício indisponível"}`,
          "workout-exercise-item"
        )
      );
    });

    const actions = el("div", "", "exercise-actions");

    actions.append(
      button("▶ Iniciar", "secondary-btn", () => {
        startWorkout(workout.id);
      }),

      button("✏️ Editar", "secondary-btn", () => {
        openWorkout(workout);
      }),

      button("🗑 Excluir", "danger-btn", () => {
        if (!confirm(`Excluir "${workout.name}"?`)) {
          return;
        }

        const next = workouts.filter(
          item => item.id !== workout.id
        );

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
    const count = workouts.filter(
      workout => workout.days.includes(index)
    ).length;

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

// =====================================
// INÍCIO
// =====================================

function renderHome() {
  const today = new Date().getDay();

  const scheduled = workouts.filter(
    workout => workout.days.includes(today)
  );

  const buttons = $("todayButtons");
  buttons.replaceChildren();

  if (!scheduled.length) {
    $("todayTitle").textContent =
      "Hoje é dia de descansar? 🌙";

    $("todayDescription").textContent =
      "Nenhum treino planejado para hoje. " +
      "Você pode iniciar um treino pela aba Rotina.";
  } else {
    $("todayTitle").textContent =
      scheduled.length === 1
        ? scheduled[0].name
        : "Seus treinos de hoje";

    $("todayDescription").textContent =
      `${scheduled.length} treino(s) planejado(s) para hoje.`;

    scheduled.forEach(workout => {
      buttons.append(
        button(
          `▶ ${workout.name}`,
          "primary-btn",
          () => startWorkout(workout.id)
        )
      );
    });
  }

  renderReminderBanner();
  renderStats();
}

// =====================================
// EXECUÇÃO DE TREINOS
// =====================================

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}

function updateTimerDisplay() {
  $("timerDisplay").textContent =
    formatTime(timerRemaining);

  $("timerToggle").textContent =
    timerRunning ? "Ⅱ Pausar" : "▶ Iniciar";
}

function resetTimer() {
  stopTimer();

  const exercise = session?.items[session.index];

  timerRemaining = exercise?.type === "time"
    ? exercise.duration
    : 0;

  updateTimerDisplay();
}

function tickTimer() {
  timerRemaining = Math.max(
    0,
    Math.ceil((timerDeadline - Date.now()) / 1000)
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
    timerDeadline =
      Date.now() + timerRemaining * 1000;

    timerRunning = true;

    timerInterval = setInterval(tickTimer, 250);
  }

  updateTimerDisplay();
};

$("timerReset").onclick = resetTimer;

function startWorkout(id) {
  if (session) return;

  const workout = workouts.find(
    item => item.id === id
  );

  if (!workout) return;

  const items = workout.exerciseIds
    .map(exerciseId =>
      exercises.find(
        exercise => exercise.id === exerciseId
      )
    )
    .filter(Boolean)
    .map(exercise => ({ ...exercise }));

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

  const exercise = session.items[session.index];
  const total = session.items.length;
  const completed = session.completed.length;
  const percent = Math.round(
    completed / total * 100
  );

  $("trainingName").textContent = session.name;

  $("trainingProgressText").textContent =
    `${completed} de ${total} exercícios concluídos`;

  $("trainingPercent").textContent = `${percent}%`;

  $("trainingProgressBar").style.width =
    `${percent}%`;

  $("currentExerciseName").textContent =
    exercise.name;

  $("currentExerciseDetails").textContent =
    exercise.type === "time"
      ? `${exercise.sets} séries de ${exercise.duration} segundos`
      : `${exercise.sets} séries de ${exercise.reps} repetições`;

  $("exerciseInstructions").textContent =
    exercise.description ||
    "Sem instruções cadastradas.";

  $("timerArea").hidden =
    exercise.type !== "time";

  const done = session.completed.some(
    item => item.index === session.index
  );

  $("completeExercise").textContent = done
    ? "✓ Exercício concluído"
    : "✓ Feito";

  $("completeExercise").disabled = done;

  $("nextExercise").textContent =
    session.index === total - 1
      ? "Finalizar treino →"
      : "Próximo →";
}

$("completeExercise").onclick = () => {
  if (!session) return;

  const index = session.index;

  if (
    session.completed.some(
      item => item.index === index
    )
  ) {
    return;
  }

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
    item => item.index === session.index
  );

  if (!done) {
    toast("Marque Feito antes de avançar.");
    return;
  }

  if (
    session.index < session.items.length - 1
  ) {
    session.index++;
    renderTraining();
  } else {
    finishWorkout();
  }
};

function finishWorkout() {
  if (
    !session ||
    session.completed.length !== session.items.length
  ) {
    return;
  }

  stopTimer();

  const record = {
    id: session.id,
    workoutId: session.workoutId,
    name: session.name,
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),

    durationSeconds: Math.max(
      0,
      Math.round(
        (Date.now() - session.startMs) / 1000
      )
    ),

    exercises: session.completed.map(item => ({
      ...item.exercise,
      completedAt: item.completedAt
    }))
  };

  const next = [...history, record];

  if (!save(KEYS.history, next)) return;

  history = next;
  session = null;

  showPage("home");

  toast("Treino finalizado! Parabéns! 🎉");
}

$("backTraining").onclick = () => {
  if (!session) return;

  if (
    !confirm(
      "Sair do treino? O progresso será descartado."
    )
  ) {
    return;
  }

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

// =====================================
// HISTÓRICO E ESTATÍSTICAS
// =====================================

function renderStats() {
  const totalExercises = history.reduce(
    (sum, record) =>
      sum + record.exercises.length,
    0
  );

  const totalSeconds = history.reduce(
    (sum, record) =>
      sum + record.durationSeconds,
    0
  );

  $("totalWorkouts").textContent =
    history.length;

  $("totalExercises").textContent =
    totalExercises;

  $("profileSummary").textContent =
    `${history.length} treino(s) concluído(s) • ` +
    `${totalExercises} exercício(s) realizado(s) • ` +
    `${Math.floor(totalSeconds / 60)}min ` +
    `${totalSeconds % 60}s registrados.`;
}

function renderHistory() {
  const list = $("historyList");
  list.replaceChildren();

  if (!history.length) {
    list.append(
      el(
        "div",
        "🐱 Nenhum treino concluído ainda.",
        "empty-state"
      )
    );
    return;
  }

  [...history].reverse().forEach(record => {
    const card = el(
      "article",
      "",
      "exercise-card"
    );

    card.append(
      el("h3", record.name),

      el(
        "p",
        new Date(
          record.completedAt
        ).toLocaleString("pt-BR"),
        "muted"
      ),

      el(
        "p",
        `⏱ ${formatTime(record.durationSeconds)} • ` +
        `${record.exercises.length} exercícios`,
        "muted"
      )
    );

    record.exercises.forEach(exercise => {
      card.append(
        el(
          "div",
          `✓ ${exercise.name}`,
          "workout-exercise-item"
        )
      );
    });

    list.append(card);
  });
}

// =====================================
// LEMBRETES v0.6.2
// =====================================

function validReminder(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.enabled === "boolean" &&
    typeof value.time === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) &&
    Array.isArray(value.days) &&
    value.days.every(
      day =>
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6
    )
  );
}

if (!validReminder(reminders)) {
  reminders = { ...defaultReminders };
}

// Identificador único do lembrete do dia.
// Exemplo: 2026-11-23_18:00
function reminderMarker(now = new Date()) {
  return `${dateKey(now)}_${reminders.time}`;
}

function reminderDue(now = new Date()) {
  if (!reminders.enabled) return false;

  if (
    !reminders.days.includes(now.getDay())
  ) {
    return false;
  }

  return clockTime(now) >= reminders.time;
}

function reminderWasDismissed(now = new Date()) {
  return (
    load(KEYS.reminderDismissed, "") ===
    reminderMarker(now)
  );
}

function dismissReminder() {
  const marker = reminderMarker();

  if (
    !save(KEYS.reminderDismissed, marker)
  ) {
    return;
  }

  renderReminderBanner();
  updateReminderDiagnostic();

  toast("Lembrete dispensado por hoje. 💜");
}

// Calcula o próximo horário FUTURO.
// O aviso atual é tratado separadamente.
function getNextReminder(now = new Date()) {
  if (
    !reminders.enabled ||
    !reminders.days.length
  ) {
    return null;
  }

  const [hour, minute] = reminders.time
    .split(":")
    .map(Number);

  for (let offset = 0; offset <= 7; offset++) {
    const date = new Date(now);

    date.setDate(
      now.getDate() + offset
    );

    date.setHours(hour, minute, 0, 0);

    if (
      reminders.days.includes(date.getDay()) &&
      date.getTime() > now.getTime()
    ) {
      return date;
    }
  }

  return null;
}

function renderReminderBanner(forceTest = false) {
  const banner = $("reminderBanner");
  banner.replaceChildren();

  const now = new Date();

  // Não dependemos mais do histórico de treinos.
  const due = reminderDue(now);

  const dismissed = reminderWasDismissed(now);

  const visible =
    forceTest || (due && !dismissed);

  banner.hidden = !visible;

  if (!visible) return;

  banner.append(
    el(
      "h3",
      forceTest
        ? "🔔 Teste de lembrete funcionando!"
        : "🔔 Hora de se movimentar!"
    ),

    el(
      "p",
      forceTest
        ? "Este é um teste do aviso do Hikki Fit. 💜"
        : "Chegou seu horário de treino! 🐱",
      "muted"
    )
  );

  banner.append(
    button(
      "📅 Ver minha rotina",
      "primary-btn",
      () => showPage("routine")
    )
  );

  if (forceTest) {
    banner.append(
      button(
        "Fechar teste",
        "secondary-btn wide",
        () => renderReminderBanner()
      )
    );
  } else {
    banner.append(
      button(
        "✓ Dispensar lembrete",
        "secondary-btn wide",
        dismissReminder
      )
    );
  }
}

function updateNotificationStatus() {
  let message =
    "Notificações indisponíveis neste navegador.";

  if ("Notification" in window) {
    if (
      Notification.permission === "granted"
    ) {
      message =
        "Permissão de notificações: concedida.";
    } else if (
      Notification.permission === "denied"
    ) {
      message =
        "Permissão de notificações: bloqueada.";
    } else {
      message =
        "Permissão de notificações: não solicitada.";
    }
  }

  $("notificationStatus").textContent =
    message;
}

function updateReminderDiagnostic() {
  const now = new Date();
  const next = getNextReminder(now);

  $("reminderNext").textContent = next
    ? "📅 Próximo lembrete: " +
      next.toLocaleString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "📅 Nenhum lembrete futuro configurado.";

  if (!reminders.enabled) {
    $("reminderDiagnostic").textContent =
      "⚪ Lembretes desativados.";
    return;
  }

  const dayMatches =
    reminders.days.includes(now.getDay());

  const timeReached =
    clockTime(now) >= reminders.time;

  const dismissed =
    reminderWasDismissed(now);

  const due =
    reminderDue(now);

  let status = "Aguardando o horário.";

  if (!dayMatches) {
    status = "Hoje não é um dia selecionado.";
  } else if (due && dismissed) {
    status = "Lembrete dispensado hoje.";
  } else if (due) {
    status = "Lembrete ativo e visível no Início.";
  }

  $("reminderDiagnostic").textContent =
    `🔍 Diagnóstico: ` +
    `dia selecionado: ${dayMatches ? "sim" : "não"} • ` +
    `horário chegou: ${timeReached ? "sim" : "não"} • ` +
    `dispensado: ${dismissed ? "sim" : "não"} • ` +
    `status: ${status}`;
}

function renderReminderSettings() {
  $("reminderEnabled").checked =
    reminders.enabled;

  $("reminderTime").value =
    reminders.time;

  document.querySelectorAll(
    "#reminderDays input"
  ).forEach(input => {
    input.checked = reminders.days.includes(
      Number(input.value)
    );
  });

  updateReminderDiagnostic();
  updateNotificationStatus();
}

$("saveReminder").onclick = () => {
  const next = {
    enabled: $("reminderEnabled").checked,

    time: $("reminderTime").value,

    days: [
      ...document.querySelectorAll(
        "#reminderDays input:checked"
      )
    ].map(input => Number(input.value))
  };

  if (
    !validReminder(next) ||
    (next.enabled && !next.days.length)
  ) {
    toast(
      "Escolha um horário e pelo menos um dia."
    );
    return;
  }

  if (
    !save(KEYS.reminders, next)
  ) {
    return;
  }

  reminders = next;

  // Uma nova configuração pode gerar
  // um novo lembrete.
  localStorage.removeItem(
    KEYS.reminderSent
  );

  localStorage.removeItem(
    KEYS.reminderDismissed
  );

  renderReminderBanner();
  updateReminderDiagnostic();

  toast("Lembrete salvo! 🔔");
};

// O teste manual funciona independentemente
// do dia, horário ou histórico.
$("testReminder").onclick = () => {
  showPage("home");

  renderReminderBanner(true);

  toast(
    "Teste exibido na tela Início! 💜"
  );
};

$("enableNotifications").onclick = async () => {
  if (
    !("Notification" in window) ||
    !window.isSecureContext
  ) {
    toast(
      "Notificações não disponíveis neste ambiente."
    );
    return;
  }

  try {
    const permission =
      await Notification.requestPermission();

    updateNotificationStatus();

    toast(
      permission === "granted"
        ? "Permissão concedida! 💜"
        : "Notificações não autorizadas."
    );
  } catch (error) {
    console.warn(error);

    toast(
      "Não foi possível solicitar a permissão."
    );
  }
};

// Notificação do sistema: tentativa opcional.
// O aviso dentro do aplicativo funciona
// independentemente dessa permissão.
async function trySystemNotification(marker) {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  if (
    load(KEYS.reminderSent, "") === marker
  ) {
    return;
  }

  const title = "Hikki Fit 💜";

  const options = {
    body: "Seu horário de treino chegou! 🐱",
    tag: "hikki-fit-reminder"
  };

  try {
    if (
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      const registration =
        await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.showNotification(
          title,
          options
        );

        save(KEYS.reminderSent, marker);
        return;
      }
    }

    // Alguns navegadores de computador
    // permitem o construtor Notification.
    // Em muitos Androids ele não funciona.
    if (
      typeof Notification === "function"
    ) {
      new Notification(title, options);
      save(KEYS.reminderSent, marker);
    }
  } catch (error) {
    console.warn(
      "Notificação do sistema não exibida:",
      error
    );
  }
}

function checkReminder() {
  const now = new Date();

  // Atualiza sempre o aviso do aplicativo.
  // Não depende de treino concluído.
  renderReminderBanner();

  // Atualiza o diagnóstico caso o Perfil
  // esteja aberto.
  updateReminderDiagnostic();

  if (!reminderDue(now)) {
    return;
  }

  if (reminderWasDismissed(now)) {
    return;
  }

  const marker = reminderMarker(now);

  // Tentativa adicional de notificação.
  // Não bloqueia o aviso interno.
  void trySystemNotification(marker);
}

// Verifica a cada 5 segundos enquanto
// a página estiver executando.
setInterval(checkReminder, 5000);

// Atualiza ao voltar para o aplicativo.
document.addEventListener(
  "visibilitychange",
  () => {
    if (!document.hidden) {
      checkReminder();
    }
  }
);

window.addEventListener(
  "focus",
  checkReminder
);

// =====================================
// BACKUP
// =====================================

function makeBackup() {
  return {
    app: "Hikki Fit",
    version: 1,
    exportedAt: new Date().toISOString(),

    data: {
      exercises,
      workouts,
      history,
      reminders,
      theme
    }
  };
}

$("exportBackup").onclick = () => {
  const json = JSON.stringify(
    makeBackup(),
    null,
    2
  );

  const blob = new Blob([json], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;

  link.download =
    `hikki-fit-backup-${dateKey(new Date())}.json`;

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );

  toast("Backup preparado! 💾");
};

$("importBackup").onclick = () => {
  $("backupFile").click();
};

function validateBackup(backup) {
  if (
    !backup ||
    backup.app !== "Hikki Fit" ||
    backup.version !== 1 ||
    !backup.data
  ) {
    return false;
  }

  const data = backup.data;

  if (
    !Array.isArray(data.exercises) ||
    !Array.isArray(data.workouts) ||
    !Array.isArray(data.history) ||
    !validReminder(data.reminders) ||
    !["dark", "light"].includes(data.theme)
  ) {
    return false;
  }

  const validExercise = exercise =>
    exercise &&
    typeof exercise.id === "string" &&
    typeof exercise.name === "string" &&
    Number.isInteger(exercise.sets) &&
    exercise.sets >= 1 &&
    ["time", "reps"].includes(exercise.type) &&
    (
      exercise.type === "time"
        ? Number.isInteger(exercise.duration) &&
          exercise.duration > 0
        : Number.isInteger(exercise.reps) &&
          exercise.reps > 0
    );

  const validWorkout = workout =>
    workout &&
    typeof workout.id === "string" &&
    typeof workout.name === "string" &&
    Array.isArray(workout.days) &&
    workout.days.every(
      day =>
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6
    ) &&
    Array.isArray(workout.exerciseIds) &&
    workout.exerciseIds.every(
      id => typeof id === "string"
    );

  const validHistory = record =>
    record &&
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.completedAt === "string" &&
    !Number.isNaN(
      Date.parse(record.completedAt)
    ) &&
    Number.isFinite(record.durationSeconds) &&
    record.durationSeconds >= 0 &&
    Array.isArray(record.exercises) &&
    record.exercises.every(validExercise);

  return (
    data.exercises.every(validExercise) &&
    data.workouts.every(validWorkout) &&
    data.history.every(validHistory)
  );
}

$("backupFile").onchange = async event => {
  const file = event.target.files?.[0];

  event.target.value = "";

  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast(
      "Backup muito grande. Limite: 5 MB."
    );
    return;
  }

  let backup;

  try {
    backup = JSON.parse(
      await file.text()
    );
  } catch {
    toast("Arquivo JSON inválido.");
    return;
  }

  if (!validateBackup(backup)) {
    toast(
      "Arquivo incompatível ou dados inválidos."
    );
    return;
  }

  if (
    !confirm(
      "Restaurar este backup? Os dados atuais " +
      "serão substituídos. Exporte uma cópia antes."
    )
  ) {
    return;
  }

  const keys = [
    KEYS.exercises,
    KEYS.workouts,
    KEYS.history,
    KEYS.reminders,
    KEYS.theme
  ];

  const previous = {};

  try {
    keys.forEach(key => {
      previous[key] =
        localStorage.getItem(key);
    });

    const data = backup.data;

    localStorage.setItem(
      KEYS.exercises,
      JSON.stringify(data.exercises)
    );

    localStorage.setItem(
      KEYS.workouts,
      JSON.stringify(data.workouts)
    );

    localStorage.setItem(
      KEYS.history,
      JSON.stringify(data.history)
    );

    localStorage.setItem(
      KEYS.reminders,
      JSON.stringify(data.reminders)
    );

    localStorage.setItem(
      KEYS.theme,
      JSON.stringify(data.theme)
    );

    // Um backup restaurado não deve
    // manter dispensas antigas.
    localStorage.removeItem(
      KEYS.reminderDismissed
    );

    localStorage.removeItem(
      KEYS.reminderSent
    );
  } catch (error) {
    console.error(error);

    try {
      keys.forEach(key => {
        if (previous[key] === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(
            key,
            previous[key]
          );
        }
      });
    } catch (restoreError) {
      console.error(
        "Falha ao recuperar dados:",
        restoreError
      );

      alert(
        "A restauração falhou e não foi possível " +
        "recuperar todos os dados anteriores. " +
        "Guarde seu backup."
      );
    }

    toast(
      "Não foi possível restaurar o backup."
    );
    return;
  }

  alert(
    "Backup restaurado! A página será atualizada."
  );

  location.reload();
};

// =====================================
// INICIALIZAÇÃO
// =====================================

renderExercises();
renderWorkouts();
renderHome();
renderHistory();
renderReminderSettings();
checkReminder();
