import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class SystemService {
  private static instance: SystemService;
  private cachedFonts: string[] | null = null;

  public static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }
    return SystemService.instance;
  }

  public async getInstalledFonts(): Promise<string[]> {
    if (this.cachedFonts && this.cachedFonts.length > 0) {
      return this.cachedFonts;
    }

    const fontFamilies = new Set<string>();

    // Baseline web & universal design fonts
    const baseline = [
      'Arial', 'Bahnschrift', 'Calibri', 'Cambria', 'Candara', 
      'Cascadia Code', 'Century Gothic', 'Comic Sans MS', 'Consolas', 
      'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Fira Code', 
      'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 
      'Impact', 'Ink Free', 'Inter', 'JetBrains Mono', 'Lato', 
      'Lucida Console', 'Lucida Sans Unicode', 'Malgun Gothic', 
      'Microsoft Sans Serif', 'Microsoft YaHei', 'Montserrat', 
      'Open Sans', 'Outfit', 'Palatino Linotype', 'Plus Jakarta Sans', 
      'Poppins', 'Roboto', 'Segoe Print', 'Segoe Script', 'Segoe UI', 
      'Segoe UI Variable', 'Sitka', 'Space Grotesk', 'Syne', 
      'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'
    ];
    baseline.forEach(f => fontFamilies.add(f));

    if (process.platform === 'win32') {
      try {
        const { stdout } = await execPromise(
          `powershell -NoProfile -Command "(Get-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts').psobject.properties.name"`,
          { timeout: 3500 }
        );
        if (stdout) {
          const lines = stdout.split(/\r?\n/);
          for (const line of lines) {
            let trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('PS')) continue;

            // Remove suffix like (TrueType), (OpenType), etc.
            trimmed = trimmed.replace(/\s*\([^)]*\)\s*$/i, '').trim();

            const parts = trimmed.split('&');
            for (const part of parts) {
              let clean = part.trim();
              clean = clean.replace(/\s+(Bold|Italic|Light|SemiBold|Semilight|Regular|Medium|Black|ExtraBold|ExtraLight|Thin)(\s+(Bold|Italic))?/i, '').trim();
              clean = clean.replace(/\s+\d+(\s*,\s*\d+)*$/i, '').trim();
              if (
                clean &&
                clean.length > 1 &&
                !/^(Modern|Roman|Script|Small Fonts|Courier \d|MS Sans Serif|MS Serif)/i.test(clean) &&
                !/^\d+/.test(clean)
              ) {
                fontFamilies.add(clean);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[SystemService] Error fetching Windows fonts:', err);
      }
    }

    this.cachedFonts = Array.from(fontFamilies).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    return this.cachedFonts;
  }
}
