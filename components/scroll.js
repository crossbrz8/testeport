export function disableScroll() {
    const scrollPosition = window.scrollY;
    document.body.style.cssText = `
      overflow: hidden;
      position: fixed;
      width: 100%;
      top: -${scrollPosition}px;
    `;
    return scrollPosition;
  }
  
  export function enableScroll(scrollPosition) {
    document.body.style.cssText = '';
    window.scrollTo(0, scrollPosition);
  }