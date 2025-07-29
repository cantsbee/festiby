export function Section({ id, title, children = [], className = '' }) {
  const section = document.createElement('div');
  if (id) section.id = id;
  section.className = className;
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    section.appendChild(h2);
  }
  children.forEach(child => section.appendChild(child));
  return section;
} 