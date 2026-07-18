const categories = [
  { id: "sleep", name: "Sleep", icon: "☾", question: "How has your sleep been recently?", low: "Restless", high: "Rested", rituals: ["30 min tech break", "Shower", "Dim the lights"], suggestions: ["Read", "Listen to music", "Breathing practice", "Prepare the room"] },
  { id: "hygiene", name: "Hygiene", icon: "◉", question: "How has your hygiene been recently?", low: "Disconnected", high: "Cared for", rituals: ["Shower", "Brush teeth", "Skin care"], suggestions: ["Wash face", "Change clothes", "Brush hair", "Prepare toiletries"] },
  { id: "nourishment", name: "Nourishment", icon: "❧", question: "How has your nourishment been recently?", low: "Depleted", high: "Nourished", rituals: ["Eat breakfast", "Drink water", "Prepare lunch"], suggestions: ["Make a snack", "Fill water bottle", "Plan one meal", "Eat without screens"] },
  { id: "movement", name: "Movement", icon: "↗", question: "How has movement felt recently?", low: "Still", high: "Energised", rituals: ["Morning stretch", "Short walk"], suggestions: ["Gentle stretch", "Walk outdoors", "Dance to one song", "Rest intentionally"] },
  { id: "breath", name: "Breath", icon: "≈", question: "How has your breath felt recently?", low: "Tight", high: "Open", rituals: ["Three slow breaths"], suggestions: ["Pause between tasks", "Breathe by a window", "Lengthen the exhale"] },
  { id: "hobbies", name: "Hobbies", icon: "♡", question: "How have your hobbies felt recently?", low: "Distant", high: "Connected", rituals: ["Read for 10 minutes"], suggestions: ["Draw", "Play music", "Make something", "Return to an old interest"] }
];

const STORAGE_KEY = "body-and-self-checkin-v2";

// The product threshold for a "meaningful" change is still unresolved.
// Keeping the existing any-final-difference behavior isolated here prevents it
// from being embedded throughout the flow and makes the later decision local.
const CHANGE_PROMPT_THRESHOLD = 1;

function defaultRituals() {
  return Object.fromEntries(categories.map((category) => [category.id, [...category.rituals]]));
}

function defaultAnswers() {
  return Object.fromEntries(categories.map((category) => [category.id, 50]));
}

function normaliseRituals(savedRituals) {
  const fallback = defaultRituals();
  return Object.fromEntries(categories.map((category) => {
    const saved = savedRituals?.[category.id];
    const valid = Array.isArray(saved)
      ? saved.filter((ritual) => typeof ritual === "string" && ritual.trim()).map((ritual) => ritual.trim())
      : fallback[category.id];
    return [category.id, [...valid]];
  }));
}

function normaliseAnswers(savedAnswers) {
  const fallback = defaultAnswers();
  return Object.fromEntries(categories.map((category) => {
    const value = Number(savedAnswers?.[category.id]);
    return [category.id, Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback[category.id]];
  }));
}

function loadSavedState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") throw new Error("No saved check-in");
    return {
      hasCompletedSetup: parsed.hasCompletedSetup === true,
      rituals: normaliseRituals(parsed.rituals),
      previousAnswers: normaliseAnswers(parsed.previousAnswers),
      reflections: Array.isArray(parsed.reflections) ? parsed.reflections : []
    };
  } catch {
    return {
      hasCompletedSetup: false,
      rituals: defaultRituals(),
      previousAnswers: defaultAnswers(),
      reflections: []
    };
  }
}

const savedState = loadSavedState();

const state = {
  currentIndex: 0,
  phase: savedState.hasCompletedSetup ? "rating" : "setup",
  isInitialRun: !savedState.hasCompletedSetup,
  hasCompletedSetup: savedState.hasCompletedSetup,
  previousAnswers: { ...savedState.previousAnswers },
  answers: { ...savedState.previousAnswers },
  rituals: savedState.rituals,
  reflections: savedState.reflections,
  selectedRituals: new Set(),
  reflectionOutcome: null,
  transitioning: false
};

const screens = {
  start: document.querySelector("#start-screen"),
  checkin: document.querySelector("#checkin-screen"),
  complete: document.querySelector("#complete-screen")
};

const categoryPreview = document.querySelector("#category-preview");
const startButton = document.querySelector("#start-button");
const backButton = document.querySelector("#back-button");
const stepLabel = document.querySelector("#step-label");
const progressFill = document.querySelector("#progress-fill");
const categoryIcon = document.querySelector("#category-icon");
const questionTitle = document.querySelector("#question-title");
const setupPanel = document.querySelector("#setup-panel");
const ratingPanel = document.querySelector("#rating-panel");
const setupDefinition = document.querySelector("#setup-definition");
const setupPurpose = document.querySelector("#setup-purpose");
const feelingSlider = document.querySelector("#feeling-slider");
const lowLabel = document.querySelector("#low-label");
const highLabel = document.querySelector("#high-label");
const previousAnswer = document.querySelector("#previous-answer");
const currentAnswer = document.querySelector("#current-answer");
const ritualList = document.querySelector("#ritual-list");
const openAddRitual = document.querySelector("#open-add-ritual");
const nextButton = document.querySelector("#next-button");
const completeIntro = document.querySelector("#complete-intro");
const summaryList = document.querySelector("#summary-list");
const restartButton = document.querySelector("#restart-button");
const pageTransition = document.querySelector("#page-transition");

const reflectionModal = document.querySelector("#reflection-modal");
const reflectionTitle = document.querySelector("#reflection-title");
const reflectionQuestion = document.querySelector("#reflection-question");
const closeReflectionButton = document.querySelector("#close-reflection");
const reflectionRituals = document.querySelector("#reflection-rituals");
const openReflectionNote = document.querySelector("#open-reflection-note");
const reflectionNoteWrap = document.querySelector("#reflection-note-wrap");
const reflectionNote = document.querySelector("#reflection-note");
const reflectionOutcomeButtons = [...document.querySelectorAll(".outcome-button")];
const skipReflection = document.querySelector("#skip-reflection");
const continueReflection = document.querySelector("#continue-reflection");

const ritualModal = document.querySelector("#ritual-modal");
const closeModalButton = document.querySelector("#close-modal");
const ritualInput = document.querySelector("#ritual-input");
const suggestionList = document.querySelector("#suggestion-list");
const addRitualButton = document.querySelector("#add-ritual-button");

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => screen.classList.toggle("screen--active", key === name));
}

function savePersistentState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      hasCompletedSetup: state.hasCompletedSetup,
      rituals: state.rituals,
      previousAnswers: state.previousAnswers,
      reflections: state.reflections.slice(-100)
    }));
  } catch {
    // The check-in remains usable when storage is unavailable.
  }
}

function renderCategoryPreview() {
  categoryPreview.innerHTML = "";
  categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `<span class="category-row__icon" aria-hidden="true">${category.icon}</span><span class="category-row__name">${category.name}</span><span class="category-row__dot" aria-hidden="true"></span>`;
    categoryPreview.appendChild(row);
  });
}

function ritualContext(category) {
  return category.id === "movement" || category.id === "breath" || category.id === "hobbies"
    ? category.name.toLowerCase()
    : `your ${category.name.toLowerCase()}`;
}

function setVisiblePanel(panel) {
  setupPanel.hidden = panel !== setupPanel;
  ratingPanel.hidden = panel !== ratingPanel;
}

function renderCurrentStage() {
  const category = categories[state.currentIndex];
  stepLabel.textContent = `${state.currentIndex + 1} of ${categories.length}`;
  progressFill.style.width = `${((state.currentIndex + 1) / categories.length) * 100}%`;
  categoryIcon.textContent = category.icon;

  if (state.phase === "setup") renderSetupStage(category);
  else renderRatingStage(category);
}

function renderSetupStage(category) {
  setVisiblePanel(setupPanel);
  questionTitle.textContent = `Your ${category.name.toLowerCase()} rituals`;
  setupDefinition.textContent = `Rituals are the things you regularly do that may affect ${ritualContext(category)}.`;
  setupPurpose.textContent = "Add the ones that are part of your life. During future check-ins, you can note when one of them may have helped or made things harder.";
  nextButton.textContent = "Continue";
  renderRitualList(category);
}

function renderRatingStage(category) {
  setVisiblePanel(ratingPanel);
  questionTitle.textContent = category.question;
  feelingSlider.value = state.answers[category.id];
  lowLabel.textContent = category.low;
  highLabel.textContent = category.high;
  nextButton.textContent = state.currentIndex === categories.length - 1 ? "Finish" : "Next";

  previousAnswer.hidden = state.isInitialRun;
  previousAnswer.textContent = state.isInitialRun
    ? ""
    : `Previous check-in: ${describePosition(category, state.previousAnswers[category.id])}`;
  updateCurrentAnswer(category);
  requestAnimationFrame(() => feelingSlider.dispatchEvent(new Event("input", { bubbles: true })));
}

function updateCurrentAnswer(category) {
  currentAnswer.textContent = `Current answer: ${describePosition(category, state.answers[category.id])}`;
}

function renderRitualList(category) {
  const currentRituals = state.rituals[category.id];
  ritualList.innerHTML = "";

  if (currentRituals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "You have not added any rituals for this area yet.";
    ritualList.appendChild(empty);
    return;
  }

  currentRituals.forEach((ritual, ritualIndex) => {
    const row = document.createElement("div");
    row.className = "ritual-row";
    row.dataset.index = ritualIndex;

    const menuButton = document.createElement("button");
    menuButton.className = "ritual-menu";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", `Edit ${ritual}`);
    menuButton.textContent = "...";
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      beginRitualEdit(row, category.id, ritualIndex);
    });

    const name = document.createElement("span");
    name.className = "ritual-row__name";
    name.textContent = ritual;

    const removeButton = document.createElement("button");
    removeButton.className = "remove-ritual";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${ritual}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      state.rituals[category.id].splice(Number(row.dataset.index), 1);
      savePersistentState();
      renderCurrentStage();
    });

    row.append(menuButton, name, removeButton);
    row.addEventListener("pointerdown", beginRitualDrag);
    ritualList.appendChild(row);
  });
}

function beginRitualEdit(row, categoryId, ritualIndex) {
  if (row.classList.contains("ritual-row--editing")) return;

  const originalValue = state.rituals[categoryId][ritualIndex];
  const name = row.querySelector(".ritual-row__name");
  const menuButton = row.querySelector(".ritual-menu");
  const removeButton = row.querySelector(".remove-ritual");
  const input = document.createElement("input");
  let finished = false;

  row.classList.add("ritual-row--editing");
  input.className = "ritual-edit-input";
  input.type = "text";
  input.maxLength = 40;
  input.value = originalValue;
  input.setAttribute("aria-label", `Edit ${originalValue}`);
  name.replaceWith(input);
  menuButton.hidden = true;
  removeButton.hidden = true;

  function finish(save) {
    if (finished) return;
    finished = true;
    const editedValue = input.value.trim();
    if (save && editedValue) state.rituals[categoryId][ritualIndex] = editedValue;
    savePersistentState();
    renderCurrentStage();
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function beginRitualDrag(event) {
  if (event.button !== 0 || event.target.closest("button, input") || state.transitioning || state.phase !== "setup") return;

  const sourceRow = event.currentTarget;
  const categoryId = categories[state.currentIndex].id;
  const startIndex = Number(sourceRow.dataset.index);
  const startRect = sourceRow.getBoundingClientRect();
  const pointerId = event.pointerId;
  const offsetX = event.clientX - startRect.left;
  const offsetY = event.clientY - startRect.top;

  const ghost = sourceRow.cloneNode(true);
  ghost.className = "ritual-row ritual-row--ghost";
  ghost.removeAttribute("data-index");
  ghost.querySelectorAll("button").forEach((button) => button.remove());
  ghost.style.width = `${startRect.width}px`;
  ghost.style.height = `${startRect.height}px`;
  ghost.style.left = `${startRect.left}px`;
  ghost.style.top = `${startRect.top}px`;
  document.body.appendChild(ghost);

  sourceRow.classList.add("ritual-row--placeholder");
  ritualList.classList.add("ritual-list--sorting");
  document.body.classList.add("is-dragging");

  function placeGhost(pointerEvent) {
    ghost.style.left = `${pointerEvent.clientX - offsetX}px`;
    ghost.style.top = `${pointerEvent.clientY - offsetY}px`;
  }

  function clearIndicators() {
    ritualList.querySelectorAll(".ritual-row").forEach((item) => item.classList.remove("drop-before", "drop-after"));
  }

  function move(pointerEvent) {
    if (pointerEvent.pointerId !== pointerId) return;
    pointerEvent.preventDefault();
    placeGhost(pointerEvent);
    clearIndicators();

    const candidates = [...ritualList.querySelectorAll(".ritual-row:not(.ritual-row--placeholder)")];
    const pointerY = pointerEvent.clientY;
    let inserted = false;

    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (pointerY < midpoint) {
        candidate.classList.add("drop-before");
        ritualList.insertBefore(sourceRow, candidate);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      const last = candidates.at(-1);
      if (last) last.classList.add("drop-after");
      ritualList.appendChild(sourceRow);
    }
  }

  function end(pointerEvent) {
    if (pointerEvent.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);

    clearIndicators();
    ghost.remove();
    sourceRow.classList.remove("ritual-row--placeholder");
    ritualList.classList.remove("ritual-list--sorting");
    document.body.classList.remove("is-dragging");

    const endIndex = [...ritualList.children].indexOf(sourceRow);
    const rituals = state.rituals[categoryId];
    const [moved] = rituals.splice(startIndex, 1);
    rituals.splice(endIndex, 0, moved);
    savePersistentState();
    renderCurrentStage();
  }

  placeGhost(event);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  event.preventDefault();
}

function runPageTransition(changePage) {
  if (state.transitioning) return;
  state.transitioning = true;
  screens.checkin.classList.add("screen--fading-out");
  window.setTimeout(() => {
    changePage();
    window.scrollTo({ top: 0 });
    pageTransition.classList.add("page-transition--active");
  }, 150);
  window.setTimeout(() => {
    screens.checkin.classList.remove("screen--fading-out");
    screens.checkin.classList.add("screen--fading-in");
  }, 430);
  window.setTimeout(() => {
    pageTransition.classList.remove("page-transition--active");
    screens.checkin.classList.remove("screen--fading-in");
    state.transitioning = false;
  }, 700);
}

function describePosition(category, value) {
  if (value <= 20) return category.low;
  if (value <= 40) return `Closer to ${category.low.toLowerCase()}`;
  if (value < 60) return "Somewhere between";
  if (value < 80) return `Closer to ${category.high.toLowerCase()}`;
  return category.high;
}

function hasMeaningfulChange(category) {
  return Math.abs(state.answers[category.id] - state.previousAnswers[category.id]) >= CHANGE_PROMPT_THRESHOLD;
}

function resetReflectionState() {
  state.selectedRituals = new Set();
  state.reflectionOutcome = null;
  reflectionNote.value = "";
  reflectionNoteWrap.hidden = true;
  openReflectionNote.textContent = "＋ Something else";
  renderOutcomeButtons();
}

function openReflectionPrompt(category) {
  resetReflectionState();
  reflectionTitle.textContent = `Your ${category.name.toLowerCase()} has changed`;
  reflectionQuestion.textContent = `Did any of your ${category.name.toLowerCase()} rituals contribute to this?`;
  renderReflectionOptions(category);
  reflectionModal.hidden = false;
}

function closeReflectionPrompt() {
  reflectionModal.hidden = true;
  nextButton.focus();
}

function renderReflectionOptions(category) {
  const currentRituals = state.rituals[category.id];
  reflectionRituals.innerHTML = "";

  if (currentRituals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No rituals are saved for this area.";
    reflectionRituals.appendChild(empty);
    return;
  }

  currentRituals.forEach((ritual) => {
    const option = document.createElement("button");
    const isSelected = state.selectedRituals.has(ritual);
    option.className = "reflection-option";
    option.type = "button";
    option.setAttribute("aria-pressed", String(isSelected));

    const check = document.createElement("span");
    check.className = "reflection-option__check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = isSelected ? "✓" : "";

    const label = document.createElement("span");
    label.textContent = ritual;
    option.append(check, label);
    option.addEventListener("click", () => {
      state.reflectionOutcome = null;
      if (state.selectedRituals.has(ritual)) state.selectedRituals.delete(ritual);
      else state.selectedRituals.add(ritual);
      renderOutcomeButtons();
      renderReflectionOptions(category);
    });
    reflectionRituals.appendChild(option);
  });
}

function renderOutcomeButtons() {
  reflectionOutcomeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.outcome === state.reflectionOutcome));
  });
}

let checkInId = null;
function currentCheckInId() {
  if (!checkInId) checkInId = new Date().toISOString();
  return checkInId;
}

function recordReflection(category) {
  state.reflections.push({
    checkInId: currentCheckInId(),
    categoryId: category.id,
    from: state.previousAnswers[category.id],
    to: state.answers[category.id],
    rituals: [...state.selectedRituals],
    outcome: state.reflectionOutcome,
    note: reflectionNote.value.trim(),
    recordedAt: new Date().toISOString()
  });
}

function moveToNextCategory() {
  if (state.currentIndex < categories.length - 1) {
    state.currentIndex += 1;
    state.phase = state.isInitialRun ? "setup" : "rating";
    renderCurrentStage();
    return;
  }
  completeCheckIn();
}

function completeCheckIn() {
  const wasInitialRun = state.isInitialRun;
  state.hasCompletedSetup = true;
  state.isInitialRun = false;
  state.previousAnswers = { ...state.answers };
  savePersistentState();
  renderSummary();
  completeIntro.textContent = wasInitialRun
    ? "Your rituals and first check-in have been saved."
    : "Your answers and any explanations have been saved.";
  showScreen("complete");
}

function renderSummary() {
  summaryList.innerHTML = "";
  categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `<span>${category.icon} ${category.name}</span><span class="summary-row__value">${describePosition(category, state.answers[category.id])}</span>`;
    summaryList.appendChild(row);
  });
}

function openRitualModal() {
  const category = categories[state.currentIndex];
  ritualInput.value = "";
  addRitualButton.disabled = true;
  suggestionList.innerHTML = "";
  category.suggestions.forEach((suggestion) => {
    const button = document.createElement("button");
    button.className = "suggestion-chip";
    button.type = "button";
    button.textContent = `＋ ${suggestion}`;
    button.addEventListener("click", () => {
      ritualInput.value = suggestion;
      addRitualButton.disabled = false;
      ritualInput.focus();
    });
    suggestionList.appendChild(button);
  });
  ritualModal.hidden = false;
  requestAnimationFrame(() => ritualInput.focus());
}

function closeRitualModal() {
  ritualModal.hidden = true;
  openAddRitual.focus();
}

function addRitual() {
  const value = ritualInput.value.trim();
  if (!value) return;
  const category = categories[state.currentIndex];
  if (!state.rituals[category.id].some((ritual) => ritual.toLowerCase() === value.toLowerCase())) {
    state.rituals[category.id].push(value);
    savePersistentState();
  }
  closeRitualModal();
  renderCurrentStage();
}

function beginCheckIn() {
  state.currentIndex = 0;
  state.phase = state.hasCompletedSetup ? "rating" : "setup";
  state.isInitialRun = !state.hasCompletedSetup;
  state.answers = { ...state.previousAnswers };
  checkInId = new Date().toISOString();
  renderCurrentStage();
  showScreen("checkin");
}

startButton.addEventListener("click", beginCheckIn);

feelingSlider.addEventListener("input", () => {
  if (state.phase !== "rating") return;
  const category = categories[state.currentIndex];
  state.answers[category.id] = Number(feelingSlider.value);
  updateCurrentAnswer(category);
});

backButton.addEventListener("click", () => {
  if (state.transitioning) return;

  if (state.phase === "rating" && state.isInitialRun) {
    return runPageTransition(() => {
      state.phase = "setup";
      renderCurrentStage();
    });
  }

  if (state.currentIndex === 0) {
    showScreen("start");
    return;
  }

  runPageTransition(() => {
    state.currentIndex -= 1;
    state.phase = "rating";
    renderCurrentStage();
  });
});

nextButton.addEventListener("click", () => {
  const category = categories[state.currentIndex];

  if (state.phase === "setup") {
    savePersistentState();
    return runPageTransition(() => {
      state.phase = "rating";
      renderCurrentStage();
    });
  }

  if (!state.isInitialRun && hasMeaningfulChange(category)) {
    openReflectionPrompt(category);
    return;
  }

  runPageTransition(moveToNextCategory);
});

closeReflectionButton.addEventListener("click", closeReflectionPrompt);
reflectionModal.addEventListener("click", (event) => {
  if (event.target === reflectionModal) closeReflectionPrompt();
});

openReflectionNote.addEventListener("click", () => {
  const willOpen = reflectionNoteWrap.hidden;
  reflectionNoteWrap.hidden = !willOpen;
  openReflectionNote.textContent = willOpen ? "− Hide explanation" : "＋ Something else";
  if (willOpen) requestAnimationFrame(() => reflectionNote.focus());
});

reflectionOutcomeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const outcome = button.dataset.outcome;
    state.reflectionOutcome = state.reflectionOutcome === outcome ? null : outcome;
    if (state.reflectionOutcome) state.selectedRituals.clear();
    renderOutcomeButtons();
    renderReflectionOptions(categories[state.currentIndex]);
  });
});

skipReflection.addEventListener("click", () => {
  closeReflectionPrompt();
  runPageTransition(moveToNextCategory);
});

continueReflection.addEventListener("click", () => {
  const category = categories[state.currentIndex];
  recordReflection(category);
  closeReflectionPrompt();
  runPageTransition(moveToNextCategory);
});

openAddRitual.addEventListener("click", openRitualModal);
closeModalButton.addEventListener("click", closeRitualModal);
ritualModal.addEventListener("click", (event) => {
  if (event.target === ritualModal) closeRitualModal();
});
ritualInput.addEventListener("input", () => {
  addRitualButton.disabled = ritualInput.value.trim().length === 0;
});
ritualInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && ritualInput.value.trim()) addRitual();
  if (event.key === "Escape") closeRitualModal();
});
addRitualButton.addEventListener("click", addRitual);

restartButton.addEventListener("click", () => {
  state.currentIndex = 0;
  state.phase = "rating";
  showScreen("start");
});

renderCategoryPreview();
