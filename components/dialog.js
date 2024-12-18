import { gsap } from 'gsap';
import { projects } from '../data.js';

export function initProjectDialog() {
  const dialog = document.querySelector('#project-dialog');
  const mainContent = document.querySelector('.flex.flex-col.md\\:flex-row.max-w-4xl');

  if (!dialog || !mainContent) return;

  dialog.addEventListener('wheel', (e) => {
    if (dialog.open) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false }); 

  let isAnimating = false;

  const dialogOpenAnimation = gsap.timeline({ 
    paused: true,
    onStart: () => isAnimating = true,
    onComplete: () => isAnimating = false
  })
    .set(dialog, { visibility: 'visible' })
    .to(dialog, {
      xPercent: 0,
      duration: 0.5,
      ease: 'power3.out'
    })
    .to(mainContent, {
      x: 600,
      duration: 0.5,
      ease: 'power3.out',  
    }, '<');

  const dialogCloseAnimation = gsap.timeline({ 
    paused: true,
    onStart: () => isAnimating = true,
    onComplete: () => {
      isAnimating = false;
      dialog.close();
      gsap.set(dialog, { visibility: 'hidden' });
      // Re-enable scrolling
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  })
    .to(dialog, {
      xPercent: -100,
      duration: 0.5,
      ease: 'power3.out'
    })
    .to(mainContent, {
      x: 0,
      duration: 0.5,
      ease: 'power3.out'
    }, '<');

  // Initial state
  gsap.set(dialog, {
    xPercent: -100,
    visibility: 'hidden'
  });

  function updateDialogContent(project) {
    if (!project) return;
    dialog.querySelector('.project-title').textContent = project.title;
    dialog.querySelector('.project-year').textContent = project.year;
    dialog.querySelector('.project-roles').textContent = project.roles;
    
    const imagesContainer = dialog.querySelector('.project-images');
    imagesContainer.innerHTML = `
      <img src="${project.image}" 
           alt="${project.title}" 
           class="absolute inset-0 object-cover w-full h-full"
           loading="lazy">
    `;

    const launchButton = dialog.querySelector('#button-launch-project');
    if (!launchButton) return;

    // Remove any existing hover effect
    const existingEffect = launchButton.querySelector('.hover-effect');
    if (existingEffect) {
      existingEffect.remove();
    }

    // Create hover effect element with modified positioning
    const hoverEffect = document.createElement('span');
    hoverEffect.className = 'hover-effect absolute top-0 left-0 w-full h-full rounded-full bg-secondary -z-[1] pb-5 pointer-events-none';
    launchButton.appendChild(hoverEffect);

    // Ensure button has relative positioning and overflow hidden
    launchButton.style.position = 'relative';
    launchButton.style.overflow = 'hidden';

    // Set initial state
    gsap.set(hoverEffect, {
      scaleX: 0,
      transformOrigin: 'left bottom'
    });

    // Create hover animations
    const hoverAnimation = gsap.timeline({ paused: true })
      .to(hoverEffect, {
        scaleX: 1,
        duration: 0.3,
        ease: "power2.out"
      });

    // Add event listeners
    launchButton.addEventListener('mouseenter', () => hoverAnimation.play());
    launchButton.addEventListener('mouseleave', () => hoverAnimation.reverse());
  }

  function handleProjectClick(e) {
    const projectItem = e.target.closest('.project-item');
    if (!projectItem) return;
    
    const index = parseInt(projectItem.dataset.projectIndex, 10);
    if (isNaN(index) || !projects[index]) return;
    
    openDialog(projects[index]);
  }

  function openDialog(project) {
    updateDialogContent(project);
    dialog.showModal();
    dialogOpenAnimation.restart();
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  function closeDialog() {
    // Prevent multiple animations from running simultaneously
    if (isAnimating || !dialog.open) return;
    
    dialogCloseAnimation.restart();
  }

  // Event Listeners
  document.querySelector('#projects').addEventListener('click', handleProjectClick);
  dialog.querySelector('.close-dialog')?.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeDialog();
  });

  // Prevent default ESC behavior
  dialog.addEventListener('cancel', (e) => e.preventDefault());

  // Handle ESC key
  const handleEscKey = (e) => {
    if (e.key === 'Escape' && dialog.open) {
      e.preventDefault();
      closeDialog();
    }
  };
  document.addEventListener('keydown', handleEscKey);

  return () => {
    document.querySelector('#projects').removeEventListener('click', handleProjectClick);
    dialog.querySelector('.close-dialog')?.removeEventListener('click', closeDialog);
    dialog.removeEventListener('click', (e) => {
      if (e.target === dialog) closeDialog();
    });
    document.removeEventListener('keydown', handleEscKey);
    gsap.killTweensOf([dialog, mainContent]);
  };
}
