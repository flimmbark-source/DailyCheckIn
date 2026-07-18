// First-run order: rating bar, then ritual setup, then the next category.
// Subsequent check-ins continue to use the normal rating-only flow in app.js.

const baseRenderRatingStage = renderRatingStage;

renderRatingStage = function renderRatingStageBarFirst(category) {
  baseRenderRatingStage(category);
  if (state.isInitialRun) nextButton.textContent = "Continue";
};

function startInitialCheckInWithRating() {
  state.currentIndex = 0;
  state.phase = "rating";
  state.isInitialRun = true;
  state.answers = { ...state.previousAnswers };
  checkInId = new Date().toISOString();
  renderCurrentStage();
  showScreen("checkin");
}

function movePastInitialRitualSetup() {
  if (state.currentIndex < categories.length - 1) {
    state.currentIndex += 1;
    state.phase = "rating";
    renderCurrentStage();
    return;
  }

  completeCheckIn();
}

startButton.addEventListener("click", (event) => {
  if (state.hasCompletedSetup) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  startInitialCheckInWithRating();
}, true);

nextButton.addEventListener("click", (event) => {
  if (!state.isInitialRun) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (state.transitioning) return;

  if (state.phase === "rating") {
    runPageTransition(() => {
      state.phase = "setup";
      renderCurrentStage();
    });
    return;
  }

  savePersistentState();
  runPageTransition(movePastInitialRitualSetup);
}, true);

backButton.addEventListener("click", (event) => {
  if (!state.isInitialRun) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (state.transitioning) return;

  if (state.phase === "setup") {
    runPageTransition(() => {
      state.phase = "rating";
      renderCurrentStage();
    });
    return;
  }

  if (state.currentIndex === 0) {
    showScreen("start");
    return;
  }

  // The step immediately before this category's bar is the previous
  // category's ritual setup screen.
  runPageTransition(() => {
    state.currentIndex -= 1;
    state.phase = "setup";
    renderCurrentStage();
  });
}, true);
