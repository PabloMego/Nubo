import path from 'path';
import fs from 'fs';
import { shell } from 'electron';

export interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  extension: string;
  modifiedAt: string;
  isImage: boolean;
  isPdf: boolean;
  previewUrl?: string;
}

export class FileService {
  private static instance: FileService;

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  public createProjectFolderStructure(
    projectRoot: string,
    projectType: 'program' | 'website' | 'script' = 'program',
    projectName?: string
  ): void {
    const name = projectName || path.basename(projectRoot);

    let folders: string[] = [];

    if (projectType === 'website') {
      folders = [
        'Website',
        path.join('Website', 'Proyecto'),
        path.join('Website', 'Design'),
        path.join('Website', 'Assets'),
        path.join('Website', 'Referencias'),
        path.join('Website', 'Pages'),
        'Brand',
        path.join('Brand', 'Logos'),
        path.join('Brand', 'Banners'),
        path.join('Brand', 'Manual'),
        path.join('Brand', 'Graphics'),
        path.join('Brand', 'Fonts'),
        'Marketing',
        path.join('Marketing', 'Campaigns'),
        path.join('Marketing', 'Social'),
        'Development',
        path.join('Development', 'Proyecto'),
        'Files',
        'Notes'
      ];
    } else if (projectType === 'script') {
      folders = [
        'Script',
        path.join('Script', 'Src'),
        path.join('Script', 'Input'),
        path.join('Script', 'Output'),
        path.join('Script', 'Config'),
        path.join('Script', 'Logs'),
        'Files',
        'Notes'
      ];
    } else {
      // program (default)
      folders = [
        'Development',
        path.join('Development', 'Proyecto'),
        path.join('Development', 'Build'),
        path.join('Development', 'Docs'),
        path.join('Development', 'Assets'),
        'Brand',
        path.join('Brand', 'Logos'),
        path.join('Brand', 'Banners'),
        path.join('Brand', 'Manual'),
        path.join('Brand', 'Graphics'),
        path.join('Brand', 'Fonts'),
        'Marketing',
        path.join('Marketing', 'Campaigns'),
        path.join('Marketing', 'Social'),
        'Files',
        'Notes'
      ];
    }

    if (!fs.existsSync(projectRoot)) {
      fs.mkdirSync(projectRoot, { recursive: true });
    }

    for (const folder of folders) {
      const folderPath = path.join(projectRoot, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }

    // Generate starter templates and documentation tailored to project type
    try {
      if (projectType === 'website') {
        const htmlPath = path.join(projectRoot, 'Website', 'Proyecto', 'index.html');
        if (!fs.existsSync(htmlPath)) {
          const starterHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 60px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      background: #0f0f11;
      color: #f4f4f5;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34D399;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 20px;
    }
    h1 { font-size: 2.75rem; margin: 0 0 16px 0; letter-spacing: -0.02em; }
    p { color: #a1a1aa; max-width: 520px; line-height: 1.6; margin: 0 auto 28px auto; font-size: 15px; }
    .features { display: flex; gap: 16px; margin-top: 20px; flex-wrap: wrap; justify-content: center; }
    .feature-card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px 20px; text-align: left; max-width: 200px; }
    .feature-card h4 { margin: 0 0 6px 0; font-size: 14px; color: #fafafa; }
    .feature-card p { margin: 0; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="badge">Sitio Web &bull; ${name}</div>
  <h1>${name}</h1>
  <p>Espacio inicial para tu sitio web creado con Nubo. Puedes maquetar directamente en esta carpeta o clonar tu repositorio React/Next.js/Astro/Vite.</p>
  <div class="features">
    <div class="feature-card">
      <h4>Design</h4>
      <p>Wireframes y bocetos en Website/Design</p>
    </div>
    <div class="feature-card">
      <h4>Assets</h4>
      <p>Imágenes y recursos en Website/Assets</p>
    </div>
    <div class="feature-card">
      <h4>Brand</h4>
      <p>Identidad y logos en Brand/Logos</p>
    </div>
  </div>
</body>
</html>`;
          fs.writeFileSync(htmlPath, starterHtml, 'utf-8');
        }

        const readmeWeb = path.join(projectRoot, 'Website', 'README.md');
        if (!fs.existsSync(readmeWeb)) {
          fs.writeFileSync(
            readmeWeb,
            `# ${name} - Sitio Web\n\nCarpeta de trabajo web organizada con Nubo.\n\n## Directorios\n- \`Website/Proyecto/\`: Código fuente del sitio (HTML/CSS/JS o framework).\n- \`Website/Design/\`: Diseños de interfaz, archivos de Illustrator (.ai), Figma o bocetos.\n- \`Website/Assets/\`: Imágenes, iconos, vídeos y fuentes del sitio web.\n- \`Website/Referencias/\`: Capturas de pantalla, enlaces de inspiración y referencias.\n- \`Website/Pages/\`: Esquemas y contenido por páginas (/home, /pricing, /about).\n`,
            'utf-8'
          );
        }
      } else if (projectType === 'script') {
        const pyPath = path.join(projectRoot, 'Script', 'Src', 'main.py');
        if (!fs.existsSync(pyPath)) {
          const starterPy = `"""
${name} - Script de Automatización
Generado con Nubo
"""

import os
import sys

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.abspath(os.path.join(base_dir, "..", "Input"))
    output_dir = os.path.abspath(os.path.join(base_dir, "..", "Output"))
    
    print(f"[{name}] Iniciando ejecución...")
    print(f"Directorio de Entrada (Input):  {input_dir}")
    print(f"Directorio de Salida (Output): {output_dir}")
    
    # Escribe aquí la lógica de procesamiento o automatización
    # Ejemplo: leer archivos de input_dir y guardar resultados en output_dir
    
    print(f"[{name}] Ejecución finalizada correctamente.")

if __name__ == "__main__":
    main()
`;
          fs.writeFileSync(pyPath, starterPy, 'utf-8');
        }

        const envPath = path.join(projectRoot, 'Script', 'Config', '.env.example');
        if (!fs.existsSync(envPath)) {
          fs.writeFileSync(
            envPath,
            `# Variables de entorno y configuración para ${name}\nAPI_KEY=\nENVIRONMENT=development\nLOG_LEVEL=INFO\n`,
            'utf-8'
          );
        }

        const readmeScript = path.join(projectRoot, 'Script', 'README.md');
        if (!fs.existsSync(readmeScript)) {
          fs.writeFileSync(
            readmeScript,
            `# ${name} - Script / Automatización\n\nEstructura de trabajo para scripts y herramientas de automatización creada con Nubo.\n\n## Directorios\n- \`Script/Src/\`: Código ejecutable (Python, Node.js, Bash o PowerShell).\n- \`Script/Input/\`: Datos o archivos de entrada para procesar (CSVs, imágenes, JSONs, datasets).\n- \`Script/Output/\`: Resultados procesados, reportes, ficheros generados y exportaciones.\n- \`Script/Config/\`: Configuraciones, parámetros y credenciales (\`.env.example\`).\n- \`Script/Logs/\`: Historial de ejecuciones y logs de depuración.\n\n## Cómo ejecutar\nAbre una terminal desde la pestaña **Desarrollo** en Nubo o con tu editor preferido.\n`,
            'utf-8'
          );
        }
      } else {
        // program
        const readmeProgram = path.join(projectRoot, 'Development', 'Proyecto', 'README.md');
        if (!fs.existsSync(readmeProgram)) {
          fs.writeFileSync(
            readmeProgram,
            `# ${name} - Programa / Software\n\nEspacio de desarrollo para **${name}** organizado con Nubo.\n\n## Estructura de Directorios\n- \`Development/Proyecto/\`: Código fuente principal de la aplicación.\n- \`Development/Build/\`: Archivos ejecutables compilados (\`.exe\`, instaladores, releases). Nubo escanea esta carpeta automáticamente.\n- \`Development/Docs/\`: Especificaciones técnicas, arquitectura y diagramas.\n- \`Development/Assets/\`: Iconos (.ico), splash screens y recursos de la app.\n\n## Gestión desde Nubo\nPuedes inicializar Git, clonar tu repositorio, abrir VS Code o lanzar la terminal directamente desde la pestaña **Desarrollo**.\n`,
            'utf-8'
          );
        }

        const buildInfo = path.join(projectRoot, 'Development', 'Build', 'LEEME.txt');
        if (!fs.existsSync(buildInfo)) {
          fs.writeFileSync(
            buildInfo,
            `Coloca aquí los ejecutables generados (.exe), instaladores y versiones empaquetadas.\nNubo escaneará automáticamente esta carpeta para detectar tus builds en la sección Desarrollo.\n`,
            'utf-8'
          );
        }
      }
    } catch (err) {
      console.warn('[FileService] Could not write starter templates:', err);
    }
  }

  public ensureBrandFolderStructure(projectRoot: string): void {
    // Scripts are personal quick tools: do not generate Brand, Website, or Marketing folders
    if (fs.existsSync(path.join(projectRoot, 'Script')) && !fs.existsSync(path.join(projectRoot, 'Website')) && !fs.existsSync(path.join(projectRoot, 'Development', 'Build'))) {
      return;
    }

    const subfolders = [
      'Brand',
      path.join('Brand', 'Logos'),
      path.join('Brand', 'Banners'),
      path.join('Brand', 'Manual'),
      path.join('Brand', 'Graphics'),
      path.join('Brand', 'Fonts'),
      'Website',
      path.join('Website', 'Assets'),
      path.join('Website', 'Pages'),
      'Marketing',
      path.join('Marketing', 'Campaigns'),
      path.join('Marketing', 'Social'),
      'Content',
      path.join('Content', 'Scripts'),
      path.join('Content', 'Media'),
      'Development',
      path.join('Development', 'Specs'),
      'Files',
      'Notes'
    ];
    for (const sub of subfolders) {
      const full = path.join(projectRoot, sub);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
      }
    }

    // Auto-organize any loose files in Brand/ root into their proper category subfolders
    const brandDir = path.join(projectRoot, 'Brand');
    if (fs.existsSync(brandDir)) {
      try {
        const entries = fs.readdirSync(brandDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) {
            const src = path.join(brandDir, entry.name);
            const lower = entry.name.toLowerCase();
            let destSub = 'Graphics';
            if (lower.endsWith('.pdf') || lower.includes('manual') || lower.includes('guide')) destSub = 'Manual';
            else if (lower.includes('banner')) destSub = 'Banners';
            else if (lower.includes('logo') || lower.includes('favicon') || lower.includes('icon')) destSub = 'Logos';
            else if (lower.endsWith('.ttf') || lower.endsWith('.otf') || lower.endsWith('.woff') || lower.endsWith('.woff2')) destSub = 'Fonts';

            const destDir = path.join(brandDir, destSub);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            const dest = path.join(destDir, entry.name);
            if (!fs.existsSync(dest)) {
              fs.renameSync(src, dest);
            }
          }
        }
      } catch (err) {
        console.warn('Error organizing loose brand files:', err);
      }
    }
  }

  public listFiles(targetPath: string, rootFolder?: string, recursive: boolean = false): FileItem[] {
    const normTarget = path.normalize(targetPath);
    if (!fs.existsSync(normTarget)) {
      return [];
    }

    const items: FileItem[] = [];
    const imageExts = new Set(['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.ico', '.bmp']);
    const pdfExts = new Set(['.pdf']);

    const walk = (currentDir: string) => {
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch (err) {
        return;
      }

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(currentDir, entry.name);
        try {
          const stats = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase();
          const isDir = entry.isDirectory();
          const rel = rootFolder ? path.relative(rootFolder, fullPath).replace(/\\/g, '/') : entry.name;

          if (isDir) {
            if (!recursive) {
              items.push({
                name: entry.name,
                path: fullPath,
                relativePath: rel,
                isDirectory: true,
                size: 0,
                extension: 'folder',
                modifiedAt: stats.mtime.toISOString(),
                isImage: false,
                isPdf: false
              });
            } else {
              // Recurse into subfolder
              walk(fullPath);
            }
          } else {
            items.push({
              name: entry.name,
              path: fullPath,
              relativePath: rel,
              isDirectory: false,
              size: stats.size,
              extension: ext.replace('.', ''),
              modifiedAt: stats.mtime.toISOString(),
              isImage: imageExts.has(ext),
              isPdf: pdfExts.has(ext)
            });
          }
        } catch (err) {
          console.warn(`Could not stat file ${fullPath}:`, err);
        }
      }
    };

    walk(normTarget);

    return items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  public createFolder(parentDirectory: string, folderName: string): string {
    const cleanName = folderName.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (!cleanName) throw new Error('Invalid folder name');
    const target = path.join(parentDirectory, cleanName);
    if (fs.existsSync(target)) {
      throw new Error('A folder or file with this name already exists');
    }
    fs.mkdirSync(target, { recursive: true });
    return target;
  }

  public uploadFiles(targetDirectory: string, sourceFilePaths: string[]): string[] {
    const normTarget = path.normalize(targetDirectory);
    if (!fs.existsSync(normTarget)) {
      fs.mkdirSync(normTarget, { recursive: true });
    }

    const copiedPaths: string[] = [];

    for (const src of sourceFilePaths) {
      const normSrc = path.normalize(src);
      if (!fs.existsSync(normSrc)) continue;
      const baseName = path.basename(normSrc);
      let dest = path.join(normTarget, baseName);

      // If source and destination are the exact same file on disk, no need to duplicate
      if (path.resolve(normSrc) === path.resolve(dest)) {
        copiedPaths.push(dest);
        continue;
      }

      // Handle duplicate names gracefully
      if (fs.existsSync(dest)) {
        const ext = path.extname(baseName);
        const nameWithoutExt = path.basename(baseName, ext);
        let counter = 1;
        while (fs.existsSync(dest)) {
          dest = path.join(normTarget, `${nameWithoutExt} (${counter})${ext}`);
          counter++;
        }
      }

      fs.copyFileSync(normSrc, dest);
      copiedPaths.push(dest);
    }

    return copiedPaths;
  }

  public saveBuffer(targetDirectory: string, fileName: string, base64Content: string): string {
    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }

    const cleanName = fileName.replace(/[<>:"/\\|?*]/g, '_');
    let dest = path.join(targetDirectory, cleanName);

    if (fs.existsSync(dest)) {
      const ext = path.extname(cleanName);
      const nameWithoutExt = path.basename(cleanName, ext);
      let counter = 1;
      while (fs.existsSync(dest)) {
        dest = path.join(targetDirectory, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      }
    }

    // Strip possible data URI prefix
    const base64Data = base64Content.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    fs.writeFileSync(dest, Buffer.from(base64Data, 'base64'));
    return dest;
  }

  public renameItem(itemPath: string, newName: string): string {
    if (!fs.existsSync(itemPath)) throw new Error('Item does not exist');
    const dir = path.dirname(itemPath);
    const cleanName = newName.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (!cleanName) throw new Error('Invalid name');
    const newPath = path.join(dir, cleanName);
    if (fs.existsSync(newPath)) throw new Error('Destination name already exists');
    fs.renameSync(itemPath, newPath);
    return newPath;
  }

  public async deleteItem(itemPath: string): Promise<boolean> {
    if (!fs.existsSync(itemPath)) return false;
    try {
      // Use electron shell.trashItem if available to allow recovery from Recycle Bin
      await shell.trashItem(itemPath);
      return true;
    } catch {
      // Fallback to rm
      const stat = fs.statSync(itemPath);
      if (stat.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(itemPath);
      }
      return true;
    }
  }

  public moveItem(sourcePath: string, destinationDir: string): string {
    if (!fs.existsSync(sourcePath)) throw new Error('Source file does not exist');
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }
    const fileName = path.basename(sourcePath);
    let target = path.join(destinationDir, fileName);

    if (fs.existsSync(target)) {
      const ext = path.extname(fileName);
      const nameWithoutExt = path.basename(fileName, ext);
      let counter = 1;
      while (fs.existsSync(target)) {
        target = path.join(destinationDir, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      }
    }

    fs.renameSync(sourcePath, target);
    return target;
  }

  public copyItem(sourcePath: string, destinationDir: string): string {
    if (!fs.existsSync(sourcePath)) throw new Error('Source file does not exist');
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }
    const fileName = path.basename(sourcePath);
    let target = path.join(destinationDir, fileName);

    if (fs.existsSync(target)) {
      const ext = path.extname(fileName);
      const nameWithoutExt = path.basename(fileName, ext);
      let counter = 1;
      while (fs.existsSync(target)) {
        target = path.join(destinationDir, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      }
    }

    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      fs.cpSync(sourcePath, target, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, target);
    }
    return target;
  }

  public async openFile(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) throw new Error('File does not exist');
    return await shell.openPath(filePath);
  }

  public openContainingFolder(filePath: string): void {
    const norm = path.normalize(filePath);
    if (fs.existsSync(norm)) {
      try {
        const stat = fs.statSync(norm);
        if (stat.isDirectory()) {
          shell.openPath(norm);
        } else {
          shell.showItemInFolder(norm);
        }
      } catch {
        shell.openPath(norm);
      }
    }
  }

  public readFileAsBase64(filePath: string): { mimeType: string; base64: string } | null {
    if (!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.md': 'text/markdown'
    };

    const mimeType = mimeMap[ext] || 'application/octet-stream';
    const buffer = fs.readFileSync(filePath);
    return {
      mimeType,
      base64: `data:${mimeType};base64,${buffer.toString('base64')}`
    };
  }
}
