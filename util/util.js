const lineBreak = (text, max, $container) => {
  const getTotalWidth = ($el) =>
    Array.from($el.children).reduce((acc, child) => acc + child.getBoundingClientRect().width, 0);
  
  const createNewLine = () => {
    const $line = document.createElement('span');
    $line.classList.add('line');
    return $line;
  };
  // Step 1: Break text into words and wrap in span elements
  const words = text.split(/\s/).map((w, i) => {
    const span = document.createElement('span');
    span.classList.add('word');
    span.innerHTML = (i > 0 ? ' ' : '') + w;
    return span;
  });

  // Step 2: Insert words into the container
  $container.innerHTML = '';
  words.forEach(word => $container.appendChild(word));

  // Step 3: Add left-space and right-space classes
  words.forEach((word, i) => {
    if (i > 0 && word.innerHTML.startsWith(' ')) {
      word.classList.add('left-space');
    }
    if (word.innerHTML.endsWith(' ')) {
      word.classList.add('right-space');
    }
  });

  // Step 4: Calculate total width and create new lines if necessary
  if (getTotalWidth($container) > max) {
    $container.innerHTML = '';
    let $currentLine = createNewLine();
    $container.appendChild($currentLine);

    words.forEach(word => {
      $currentLine.appendChild(word);
      if (getTotalWidth($currentLine) > max) {
        $currentLine.removeChild(word);
        $currentLine = createNewLine();
        $currentLine.appendChild(word);
        $container.appendChild($currentLine);
      }
    });
  } else {
    // If no line break is needed, just put all words in a single line
    const $line = createNewLine();
    words.forEach(word => $line.appendChild(word));
    $container.appendChild($line);
  }

  // Step 5: Wrap lines in `.text` span and remove empty lines
  Array.from($container.querySelectorAll('.line')).forEach(line => {
    if (line.innerText.trim()) {
      line.innerHTML = `<span class="text">${line.innerHTML}</span>`;
    } else {
      line.remove();
    }
  });
};

const getStyleNumber = (el, property) => {
  return Number(getComputedStyle(el)[property].replace('px', ''));
}
const isTouch = () => {
  try {
    document.createEvent('TouchEvent');
    return true;
  } catch (e) {
    return false;
  }
}
export default {
  isTouch: isTouch,
  getStyleNumber: getStyleNumber,
  lineBreak: lineBreak,
}