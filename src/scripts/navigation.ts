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

  constructor(viewContainer: HTMLElement) {
    this.viewContainer = viewContainer;

    appStore.subscribe((state) => {
      this.route(state.activeSection);
    });
  }

  public route(section: AppSection): void {
    this.viewContainer.scrollTop = 0;

    switch (section) {
      case 'home':
        HomePage.render(this.viewContainer);
        break;
      case 'overview':
        OverviewPage.render(this.viewContainer);
        break;
      case 'guide':
        GuidePage.render(this.viewContainer);
        break;
      case 'files':
        FilesPage.render(this.viewContainer);
        break;
      case 'brand':
        BrandPage.render(this.viewContainer);
        break;
      case 'website':
        WebsitePageView.render(this.viewContainer);
        break;
      case 'development':
        DevelopmentPage.render(this.viewContainer);
        break;
      case 'marketing':
        MarketingPage.setActiveTab('campaigns');
        MarketingPage.render(this.viewContainer);
        break;
      case 'content':
        MarketingPage.setActiveTab('content');
        MarketingPage.render(this.viewContainer);
        break;
      case 'notes':
        NotesPage.render(this.viewContainer);
        break;
      case 'settings':
        SettingsPage.render(this.viewContainer);
        break;
      default:
        HomePage.render(this.viewContainer);
        break;
    }
  }
}
