import { icons } from '../scripts/icons';
import { appStore } from '../scripts/store';

export interface TourStep {
  title: string;
  description: string;
  icon: string;
  targetSelector?: string;
}

export class OnboardingTour {
  private static instance: OnboardingTour;
  private overlayEl: HTMLElement | null = null;
  private cardEl: HTMLElement | null = null;
  private currentStepIndex = 0;

  private steps: TourStep[] = [
    {
      title: 'Bienvenido a Nubo',
      description: 'El hogar de todo tu proyecto digital. Diseñado especialmente para creadores, programadores y makers que necesitan tener su código, marca, tareas, web, marketing y archivos centralizados en un entorno limpio y personal.',
      icon: icons.cloud(32)
    },
    {
      title: 'Barra Lateral & Múltiples Proyectos',
      description: 'Crea y alterna rápidamente entre todos tus proyectos independientes. Puedes pulsar "+ New project" para iniciar uno nuevo o colapsar la barra lateral para trabajar con máxima concentración.',
      icon: icons.sidebar(32),
      targetSelector: '#sidebar'
    },
    {
      title: 'Tu Escritorio Digital Completo',
      description: 'Cada proyecto organiza automáticamente: Tareas de desarrollo ligeras (sin la pesadez de Jira), Identidad de marca (logos y muestras de color), Presencia web & SEO, Campañas de marketing y Editor de notas con auto-guardado.',
      icon: icons.overview(32),
      targetSelector: '#view-container'
    },
    {
      title: 'Archivos Físicos y Drag & Drop',
      description: 'Nubo crea carpetas reales en tu ordenador (Brand, Website, Marketing, etc.). Puedes arrastrar y soltar archivos directamente desde el Explorador de Windows hacia Nubo, ver miniaturas y abrirlos con tu aplicación predeterminada.',
      icon: icons.folder(32),
      targetSelector: '#btn-open-proj-folder'
    },
    {
      title: 'Paleta de Comandos Global (Ctrl + K)',
      description: 'Pulsa Ctrl + K en cualquier momento para desplegar la búsqueda universal. Encuentra cualquier archivo, tarea de desarrollo, nota o proyecto al instante mediante escritura predictiva.',
      icon: icons.search(32),
      targetSelector: '#btn-sidebar-search'
    },
    {
      title: '¡Todo listo para empezar!',
      description: 'Ya tienes todo lo necesario para construir tu próximo producto digital. Puedes cambiar la carpeta de proyectos o volver a iniciar este tutorial guiado cuando quieras desde la sección de Settings.',
      icon: icons.check(32)
    }
  ];

  private constructor() {
    this.createDom();
  }

  public static getInstance(): OnboardingTour {
    if (!OnboardingTour.instance) {
      OnboardingTour.instance = new OnboardingTour();
    }
    return OnboardingTour.instance;
  }

  private createDom() {
    let overlay = document.getElementById('onboarding-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'onboarding-overlay';
      overlay.className = 'onboarding-overlay';
      overlay.innerHTML = `
        <div class="onboarding-spotlight" id="onboarding-spotlight"></div>
        <div class="onboarding-card" id="onboarding-card"></div>
      `;
      document.body.appendChild(overlay);
    }

    this.overlayEl = overlay;
    this.cardEl = overlay.querySelector('#onboarding-card');
  }

  public start(force = false) {
    const settings = appStore.getState().settings;
    if (!force && settings?.onboardingCompleted) {
      return; // Already completed
    }

    this.currentStepIndex = 0;
    this.overlayEl?.classList.add('active');
    this.renderStep();
  }

  public end() {
    this.overlayEl?.classList.remove('active');
    const spotlight = document.getElementById('onboarding-spotlight');
    if (spotlight) spotlight.style.display = 'none';

    // Persist completion in settings
    if (window.nubo?.settings) {
      window.nubo.settings.update({ onboardingCompleted: true });
    }
  }

  private renderStep() {
    if (!this.cardEl) return;
    const step = this.steps[this.currentStepIndex];
    const isFirst = this.currentStepIndex === 0;
    const isLast = this.currentStepIndex === this.steps.length - 1;

    this.cardEl.innerHTML = `
      <div class="onboarding-hero-banner">
        <div class="onboarding-icon-ring">
          ${step.icon}
        </div>
      </div>
      <div class="onboarding-body">
        <div class="onboarding-step-counter">PASO ${this.currentStepIndex + 1} DE ${this.steps.length}</div>
        <div class="onboarding-title">${step.title}</div>
        <div class="onboarding-description">${step.description}</div>
        <div class="onboarding-dots">
          ${this.steps.map((_, i) => `
            <div class="onboarding-dot ${i === this.currentStepIndex ? 'active' : ''}"></div>
          `).join('')}
        </div>
      </div>
      <div class="onboarding-footer">
        <button class="btn btn-ghost btn-sm" id="btn-tour-skip">Saltar tutorial</button>
        <div class="onboarding-footer-actions">
          ${!isFirst ? `
            <button class="btn btn-secondary btn-sm" id="btn-tour-prev">Anterior</button>
          ` : ''}
          <button class="btn btn-primary btn-sm" id="btn-tour-next">
            ${isLast ? '¡Empezar a usar Nubo!' : 'Siguiente'}
          </button>
        </div>
      </div>
    `;

    this.highlightTarget(step.targetSelector);
    this.bindEvents();
  }

  private highlightTarget(selector?: string) {
    const spotlight = document.getElementById('onboarding-spotlight');
    if (!spotlight) return;

    if (!selector) {
      spotlight.style.display = 'none';
      return;
    }

    const target = document.querySelector(selector);
    if (!target) {
      spotlight.style.display = 'none';
      return;
    }

    const rect = target.getBoundingClientRect();
    spotlight.style.display = 'block';
    spotlight.style.top = `${rect.top - 6}px`;
    spotlight.style.left = `${rect.left - 6}px`;
    spotlight.style.width = `${rect.width + 12}px`;
    spotlight.style.height = `${rect.height + 12}px`;
  }

  private bindEvents() {
    this.cardEl?.querySelector('#btn-tour-skip')?.addEventListener('click', () => {
      this.end();
    });

    this.cardEl?.querySelector('#btn-tour-prev')?.addEventListener('click', () => {
      if (this.currentStepIndex > 0) {
        this.currentStepIndex--;
        this.renderStep();
      }
    });

    this.cardEl?.querySelector('#btn-tour-next')?.addEventListener('click', () => {
      if (this.currentStepIndex < this.steps.length - 1) {
        this.currentStepIndex++;
        this.renderStep();
      } else {
        this.end();
      }
    });
  }
}

export const onboardingTour = OnboardingTour.getInstance();
