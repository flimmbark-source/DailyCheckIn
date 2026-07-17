const checkInSlider = document.querySelector("#feeling-slider");

function updateCheckInSliderColor() {
  if (!checkInSlider) return;

  const min = Number(checkInSlider.min) || 0;
  const max = Number(checkInSlider.max) || 100;
  const value = Number(checkInSlider.value);
  const progress = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const hue = Math.round(progress * 120);

  checkInSlider.style.setProperty("--slider-position", `${progress * 100}%`);
  checkInSlider.style.setProperty("--slider-color", `hsl(${hue} 72% 46%)`);
}

checkInSlider?.addEventListener("input", updateCheckInSliderColor);

["#start-button", "#next-button", "#back-button", "#restart-button"].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("click", () => {
    requestAnimationFrame(updateCheckInSliderColor);
    window.setTimeout(updateCheckInSliderColor, 460);
  });
});

updateCheckInSliderColor();