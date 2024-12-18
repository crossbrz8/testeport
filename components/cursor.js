import { gsap } from 'gsap';
import { projects } from '../data.js';

export function initCursor() {
  const cursorItem = document.querySelector(".container-projects .cursor");
  const cursorParagraph = cursorItem?.querySelector(".text-for-cursor");
  const projectsContainer = document.querySelector(".container-projects");

  if (!cursorItem || !cursorParagraph || !projectsContainer) return;

  let isHoveringProject = false;
  let currentProject = null;
  let rafId = null;
  let lastX = 0;
  let lastY = 0;
  let currentX = 0;
  let currentY = 0;

  // Initial state
  gsap.set(cursorItem, { 
    xPercent: -50,
    yPercent: -50,
    position: 'fixed',
    force3D: true,
    opacity: 0,
    scale: 0,
    zIndex: 9999
  });

  const cursorTimeline = gsap.timeline({ paused: true });
  cursorTimeline.to(cursorItem, {
    opacity: 1,
    scale: 1,
    duration: 0.3,
    ease: "power3.out"
  });

  function updateCursorPosition() {
    if (!isHoveringProject) return;

    currentX += (lastX - currentX) * 0.15;
    currentY += (lastY - currentY) * 0.15;

    gsap.set(cursorItem, {
      x: currentX,
      y: currentY
    });

    rafId = requestAnimationFrame(updateCursorPosition);
  }

  const handleMouseMove = (e) => {
    if (!isHoveringProject || !currentProject) return;
    
    lastX = e.clientX;
    lastY = e.clientY;

    if (!rafId) {
      rafId = requestAnimationFrame(updateCursorPosition);
    }
  };

  const handleProjectHover = (e) => {
    const projectItem = e.currentTarget;
    if (!projectItem) return;
    
    currentProject = projectItem;
    // Find the original index (before cloning)
    const projectLi = projectItem.closest('li');
    const allLis = Array.from(projectsContainer.querySelectorAll('li'));
    const index = allLis.indexOf(projectLi) % projects.length; // Use modulo to get original index
    
    const projectTitle = projects[index]?.title;
    
    isHoveringProject = true;
    cursorParagraph.textContent = projectTitle;
    
    lastX = currentX = e.clientX;
    lastY = currentY = e.clientY;
    
    gsap.set(cursorItem, { x: currentX, y: currentY });
    cursorTimeline.play();
    
    if (!rafId) {
      rafId = requestAnimationFrame(updateCursorPosition);
    }
  };

  const handleProjectLeave = () => {
    isHoveringProject = false;
    currentProject = null;
    cursorParagraph.textContent = "";
    
    cursorTimeline.reverse();
    
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  function attachProjectListeners() {
    const projectItems = projectsContainer.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      item.addEventListener("mouseenter", handleProjectHover, { passive: true });
      item.addEventListener("mouseleave", handleProjectLeave, { passive: true });
    });
  }

  // Add mousemove listener
  window.addEventListener("mousemove", handleMouseMove, { passive: true });

  // Add MutationObserver to watch for content changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        attachProjectListeners();
      }
    });
  });

  observer.observe(projectsContainer, { 
    childList: true, 
    subtree: true 
  });

  // Initial attachment
  attachProjectListeners();

  return () => {
    observer.disconnect();
    window.removeEventListener("mousemove", handleMouseMove);
    const projectItems = projectsContainer.querySelectorAll('.project-item');
    projectItems.forEach(item => {
      item.removeEventListener("mouseenter", handleProjectHover);
      item.removeEventListener("mouseleave", handleProjectLeave);
    });
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    gsap.killTweensOf(cursorItem);
    cursorTimeline.kill();
  };
}