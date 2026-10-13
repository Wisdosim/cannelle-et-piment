/**
 * CANNELLE ET PIMENT — AUTO-PLAY SIMULATION ENGINE
 * Simulation cinématographique haute fidélité dans le DOM
 * Zéro vidéo, zéro iframe, zéro MP4 : animation scriptée en pur code JavaScript
 */

(function () {
  'use strict';

  let isRunning = false;
  let activeTimeouts = [];
  let cursorEl = null;
  let bannerEl = null;

  // Utilitaires de temporisation sécurisée
  function wait(ms) {
    return new Promise(resolve => {
      const id = setTimeout(resolve, ms);
      activeTimeouts.push(id);
    });
  }

  function clearAllTimers() {
    activeTimeouts.forEach(id => clearTimeout(id));
    activeTimeouts = [];
  }

  // Création du curseur de souris virtuel (SVG élégant noir & blanc haut de gamme)
  function createVirtualCursor() {
    let existing = document.getElementById('auto-demo-cursor');
    if (existing) existing.remove();

    const cursor = document.createElement('div');
    cursor.id = 'auto-demo-cursor';
    cursor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 24px;
      height: 24px;
      z-index: 100000;
      pointer-events: none;
      transform: translate3d(-50px, -50px, 0);
      transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
      opacity: 0;
    `;

    cursor.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.25));">
        <path d="M4 3L11.5 21L14.5 13.5L22 10.5L4 3Z" fill="#000000" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>
      <div id="auto-cursor-ripple" style="
        position: absolute;
        top: 2px;
        left: 2px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid #000000;
        transform: scale(0);
        opacity: 0;
        pointer-events: none;
      "></div>
    `;

    document.body.appendChild(cursor);
    cursorEl = cursor;
    return cursor;
  }

  // Animation de clic (effet ripple fluide)
  function triggerClickRipple() {
    const ripple = document.getElementById('auto-cursor-ripple');
    if (!ripple) return;
    ripple.style.transition = 'none';
    ripple.style.transform = 'scale(0.3)';
    ripple.style.opacity = '0.9';

    requestAnimationFrame(() => {
      ripple.style.transition = 'transform 0.35s ease-out, opacity 0.35s ease-out';
      ripple.style.transform = 'scale(1.9)';
      ripple.style.opacity = '0';
    });
  }

  // Déplacement fluide du curseur avec gestion du défilement sans à-coups
  async function moveCursorTo(target, offsetX = 10, offsetY = 10) {
    if (!cursorEl || !isRunning) return;
    let x = 0, y = 0;
    let el = null;

    if (typeof target === 'string') {
      el = document.querySelector(target);
    } else if (target && target.getBoundingClientRect) {
      el = target;
    }

    if (el) {
      const initRect = el.getBoundingClientRect();
      const needsScroll = initRect.top < 80 || initRect.bottom > (window.innerHeight - 80);
      if (needsScroll) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        await wait(280);
      }

      const rect = el.getBoundingClientRect();
      x = rect.left + (offsetX !== undefined ? offsetX : rect.width / 2);
      y = rect.top + (offsetY !== undefined ? offsetY : rect.height / 2);
    } else if (target && typeof target.x === 'number') {
      x = target.x;
      y = target.y;
    }

    cursorEl.style.opacity = '1';
    cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    return wait(640);
  }

  // Frappe réaliste caractère par caractère dans un champ input
  async function typeIntoInput(selector, text, clearFirst = true) {
    if (!isRunning) return;
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;

    el.focus();
    if (clearFirst) {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    for (let i = 0; i < text.length; i++) {
      if (!isRunning) return;
      el.value += text[i];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(30 + Math.random() * 20);
    }
  }

  // Animation de glissement du slider
  async function animateSlider(selector, targetVal) {
    if (!isRunning) return;
    const slider = document.querySelector(selector);
    if (!slider) return;

    const startVal = parseInt(slider.value) || 65;
    const diff = targetVal - startVal;
    const steps = Math.abs(diff);
    const stepDirection = diff > 0 ? 1 : -1;

    for (let i = 0; i < steps; i++) {
      if (!isRunning) return;
      slider.value = parseInt(slider.value) + stepDirection;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
      await wait(40);
    }
  }

  // Création du bandeau supérieur stylisé ("Démonstration automatique en cours...")
  function showSimulationBanner() {
    let existing = document.getElementById('auto-demo-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'auto-demo-banner';
    banner.style.cssText = `
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translate3d(-50%, -50px, 0);
      background: #000000;
      color: #ffffff;
      padding: 8px 18px 8px 22px;
      border-radius: 40px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.26);
      border: 1px solid rgba(255, 255, 255, 0.18);
      font-size: 12.5px;
      font-family: var(--font, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif);
      z-index: 100001;
      opacity: 0;
      transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease;
      letter-spacing: -0.01em;
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="
          display:inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
          animation: autoDemoPulse 1.4s infinite ease-in-out;
        "></span>
        <span id="auto-demo-status-text" style="font-weight: 500;">Démonstration automatique en cours...</span>
      </div>
      <button id="auto-demo-btn-skip" type="button" style="
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 20px;
        padding: 4px 14px;
        font-size: 11.5px;
        font-weight: 500;
        cursor: pointer;
        font-family: inherit;
        transition: background 150ms ease, transform 120ms ease;
      ">Passer / Reprendre le contrôle</button>
    `;

    // Style de pulsation
    if (!document.getElementById('auto-demo-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'auto-demo-styles';
      styleTag.textContent = `
        @keyframes autoDemoPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.35); }
        }
        #auto-demo-btn-skip:hover {
          background: rgba(255, 255, 255, 0.28) !important;
        }
      `;
      document.head.appendChild(styleTag);
    }

    document.body.appendChild(banner);
    bannerEl = banner;

    const skipBtn = banner.querySelector('#auto-demo-btn-skip');
    skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopAutoDemo(true);
    });

    requestAnimationFrame(() => {
      banner.style.opacity = '1';
      banner.style.transform = 'translate3d(-50%, 0, 0)';
    });
  }

  // Arrêt propre de la simulation et restitution du contrôle total à l'utilisateur
  function stopAutoDemo(userInitiated = false) {
    if (!isRunning) return;
    isRunning = false;
    clearAllTimers();

    if (cursorEl) {
      cursorEl.style.transition = 'opacity 0.25s ease';
      cursorEl.style.opacity = '0';
      setTimeout(() => { if (cursorEl) cursorEl.remove(); cursorEl = null; }, 260);
    }

    if (bannerEl) {
      bannerEl.style.opacity = '0';
      bannerEl.style.transform = 'translate3d(-50%, -50px, 0)';
      setTimeout(() => { if (bannerEl) bannerEl.remove(); bannerEl = null; }, 400);
    }

    // Fermeture des modales éventuellement ouvertes
    const pickerModal = document.getElementById('modal-dish-picker');
    if (pickerModal && pickerModal.classList.contains('open')) {
      pickerModal.classList.remove('open');
    }

    if (userInitiated && typeof window.toast === 'function') {
      window.toast("Vous avez repris le contrôle de l'application.", "success");
    }
  }

  // SCÉNARIO COMPLET DE SIMULATION DANS LE DOM (~30 SECONDES)
  async function runSimulationScenario() {
    isRunning = true;
    createVirtualCursor();
    showSimulationBanner();

    // Positionnement initial du curseur au centre de l'écran
    cursorEl.style.transform = `translate3d(${window.innerWidth * 0.45}px, ${window.innerHeight * 0.42}px, 0)`;
    cursorEl.style.opacity = '1';

    await wait(700);
    if (!isRunning) return;

    // 1. Déplacement vers l'onglet Devis & Clic
    const tabDevis = document.getElementById('tab-devis');
    if (tabDevis) {
      await moveCursorTo(tabDevis, 25, 14);
      triggerClickRipple();
      if (typeof window.switchView === 'function') window.switchView('devis');
      await wait(600);
    }
    if (!isRunning) return;

    // 2. Déplacement vers le champ Nom Client & Saisie fluide
    const clientInput = document.getElementById('dv-client');
    if (clientInput) {
      await moveCursorTo(clientInput, 40, 18);
      triggerClickRipple();
      await wait(200);
      await typeIntoInput(clientInput, 'Cabinet Lemercier & Associés — Séminaire Annuel');
      await wait(450);
    }
    if (!isRunning) return;

    // 3. Déplacement vers le volume Convives & Saisie 140
    const couvertsInput = document.getElementById('dv-couverts');
    if (couvertsInput) {
      await moveCursorTo(couvertsInput, 32, 18);
      triggerClickRipple();
      await wait(200);
      await typeIntoInput(couvertsInput, '140');
      await wait(500);
    }
    if (!isRunning) return;

    // 4. Glissement du slider de marge cible vers 74%
    const margeSlider = document.getElementById('dv-marge');
    if (margeSlider) {
      await moveCursorTo(margeSlider, 55, 10);
      triggerClickRipple();
      await animateSlider('#dv-marge', 74);
      await wait(600);
    }
    if (!isRunning) return;

    // 5. Clic sur "+ Ajouter une Recette"
    const addDishBtn = document.querySelector('#tour-card-dishes button');
    if (addDishBtn) {
      await moveCursorTo(addDishBtn, 35, 15);
      triggerClickRipple();
      if (typeof window.openDishPicker === 'function') window.openDishPicker();
      await wait(750);
      if (!isRunning) return;

      // Dans la modale : sélection d'une fiche technique
      const pickerSelect = document.getElementById('picker-recette');
      if (pickerSelect) {
        // S'assurer que le select a des options
        if (pickerSelect.options.length <= 1 && typeof window.refreshPickerDropdown === 'function') {
          window.refreshPickerDropdown();
        }
        await moveCursorTo(pickerSelect, 50, 16);
        triggerClickRipple();

        if (pickerSelect.options.length > 1) {
          pickerSelect.selectedIndex = 1;
          pickerSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        await wait(600);
        if (!isRunning) return;

        // Saisie du nombre de portions dans la modale
        const pickerQty = document.getElementById('picker-qty');
        if (pickerQty) {
          await moveCursorTo(pickerQty, 28, 16);
          triggerClickRipple();
          await typeIntoInput(pickerQty, '140');
          await wait(450);
        }
        if (!isRunning) return;

        // Validation de l'ajout
        const confirmBtn = document.querySelector('#modal-dish-picker .btn-primary');
        if (confirmBtn) {
          await moveCursorTo(confirmBtn, 45, 16);
          triggerClickRipple();
          if (typeof window.addDish === 'function') window.addDish();
        }
        await wait(750);
      }
    }
    if (!isRunning) return;

    // 6. Saisie de frais directs additionnels
    const fraisLabelInput = document.getElementById('dv-frais-label');
    if (fraisLabelInput) {
      await moveCursorTo(fraisLabelInput, 40, 18);
      triggerClickRipple();
      await typeIntoInput(fraisLabelInput, 'Arts de la table & Nappage Prestige');
      await wait(350);
    }
    if (!isRunning) return;

    const fraisMontantInput = document.getElementById('dv-frais-montant');
    if (fraisMontantInput) {
      await moveCursorTo(fraisMontantInput, 35, 18);
      triggerClickRipple();
      await typeIntoInput(fraisMontantInput, '650');
      await wait(600);
    }
    if (!isRunning) return;

    // 7. Clic explicite sur "Calculer la rentabilité"
    const calcBtn = document.getElementById('btn-calc-rentabilite') || document.querySelector('#view-devis button.btn-secondary');
    if (calcBtn) {
      await moveCursorTo(calcBtn, 45, 16);
      triggerClickRipple();
      if (typeof window.calcDevis === 'function') window.calcDevis();
      if (typeof window.highlightKpis === 'function') window.highlightKpis();
      await wait(900);
    }
    if (!isRunning) return;

    // 8. Démonstration des KPIs financiers calculés en temps réel
    const kpiPrix = document.getElementById('res-prix-couvert');
    if (kpiPrix) {
      await moveCursorTo(kpiPrix, 30, 12);
      await wait(1100);
    }
    if (!isRunning) return;

    const kpiMarge = document.getElementById('res-marge-eur');
    if (kpiMarge) {
      await moveCursorTo(kpiMarge, 25, 10);
      await wait(1000);
    }
    if (!isRunning) return;

    // 9. Démonstration du score de conformité RSE / EGAlim
    const rseDonut = document.getElementById('rse-donut');
    if (rseDonut) {
      await moveCursorTo(rseDonut, 36, 36);
      await wait(1300);
    }
    if (!isRunning) return;

    // 10. Conclusion de la démonstration et transmission du contrôle à l'utilisateur
    const statusText = document.getElementById('auto-demo-status-text');
    if (statusText) {
      statusText.textContent = "Démonstration terminée. Vous avez le contrôle total.";
    }
    await wait(2000);

    stopAutoDemo(false);
  }

  // Fonction globale pour démarrer la simulation
  window.startAutoDemo = function () {
    stopAutoDemo(false);
    // Dismiss l'overlay hero si présent
    const heroOverlay = document.getElementById('landing-hero-overlay');
    if (heroOverlay) {
      heroOverlay.classList.add('dismissed');
    }
    runSimulationScenario();
  };

  window.stopAutoDemo = stopAutoDemo;

  // Interruption via la touche Échap
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isRunning) {
      stopAutoDemo(true);
    }
  });

  // Détection du paramètre ?autodemo=1 au chargement
  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autodemo') === '1' || params.get('autodemo') === 'true') {
      setTimeout(() => {
        window.startAutoDemo();
      }, 500);
    }
  });
})();
