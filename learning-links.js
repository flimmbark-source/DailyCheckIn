const learnMoreLink = document.querySelector("#learn-more");

function learningUrl(category) {
  return `learning.html?category=${encodeURIComponent(category.id)}`;
}

const renderSetupStageBeforeLearningLink = renderSetupStage;
renderSetupStage = function renderSetupStageWithLearningLink(category) {
  renderSetupStageBeforeLearningLink(category);
  learnMoreLink.href = learningUrl(category);
  learnMoreLink.hidden = false;
};

const renderRatingStageBeforeLearningLink = renderRatingStage;
renderRatingStage = function renderRatingStageWithoutLearningLink(category) {
  renderRatingStageBeforeLearningLink(category);
  learnMoreLink.hidden = true;
};

openAddRitual.addEventListener("click", () => {
  suggestionList.querySelector(".suggestion-chip--learn-more")?.remove();

  const category = categories[state.currentIndex];
  const learnChip = document.createElement("a");
  learnChip.className = "suggestion-chip suggestion-chip--learn-more";
  learnChip.href = learningUrl(category);
  learnChip.textContent = "Learn more...";
  suggestionList.appendChild(learnChip);
});
