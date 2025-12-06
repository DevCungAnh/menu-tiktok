/**
 * MENU SCRIPT - Star Particle System & Effects
 * =============================================
 * 
 * Các phần chính:
 * 1. Star Particle System (canvas) - Vẽ sao lấp lánh
 * 2. Parallax Effect - Di chuyển theo chuột
 * 3. Effects Toggle - Bật/tắt hiệu ứng
 * 
 * Để tùy chỉnh:
 * - STAR_COUNT: Số lượng sao
 * - STAR_COLORS: Màu sắc sao
 * - BIG_STAR_RATIO: Tỷ lệ sao lớn
 */

(function() {
    'use strict';

    // ===== Configuration =====
    const CONFIG = {
        STAR_COUNT: 120,
        BIG_STAR_RATIO: 0.08,
        STAR_COLORS: ['#ffffff', '#ff6b9d', '#00f5ff', '#c471ed'],
        PARALLAX_FACTOR: 0.02,
        TWINKLE_SPEED: 0.02
    };

    // ===== State =====
    let canvas, ctx;
    let stars = [];
    let mouseX = 0, mouseY = 0;
    let animationId = null;
    let effectsEnabled = true;
    let prefersReducedMotion = false;

    // ===== Star Class =====
    class Star {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.baseX = this.x;
            this.baseY = this.y;
            
            // Determine if big star
            this.isBig = Math.random() < CONFIG.BIG_STAR_RATIO;
            this.size = this.isBig ? Math.random() * 3 + 2 : Math.random() * 1.5 + 0.5;
            
            // Color
            this.color = CONFIG.STAR_COLORS[Math.floor(Math.random() * CONFIG.STAR_COLORS.length)];
            
            // Twinkle properties
            this.opacity = Math.random();
            this.twinkleSpeed = (Math.random() * 0.02 + 0.005) * (this.isBig ? 1.5 : 1);
            this.twinkleDirection = Math.random() > 0.5 ? 1 : -1;
        }

        update(mouseOffsetX, mouseOffsetY) {
            // Parallax movement
            if (effectsEnabled && !prefersReducedMotion) {
                this.x = this.baseX + mouseOffsetX * (this.isBig ? 1.5 : 1);
                this.y = this.baseY + mouseOffsetY * (this.isBig ? 1.5 : 1);
            }

            // Twinkle effect
            if (effectsEnabled && !prefersReducedMotion) {
                this.opacity += this.twinkleSpeed * this.twinkleDirection;
                
                if (this.opacity >= 1) {
                    this.opacity = 1;
                    this.twinkleDirection = -1;
                } else if (this.opacity <= 0.2) {
                    this.opacity = 0.2;
                    this.twinkleDirection = 1;
                }
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            
            // Glow effect for big stars
            if (this.isBig && effectsEnabled) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.size * 2
                );
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.globalAlpha = this.opacity * 0.5;
                ctx.fill();
            }
            
            ctx.globalAlpha = 1;
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
        
        // Recreate stars on resize
        createStars();
    }

    // ===== Create Stars =====
    function createStars() {
        stars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            stars.push(new Star());
        }
    }

    // ===== Animation Loop =====
    function animate() {
        if (!effectsEnabled && prefersReducedMotion) {
            // Draw static stars when effects disabled
            drawStaticStars();
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate mouse offset for parallax
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const offsetX = (mouseX - centerX) * CONFIG.PARALLAX_FACTOR;
        const offsetY = (mouseY - centerY) * CONFIG.PARALLAX_FACTOR;

        // Update and draw stars
        stars.forEach(star => {
            star.update(offsetX, offsetY);
            star.draw();
        });

        animationId = requestAnimationFrame(animate);
    }

    // ===== Draw Static Stars =====
    function drawStaticStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.baseX, star.baseY, star.size, 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = 0.6;
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
        }, 16); // ~60fps
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
                drawStaticStars();
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
                drawStaticStars();
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

        // Create stars
        createStars();

        // Start animation
        if (!prefersReducedMotion) {
            animate();
        } else {
            drawStaticStars();
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
