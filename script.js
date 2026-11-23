
"use strict";

const STORAGE_KEY = "hikki_fit_exercises_v1";
const THEME_KEY = "hikki_fit_theme";

const $ = (id) => document.getElementById(id);

let exercises = loadExercises();
let editingId = null;
let toastTimer;

function loadExercises() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Erro ao carregar exercícios:", error);
    return [];
  }
}

function saveExercises() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(exercises)
    );
    return true;
  } catch (error) {
    console.error("Erro ao salvar exercícios:", error);
    showToast("Não foi possível salvar no dispositivo.");
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

// Navegação
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

    window.scrollTo(0, 0);
  });
});

// Tema
function applyTheme(theme) {
  document.body.classList.toggle(
    "light",
    theme === "light"
  );
  $("themeBtn").textContent =
    theme === "light" ? "☾" : "☀";
}

let currentTheme = localStorage.getItem(THEME_KEY);
if (currentTheme !== "light") currentTheme = "dark";

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

// Formulário
const dialog = $("exerciseDialog");
const form = $("exerciseForm");

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
  form.reset();

  editingId = exercise ? exercise.id : null;

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
  dialog.showModal();
}

$("addExerciseBtn").addEventListener("click", () => {
  openExerciseForm();
});

$("closeDialog").addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

form.addEventListener("submit", (event) => {
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
    id: editingId || crypto.randomUUID(),
    name,
    sets,
    type,
    reps: type === "reps" ? reps : null,
    duration: type === "time" ? duration : null,
    description
  };

  const previous = exercises;

  if (editingId) {
    exercises = exercises.map(item =>
      item.id === editingId ? exercise : item
    );
  } else {
    exercises = [...exercises, exercise];
  }

  if (!saveExercises()) {
    exercises = previous;
    return;
  }

  dialog.close();
  renderExercises();

  showToast(
    editingId
      ? "Exercício atualizado! 💜"
      : "Exercício criado! 💜"
  );

  editingId = null;
});

// Criar elementos de texto com segurança
function textElement(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderExercises() {
  const list = $("exerciseList");
  list.replaceChildren();

  $("exerciseCount").textContent =
    `${exercises.length} exercício(s) cadastrado(s)`;

  if (exercises.length === 0) {
    const empty = textElement(
      "div",
      "",
      "empty-state"
    );

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
    editBtn.type = "button";
    editBtn.addEventListener("click", () => {
      openExerciseForm(exercise);
    });

    const deleteBtn = textElement(
      "button",
      "🗑 Excluir",
      "danger-btn"
    );
    deleteBtn.type = "button";

    deleteBtn.addEventListener("click", () => {
      const confirmed = confirm(
        `Excluir o exercício "${exercise.name}"?`
      );

      if (!confirmed) return;

      const previous = exercises;
      exercises = exercises.filter(
        item => item.id !== exercise.id
      );

      if (!saveExercises()) {
        exercises = previous;
        return;
      }

      renderExercises();
      showToast("Exercício excluído.");
    });

    actions.append(editBtn, deleteBtn);
    card.append(actions);
    list.append(card);
  });
}

$("startBtn").addEventListener("click", () => {
  showToast(
    "Em breve você poderá iniciar seus treinos! 💜"
  );
});

renderExercises();
