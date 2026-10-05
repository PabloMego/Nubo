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

  public createProjectFolderStructure(projectRoot: string): void {
    const folders = [
      'Brand',
      path.join('Brand', 'Logos'),
      path.join('Brand', 'Banners'),
      path.join('Brand', 'Manual'),
      path.join('Brand', 'Graphics'),
      path.join('Brand', 'Fonts'),
      'Website',
      path.join('Website', 'Proyecto'),
      path.join('Website', 'Design'),
      path.join('Website', 'Referencias'),
      'Marketing',
      path.join('Marketing', 'Campaigns'),
      path.join('Marketing', 'Social'),
      'Content',
      path.join('Content', 'Scripts'),
      path.join('Content', 'Media'),
      'Development',
      path.join('Development', 'Proyecto'),
      'Files',
      'Notes'
    ];

    if (!fs.existsSync(projectRoot)) {
      fs.mkdirSync(projectRoot, { recursive: true });
    }

    for (const folder of folders) {
      const folderPath = path.join(projectRoot, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }
  }

  public ensureBrandFolderStructure(projectRoot: string): void {
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
