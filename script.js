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
        const popupOverlay = document.getElementById('popupOverlay');
        const popupClose = document.getElementById('popupClose');
        const popupTitle = document.getElementById('popupTitle');
        const popupInfo = document.getElementById('popupInfo');
        
        // Staggered entrance animation
        menuItems.forEach((item, idx) => {
            setTimeout(() => item.classList.add('show'), idx * 80);
        });
        
        // Open popup on click
        menuItems.forEach((item, idx) => { 
            item.addEventListener('click', function(e) {
                // Ripple effect
                if (effectsEnabled) {
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
                }
                
                // Open popup if item has data-info
                const info = this.dataset.info;
                if (popupOverlay && info) {
                    const itemText = this.querySelector('.item-text')?.textContent || 'Chi tiết';
                    popupTitle.textContent = itemText;
                    popupInfo.textContent = info;
                    popupOverlay.classList.add('active');
                }
            });

            // Keyboard support
            item.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
        
        // Close popup
        function closePopup() {
            if (popupOverlay) {
                popupOverlay.classList.remove('active');
            }
        }
        
        if (popupClose) {
            popupClose.addEventListener('click', closePopup);
        }
        
        if (popupOverlay) {
            popupOverlay.addEventListener('click', function(e) {
                if (e.target === this) closePopup();
            });
        }
        
        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && popupOverlay?.classList.contains('active')) {
                closePopup();
            }
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

    // ===== QR Lightbox =====
    function initQRLightbox() {
        const qrImage = document.getElementById('qrImage');
        const qrLightbox = document.getElementById('qrLightbox');
        
        if (!qrImage || !qrLightbox) return;
        
        // Click to open
        qrImage.addEventListener('click', function() {
            qrLightbox.classList.add('active');
        });
        
        // Click to close
        qrLightbox.addEventListener('click', function() {
            qrLightbox.classList.remove('active');
        });
        
        // Escape to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && qrLightbox.classList.contains('active')) {
                qrLightbox.classList.remove('active');
            }
        });
    }

    // ===== Copy STK =====
    function initCopySTK() {
        const copyBtn = document.getElementById('copyStk');
        const bankNumber = document.getElementById('bankNumber');
        const copyToast = document.getElementById('copyToast');
        
        if (!copyBtn || !bankNumber) return;
        
        copyBtn.addEventListener('click', function() {
            const stk = bankNumber.dataset.stk;
            
            // Copy to clipboard
            navigator.clipboard.writeText(stk).then(() => {
                // Show toast
                if (copyToast) {
                    copyToast.classList.add('show');
                    setTimeout(() => {
                        copyToast.classList.remove('show');
                    }, 2000);
                }
                
                // Change button text temporarily
                this.textContent = '✅';
                setTimeout(() => {
                    this.textContent = '📋';
                }, 2000);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = stk;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (copyToast) {
                    copyToast.classList.add('show');
                    setTimeout(() => {
                        copyToast.classList.remove('show');
                    }, 2000);
                }
            });
        });
    }

    // ===== Confetti for VIP Combo =====
    function initConfetti() {
        const vipCombo = document.querySelector('.combo-item.vip');
        if (!vipCombo) return;
        
        vipCombo.addEventListener('click', function() {
            createConfetti();
        });
    }

    function createConfetti() {
        const colors = ['#ff6b9d', '#c471ed', '#00f5ff', '#ffd700', '#ff4757', '#00e676'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            
            document.body.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => confetti.remove(), 4000);
        }
    }

    // ===== Background Music =====
    function initMusic() {
        const bgMusic = document.getElementById('bgMusic');
        const musicToggle = document.getElementById('musicToggle');
        
        if (!bgMusic || !musicToggle) return;
        
        // Set volume
        bgMusic.volume = 0.3;
        
        // Check if user explicitly disabled music (default is ON)
        const musicDisabled = localStorage.getItem('musicEnabled') === 'false';
        
        // Update button state
        function updateButton(playing) {
            musicToggle.textContent = playing ? '🔊' : '🔇';
            musicToggle.classList.toggle('playing', playing);
        }
        
        // Auto-play on first user interaction (unless user disabled it)
        if (!musicDisabled) {
            const playOnInteraction = () => {
                bgMusic.play().then(() => {
                    updateButton(true);
                }).catch(() => {});
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('touchstart', playOnInteraction);
        }
        
        // Toggle music on button click
        musicToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (bgMusic.paused) {
                bgMusic.play().then(() => {
                    updateButton(true);
                    localStorage.setItem('musicEnabled', 'true');
                }).catch(err => {
                    console.log('Could not play music:', err);
                });
            } else {
                bgMusic.pause();
                updateButton(false);
                localStorage.setItem('musicEnabled', 'false');
            }
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
        initQRLightbox();
        initCopySTK();
        initConfetti();
        initMusic();

        console.log('✨ Menu initialized!');
    }

    // ===== DOM Ready =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
