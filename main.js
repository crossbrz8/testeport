import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Splitting from "splitting";
import { initCursor } from './components/cursor';
import { initProjectDialog } from './components/dialog';
import { disableScroll, enableScroll } from './components/scroll';
import './style.css';
import Column from './components/column.js';
import { fetchProjects } from './data.js';
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import { initDistortion } from './components/distortion'

gsap.registerPlugin(ScrollTrigger);

// Create a shared scroll state that both Column and Distortion can access
const sharedScrollState = {
  current: 0,
  target: 0,
  velocity: 0,
  isScrolling: false
};

async function renderProjects() {
  const projectsList = document.querySelector('#projects ul');
  if (!projectsList) return;

  try {
    const projects = await fetchProjects();
    console.log('Rendering projects:', projects);
    
    const fragment = document.createDocumentFragment();
    
    projects.forEach((project, index) => {
      const li = document.createElement('li');
      li.className = 'w-full swiper-slide';
      
      // Use a default image if project.image is missing
      const imageUrl = project.image;
      
      li.innerHTML = `
        <button class="project-item flex flex-col items-center justify-center gap-2.5" data-project-index="${index}">
          <picture class="w-[140px] h-[140px] sm:w-full md:w-[120px] md:h-[120px] xl:w-[200px] xl:h-[200px] aspect-square block">
            <source media="(min-width: 768px)" srcset="${imageUrl}">
            <img
              data-webgl-media 
              data-project-index="${index}"
              src="${imageUrl}" 
              alt="${project.title || 'Project image'}" 
              loading="eager"
              crossorigin="anonymous"
              class="w-full h-full object-cover invisible sm:visible"
              onerror="this.onerror=null; this.src='/images/placeholder.jpg';"
            >
          </picture>
          <span class="uppercase md:hidden">${project.title || 'Untitled Project'}</span>
        </button>
      `;
      fragment.appendChild(li);
    });
    
    projectsList.textContent = '';
    projectsList.appendChild(fragment);

    // After rendering, initialize distortion
    const projectImages = document.querySelectorAll('[data-webgl-media]');
    if (projectImages.length > 0) {
      initDistortion({
        scrollState: sharedScrollState
      });
    }
  } catch (error) {
    console.error('Error rendering projects:', error);
  }
}

async function preloadAssets() {
  // Initialize Splitting first
  Splitting();

  try {
    const projects = await fetchProjects();
    console.log('Fetched projects:', projects); // Debug log
    
    // Preload all project images
    const imagePromises = projects.map(project => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log(`Successfully loaded image: ${project.image}`);
          resolve(img);
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${project.image}`);
          resolve();
        };
        img.src = project.image;
      });
    });

    // Render projects while loading
    await renderProjects();

    // Initialize columns early
    if (window.innerWidth > 768) {
      const bioSection = document.querySelector('#bio-section');
      const projectsSection = document.querySelector('#projects');
      
      if (bioSection) {
        new Column({
          el: bioSection,
          reverse: false,
          scrollState: sharedScrollState
        });
      }

      if (projectsSection) {
        new Column({
          el: projectsSection.querySelector('.container-projects'),
          reverse: true,
          scrollState: sharedScrollState
        });
      }
    }

    // Initialize Three.js and distortion
    const distortionPromise = initDistortion({ scrollState: sharedScrollState });

    try {
      // Wait for all assets to load
      await Promise.all([...imagePromises, distortionPromise]);
      return true;
    } catch (error) {
      console.error('Error in Promise.all:', error);
      return false;
    }
  } catch (error) {
    console.error('Error in preloadAssets:', error);
    return false;
  }
}

async function initLoader() {
  const scrollPosition = disableScroll();
  
  // Initialize Splitting first
  const splitResults = Splitting();
  
  // Set initial states
  gsap.set(".main-loader", { opacity: 0 });
  gsap.set(".loader-item", { opacity: 0 });
  gsap.set("#projects", { 
    opacity: 0,
    y: window.innerWidth >= 768 ? -200 : 0,
    x: window.innerWidth < 768 ? -200 : 0
  });
  gsap.set("#hero-content", { opacity: 1 });
  gsap.set("#bio-section", { 
    opacity: 0,
    y: 200
  });
  gsap.set("#hero-heading .char", {
    yPercent: 100,
    opacity: 0,
    display: 'inline-block'
  });
  gsap.set("#hero-list li, #hero-email, #social-links", { 
    y: 100,
    opacity: 0
  });
  gsap.set("#webgl", {
    opacity: 0
  });

  // Create loading timeline
  const tl = gsap.timeline();
  
  // Start loading animation
  tl.to(".loader-item", {
    opacity: 1,
    rotation: 360,
    duration: 1,
    ease: "power4.inOut"
  })
  .to(".main-loader", {
    duration: 1,
    opacity: 1,
    ease: "power2.inOut"
  });

  // Preload all assets while the animation is playing
  await preloadAssets();
  
  // Complete the loading sequence
  return tl
    .to(".loader-item", {
      rotation: 720,
      duration: 1,
      ease: "power4.inOut"
    })
    .to(".main-loader", {
      duration: 1,
      opacity: 0,
      ease: "power4.inOut"
    })
    .to(".loader-item", {
      opacity: 0,
      duration: 1,
      ease: "power4.inOut"
    })
    .to("#loader", {
      display: 'none'
    })
    .to("#hero-heading .char", {
      y: 0,
      yPercent: 0,
      opacity: 1,
      duration: 1.5,
      ease: "power4.out",
      stagger: {
        amount: 0.3,
        from: "start"
      }
    })
    .to(["#hero-list li", "#hero-email", "#social-links", "#bio-section", "#projects", "#webgl"], {
      y: 0,
      yPercent: 0,
      opacity: 1,
      x: 0,
      duration: 1.5,
      ease: "power4.out",
      stagger: {
        amount: 0.8,
        from: "start"
      },
      clearProps: "all",
      onComplete: () => enableScroll(scrollPosition)
    }, "<0.2");
}

function initMobileSwiper() {
  let projectsSwiper = null;
  let resizeTimeout;

  function handleResize() {
    // Clear any pending resize timeout
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    // Debounce the resize handler
    resizeTimeout = setTimeout(() => {
      const isMobile = window.innerWidth < 768;
      
      if (isMobile && !projectsSwiper) {
        projectsSwiper = new Swiper('.swiper', {
          modules: [Navigation, Pagination],
          direction: 'horizontal',
          slidesPerView: 'auto',
          spaceBetween: 10,
          centeredSlides: true,
          loop: true,
          // Add touch handling optimization
          touchEventsTarget: 'container',
          touchRatio: 1,
          touchAngle: 45,
          grabCursor: true
        });
      } else if (!isMobile && projectsSwiper) {
        projectsSwiper.destroy(true, true); // true, true for complete cleanup
        projectsSwiper = null;
      }
    }, 250); // 250ms debounce delay
  }

  // Initial check
  handleResize();

  // Use passive listener for better performance
  window.addEventListener('resize', handleResize, { passive: true });

  // Return cleanup function
  return () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    window.removeEventListener('resize', handleResize);
    if (projectsSwiper) {
      projectsSwiper.destroy(true, true);
    }
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize components
    const cleanup = {
      cursor: initCursor(),
      dialog: initProjectDialog(),
      swiper: initMobileSwiper()
    };
    
    // Start the loader sequence which includes all initialization
    await initLoader();
    
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});
