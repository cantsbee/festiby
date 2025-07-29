export function ResultList({ id, items = [], className = '' }) {
  const ul = document.createElement('ul');
  if (id) ul.id = id;
  ul.className = className;
  items.forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = item;
    ul.appendChild(li);
  });
  return ul;
} 