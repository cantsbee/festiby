export function Button({ id, text, onClick, className = '' }) {
  const btn = document.createElement('button');
  if (id) btn.id = id;
  btn.textContent = text;
  btn.className = className;
  if (onClick) btn.onclick = onClick;
  return btn;
} 