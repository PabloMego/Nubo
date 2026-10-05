import { MarketingPage } from './marketing';

export class ContentPage {
  public static async render(container: HTMLElement): Promise<void> {
    MarketingPage.setActiveTab('content');
    return MarketingPage.render(container);
  }
}
