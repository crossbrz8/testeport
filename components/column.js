import Splitting from "splitting";
import gsap from "gsap";
export default class Column {
  constructor({ el, reverse = false, scrollState }) {
    if (!el) return;
    
    this.$el = el;
    this.reverse = reverse;
    this.scrollState = scrollState;
    
    // Performance and state tracking
    this.state = {
      isDesktop: window.innerWidth > 768,
      destroyed: false,
      isScrolling: false,
      autoScroll: false,
      isPaused: false
    };
    
    // Scroll physics configuration
    this.scroll = {
      ease: 0.035,
      current: 0,
      target: 0,
      last: 0,
      velocity: 0,
      lerp: 0.5,
      maxSpeed: 160
    };
    
    // Velocity and speed controls
    this.velocityConfig = {
      default: 0.8,
      max: 1.5,
      increment: 0.15,
      maxVelocity: 4,
      current: 0
    };
    
    // Touch interaction tracking
    this.touch = {
      start: 0,
      previous: 0,
      delta: 0
    };
    
    // Performance optimization - bind methods once
    this.boundMethods = {
      render: this.render.bind(this),
      handleResize: this.debounce(this.handleResize.bind(this), 200),
      wheel: this.wheel.bind(this),
      handleMouseEnter: this.handleMouseEnter.bind(this),
      handleMouseLeave: this.handleMouseLeave.bind(this),
      handleTouchStart: this.handleTouchStart.bind(this),
      handleTouchMove: this.handleTouchMove.bind(this),
      handleTouchEnd: this.handleTouchEnd.bind(this)
    };
    
    // Refs and calculations
    this.refs = {
      rafId: null,
      scrollTimeout: null,
      windowHeight: window.innerHeight,
      contentHeight: 0
    };
    
    // Determine content container
    this.state.isProjects = this.$el?.classList?.contains('container-projects') || false;
    this.$content = this.state.isProjects 
      ? this.$el.querySelector('ul')
      : this.$el.querySelector('.column-content') || this.$el;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the column scroll behavior
   */
  init() {
    if (!this.state.isDesktop) {
      this.resetStyles();
      return;
    }
    
    // Add event listeners with optimization
    this.addEventListeners();
    
    // Prepare content for continuous scrolling
    this.prepareContent();
    
    // Initial setup
    this.resize();
    this.startAnimation();
  }
  
  /**
   * Add event listeners with performance considerations
   */
  addEventListeners() {
    const options = { passive: true };
    
    window.addEventListener('resize', this.boundMethods.handleResize, options);
    window.addEventListener('wheel', this.boundMethods.wheel, { passive: false });
    
    this.$el.addEventListener('mouseenter', this.boundMethods.handleMouseEnter, options);
    this.$el.addEventListener('mouseleave', this.boundMethods.handleMouseLeave, options);
    
    // Add touch support
    this.$el.addEventListener('touchstart', this.boundMethods.handleTouchStart, options);
    this.$el.addEventListener('touchmove', this.boundMethods.handleTouchMove, options);
    this.$el.addEventListener('touchend', this.boundMethods.handleTouchEnd, options);
  }
  
  /**
   * Prepare content for continuous scrolling
   */
  prepareContent() {
    this.originalContent = Array.from(this.$content.children);
    
    const viewportHeight = window.innerHeight;
    const contentHeight = this.$content.scrollHeight;
    // Further reduce multiplier for better performance
    const multiplier = Math.min(Math.ceil((viewportHeight * 8) / contentHeight) + 1, 6);
    
    const fragment = document.createDocumentFragment();
    const templateElements = new Map();
    
    // Create and cache template elements
    this.originalContent.forEach(el => {
      const clone = el.cloneNode(true);
      templateElements.set(el, clone);
    });
    
    for (let i = 0; i < multiplier; i++) {
      this.originalContent.forEach(el => {
        const clone = templateElements.get(el).cloneNode(true);
        fragment.appendChild(clone);
      });
    }
    
    this.$content.innerHTML = '';
    this.$content.appendChild(fragment);
    
    this.height = contentHeight;
    this.scroll.current = contentHeight * 2;
    this.scroll.target = contentHeight * 2;
    
    // Use Promise to handle text splitting asynchronously
    Promise.resolve().then(() => {
      const textElements = this.$content.querySelectorAll('p, span, h2, h3, h4, h5, li');
      const elementsToSplit = Array.from(textElements).filter(el => !el.hasAttribute('data-splitting'));
      
      if (elementsToSplit.length > 0) {
        Splitting({ target: elementsToSplit, by: 'lines' });
      }

      const words = this.$content.querySelectorAll('.splitting .word');
      this.lines = Array.from(words).map(line => ({
        el: line,
        top: line.offsetTop,
        transform: null,
        rect: line.getBoundingClientRect()
      }));
    });
  }
  /**
   * Ensure content is wrapped in a container
   */
  ensureContentWrapper() {
    if (!this.state.isProjects && !this.$content.classList.contains('column-content')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'column-content';
      
      while (this.$el.firstChild) {
        wrapper.appendChild(this.$el.firstChild);
      }
      
      this.$el.appendChild(wrapper);
      this.$content = wrapper;
    }
  }
  
  /**
   * Start animation loop
   */
  startAnimation() {
    this.stopAnimation(); // Ensure previous animation is stopped
    this.refs.rafId = requestAnimationFrame(this.boundMethods.render);
  }
  
  /**
   * Stop current animation
   */
  stopAnimation() {
    if (this.refs.rafId) {
      cancelAnimationFrame(this.refs.rafId);
      this.refs.rafId = null;
    }
  }
  
  /**
   * Render method for smooth scrolling
   */
  render() {
    if (this.state.destroyed || !this.state.isDesktop) {
      this.stopAnimation();
      return;
    }
    
    const delta = this.scroll.target - this.scroll.current;
    const smoothDelta = delta * this.scroll.lerp;
    
    // Limit scroll speed
    const clampedDelta = Math.min(Math.abs(smoothDelta), this.scroll.maxSpeed) * Math.sign(smoothDelta);
    
    // Only update velocity if there's significant movement
    if (Math.abs(delta) > 0.1) {
      this.scroll.velocity = Math.min(Math.abs(clampedDelta), 1);
      this.scroll.current += clampedDelta * (1 + this.scroll.velocity * 0.2);
      
      this.direction = delta > 0 ? 'down' : 'up';
      this.isScrolling = true;
      
      if (!this.isUpdating) {
        this.isUpdating = true;
        requestAnimationFrame(() => {
          this.updateElements(this.scroll.current);
          this.isUpdating = false;
        });
      }
    } else {
      // Gradually slow down when near target
      this.isScrolling = false;
      this.scroll.velocity = 0;
      
      if (this.scrollState) {
        this.scrollState.velocity = 0;
      }
      
      if (this.lines && !this.isResetting) {
        this.isResetting = true;
        requestAnimationFrame(() => {
          const transform = 'transform 0.3s ease-out';
          this.lines.forEach(line => {
            line.el.style.transition = transform;
            line.el.style.transform = 'translate3d(0, 0, 0)';
            line.transform = null;
          });
          this.isResetting = false;
        });
      }
    }
    
    // Handle infinite scroll boundaries with smoother transition
    const contentHeight = this.refs.contentHeight;
    if (this.scroll.current >= contentHeight * 2) {
      this.scroll.current -= contentHeight;
      this.scroll.target -= contentHeight;
      this.scroll.velocity *= 0.5; // Reduce velocity when wrapping
    } else if (this.scroll.current <= 0) {
      this.scroll.current += contentHeight;
      this.scroll.target += contentHeight;
      this.scroll.velocity *= 0.5; // Reduce velocity when wrapping
    }
    
    const newTransform = `translate3d(0, ${-this.scroll.current}px, 0)`;
    if (this.lastTransform !== newTransform) {
      this.$content.style.transform = newTransform;
      this.lastTransform = newTransform;
    }
    
    this.refs.rafId = requestAnimationFrame(this.boundMethods.render);
  }
  
  /**
   * Update velocity based on scroll state
   */
  updateVelocity() {
    // Gradually adjust velocity
    this.velocityConfig.current = this.state.isScrolling
      ? Math.min(
          this.velocityConfig.current + this.velocityConfig.increment, 
          this.velocityConfig.maxVelocity
        )
      : Math.max(
          this.velocityConfig.current - this.velocityConfig.increment, 
          0
        );
  }
  
  /**
   * Handle wheel event
   * @param {WheelEvent} e - Wheel event
   */
  wheel(e) {
    if (this.state.modalOpen) return;
    
    e.preventDefault();
    const delta = e.wheelDeltaY || -1 * e.deltaY;
    
    this.state.isScrolling = true;
    this.state.autoScroll = false;
    this.isScrolling = true;
    
    const direction = this.reverse ? 1 : -1;
    // Increase scroll multiplier and add speed limit
    const scrollMultiplier = 0.8;
    const maxScroll = 90;
    const scrollAmount = Math.min(Math.abs(delta), maxScroll) * Math.sign(delta) * direction * scrollMultiplier;
    
    gsap.to(this.scroll, {
      target: this.scroll.target + scrollAmount,
      duration: 0.25,
      ease: "power1.out",
      overwrite: true,
      onUpdate: () => {
        if (this.scrollState) {
          this.scrollState.target = this.scroll.target;
          const velocity = Math.min((this.scroll.target - this.scroll.current) * 0.1, 1);
          this.scrollState.velocity = velocity;
        }
      }
    });
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = setTimeout(() => {
      this.state.isScrolling = false;
      this.isScrolling = false;
      if (!this.state.isPaused) {
        this.state.autoScroll = true;
      }
      if (this.scrollState) {
        this.scrollState.velocity = 0;
      }
    }, 150);
  }
  
  /**
   * Easing function for smooth scrolling
   * @param {number} x - Input value between 0 and 1
   * @returns {number} Eased value
   */
  easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
  }
  
  /**
   * Handle touch start event
   * @param {TouchEvent} e - Touch start event
   */
  handleTouchStart(e) {
    this.touch.start = e.touches[0].clientY;
    this.state.isPaused = true;
    this.state.autoScroll = false;
  }
  
  /**
   * Handle touch move event
   * @param {TouchEvent} e - Touch move event
   */
  handleTouchMove(e) {
    const current = e.touches[0].clientY;
    const delta = this.touch.start - current;
    
    // Adjust scroll target based on reverse property
    const direction = this.reverse ? -1 : 1;
    this.scroll.target += delta * direction;
    this.touch.start = current;
    
    this.state.isScrolling = true;
  }
  
  /**
   * Handle touch end event
   */
  handleTouchEnd() {
    this.state.isScrolling = false;
    this.state.isPaused = false;
    this.state.autoScroll = true;
  }
  
  /**
   * Handle mouse enter
   */
  handleMouseEnter() {
    this.state.isPaused = true;
    this.state.autoScroll = false;
    this.velocityConfig.current = 0;
  }
  
  /**
   * Handle mouse leave
   */
  handleMouseLeave() {
    this.state.isPaused = false;
    if (!this.state.recentlyScrolled) {
      this.state.autoScroll = true;
    }
    this.velocityConfig.current = 0;
  }
  
  /**
   * Handle resize event
   */
  handleResize() {
    const wasDesktop = this.state.isDesktop;
    this.state.isDesktop = window.innerWidth > 768;
    
    if (wasDesktop !== this.state.isDesktop) {
        if (this.state.isDesktop) {
            // Switching to desktop mode
            this.$content.removeAttribute('aria-hidden');
            this.$content.removeAttribute('tabindex');
            this.state.destroyed = false;
            this.state.autoScroll = false;
            this.$content.style.transform = '';
            this.prepareContent();
            this.resize();
            this.startAnimation();
        } else {
            // Switching to mobile mode
            this.$content.setAttribute('aria-hidden', 'true');
            this.$content.setAttribute('tabindex', '-1');
            this.state.destroyed = true;
            this.state.autoScroll = false;
            this.stopAnimation();
            this.$content.innerHTML = '';
            if (this.originalContent) {
                this.originalContent.forEach(el => {
                    this.$content.appendChild(el.cloneNode(true));
                });
            }
            this.$content.style.transform = 'none';
            this.scroll.current = 0;
            this.scroll.target = 0;
        }
    }
  }
  
  /**
   * Resize and update dimensions
   */
  resize() {
    this.refs.windowHeight = window.innerHeight;
    this.refs.contentHeight = this.$content.scrollHeight / 3;
  }
  
  /**
   * Reset styles to default
   */
  resetStyles() {
    this.$content.style.transform = 'none';
    // Add accessibility attributes when resetting to mobile
    if (!this.state.isDesktop) {
        this.$content.setAttribute('aria-hidden', 'true');
        this.$content.setAttribute('tabindex', '-1');
    }
  }
  
  /**
   * Destroy the column scroll instance
   */
  destroy() {
    // Mark as destroyed to prevent further updates
    this.state.destroyed = true;
    
    // Remove all event listeners
    window.removeEventListener('resize', this.boundMethods.handleResize);
    window.removeEventListener('wheel', this.boundMethods.wheel, { passive: false });
    
    this.$el.removeEventListener('mouseenter', this.boundMethods.handleMouseEnter);
    this.$el.removeEventListener('mouseleave', this.boundMethods.handleMouseLeave);
    this.$el.removeEventListener('touchstart', this.boundMethods.handleTouchStart);
    this.$el.removeEventListener('touchmove', this.boundMethods.handleTouchMove);
    this.$el.removeEventListener('touchend', this.boundMethods.handleTouchEnd);
    
    // Clear timeouts and stop animation
    clearTimeout(this.refs.scrollTimeout);
    this.stopAnimation();
    
    // Reset styles
    this.resetStyles();
  }
  
  /**
   * Debounce utility method
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  updateElements(scroll) {
    if (!this.lines || !this.isScrolling) return;
    
    const isReverse = this.reverse;
    const viewportHeight = window.innerHeight;
    const baseAmplitude = 20;
    const velocityMultiplier = 9;
    const amplitude = baseAmplitude + velocityMultiplier * Math.min(this.scroll.velocity, 1.0);
    const y = isReverse ? scroll : -scroll;
    
    const len = this.lines.length;
    for (let i = 0; i < len; i++) {
      const line = this.lines[i];
      const posY = line.top + y;
      
      if (posY < -150 || posY > viewportHeight + 150) {
        if (line.transform !== null) {
          line.el.style.transform = 'translate3d(0, 0, 0)';
          line.transform = null;
        }
        continue;
      }
      
      const progress = Math.min(Math.max(0, posY / viewportHeight), 1);
      const x = isReverse ? 
        Math.cos(progress * Math.PI) * amplitude :
        Math.sin(progress * Math.PI) * amplitude;
      
      const newTransform = `translate3d(${x}px, 0, 0)`;
      if (line.transform !== newTransform) {
        line.el.style.transform = newTransform;
        line.transform = newTransform;
      }
    }
  }
  
  update() {
    // ... existing code ...
    
    // Update shared scroll state with more pronounced velocity
    if (this.scrollState) {
      this.scrollState.current = this.current;
      this.scrollState.target = this.target;
      this.scrollState.velocity = (this.current - this.prev) * 2.5;
    }
    
    this.prev = this.current;
  }
}