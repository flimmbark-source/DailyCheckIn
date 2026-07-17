const categories = [
  {
    id: "sleep",
    name: "Sleep",
    icon: "☾",
    question: "How has your sleep been recently?",
    low: "Restless",
    high: "Rested",
    rituals: ["30 min tech break", "Shower", "Dim the lights"],
    suggestions: ["Read", "Listen to music", "Breathing practice", "Prepare the room"]
  },
  {
    id: "hygiene",
    name: "Hygiene",
    icon: "◉",
    question: "How has your hygiene been recently?",
    low: "Disconnected",
    high: "Cared for",
    rituals: ["Shower", "Brush teeth", "Skin care"],
    suggestions: ["Wash face", "Change clothes", "Brush hair", "Prepare toiletries"]
  },
  {
    id: "nourishment",
    name: "Nourishment",
    icon: "❧",
    question: "How has your nourishment been recently?",
    low: "Depleted",
    high: "Nourished",
    rituals: ["Eat breakfast", "Drink water", "Prepare lunch"],
    suggestions: ["Make a snack", "Fill water bottle", "Plan one meal", "Eat without screens"]
  },
  {
    id: "movement",
    name: "Movement",
    icon: "↗",
    question: "How has movement felt recently?",
    low: "Still",
    high: "Energised",
    rituals: ["Morning stretch", "Short walk"],
    suggestions: ["Gentle stretch", "Walk outdoors", "Dance to one song", "Rest intentionally"]
  },
  {
    id: "breath",
    name: "Breath",
    icon: "≈",
    question: "How has your breath felt recently?",
    low: "Tight",
    high: "Open",
    rituals: ["Three slow breaths"],
    suggestions: ["Pause between tasks", "Breathe by a window", "Lengthen the exhale"]
  },
  {
    id: "hobbies",
    name: "Hobbies",
    icon: "♡",
    question: "How have your hobbies felt recently?",
    low: "Distant",
    high: "Connected",
    rituals: ["Read for 10 minutes"],
    suggestions: ["Draw", "Play music", "Make something", "Return to an old interest"]
  }
];

const state = {
  currentIndex: 0,
  answers: Object.fromEntries(categories.map((category) => [category.id, 50])),
  rituals: Object.fromEntries(categories.map((category) => [category.id, [...category.rituals]]))
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
const feelingSlider = document.querySelector("#feeling-slider");
const lowLabel = document.querySelector("#low-label");
const highLabel = document.querySelector("#high-label");
const ritualList = document.querySelector("#ritual-list");
const ritualCount = document.querySelector("#ritual-count");
const openAddRitual = document.querySelector("#open-add-ritual");
const nextButton = document.querySelector("#next-button");
const summaryList = document.querySelector("#summary-list");
const restartButton = document.querySelector("#restart-button");

const modal = document.querySelector("#ritual-modal");
const closeModalButton = document.querySelector("#close-modal");
const ritualInput = document.querySelector("#ritual-input");
const suggestionList = document.querySelector("#suggestion-list");
const addRitualButton = document.querySelector("#add-ritual-button");

function showScreen(name) {
  Object.entries(screens).forEach(([key, screen]) => {
    screen.classList.toggle("screen--active", key === name);
  });
}

function renderCategoryPreview() {
  categoryPreview.innerHTML = "";
  categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <span class="category-row__icon" aria-hidden="true">${category.icon}</span>
      <span class="category-row__name">${category.name}</span>
      <span class="category-row__dot" aria-hidden="true"></span>
    `;
    categoryPreview.appendChild(row);
  });
}

function renderCurrentCategory() {
  const category = categories[state.currentIndex];
  const currentRituals = state.rituals[category.id];

  stepLabel.textContent = `${state.currentIndex + 1} of ${categories.length}`;
  progressFill.style.width = `${((state.currentIndex + 1) / categories.length) * 100}%`;
  categoryIcon.textContent = category.icon;
  questionTitle.textContent = category.question;
  feelingSlider.value = state.answers[category.id];
  lowLabel.textContent = category.low;
  highLabel.textContent = category.high;
  ritualCount.textContent = `${currentRituals.length} ${currentRituals.length === 1 ? "ritual" : "rituals"}`;
  nextButton.textContent = state.currentIndex === categories.length - 1 ? "Finish" : "Next";

  ritualList.innerHTML = "";
  currentRituals.forEach((ritual, ritualIndex) => {
    const row = document.createElement("div");
    row.className = "ritual-row";

    const name = document.createElement("span");
    name.className = "ritual-row__name";
    name.textContent = ritual;

    const removeButton = document.createElement("button");
    removeButton.className = "remove-ritual";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${ritual}`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", () => {
      state.rituals[category.id].splice(ritualIndex, 1);
      renderCurrentCategory();
    });

    row.append(name, removeButton);
    ritualList.appendChild(row);
  });
}

function describePosition(category, value) {
  if (value <= 20) return category.low;
  if (value <= 40) return `Closer to ${category.low.toLowerCase()}`;
  if (value < 60) return "Somewhere between";
  if (value < 80) return `Closer to ${category.high.toLowerCase()}`;
  return category.high;
}

function renderSummary() {
  summaryList.innerHTML = "";
  categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `
      <span>${category.icon} ${category.name}</span>
      <span class="summary-row__value">${describePosition(category, state.answers[category.id])}</span>
    `;
    summaryList.appendChild(row);
  });
}

function openModal() {
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

  modal.hidden = false;
  requestAnimationFrame(() => ritualInput.focus());
}

function closeModal() {
  modal.hidden = true;
  openAddRitual.focus();
}

function addRitual() {
  const value = ritualInput.value.trim();
  if (!value) return;

  const category = categories[state.currentIndex];
  if (!state.rituals[category.id].some((ritual) => ritual.toLowerCase() === value.toLowerCase())) {
    state.rituals[category.id].push(value);
  }

  closeModal();
  renderCurrentCategory();
}

startButton.addEventListener("click", () => {
  state.currentIndex = 0;
  renderCurrentCategory();
  showScreen("checkin");
});

feelingSlider.addEventListener("input", () => {
  const category = categories[state.currentIndex];
  state.answers[category.id] = Number(feelingSlider.value);
});

backButton.addEventListener("click", () => {
  if (state.currentIndex === 0) {
    showScreen("start");
    return;
  }
  state.currentIndex -= 1;
  renderCurrentCategory();
});

nextButton.addEventListener("click", () => {
  if (state.currentIndex < categories.length - 1) {
    state.currentIndex += 1;
    renderCurrentCategory();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  renderSummary();
  showScreen("complete");
});

openAddRitual.addEventListener("click", openModal);
closeModalButton.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

ritualInput.addEventListener("input", () => {
  addRitualButton.disabled = ritualInput.value.trim().length === 0;
});

ritualInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && ritualInput.value.trim()) addRitual();
  if (event.key === "Escape") closeModal();
});

addRitualButton.addEventListener("click", addRitual);

restartButton.addEventListener("click", () => {
  state.currentIndex = 0;
  showScreen("start");
});

renderCategoryPreview();
