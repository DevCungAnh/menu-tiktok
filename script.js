/**
 * MENU SCRIPT - Floating Bubbles & Effects
 * =========================================
 * 
 * Các phần chính:
 * 1. Floating Bubbles (canvas) - Bong bóng bay lên
 * 2. Parallax Effect - Di chuyển theo chuột
 * 3. Effects Toggle - Bật/tắt hiệu ứng
 */

(function() {
    'use strict';

    // ===== Configuration =====
    const CONFIG = {
        BUBBLE_COUNT: 35,
        BUBBLE_COLORS: [
            'rgba(255, 107, 157, 0.4)',
            'rgba(196, 113, 237, 0.4)',
            'rgba(0, 245, 255, 0.3)',
            'rgba(255, 255, 255, 0.3)',
            'rgba(255, 182, 193, 0.4)'
        ],
        MIN_SIZE: 8,
        MAX_SIZE: 40,
        MIN_SPEED: 0.3,
        MAX_SPEED: 1.2
    };

    // ===== State =====
    let canvas, ctx;
    let bubbles = [];
    let mouseX = 0, mouseY = 0;
    let animationId = null;
    let effectsEnabled = true;
    let prefersReducedMotion = false;

    // ===== Bubble Class =====
    class Bubble {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.size = Math.random() * (CONFIG.MAX_SIZE - CONFIG.MIN_SIZE) + CONFIG.MIN_SIZE;
            this.x = Math.random() * canvas.width;
            this.y = initial ? Math.random() * canvas.height : canvas.height + this.size;
            this.speed = Math.random() * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED) + CONFIG.MIN_SPEED;
            this.color = CONFIG.BUBBLE_COLORS[Math.floor(Math.random() * CONFIG.BUBBLE_COLORS.length)];
            
            // Horizontal drift
            this.drift = (Math.random() - 0.5) * 0.5;
            this.driftAngle = Math.random() * Math.PI * 2;
            this.driftSpeed = Math.random() * 0.02 + 0.01;
            
            // Opacity animation
            this.opacity = Math.random() * 0.5 + 0.3;
            this.opacityDirection = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            // Rise up
            this.y -= this.speed;
            
            // Horizontal drift (sine wave)
            this.driftAngle += this.driftSpeed;
            this.x += Math.sin(this.driftAngle) * this.drift;
            
            // Opacity pulse
            this.opacity += 0.005 * this.opacityDirection;
            if (this.opacity >= 0.8) this.opacityDirection = -1;
            if (this.opacity <= 0.2) this.opacityDirection = 1;
            
            // Reset when off screen
            if (this.y < -this.size * 2) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            
            // Gradient fill for 3D effect
            const gradient = ctx.createRadialGradient(
                this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
                this.x, this.y, this.size
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, ' + (this.opacity * 0.8) + ')');
            gradient.addColorStop(0.4, this.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Highlight
            ctx.beginPath();
            ctx.arc(this.x - this.size * 0.25, this.y - this.size * 0.25, this.size * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + (this.opacity * 0.6) + ')';
            ctx.fill();
        }
    }

    // ===== Initialize Canvas =====
    function initCanvas() {
        canvas = document.getElementById('starfield');
        if (!canvas) return false;
        
        ctx = canvas.getContext('2d');
        resizeCanvas();
        return true;
    }

    // ===== Resize Canvas =====
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Recreate bubbles on resize
        createBubbles();
    }

    // ===== Create Bubbles =====
    function createBubbles() {
        bubbles = [];
        for (let i = 0; i < CONFIG.BUBBLE_COUNT; i++) {
            bubbles.push(new Bubble());
        }
    }

    // ===== Animation Loop =====
    function animate() {
        if (!effectsEnabled && prefersReducedMotion) {
            drawStaticBubbles();
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update and draw bubbles
        bubbles.forEach(bubble => {
            bubble.update();
            bubble.draw();
        });

        animationId = requestAnimationFrame(animate);
    }

    // ===== Draw Static Bubbles =====
    function drawStaticBubbles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bubbles.forEach(bubble => {
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            ctx.fillStyle = bubble.color;
            ctx.globalAlpha = 0.3;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // ===== Mouse Move Handler (with debounce) =====
    let mouseMoveTimeout;
    function handleMouseMove(e) {
        if (mouseMoveTimeout) return;
        
        mouseMoveTimeout = setTimeout(() => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            mouseMoveTimeout = null;
        }, 16);
    }

    // ===== Effects Toggle =====
    function initEffectsToggle() {
        const toggleBtn = document.getElementById('effectsToggle');
        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', () => {
            effectsEnabled = !effectsEnabled;
            toggleBtn.setAttribute('aria-pressed', effectsEnabled);
            document.body.classList.toggle('effects-off', !effectsEnabled);

            if (effectsEnabled && !prefersReducedMotion) {
                animate();
            } else {
                cancelAnimationFrame(animationId);
                drawStaticBubbles();
            }
        });
    }

    // ===== Check Reduced Motion Preference =====
    function checkReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotion = mediaQuery.matches;

        mediaQuery.addEventListener('change', (e) => {
            prefersReducedMotion = e.matches;
            if (prefersReducedMotion) {
                cancelAnimationFrame(animationId);
                drawStaticBubbles();
            } else if (effectsEnabled) {
                animate();
            }
        });
    }

    // ===== Menu Item Interactions =====
    function initMenuItems() {
        const menuItems = document.querySelectorAll('.menu-item');
        
        // Staggered entrance animation
        menuItems.forEach((item, idx) => {
            setTimeout(() => item.classList.add('show'), idx * 80);
        });
        
        menuItems.forEach(item => { 
            // Click ripple effect
            item.addEventListener('click', function(e) {
                if (!effectsEnabled) return;
                
                const ripple = document.createElement('span');
                ripple.style.cssText = `
                    position: absolute;
                    background: rgba(255, 107, 157, 0.3);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s ease-out forwards;
                    pointer-events: none;
                `;
                
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
                ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
                
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });

            // Keyboard support
            item.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
    }

    // ===== Zalo Button Ripple =====
    function initZaloButton() {
        const zaloBtn = document.querySelector('.zalo-contact');
        if (!zaloBtn) return;

        zaloBtn.addEventListener('click', function(e) {
            // Add ripple effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }

    // ===== Add Dynamic Styles =====
    function addDynamicStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== Initialize Everything =====
    function init() {
        // Check reduced motion first
        checkReducedMotion();

        // Initialize canvas
        if (!initCanvas()) {
            console.warn('Canvas not found');
            return;
        }

        // Add styles
        addDynamicStyles();

        // Create bubbles
        createBubbles();

        // Start animation
        if (!prefersReducedMotion) {
            animate();
        } else {
            drawStaticBubbles();
        }

        // Event listeners
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        // Initialize UI
        initEffectsToggle();
        initMenuItems();
        initZaloButton();

        console.log('✨ Menu initialized!');
    }

    // ===== DOM Ready =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
