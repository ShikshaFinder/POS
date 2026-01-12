/**
 * PWA Install Handler
 * Provides native-like install experience for the web application.
 * Captures install prompt, handles UI feedback, and manages device-specific flows.
 */

(function () {
    // Configuration
    const INSTALL_BTN_ID = 'pwa-install-btn';

    // State
    let deferredPrompt = null;
    let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // 1. Initialize & Event Listeners
    function init() {
        // Capture the install prompt
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Handle successful installation
        window.addEventListener('appinstalled', handleAppInstalled);

        // Inject Styles for Modals
        injectStyles();

        // Debug check for insecure context
        if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
            console.warn('[PWA] API requires HTTPS or localhost. Install prompt may not fire.');
        }
    }

    // 2. Handle beforeinstallprompt
    function handleBeforeInstallPrompt(e) {
        // Prevent default browser banner
        e.preventDefault();
        // Stash the event
        deferredPrompt = e;
        console.log('[PWA] Install prompt captured and deferred');
    }

    // 3. Handle appinstalled Event
    function handleAppInstalled(e) {
        console.log('[PWA] Application successfully installed');
        deferredPrompt = null;
        hideInstallButton();
    }

    // 4. Button Logic (Event Delegation)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest(`#${INSTALL_BTN_ID}`);
        if (!btn) return;

        // Prevent React handler and default logic
        e.stopImmediatePropagation();
        e.preventDefault();

        await triggerInstallFlow(btn);
    }, true); // Use capture phase

    // 5. Install Flow
    async function triggerInstallFlow(btn) {
        const originalContent = btn.innerHTML;

        // Loading State
        setLoadingState(btn, true);

        // Artificial delay for UX
        await new Promise(resolve => setTimeout(resolve, 600));

        try {
            if (deferredPrompt) {
                // Desktop / Android Flow (Native)
                await deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`[PWA] Install prompt outcome: ${outcome}`);

                if (outcome === 'accepted') {
                    deferredPrompt = null;
                }
            } else {
                // Fallback: iOS or Browser Menu Instructions
                showInstallInstructions(isIOS ? 'ios' : 'android');
            }
        } catch (error) {
            console.error('[PWA] Install error:', error);
            showInstallInstructions('generic');
        } finally {
            // Restore Button State
            setLoadingState(btn, false, originalContent);
        }
    }

    // 6. UI Helpers & Components
    function setLoadingState(btn, isLoading, originalContent) {
        if (isLoading) {
            if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="pwa-spinner">⟳</span> Installing...`;
            btn.style.opacity = '0.8';
            btn.style.cursor = 'wait';
        } else {
            btn.disabled = false;
            btn.innerHTML = originalContent || btn.dataset.original;
            btn.style.opacity = '';
            btn.style.cursor = '';
        }
    }

    function hideInstallButton() {
        const btn = document.getElementById(INSTALL_BTN_ID);
        if (btn) btn.style.display = 'none';
    }

    // --- Beautiful Modal System ---
    function showInstallInstructions(type) {
        // Icons
        const shareIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>`;
        const menuIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`;
        const plusIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;

        let title = "Install App";
        let steps = "";

        if (type === 'ios') {
            title = "Install on iOS";
            steps = `
        <li class="pwa-step">
            <span class="pwa-step-icon">${shareIcon}</span>
            <span>Tap the <b>Share</b> button in your browser bar.</span>
        </li>
        <li class="pwa-step">
            <span class="pwa-step-icon">${plusIcon}</span>
            <span>Scroll down and select <b>Add to Home Screen</b>.</span>
        </li>
      `;
        } else {
            // Android / Generic
            title = "Install App";
            steps = `
        <li class="pwa-step">
            <span class="pwa-step-icon">${menuIcon}</span>
            <span>Tap the browser menu (three dots) button.</span>
        </li>
        <li class="pwa-step">
            <span class="pwa-step-icon">${plusIcon}</span>
            <span>Select <b>Install App</b> or <b>Add to Home Screen</b>.</span>
        </li>
      `;
        }

        const modalHtml = `
      <div id="pwa-modal-overlay" class="pwa-overlay">
        <div class="pwa-modal animate-slide-up">
            <div class="pwa-modal-header">
                <img src="/flavi-logo.png" alt="Logo" class="pwa-modal-logo" onerror="this.style.display='none'"/>
                <h3>${title}</h3>
                <button id="pwa-close-btn" class="pwa-close-icon">&times;</button>
            </div>
            <ul class="pwa-steps">
                ${steps}
            </ul>
            <button id="pwa-action-btn" class="pwa-primary-btn">Got it</button>
        </div>
      </div>
    `;

        // Remove existing if any
        const existing = document.getElementById('pwa-modal-overlay');
        if (existing) existing.remove();

        // Inject
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Event Listeners
        document.getElementById('pwa-close-btn').onclick = closePwaModal;
        document.getElementById('pwa-action-btn').onclick = closePwaModal;
        document.getElementById('pwa-modal-overlay').onclick = (e) => {
            if (e.target.id === 'pwa-modal-overlay') closePwaModal();
        };
    }

    function closePwaModal() {
        const overlay = document.getElementById('pwa-modal-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .pwa-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 10000;
        display: flex; align-items: flex-end; justify-content: center;
        backdrop-filter: blur(4px);
      }
      .pwa-modal {
        background: white; width: 100%; max-width: 440px;
        border-radius: 20px 20px 0 0;
        padding: 24px; box-shadow: 0 -4px 24px rgba(0,0,0,0.2);
        animation: pwaSlideUp 0.3s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      @media(min-width: 600px) {
        .pwa-overlay { align-items: center; }
        .pwa-modal { border-radius: 16px; }
      }
      .pwa-modal-header {
        display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
      }
      .pwa-modal-logo { width: 48px; height: 48px; border-radius: 10px; object-fit: contain; background: #f3f4f6; padding: 4px; }
      .pwa-modal-header h3 { margin: 0; flex: 1; font-size: 1.25rem; font-weight: 700; color: #111827; }
      .pwa-close-icon {
        background: none; border: none; font-size: 28px; line-height: 1; color: #9ca3af; cursor: pointer; padding: 0;
      }
      .pwa-steps {
        list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 16px;
      }
      .pwa-step { display: flex; align-items: center; gap: 16px; color: #374151; font-size: 0.95rem; line-height: 1.4; }
      .pwa-step-icon {
        flex-shrink: 0; width: 36px; height: 36px; background: #eff6ff;
        color: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      }
      .pwa-primary-btn {
        width: 100%; background: #2563eb; color: white; border: none;
        padding: 14px; border-radius: 12px; font-weight: 600; font-size: 1rem;
        cursor: pointer; transition: background 0.2s;
      }
      .pwa-primary-btn:active { background: #1d4ed8; }
      .pwa-spinner { animation: pwaSpin 1s linear infinite; display: inline-block; margin-right: 8px; }
      
      @keyframes pwaSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @keyframes pwaSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .fade-out { opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    `;
        document.head.appendChild(style);
    }

    // Start
    if (typeof window !== 'undefined') init();

})();
