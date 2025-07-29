export function TextArea({ id, placeholder = '', rows = 4, cols = 40, className = '' }) {
  const ta = document.createElement('textarea');
  if (id) ta.id = id;
  ta.placeholder = placeholder;
  ta.rows = rows;
  ta.cols = cols;
  ta.className = className;
  return ta;
} 