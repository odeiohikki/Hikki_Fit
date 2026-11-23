
"use strict";

/* ==========================================
   HIKKI FIT v0.8
   IMAGENS, GIFS E VÍDEOS DOS EXERCÍCIOS
========================================== */

const MEDIA_DB_NAME = "hikki_fit_media_v1";
const MEDIA_STORE = "exercise_media";
const MEDIA_MAX_SIZE = 30 * 1024 * 1024;

let mediaPending = null;
let mediaEditingId = null;
let mediaPreviewUrl = null;
let trainingMediaUrl = null;
let mediaEditRequest = 0;
let mediaTrainingRequest = 0;

// ==========================================
// BANCO DE DADOS DE MÍDIA
// ==========================================

function openMediaDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getExerciseMedia(id) {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      MEDIA_STORE,
      "readonly"
    );

    const request = transaction
      .objectStore(MEDIA_STORE)
      .get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

async function saveExerciseMedia(id, media) {
  const db = await openMediaDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      MEDIA_STORE,
      "readwrite"
    );

    const store = transaction.objectStore(MEDIA_STORE);

    if (media === null) {
      store.delete(id);
    } else {
      store.put(media, id);
    }

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

// ==========================================
// UTILITÁRIOS
// ==========================================

function isVideoMedia(media) {
  if (!media) return false;

  if (media.kind === "file") {
    return media.mime.startsWith("video/");
  }

  return media.type === "video";
}

function validMediaUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function releaseMediaPreview() {
  if (mediaPreviewUrl) {
    URL.revokeObjectURL(mediaPreviewUrl);
    mediaPreviewUrl = null;
  }
}

function releaseTrainingMedia() {
  if (trainingMediaUrl) {
    URL.revokeObjectURL(trainingMediaUrl);
    trainingMediaUrl = null;
  }
}

function createMediaElement(media, url) {
  let element;

  if (isVideoMedia(media)) {
    element = document.createElement("video");
    element.controls = true;
    element.playsInline = true;
    element.preload = "metadata";
  } else {
    element = document.createElement("img");
    element.alt = "Demonstração do exercício";
    element.loading = "lazy";
  }

  element.src = url;
  element.className = "hikki-media-content";

  element.onerror = () => {
    element.replaceWith(
      el(
        "p",
        "Não foi possível carregar esta mídia.",
        "muted small"
      )
    );
  };

  return element;
}

function getMediaSource(media) {
  if (media.kind === "file") {
    return URL.createObjectURL(media.blob);
  }

  return media.url;
}

// ==========================================
// FORMULÁRIO DOS EXERCÍCIOS
// ==========================================

const mediaSection = document.createElement("div");
mediaSection.className = "hikki-media-section";

mediaSection.innerHTML = `
  <h3>🖼️ Demonstração do exercício</h3>

  <p class="muted small">
    Adicione uma imagem, GIF ou vídeo.
    Essa etapa é opcional.
  </p>

  <label for="mediaFile">Arquivo do dispositivo</label>

  <input
    id="mediaFile"
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
  >

  <label for="mediaLink">Ou cole um link direto</label>

  <input
    id="mediaLink"
    type="url"
    placeholder="https://exemplo.com/video.mp4"
  >

  <label for="mediaLinkType">Tipo do link</label>

  <select id="mediaLinkType">
    <option value="image">Imagem ou GIF</option>
    <option value="video">Vídeo</option>
  </select>

  <div id="mediaFormPreview" class="hikki-media-preview" hidden></div>

  <button
    id="removeExerciseMedia"
    type="button"
    class="secondary-btn wide"
  >
    Remover demonstração
  </button>

  <p class="muted small">
    Arquivos locais: até 30 MB.
    Links externos precisam estar acessíveis.
  </p>
`;

const exerciseSaveButton =
  document.querySelector('#exerciseForm button[type="submit"]');

exerciseSaveButton.before(mediaSection);

const mediaFileInput = $("mediaFile");
const mediaLinkInput = $("mediaLink");
const mediaLinkType = $("mediaLinkType");
const mediaFormPreview = $("mediaFormPreview");

function showMediaFormPreview(media) {
  releaseMediaPreview();
  mediaFormPreview.replaceChildren();

  if (!media) {
    mediaFormPreview.hidden = true;
    return;
  }

  const url = getMediaSource(media);

  if (media.kind === "file") {
    mediaPreviewUrl = url;
  }

  const element = createMediaElement(media, url);

  mediaFormPreview.append(element);
  mediaFormPreview.hidden = false;
}

mediaFileInput.addEventListener("change", () => {
  const file = mediaFileInput.files[0];

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm"
  ];

  if (!allowedTypes.includes(file.type)) {
    mediaFileInput.value = "";
    toast("Formato não permitido.");
    return;
  }

  if (file.size > MEDIA_MAX_SIZE) {
    mediaFileInput.value = "";
    toast("O arquivo deve ter até 30 MB.");
    return;
  }

  mediaPending = {
    kind: "file",
    mime: file.type,
    name: file.name,
    blob: file
  };

  mediaLinkInput.value = "";
  showMediaFormPreview(mediaPending);
});

function updateMediaLink() {
  const url = mediaLinkInput.value.trim();

  if (!url) return;

  if (!validMediaUrl(url)) {
    toast("Informe um link HTTP ou HTTPS válido.");
    return;
  }

  mediaPending = {
    kind: "link",
    type: mediaLinkType.value,
    url
  };

  mediaFileInput.value = "";
  showMediaFormPreview(mediaPending);
}

mediaLinkInput.addEventListener("change", updateMediaLink);

mediaLinkType.addEventListener("change", () => {
  if (mediaLinkInput.value.trim()) {
    updateMediaLink();
  }
});

$("removeExerciseMedia").onclick = () => {
  mediaPending = null;

  mediaFileInput.value = "";
  mediaLinkInput.value = "";

  showMediaFormPreview(null);
  toast("Demonstração removida da edição.");
};

// ==========================================
// ABRIR EXERCÍCIO PARA CRIAR OU EDITAR
// ==========================================

const openExerciseOriginal = openExercise;

openExercise = function (exercise = null) {
  const requestId = ++mediaEditRequest;

  mediaEditingId = exercise?.id || null;
  mediaPending = null;

  mediaFileInput.value = "";
  mediaLinkInput.value = "";
  mediaLinkType.value = "image";

  showMediaFormPreview(null);

  openExerciseOriginal(exercise);

  if (!exercise) return;

  getExerciseMedia(exercise.id)
    .then(media => {
      if (requestId !== mediaEditRequest) return;
      if (!exerciseDialog.open) return;

      mediaPending = media;

      if (media?.kind === "link") {
        mediaLinkInput.value = media.url;
        mediaLinkType.value = media.type;
      }

      showMediaFormPreview(media);
    })
    .catch(error => {
      console.error("Erro ao carregar mídia:", error);
      toast("Não foi possível carregar a demonstração.");
    });
};

// ==========================================
// SALVAR EXERCÍCIO E DEMONSTRAÇÃO
// ==========================================

const saveExerciseOriginal = exerciseForm.onsubmit;

exerciseForm.onsubmit = async function (event) {
  event.preventDefault();

  // Evita salvar um link ainda não confirmado
  // pelo evento change do campo.
  const typedLink = mediaLinkInput.value.trim();

  if (typedLink) {
    if (!validMediaUrl(typedLink)) {
      toast("Confira o link da demonstração.");
      return;
    }

    mediaPending = {
      kind: "link",
      type: mediaLinkType.value,
      url: typedLink
    };
  }

  const previousIds = new Set(
    exercises.map(item => item.id)
  );

  const editingId = mediaEditingId;
  const selectedMedia = mediaPending;

  // Mantém o salvamento original da v0.7.
  saveExerciseOriginal.call(exerciseForm, event);

  // Se o formulário não foi fechado,
  // o exercício não foi salvo.
  if (exerciseDialog.open) return;

  const savedId = editingId || exercises.find(
    item => !previousIds.has(item.id)
  )?.id;

  if (!savedId) {
    toast("Não foi possível identificar o exercício.");
    return;
  }

  try {
    await saveExerciseMedia(savedId, selectedMedia);

    toast(
      selectedMedia
        ? "Exercício e demonstração salvos! 💜"
        : "Exercício salvo! 💜"
    );
  } catch (error) {
    console.error("Erro ao salvar mídia:", error);

    toast(
      "Exercício salvo, mas a mídia não foi armazenada."
    );
  }
};

// ==========================================
// DEMONSTRAÇÃO DURANTE O TREINO
// ==========================================

const trainingMediaSection = document.createElement("div");
trainingMediaSection.className = "hikki-training-media";

const trainingMediaButton = document.createElement("button");
trainingMediaButton.type = "button";
trainingMediaButton.className = "hikki-demo-btn";
trainingMediaButton.textContent = "▶ Ver demonstração";

const trainingMediaPanel = document.createElement("div");
trainingMediaPanel.className = "hikki-training-media-panel";
trainingMediaPanel.hidden = true;

trainingMediaSection.append(
  trainingMediaButton,
  trainingMediaPanel
);

$("exerciseInstructions").before(trainingMediaSection);

trainingMediaButton.onclick = () => {
  const opening = trainingMediaPanel.hidden;

  trainingMediaPanel.hidden = !opening;

  trainingMediaButton.textContent = opening
    ? "⌃ Ocultar demonstração"
    : "▶ Ver demonstração";

  if (!opening) {
    trainingMediaPanel
      .querySelectorAll("video")
      .forEach(video => video.pause());
  }
};

async function updateTrainingMedia() {
  const requestId = ++mediaTrainingRequest;

  releaseTrainingMedia();

  trainingMediaPanel.replaceChildren();
  trainingMediaPanel.hidden = true;
  trainingMediaSection.hidden = true;

  trainingMediaButton.textContent =
    "▶ Ver demonstração";

  if (!session) return;

  const sessionId = session.id;
  const index = session.index;
  const exercise = session.items[index];

  if (!exercise) return;

  try {
    const media = await getExerciseMedia(exercise.id);

    if (requestId !== mediaTrainingRequest) return;

    if (
      !session ||
      session.id !== sessionId ||
      session.index !== index
    ) {
      return;
    }

    if (!media) return;

    const url = getMediaSource(media);

    if (media.kind === "file") {
      trainingMediaUrl = url;
    }

    trainingMediaPanel.append(
      createMediaElement(media, url)
    );

    trainingMediaSection.hidden = false;
  } catch (error) {
    console.error("Erro na demonstração:", error);
  }
}

const renderTrainingOriginal = renderTraining;

renderTraining = function () {
  renderTrainingOriginal();
  void updateTrainingMedia();
};

// ==========================================
// LIMPEZA AO SAIR DO TREINO
// ==========================================

$("backTraining").addEventListener("click", () => {
  if (!session) {
    ++mediaTrainingRequest;
    releaseTrainingMedia();
    trainingMediaPanel.replaceChildren();
  }
});

// Inicializa a interface.
trainingMediaSection.hidden = true;
