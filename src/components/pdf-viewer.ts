import * as pdfjsLib from 'pdfjs-dist';
import { icons } from '../scripts/icons';
import { t } from '../scripts/i18n';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
} catch (e) {
  console.warn('PDF.js worker initialization notice:', e);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const pure = base64.includes(',') ? base64.split(',')[1] : base64;
  const clean = pure.replace(/\s/g, '');
  const binaryString = window.atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function base64ToPdfBlobUrl(base64: string): string {
  try {
    const bytes = base64ToUint8Array(base64);
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Error creating blob url:', e);
    return base64;
  }
}

export class PdfViewerComponent {
  private container: HTMLElement;
  private pdfDoc: any = null;
  private currentPage = 1;
  private totalPages = 1;
  private currentScale = 1.0;
  private currentRotation = 0;
  private isRendering = false;
  private renderPending = false;
  private isAutoFit = true;
  private filePath?: string;
  private blobUrl?: string;
  private title: string;
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement, title: string = 'Documento PDF', filePath?: string) {
    this.container = container;
    this.title = title;
    this.filePath = filePath;
  }

  public async load(dataOrBase64: string | Uint8Array, initialPage = 1): Promise<void> {
    try {
      this.container.innerHTML = `
        <div class="pdf-loading-state">
          <div class="spinner" style="width: 24px; height: 24px; border: 2px solid var(--border-subtle); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <span>Cargando documento PDF...</span>
        </div>
      `;

      let dataBytes: Uint8Array;
      if (typeof dataOrBase64 === 'string') {
        dataBytes = base64ToUint8Array(dataOrBase64);
        this.blobUrl = base64ToPdfBlobUrl(dataOrBase64);
      } else {
        dataBytes = dataOrBase64;
        const blob = new Blob([dataBytes as any], { type: 'application/pdf' });
        this.blobUrl = URL.createObjectURL(blob);
      }

      const loadingTask = pdfjsLib.getDocument({
        data: dataBytes,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = Math.min(Math.max(1, initialPage), this.totalPages);

      this.buildViewerDom();
      await this.fitInitialView();
      this.setupResizeObserver();
    } catch (err: any) {
      console.error('[PdfViewerComponent] Error loading PDF:', err);
      this.renderFallbackView();
    }
  }

  private buildViewerDom(): void {
    const filename = this.filePath ? this.filePath.split(/[/\\]/).pop() : (this.title.endsWith('.pdf') ? this.title : `${this.title}.pdf`);

    this.container.innerHTML = `
      <div class="nubo-pdf-viewer">
        <div class="nubo-pdf-toolbar">
          <div class="nubo-pdf-meta">
            <div class="pdf-icon-badge">${icons.filePdf(18)}</div>
            <div>
              <div class="pdf-filename">${filename}</div>
              <div class="pdf-filesize">${this.totalPages} ${this.totalPages === 1 ? 'página' : 'páginas'}</div>
            </div>
          </div>

          <div class="nubo-pdf-nav">
            <button class="btn btn-ghost btn-xs btn-icon btn-pdf-prev" title="Página anterior" ${this.currentPage <= 1 ? 'disabled' : ''}>
              ${icons.chevronLeft(14)}
            </button>
            <span class="nubo-pdf-page-indicator">
              <span class="pdf-cur-page">${this.currentPage}</span> / <span>${this.totalPages}</span>
            </span>
            <button class="btn btn-ghost btn-xs btn-icon btn-pdf-next" title="Página siguiente" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
              ${icons.chevronRight(14)}
            </button>
          </div>

          <div class="nubo-pdf-zoom-group">
            <button class="btn btn-ghost btn-xs btn-icon btn-pdf-zoom-out" title="Reducir zoom">
              ${icons.minus(13)}
            </button>
            <span class="nubo-pdf-zoom-level">${Math.round(this.currentScale * 100)}%</span>
            <button class="btn btn-ghost btn-xs btn-icon btn-pdf-zoom-in" title="Aumentar zoom">
              ${icons.plus(13)}
            </button>
            <button class="btn btn-ghost btn-xs btn-pdf-fit-page" title="Ajustar a la página">
              <span>Ajustar</span>
            </button>
            <button class="btn btn-ghost btn-xs btn-pdf-fit-width" title="Ajustar al ancho">
              <span>Ancho</span>
            </button>
          </div>

          <div class="nubo-pdf-actions">
            ${this.filePath ? `
              <button class="btn btn-secondary btn-xs btn-pdf-external" title="Abrir con lector predeterminado de Windows (Adobe, Edge...)">
                ${icons.external(12)}
                <span>Abrir en PC</span>
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-xs btn-pdf-download" title="Descargar archivo">
              ${icons.download(12)}
              <span>Descargar</span>
            </button>
            <button class="btn btn-secondary btn-xs btn-pdf-fullscreen" title="Ver en pantalla completa">
              ${icons.maximize(12)}
              <span>Pantalla completa</span>
            </button>
          </div>
        </div>

        <div class="nubo-pdf-stage">
          <div class="nubo-pdf-canvas-wrapper">
            <canvas class="nubo-pdf-canvas"></canvas>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const prevBtn = this.container.querySelector('.btn-pdf-prev') as HTMLButtonElement;
    const nextBtn = this.container.querySelector('.btn-pdf-next') as HTMLButtonElement;
    const zoomInBtn = this.container.querySelector('.btn-pdf-zoom-in') as HTMLButtonElement;
    const zoomOutBtn = this.container.querySelector('.btn-pdf-zoom-out') as HTMLButtonElement;
    const fitPageBtn = this.container.querySelector('.btn-pdf-fit-page') as HTMLButtonElement;
    const fitWidthBtn = this.container.querySelector('.btn-pdf-fit-width') as HTMLButtonElement;
    const externalBtn = this.container.querySelector('.btn-pdf-external') as HTMLButtonElement;
    const downloadBtn = this.container.querySelector('.btn-pdf-download') as HTMLButtonElement;
    const fullscreenBtn = this.container.querySelector('.btn-pdf-fullscreen') as HTMLButtonElement;

    prevBtn?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderPage(this.currentPage);
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.renderPage(this.currentPage);
      }
    });

    zoomInBtn?.addEventListener('click', () => {
      this.isAutoFit = false;
      this.currentScale = Math.min(3.0, parseFloat((this.currentScale + 0.15).toFixed(2)));
      this.updateZoomDisplay();
      this.renderPage(this.currentPage);
    });

    zoomOutBtn?.addEventListener('click', () => {
      this.isAutoFit = false;
      this.currentScale = Math.max(0.3, parseFloat((this.currentScale - 0.15).toFixed(2)));
      this.updateZoomDisplay();
      this.renderPage(this.currentPage);
    });

    fitPageBtn?.addEventListener('click', async () => {
      this.isAutoFit = true;
      await this.fitToPage();
    });

    fitWidthBtn?.addEventListener('click', async () => {
      this.isAutoFit = false;
      await this.fitToWidth();
    });

    externalBtn?.addEventListener('click', () => {
      if (this.filePath && window.nubo?.files?.openFile) {
        window.nubo.files.openFile(this.filePath);
      }
    });

    downloadBtn?.addEventListener('click', () => {
      const filename = this.filePath ? this.filePath.split(/[/\\]/).pop() : (this.title.endsWith('.pdf') ? this.title : `${this.title}.pdf`);
      if (this.blobUrl) {
        const a = document.createElement('a');
        a.href = this.blobUrl;
        a.download = filename || 'document.pdf';
        a.click();
      }
    });

    fullscreenBtn?.addEventListener('click', () => {
      if (this.pdfDoc) {
        PdfViewerComponent.openFullscreenModal(this.title, this.pdfDoc, this.currentPage, this.filePath, this.blobUrl);
      }
    });
  }

  private updateZoomDisplay(): void {
    const zoomEl = this.container.querySelector('.nubo-pdf-zoom-level');
    if (zoomEl) zoomEl.textContent = `${Math.round(this.currentScale * 100)}%`;
  }

  private setupResizeObserver(): void {
    const stage = this.container.querySelector('.nubo-pdf-stage') as HTMLElement;
    if (!stage || typeof ResizeObserver === 'undefined') return;

    let resizeTimer: any = null;
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.isAutoFit || !this.pdfDoc) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (stage.clientWidth > 100) {
          this.fitInitialView();
        }
      }, 150);
    });
    this.resizeObserver.observe(stage);
  }

  private async fitInitialView(): Promise<void> {
    if (!this.pdfDoc) return;
    try {
      const page = await this.pdfDoc.getPage(this.currentPage);
      const stage = this.container.querySelector('.nubo-pdf-stage') as HTMLElement;

      let stageWidth = stage?.clientWidth || 0;
      let stageHeight = stage?.clientHeight || 0;

      if (stageWidth < 100) {
        stageWidth = Math.max(380, Math.min(1000, window.innerWidth - 380));
        stageHeight = 560;
      } else {
        stageWidth = Math.max(300, stageWidth - 48);
        stageHeight = stageHeight > 200 ? stageHeight - 56 : 560;
      }

      const defaultViewport = page.getViewport({ scale: 1.0, rotation: this.currentRotation });
      const isLandscape = defaultViewport.width >= defaultViewport.height;

      let targetScale: number;
      if (isLandscape) {
        // Landscape (presentation/slide manual): fit both width & height so entire slide is visible without vertical clipping
        const scaleW = stageWidth / defaultViewport.width;
        const scaleH = stageHeight / defaultViewport.height;
        targetScale = Math.min(scaleW, scaleH);
      } else {
        // Portrait (A4 / document manual): fit width so text is comfortably readable
        targetScale = stageWidth / defaultViewport.width;
      }

      this.currentScale = parseFloat(Math.max(0.35, Math.min(2.0, targetScale)).toFixed(2));
      this.updateZoomDisplay();
      await this.renderPage(this.currentPage);
    } catch (e) {
      console.warn('Error fitting initial view:', e);
      await this.renderPage(this.currentPage);
    }
  }

  public async fitToPage(): Promise<void> {
    if (!this.pdfDoc) return;
    try {
      const page = await this.pdfDoc.getPage(this.currentPage);
      const stage = this.container.querySelector('.nubo-pdf-stage') as HTMLElement;
      if (!stage) return;
      const stageWidth = Math.max(300, stage.clientWidth - 48);
      const stageHeight = Math.max(300, stage.clientHeight - 56);
      const defaultViewport = page.getViewport({ scale: 1.0, rotation: this.currentRotation });
      const scaleW = stageWidth / defaultViewport.width;
      const scaleH = stageHeight / defaultViewport.height;
      const targetScale = Math.min(scaleW, scaleH);
      this.currentScale = parseFloat(Math.max(0.3, Math.min(2.5, targetScale)).toFixed(2));
      this.updateZoomDisplay();
      await this.renderPage(this.currentPage);
    } catch (e) {
      console.warn('Error fitting page:', e);
    }
  }

  public async fitToWidth(): Promise<void> {
    if (!this.pdfDoc) return;
    try {
      const page = await this.pdfDoc.getPage(this.currentPage);
      const stage = this.container.querySelector('.nubo-pdf-stage') as HTMLElement;
      if (!stage) return;
      const stageWidth = Math.max(300, stage.clientWidth - 48);
      const defaultViewport = page.getViewport({ scale: 1.0, rotation: this.currentRotation });
      const targetScale = stageWidth / defaultViewport.width;
      this.currentScale = parseFloat(Math.max(0.3, Math.min(3.0, targetScale)).toFixed(2));
      this.updateZoomDisplay();
      await this.renderPage(this.currentPage);
    } catch (e) {
      console.warn('Error fitting width:', e);
    }
  }

  public async renderPage(num: number): Promise<void> {
    if (!this.pdfDoc) return;
    if (this.isRendering) {
      this.renderPending = true;
      return;
    }
    this.isRendering = true;

    try {
      const page = await this.pdfDoc.getPage(num);
      const canvas = this.container.querySelector('.nubo-pdf-canvas') as HTMLCanvasElement;
      if (!canvas) {
        this.isRendering = false;
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.isRendering = false;
        return;
      }

      // Crisp rendering on high-DPI screens
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: this.currentScale, rotation: this.currentRotation });

      const cssWidth = Math.floor(viewport.width);
      const cssHeight = Math.floor(viewport.height);

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.style.aspectRatio = `${cssWidth} / ${cssHeight}`;

      ctx.save();
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      ctx.restore();

      // Update controls
      const curPageEl = this.container.querySelector('.pdf-cur-page');
      if (curPageEl) curPageEl.textContent = String(this.currentPage);

      const prevBtn = this.container.querySelector('.btn-pdf-prev') as HTMLButtonElement;
      const nextBtn = this.container.querySelector('.btn-pdf-next') as HTMLButtonElement;
      if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
      if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    } catch (err) {
      console.error('[PdfViewerComponent] Render page error:', err);
    } finally {
      this.isRendering = false;
      if (this.renderPending) {
        this.renderPending = false;
        await this.renderPage(this.currentPage);
      }
    }
  }

  private renderFallbackView(): void {
    const filename = this.filePath ? this.filePath.split(/[/\\]/).pop() : `${this.title}.pdf`;
    this.container.innerHTML = `
      <div class="pdf-fallback-view" style="padding: 24px; text-align: center; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
        <div style="margin-bottom: 12px; color: var(--color-primary);">${icons.filePdf(36)}</div>
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${filename}</div>
        <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 16px;">
          Documento PDF disponible para visualizar o descargar.
        </p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
          ${this.filePath ? `
            <button class="btn btn-primary btn-sm btn-fallback-external">
              ${icons.external(13)}
              <span>Abrir con lector del sistema</span>
            </button>
            <button class="btn btn-secondary btn-sm btn-fallback-folder">
              ${icons.folder(13)}
              <span>Abrir carpeta</span>
            </button>
          ` : ''}
          ${this.blobUrl ? `
            <a href="${this.blobUrl}" download="${filename}" class="btn btn-secondary btn-sm">
              ${icons.download(13)}
              <span>Descargar PDF</span>
            </a>
          ` : ''}
        </div>
      </div>
    `;

    this.container.querySelector('.btn-fallback-external')?.addEventListener('click', () => {
      if (this.filePath && window.nubo?.files?.openFile) {
        window.nubo.files.openFile(this.filePath);
      }
    });

    this.container.querySelector('.btn-fallback-folder')?.addEventListener('click', () => {
      if (this.filePath && window.nubo?.files?.openContainingFolder) {
        window.nubo.files.openContainingFolder(this.filePath);
      }
    });
  }

  // Generate a crisp thumbnail of Page 1 for cards and lists (preserves aspect ratio)
  public static async generateThumbnail(dataOrBase64: string | Uint8Array, maxWidth = 120): Promise<string | null> {
    try {
      const dataBytes = typeof dataOrBase64 === 'string' ? base64ToUint8Array(dataOrBase64) : dataOrBase64;
      const loadingTask = pdfjsLib.getDocument({
        data: dataBytes,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      const doc = await loadingTask.promise;
      const page = await doc.getPage(1);
      const defaultViewport = page.getViewport({ scale: 1.0 });
      const scale = maxWidth / defaultViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }

  // Fullscreen interactive modal viewer with guaranteed aspect-ratio and responsive fitting
  public static openFullscreenModal(
    title: string,
    pdfDocOrData: any,
    initialPage: number = 1,
    filePath?: string,
    blobUrl?: string
  ): void {
    document.getElementById('nubo-pdf-modal-root')?.remove();

    if (!blobUrl && typeof pdfDocOrData === 'string') {
      blobUrl = base64ToPdfBlobUrl(pdfDocOrData);
    }

    const overlay = document.createElement('div');
    overlay.id = 'nubo-pdf-modal-root';
    overlay.className = 'brand-pdf-fullscreen-modal';

    const filename = filePath ? filePath.split(/[/\\]/).pop() : (title.endsWith('.pdf') ? title : `${title}.pdf`);

    overlay.innerHTML = `
      <div class="brand-pdf-fullscreen-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="pdf-icon-badge" style="width: 30px; height: 30px;">${icons.filePdf(16)}</div>
          <div>
            <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary); line-height: 1.2;">${filename}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${title}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="nubo-pdf-nav" style="background: var(--bg-subtle); padding: 2px 6px; border-radius: var(--radius-xs);">
            <button class="btn btn-ghost btn-xs btn-icon btn-modal-prev" title="Página anterior (←)">
              ${icons.chevronLeft(14)}
            </button>
            <span class="nubo-pdf-page-indicator" style="font-size: 12px;">
              <span class="modal-cur-page">${initialPage}</span> / <span class="modal-total-pages">-</span>
            </span>
            <button class="btn btn-ghost btn-xs btn-icon btn-modal-next" title="Página siguiente (→)">
              ${icons.chevronRight(14)}
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 4px; background: var(--bg-subtle); padding: 2px 6px; border-radius: var(--radius-xs);">
            <button class="btn btn-ghost btn-xs btn-icon btn-modal-zoom-out" title="Reducir zoom (-)">
              ${icons.minus(13)}
            </button>
            <span class="modal-zoom-val" style="font-size: 12px; min-width: 44px; text-align: center; font-family: monospace;">100%</span>
            <button class="btn btn-ghost btn-xs btn-icon btn-modal-zoom-in" title="Aumentar zoom (+)">
              ${icons.plus(13)}
            </button>
            <button class="btn btn-ghost btn-xs btn-modal-fit-page" title="Ajustar a la pantalla (0)">
              <span>Ajustar</span>
            </button>
            <button class="btn btn-ghost btn-xs btn-modal-fit-width" title="Ajustar al ancho">
              <span>Ancho</span>
            </button>
          </div>

          ${filePath ? `
            <button class="btn btn-secondary btn-sm btn-modal-external" title="Abrir con lector del sistema">
              ${icons.external(13)}
              <span>Abrir en PC</span>
            </button>
            <button class="btn btn-secondary btn-sm btn-modal-folder" title="Abrir carpeta">
              ${icons.folder(13)}
              <span>Carpeta</span>
            </button>
          ` : ''}

          <button class="btn btn-secondary btn-sm btn-modal-download" title="Descargar PDF">
            ${icons.download(13)}
            <span>Descargar</span>
          </button>

          <button class="btn btn-ghost btn-sm btn-icon btn-modal-close" title="Cerrar visor (Esc)">
            ${icons.close(18)}
          </button>
        </div>
      </div>

      <div class="modal-pdf-viewport">
        <div class="modal-pdf-canvas-wrapper">
          <canvas class="modal-pdf-canvas"></canvas>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let doc = pdfDocOrData;
    let pageNum = initialPage;
    let totalPages = 1;
    let scale = 1.0;
    let isRendering = false;

    const canvas = overlay.querySelector('.modal-pdf-canvas') as HTMLCanvasElement;
    const curPageEl = overlay.querySelector('.modal-cur-page');
    const totalPagesEl = overlay.querySelector('.modal-total-pages');
    const zoomValEl = overlay.querySelector('.modal-zoom-val');

    const renderModalPage = async (num: number) => {
      if (!doc || isRendering) return;
      isRendering = true;
      try {
        const page = await doc.getPage(num);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });

        const cssWidth = Math.floor(viewport.width);
        const cssHeight = Math.floor(viewport.height);

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;
        canvas.style.aspectRatio = `${cssWidth} / ${cssHeight}`;

        ctx.save();
        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport }).promise;
        ctx.restore();

        if (curPageEl) curPageEl.textContent = String(pageNum);
        if (zoomValEl) zoomValEl.textContent = `${Math.round(scale * 100)}%`;
      } finally {
        isRendering = false;
      }
    };

    const fitModalPage = async () => {
      if (!doc) return;
      try {
        const page = await doc.getPage(pageNum);
        const defaultViewport = page.getViewport({ scale: 1.0 });
        const availW = Math.max(300, window.innerWidth - 64);
        const availH = Math.max(300, window.innerHeight - 110);
        const fitScale = Math.min(availW / defaultViewport.width, availH / defaultViewport.height);
        scale = parseFloat(Math.max(0.3, Math.min(2.5, fitScale)).toFixed(2));
        await renderModalPage(pageNum);
      } catch (e) {
        console.warn('Error fitting modal page:', e);
      }
    };

    const fitModalWidth = async () => {
      if (!doc) return;
      try {
        const page = await doc.getPage(pageNum);
        const defaultViewport = page.getViewport({ scale: 1.0 });
        const availW = Math.max(300, window.innerWidth - 64);
        scale = parseFloat(Math.max(0.3, Math.min(3.0, availW / defaultViewport.width)).toFixed(2));
        await renderModalPage(pageNum);
      } catch (e) {
        console.warn('Error fitting modal width:', e);
      }
    };

    const initDoc = async () => {
      if (!doc.numPages) {
        const bytes = typeof doc === 'string' ? base64ToUint8Array(doc) : doc;
        doc = await pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        }).promise;
      }
      totalPages = doc.numPages;
      if (totalPagesEl) totalPagesEl.textContent = String(totalPages);
      await fitModalPage();
    };

    initDoc();

    const closeModal = () => {
      overlay.remove();
      window.removeEventListener('keydown', onKeyDown);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft' && pageNum > 1) {
        pageNum--;
        renderModalPage(pageNum);
      }
      if (e.key === 'ArrowRight' && pageNum < totalPages) {
        pageNum++;
        renderModalPage(pageNum);
      }
      if (e.key === '+' || e.key === '=') {
        scale = Math.min(3.0, parseFloat((scale + 0.15).toFixed(2)));
        renderModalPage(pageNum);
      }
      if (e.key === '-' || e.key === '_') {
        scale = Math.max(0.3, parseFloat((scale - 0.15).toFixed(2)));
        renderModalPage(pageNum);
      }
      if (e.key === '0') {
        fitModalPage();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    overlay.querySelector('.btn-modal-close')?.addEventListener('click', closeModal);

    overlay.querySelector('.btn-modal-prev')?.addEventListener('click', () => {
      if (pageNum > 1) {
        pageNum--;
        renderModalPage(pageNum);
      }
    });

    overlay.querySelector('.btn-modal-next')?.addEventListener('click', () => {
      if (pageNum < totalPages) {
        pageNum++;
        renderModalPage(pageNum);
      }
    });

    overlay.querySelector('.btn-modal-zoom-in')?.addEventListener('click', () => {
      scale = Math.min(3.0, parseFloat((scale + 0.15).toFixed(2)));
      renderModalPage(pageNum);
    });

    overlay.querySelector('.btn-modal-zoom-out')?.addEventListener('click', () => {
      scale = Math.max(0.3, parseFloat((scale - 0.15).toFixed(2)));
      renderModalPage(pageNum);
    });

    overlay.querySelector('.btn-modal-fit-page')?.addEventListener('click', fitModalPage);
    overlay.querySelector('.btn-modal-fit-width')?.addEventListener('click', fitModalWidth);

    overlay.querySelector('.btn-modal-external')?.addEventListener('click', () => {
      if (filePath && window.nubo?.files?.openFile) {
        window.nubo.files.openFile(filePath);
      }
    });

    overlay.querySelector('.btn-modal-folder')?.addEventListener('click', () => {
      if (filePath && window.nubo?.files?.openContainingFolder) {
        window.nubo.files.openContainingFolder(filePath);
      }
    });

    overlay.querySelector('.btn-modal-download')?.addEventListener('click', () => {
      if (blobUrl) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename || 'document.pdf';
        a.click();
      } else if (filePath && window.nubo?.files?.exportFile) {
        window.nubo.files.exportFile(filePath, filename || 'document.pdf');
      }
    });
  }
}
