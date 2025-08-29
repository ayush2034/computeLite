// main.js
const btn = document.getElementById('change');
const demo = document.getElementById('demo');
if (btn && demo) {
  btn.addEventListener('click', () => {
    demo.textContent = "Button clicked! Tailwind + Vanilla JS in action.";
  });
}
