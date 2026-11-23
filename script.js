
"use strict";

// =====================================
// HIKKI FIT 0.4
// =====================================

const EXERCISE_KEY = "hikki_fit_exercises_v1";
const WORKOUT_KEY = "hikki_fit_workouts_v1";
const THEME_KEY = "hikki_fit_theme";

const $ = id => document.getElementById(id);

const WEEK_DAYS = [
  "Domingo", "Segunda", "Terça", "Quarta",
  "Quinta", "Sexta", "Sábado"
];

const SHORT_DAYS = [
  "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"
];

let editingExerciseId = null;
let editingWorkoutId = null;
let toastTimer;

function loadArray(key) {
  try {
    const data = JSON.parse(
      localStorage.getItem(key) || "[]"
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro ao carregar:", key, error);
    return [];
  }
}

let exercises = loadArray(EXERCISE_KEY);
let workouts = loadArray(WORKOUT_KEY);

function saveArray(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Erro ao salvar:", error);
    showToast("Não foi possível salvar os dados.");
    return false;
  }
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function textElement(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

// =====================================
// NAVEGAÇÃO
// =====================================

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    document.querySelectorAll(".page").forEach(section => {
      section.classList.toggle(
        "active",
        section.id === page
      );
    });

    document.querySelectorAll(".nav-btn").forEach(nav => {
      nav.classList.toggle("active", nav === button);
    });

    if (page === "home") renderTodayWorkout();
    if (page === "routine") {
      renderWeek();
      renderWorkouts();
    }

    window.scrollTo(0, 0);
  });
});

// =====================================
// TEMA
// =====================================

let currentTheme;

try {
  currentTheme = localStorage.getItem(THEME_KEY);
} catch (error) {
  currentTheme = "dark";
}

if (currentTheme !== "light") currentTheme = "dark";

function applyTheme(theme) {
  document.body.classList.toggle(
    "light",
    theme === "light"
  );

  $("themeBtn").textContent =
    theme === "light" ? "☾" : "☀";
}

applyTheme(currentTheme);

$("themeBtn").addEventListener("click", () => {
  currentTheme =
    currentTheme === "dark" ? "light" : "dark";

  applyTheme(currentTheme);

  try {
    localStorage.setItem(THEME_KEY, currentTheme);
  } catch (error) {
    showToast("Não foi possível salvar o tema.");
  }
});

// =====================================
// CADASTRO DE EXERCÍCIOS
// =====================================

const exerciseDialog = $("exerciseDialog");
const exerciseForm = $("exerciseForm");

function updateTypeFields() {
  const isTime = $("exerciseType").value === "time";

  $("repsField").hidden = isTime;
  $("timeField").hidden = !isTime;

  $("exerciseReps").required = !isTime;
  $("exerciseDuration").required = isTime;
}

$("exerciseType").addEventListener(
  "change",
  updateTypeFields
);

function openExerciseForm(exercise = null) {
  exerciseForm.reset();
  editingExerciseId = exercise ? exercise.id : null;

  $("formTitle").textContent = exercise
    ? "Editar exercício"
    : "Novo exercício";

  if (exercise) {
    $("exerciseName").value = exercise.name;
    $("exerciseSets").value = exercise.sets;
    $("exerciseType").value = exercise.type;
    $("exerciseReps").value = exercise.reps || 10;
    $("exerciseDuration").value =
      exercise.duration || 60;
    $("exerciseDescription").value =
      exercise.description || "";
  }

  updateTypeFields();
  exerciseDialog.showModal();
}

$("addExerciseBtn").addEventListener("click", () => {
  openExerciseForm();
});

$("closeDialog").addEventListener("click", () => {
  exerciseDialog.close();
});

exerciseDialog.addEventListener("click", event => {
  if (event.target === exerciseDialog) {
    exerciseDialog.close();
  }
});

exerciseForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = $("exerciseName").value.trim();
  const sets = Number($("exerciseSets").value);
  const type = $("exerciseType").value;
  const reps = Number($("exerciseReps").value);
  const duration = Number($("exerciseDuration").value);
  const description =
    $("exerciseDescription").value.trim();

  if (!name || !Number.isInteger(sets) ||
      sets < 1 || sets > 100) {
    showToast("Confira o nome e as séries.");
    return;
  }

  const amount = type === "time" ? duration : reps;
  const maxAmount = type === "time" ? 86400 : 10000;

  if (!Number.isInteger(amount) ||
      amount < 1 || amount > maxAmount) {
    showToast("Confira a quantidade informada.");
    return;
  }

  const exercise = {
    id: editingExerciseId || crypto.randomUUID(),
    name,
    sets,
    type,
    reps: type === "reps" ? reps : null,
    duration: type === "time" ? duration : null,
    description
  };

  const previous = exercises;

  if (editingExerciseId) {
    exercises = exercises.map(item =>
      item.id === editingExerciseId ? exercise : item
    );
  } else {
    exercises = [...exercises, exercise];
  }

  if (!saveArray(EXERCISE_KEY, exercises)) {
    exercises = previous;
    return;
  }

  exerciseDialog.close();
  renderExercises();
  renderWorkouts();
  renderTodayWorkout();

  showToast(
    editingExerciseId
      ? "Exercício atualizado! 💜"
      : "Exercício criado! 💜"
  );

  editingExerciseId = null;
});

function renderExercises() {
  const list = $("exerciseList");
  list.replaceChildren();

  $("exerciseCount").textContent =
    `${exercises.length} exercício(s) cadastrado(s)`;

  if (exercises.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    empty.append(
      textElement("div", "🐱", "emoji"),
      textElement("h3", "Sua biblioteca está vazia"),
      textElement(
        "p",
        "Clique em Novo exercício para começar."
      )
    );

    list.append(empty);
    return;
  }

  exercises.forEach(exercise => {
    const card = document.createElement("article");
    card.className = "exercise-card";

    const details = exercise.type === "time"
      ? `${exercise.sets} séries • ${exercise.duration}s por série`
      : `${exercise.sets} séries • ${exercise.reps} repetições`;

    card.append(
      textElement("h3", exercise.name),
      textElement("p", details, "muted")
    );

    if (exercise.description) {
      card.append(
        textElement(
          "p",
          exercise.description,
          "muted small"
        )
      );
    }

    const actions = document.createElement("div");
    actions.className = "exercise-actions";

    const editBtn = textElement(
      "button",
      "✏️ Editar",
      "secondary-btn"
    );

    editBtn.addEventListener("click", () => {
      openExerciseForm(exercise);
    });

    const deleteBtn = textElement(
      "button",
      "🗑 Excluir",
      "danger-btn"
    );

    deleteBtn.addEventListener("click", () => {
      if (!confirm(
        `Excluir o exercício "${exercise.name}"?`
      )) return;

      const previousExercises = exercises;
      const previousWorkouts = workouts;

      exercises = exercises.filter(
        item => item.id !== exercise.id
      );

      workouts = workouts.map(workout => ({
        ...workout,
        exerciseIds: workout.exerciseIds.filter(
          id => id !== exercise.id
        )
      }));

      // Salva as duas coleções.
      // Se uma falhar, tenta restaurar ambas.
      const savedExercises = saveArray(
        EXERCISE_KEY, exercises
      );

      const savedWorkouts = savedExercises &&
        saveArray(WORKOUT_KEY, workouts);

      if (!savedExercises || !savedWorkouts) {
        exercises = previousExercises;
        workouts = previousWorkouts;

        saveArray(EXERCISE_KEY, exercises);
        saveArray(WORKOUT_KEY, workouts);
        return;
      }

      renderExercises();
      renderWorkouts();
      renderWeek();
      renderTodayWorkout();
      showToast("Exercício excluído.");
    });

    actions.append(editBtn, deleteBtn);
    card.append(actions);
    list.append(card);
  });
}

// =====================================
// ROTINA SEMANAL
// =====================================

const workoutDialog = $("workoutDialog");
const workoutForm = $("workoutForm");

function openWorkoutForm(workout = null) {
  if (exercises.length === 0) {
    showToast("Cadastre um exercício primeiro!");
    return;
  }

  workoutForm.reset();
  editingWorkoutId = workout ? workout.id : null;

  $("workoutFormTitle").textContent = workout
    ? "Editar treino"
    : "Criar treino";

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
    const label = document.createElement("label");
    label.className = "workout-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = exercise.id;

    checkbox.checked = workout
      ? workout.exerciseIds.includes(exercise.id)
      : false;

    const name = document.createElement("span");
    name.textContent = exercise.name;

    label.append(checkbox, name);
    options.append(label);
  });

  workoutDialog.showModal();
}

$("addWorkoutBtn").addEventListener("click", () => {
  openWorkoutForm();
});

$("closeWorkoutDialog").addEventListener(
  "click",
  () => workoutDialog.close()
);

workoutDialog.addEventListener("click", event => {
  if (event.target === workoutDialog) {
    workoutDialog.close();
  }
});

workoutForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = $("workoutName").value.trim();

  const days = [...document.querySelectorAll(
    "#workoutDays input:checked"
  )].map(input => Number(input.value));

  const exerciseIds = [...document.querySelectorAll(
    "#workoutExerciseOptions input:checked"
  )].map(input => input.value);

  if (!name) {
    showToast("Digite o nome do treino.");
    return;
  }

  if (days.length === 0) {
    showToast("Selecione pelo menos um dia.");
    return;
  }

  if (exerciseIds.length === 0) {
    showToast("Selecione pelo menos um exercício.");
    return;
  }

  const workout = {
    id: editingWorkoutId || crypto.randomUUID(),
    name,
    days,
    exerciseIds
  };

  const previous = workouts;

  if (editingWorkoutId) {
    workouts = workouts.map(item =>
      item.id === editingWorkoutId ? workout : item
    );
  } else {
    workouts = [...workouts, workout];
  }

  if (!saveArray(WORKOUT_KEY, workouts)) {
    workouts = previous;
    return;
  }

  workoutDialog.close();
  renderWorkouts();
  renderWeek();
  renderTodayWorkout();

  showToast(
    editingWorkoutId
      ? "Treino atualizado! 💜"
      : "Treino criado! 💜"
  );

  editingWorkoutId = null;
});

function renderWorkouts() {
  const list = $("workoutList");
  list.replaceChildren();

  if (workouts.length === 0) {
    list.append(
      textElement(
        "div",
        "🐱 Nenhum treino cadastrado ainda.",
        "empty-state"
      )
    );
    return;
  }

  workouts.forEach(workout => {
    const card = document.createElement("article");
    card.className = "exercise-card";

    card.append(
      textElement("h3", workout.name)
    );

    const dayNames = workout.days
      .map(day => SHORT_DAYS[day])
      .join(", ");

    card.append(
      textElement(
        "p",
        `📅 ${dayNames}`,
        "workout-days-label"
      )
    );

    workout.exerciseIds.forEach(id => {
      const exercise = exercises.find(
        item => item.id === id
      );

      card.append(
        textElement(
          "div",
          exercise
            ? `• ${exercise.name}`
            : "• Exercício removido",
          "workout-exercise-item"
        )
      );
    });

    const actions = document.createElement("div");
    actions.className = "exercise-actions";

    const editBtn = textElement(
      "button",
      "✏️ Editar",
      "secondary-btn"
    );

    editBtn.addEventListener("click", () => {
      openWorkoutForm(workout);
    });

    const deleteBtn = textElement(
      "button",
      "🗑 Excluir",
      "danger-btn"
    );

    deleteBtn.addEventListener("click", () => {
      if (!confirm(
        `Excluir "${workout.name}"?`
      )) return;

      const previous = workouts;

      workouts = workouts.filter(
        item => item.id !== workout.id
      );

      if (!saveArray(WORKOUT_KEY, workouts)) {
        workouts = previous;
        return;
      }

      renderWorkouts();
      renderWeek();
      renderTodayWorkout();
      showToast("Treino excluído.");
    });

    actions.append(editBtn, deleteBtn);
    card.append(actions);
    list.append(card);
  });
}

function renderWeek() {
  const container = $("weekOverview");
  container.replaceChildren();

  const today = new Date().getDay();

  WEEK_DAYS.forEach((day, index) => {
    const dayWorkouts = workouts.filter(
      workout => workout.days.includes(index)
    );

    const box = document.createElement("div");
    box.className = "week-day";

    if (dayWorkouts.length > 0) {
      box.classList.add("has-workout");
    }

    if (index === today) {
      box.classList.add("today");
    }

    box.append(
      textElement("strong", SHORT_DAYS[index]),
      textElement(
        "span",
        dayWorkouts.length > 0
          ? String(dayWorkouts.length)
          : "–"
      )
    );

    box.title = dayWorkouts.length
      ? `${day}: ${dayWorkouts.map(w => w.name).join(", ")}`
      : `${day}: nenhum treino`;

    container.append(box);
  });
}

function renderTodayWorkout() {
  const today = new Date().getDay();

  const todayWorkouts = workouts.filter(
    workout => workout.days.includes(today)
  );

  if (todayWorkouts.length === 0) {
    $("todayWorkoutTitle").textContent =
      "Hoje é dia de descansar? 🌙";

    $("todayWorkoutDescription").textContent =
      "Nenhum treino foi planejado para hoje.";
    return;
  }

  $("todayWorkoutTitle").textContent =
    todayWorkouts.map(w => w.name).join(" + ");

  const total = todayWorkouts.reduce(
    (sum, workout) =>
      sum + workout.exerciseIds.length,
    0
  );

  $("todayWorkoutDescription").textContent =
    `${todayWorkouts.length} treino(s) planejado(s) • ` +
    `${total} exercício(s) na rotina de hoje.`;
}

// =====================================
// BOTÃO INICIAR TREINO
// =====================================

$("startBtn").addEventListener("click", () => {
  showToast(
    "Em breve você poderá iniciar seus treinos! 💜"
  );
});

// =====================================
// INICIALIZAÇÃO
// =====================================

renderExercises();
renderWorkouts();
renderWeek();
renderTodayWorkout();
