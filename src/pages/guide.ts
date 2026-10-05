import { icons } from '../scripts/icons';
import { appStore, AppSection } from '../scripts/store';
import { modalManager } from '../components/modal';
import { t, getLanguage } from '../scripts/i18n';
import { Project } from '../scripts/types';

interface GuideStep {
  id: string;
  number: string;
  tag: string;
  title: string;
  tagline: string;
  accent: string;
  bgLight: string;
  icon: (size?: number) => string;
  deliverables: { icon: (size?: number) => string; label: string }[];
  primaryAction: {
    label: string;
    section: AppSection;
  };
  secondaryAction?: {
    label: string;
    section: AppSection;
  };
}

export class GuidePage {
  public static render(container: HTMLElement): void {
    const project = appStore.getState().currentProject;

    if (!project) {
      container.innerHTML = `
        <div class="empty-state">
          ${icons.compass(36)}
          <h3>${t('overview.noProjectSelected')}</h3>
          <p>${t('overview.selectProjectPrompt')}</p>
          <button class="btn btn-primary" id="btn-guide-empty-create">${t('overview.createProject')}</button>
        </div>
      `;
      container.querySelector('#btn-guide-empty-create')?.addEventListener('click', () => {
        modalManager.openNewProjectModal();
      });
      return;
    }

    const isEs = getLanguage() === 'es';
    const steps = this.getSteps(isEs);

    container.innerHTML = `
      <div class="guide-container">
        <!-- Minimal Hero Header -->
        <div class="app-page-hero">
          <div class="page-hero-left">
            <div class="page-title-row">
              <h2>${isEs ? 'Guía del Proyecto' : 'Project Guide'}</h2>
              <span class="page-stats-badge">
                ${icons.compass(13)}
                <span>${isEs ? 'Hoja de Ruta Visual' : 'Visual Roadmap'}</span>
              </span>
            </div>
            <p class="page-subtitle">
              ${isEs ? 'El camino recomendado en 4 etapas: desde el prototipo funcional hasta el lanzamiento.' : 'The recommended 4-step path: from functional prototype to public launch.'}
            </p>
          </div>
        </div>

        <!-- 1. Visual Flow Banner (Pipeline Horizontal) -->
        <div class="guide-flow-banner">
          ${steps.map((s, idx) => `
            <button class="guide-flow-node" data-target="guide-card-${s.id}">
              <div class="guide-flow-badge" style="background: ${s.bgLight}; color: ${s.accent};">
                ${s.icon(18)}
              </div>
              <div class="guide-flow-info">
                <span class="guide-flow-step">${s.tag}</span>
                <span class="guide-flow-name">${s.title}</span>
              </div>
            </button>
            ${idx < steps.length - 1 ? `
              <div class="guide-flow-arrow">
                ${icons.arrowRight(16)}
              </div>
            ` : ''}
          `).join('')}
        </div>

        <!-- 2. Visual 4-Step Cards Grid -->
        <div class="guide-grid">
          ${steps.map((s) => `
            <div class="guide-card" id="guide-card-${s.id}" style="--card-accent: ${s.accent};">
              <div>
                <div class="guide-card-header">
                  <div class="guide-card-icon-box" style="background: ${s.bgLight}; color: ${s.accent};">
                    ${s.icon(26)}
                  </div>
                  <span class="guide-card-num" style="color: ${s.accent}; border-color: ${s.accent}40;">
                    ${s.tag}
                  </span>
                </div>

                <h3 class="guide-card-title">${s.title}</h3>
                <p class="guide-card-tagline">${s.tagline}</p>

                <!-- Visual Deliverables (Clean Pills) -->
                <div class="guide-chips-list">
                  ${s.deliverables.map((d) => `
                    <div class="guide-chip">
                      <span class="guide-chip-dot" style="background: ${s.accent};"></span>
                      <span>${d.label}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Action Buttons -->
              <div style="display: flex; gap: 8px;">
                ${s.secondaryAction ? `
                  <button class="btn btn-secondary btn-sm btn-guide-jump" data-target-section="${s.secondaryAction.section}">
                    <span>${s.secondaryAction.label}</span>
                  </button>
                ` : ''}
                <button class="btn btn-primary guide-action-btn btn-guide-jump" data-target-section="${s.primaryAction.section}">
                  <span>${s.primaryAction.label}</span>
                  ${icons.arrowRight(14)}
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- 3. Bottom Summary Flow / Golden Rule -->
        <div class="guide-rule-bar">
          <div class="guide-rule-left">
            <div class="guide-rule-icon">
              ${icons.bulb(18)}
            </div>
            <div class="guide-rule-text">
              <strong>${isEs ? 'Recomendación de Nubo:' : 'Nubo Best Practice:'}</strong> 
              ${isEs ? 'Valida primero la funcionalidad, dale identidad con tu marca, arma tu escaparate web y finalmente ejecuta el marketing.' : 'First validate the functionality, give it brand identity, build your website storefront, and finally execute marketing.'}
            </div>
          </div>
          <div class="guide-rule-flow">
            <span class="guide-rule-flow-step">${isEs ? '1. Prototipo' : '1. Prototype'}</span>
            <span>→</span>
            <span class="guide-rule-flow-step">${isEs ? '2. Marca' : '2. Brand'}</span>
            <span>→</span>
            <span class="guide-rule-flow-step">${isEs ? '3. Web' : '3. Website'}</span>
            <span>→</span>
            <span class="guide-rule-flow-step">${isEs ? '4. Marketing' : '4. Marketing'}</span>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  private static bindEvents(container: HTMLElement): void {
    // Smooth scroll to card when clicking nodes in the top banner
    container.querySelectorAll('.guide-flow-node[data-target]').forEach((node) => {
      node.addEventListener('click', () => {
        const targetId = node.getAttribute('data-target');
        if (targetId) {
          const card = container.querySelector('#' + targetId);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlight-glow');
            setTimeout(() => card.classList.remove('highlight-glow'), 1200);
          }
        }
      });
    });

    // Jump buttons to navigate directly to app sections
    container.querySelectorAll('.btn-guide-jump[data-target-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = btn.getAttribute('data-target-section') as AppSection;
        if (sec) {
          appStore.setActiveSection(sec);
        }
      });
    });
  }

  private static getSteps(isEs: boolean): GuideStep[] {
    return [
      {
        id: 'prototype',
        number: '01',
        tag: isEs ? 'PASO 01 · TÉCNICA' : 'STEP 01 · TECH',
        title: isEs ? 'Archivos y Prototipo' : 'Files & Prototype',
        tagline: isEs 
          ? 'Especificaciones del producto, estructura de carpetas y prototipo funcional probado.'
          : 'Product specifications, project folder structure, and tested functional MVP.',
        accent: '#3B82F6',
        bgLight: 'rgba(59, 130, 246, 0.12)',
        icon: (s = 24) => icons.code(s),
        deliverables: [
          { icon: icons.check, label: isEs ? 'Prototipo funcional mínimo (MVP)' : 'Functional minimum viable product' },
          { icon: icons.folder, label: isEs ? 'Estructura de archivos y repo Git' : 'Folder structure and Git repository' },
          { icon: icons.fileText, label: isEs ? 'Especificaciones y backlog de tareas' : 'Specifications and task backlog' }
        ],
        primaryAction: {
          label: isEs ? 'Ir a Desarrollo' : 'Go to Development',
          section: 'development'
        },
        secondaryAction: {
          label: isEs ? 'Archivos' : 'Files',
          section: 'files'
        }
      },
      {
        id: 'brand',
        number: '02',
        tag: isEs ? 'PASO 02 · IDENTIDAD' : 'STEP 02 · IDENTITY',
        title: isEs ? 'Marca e Identidad' : 'Brand & Assets',
        tagline: isEs
          ? 'Personalidad visual: archivo maestro de Illustrator (.ai), logotipos y paleta de colores.'
          : 'Visual personality: Illustrator master file (.ai), official logos, and color palette.',
        accent: '#EC4899',
        bgLight: 'rgba(236, 72, 153, 0.12)',
        icon: (s = 24) => icons.palette(s),
        deliverables: [
          { icon: icons.file, label: isEs ? 'Archivo maestro Illustrator (.ai)' : 'Master Illustrator file (.ai)' },
          { icon: icons.image, label: isEs ? 'Logotipos oficiales (SVG / PNG)' : 'Official logos (SVG / PNG)' },
          { icon: icons.sparkles, label: isEs ? 'Paleta de colores HEX y tipografías' : 'HEX color palette and typography' }
        ],
        primaryAction: {
          label: isEs ? 'Ir a Marca & Assets' : 'Go to Brand & Assets',
          section: 'brand'
        }
      },
      {
        id: 'website',
        number: '03',
        tag: isEs ? 'PASO 03 · ESCAPARATE' : 'STEP 03 · SHOWCASE',
        title: isEs ? 'Sitio Web y Presencia' : 'Website & Presence',
        tagline: isEs
          ? 'Landing page oficial, moodboard de referencias de diseño y optimización SEO.'
          : 'Official landing page, design inspiration moodboard, and SEO metadata.',
        accent: '#06B6D4',
        bgLight: 'rgba(6, 182, 212, 0.12)',
        icon: (s = 24) => icons.globe(s),
        deliverables: [
          { icon: icons.image, label: isEs ? 'Moodboard visual de inspiración' : 'Visual inspiration moodboard' },
          { icon: icons.globe, label: isEs ? 'Estructura de páginas y navegación' : 'Page architecture and navigation' },
          { icon: icons.search, label: isEs ? 'Títulos, descripción y SEO' : 'Titles, description, and SEO setup' }
        ],
        primaryAction: {
          label: isEs ? 'Ir a Sitio Web' : 'Go to Website',
          section: 'website'
        }
      },
      {
        id: 'marketing',
        number: '04',
        tag: isEs ? 'PASO 04 · LANZAMIENTO' : 'STEP 04 · TRACTION',
        title: isEs ? 'Marketing y Tracción' : 'Marketing & Launch',
        tagline: isEs
          ? 'Canales de adquisición prioritarios, campañas en Kanban y planificación de contenidos.'
          : 'High-leverage acquisition channels, Kanban campaigns, and content scheduling.',
        accent: '#10B981',
        bgLight: 'rgba(16, 185, 129, 0.12)',
        icon: (s = 24) => icons.target(s),
        deliverables: [
          { icon: icons.target, label: isEs ? 'Canales prioritarios de adquisición' : 'High-priority acquisition channels' },
          { icon: icons.columns, label: isEs ? 'Tablero de campañas de lanzamiento' : 'Launch campaigns Kanban board' },
          { icon: icons.video, label: isEs ? 'Planificador de contenidos para redes' : 'Social media content planner' }
        ],
        primaryAction: {
          label: isEs ? 'Ir a Marketing' : 'Go to Marketing',
          section: 'marketing'
        },
        secondaryAction: {
          label: isEs ? 'Contenido' : 'Content',
          section: 'content'
        }
      }
    ];
  }
}
