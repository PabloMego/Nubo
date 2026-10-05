import { appStore, AppSection } from './store';
import { HomePage } from '../pages/home';
import { OverviewPage } from '../pages/overview';
import { GuidePage } from '../pages/guide';
import { FilesPage } from '../pages/files';
import { BrandPage } from '../pages/brand';
import { WebsitePageView } from '../pages/website';
import { DevelopmentPage } from '../pages/development';
import { MarketingPage } from '../pages/marketing';
import { ContentPage } from '../pages/content';
import { NotesPage } from '../pages/notes';
import { SettingsPage } from '../pages/settings';

export class NavigationRouter {
  private viewContainer: HTMLElement;
  private lastProjectId: string | null = null;
  private currentRenderToken: number = 0;

  constructor(viewContainer: HTMLElement) {
    this.viewContainer = viewContainer;

    appStore.subscribe((state) => {
      const currentId = state.currentProject?.id || null;
      if (this.lastProjectId !== currentId) {
        this.lastProjectId = currentId;
        DevelopmentPage.clearCache();
        WebsitePageView.clearCache();
      }
      this.route(state.activeSection);
    });
  }

  public async route(section: AppSection): Promise<void> {
    const token = ++this.currentRenderToken;
    this.viewContainer.scrollTop = 0;

    // Fast check: if the active section already changed, abort early
    if (appStore.getState().activeSection !== section) {
      return;
    }

    switch (section) {
      case 'home':
        await HomePage.render(this.viewContainer);
        break;
      case 'overview':
        await OverviewPage.render(this.viewContainer);
        break;
      case 'guide':
        await GuidePage.render(this.viewContainer);
        break;
      case 'files':
        await FilesPage.render(this.viewContainer);
        break;
      case 'brand':
        await BrandPage.render(this.viewContainer);
        break;
      case 'website':
        await WebsitePageView.render(this.viewContainer);
        break;
      case 'development':
        await DevelopmentPage.render(this.viewContainer);
        break;
      case 'marketing':
        MarketingPage.setActiveTab('campaigns');
        await MarketingPage.render(this.viewContainer);
        break;
      case 'content':
        MarketingPage.setActiveTab('content');
        await MarketingPage.render(this.viewContainer);
        break;
      case 'notes':
        await NotesPage.render(this.viewContainer);
        break;
      case 'settings':
        await SettingsPage.render(this.viewContainer);
        break;
      default:
        await HomePage.render(this.viewContainer);
        break;
    }

    // If another route was triggered while this page was rendering async,
    // ensure the active section matches what is rendered on screen
    if (token !== this.currentRenderToken) {
      const latestSection = appStore.getState().activeSection;
      if (latestSection !== section) {
        this.route(latestSection);
      }
    }
  }
}
