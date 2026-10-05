import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface DatabaseAdapter {
  run(sql: string, params?: any[]): { changes: number; lastInsertRowid: number | bigint };
  get<T = any>(sql: string, params?: any[]): T | undefined;
  all<T = any>(sql: string, params?: any[]): T[];
  exec(sql: string): void;
  close(): void;
}

class SqlJsAdapter implements DatabaseAdapter {
  private db: any;
  private dbPath: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(db: any, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  private persist() {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('Error persisting SQLite database to disk:', err);
    }
  }

  run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
    this.db.run(sql, params);
    this.persist();
    const rows = this.db.exec('SELECT last_insert_rowid() as id, changes() as changes');
    if (rows && rows.length > 0 && rows[0].values.length > 0) {
      return {
        lastInsertRowid: Number(rows[0].values[0][0]),
        changes: Number(rows[0].values[0][1])
      };
    }
    return { changes: 1, lastInsertRowid: 0 };
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const obj = stmt.getAsObject();
      stmt.free();
      return obj as T;
    }
    stmt.free();
    return undefined;
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T);
    }
    stmt.free();
    return results;
  }

  exec(sql: string): void {
    this.db.exec(sql);
    this.persist();
  }

  close(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (err) {
      console.error('Error saving SQLite on close:', err);
    }
    this.db.close();
  }
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db!: DatabaseAdapter;
  private dbPath: string;

  private constructor() {
    const userDataPath = app ? app.getPath('userData') : path.join(process.cwd(), '.nubo_data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.dbPath = path.join(userDataPath, 'nubo.db');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    console.log(`[DatabaseService] Initializing SQLite database at: ${this.dbPath}`);

    try {
      const initSqlJs = require('sql.js');
      const candidates = [
        path.join(process.resourcesPath || '', 'app.asar.unpacked/node_modules/sql.js/dist/sql-wasm.wasm'),
        path.join(app ? app.getAppPath() : process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
        path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
        path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
      ];
      let wasmPath = '';
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          wasmPath = c;
          break;
        }
      }

      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          if (wasmPath && fs.existsSync(wasmPath)) return wasmPath;
          return path.join(__dirname, file);
        }
      });

      let fileBuffer: Buffer | null = null;
      if (fs.existsSync(this.dbPath)) {
        fileBuffer = fs.readFileSync(this.dbPath);
      }
      const wasmDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
      this.db = new SqlJsAdapter(wasmDb, this.dbPath);
      console.log('[DatabaseService] Successfully initialized SQLite (WebAssembly)');
    } catch (err: any) {
      console.error('[DatabaseService] Failed to initialize SQLite:', err);
      throw err;
    }

    this.runMigrations();
  }

  public getAdapter(): DatabaseAdapter {
    return this.db;
  }

  private runMigrations(): void {
    const schema = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        logo TEXT,
        color TEXT DEFAULT '#111111',
        project_type TEXT DEFAULT 'program',
        website TEXT,
        github TEXT,
        status TEXT DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        folder_path TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        type TEXT DEFAULT 'task',
        tags TEXT DEFAULT '[]',
        due_date TEXT,
        checklist TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS brand_assets (
        id TEXT PRIMARY KEY,
        project_id TEXT UNIQUE NOT NULL,
        primary_logo TEXT,
        primary_logo_path TEXT,
        alternative_logo TEXT,
        alternative_logo_path TEXT,
        favicon TEXT,
        favicon_path TEXT,
        banner TEXT,
        banner_path TEXT,
        brand_manual_pdf TEXT,
        brand_manual_path TEXT,
        what_is_it TEXT,
        mission TEXT,
        primary_color TEXT DEFAULT '#111111',
        secondary_color TEXT DEFAULT '#F5F5F5',
        accent_color TEXT DEFAULT '#000000',
        typography TEXT DEFAULT 'Inter, system-ui',
        secondary_typography TEXT DEFAULT 'Inter, sans-serif',
        guidelines TEXT,
        colors_json TEXT DEFAULT '[]',
        graphics_json TEXT DEFAULT '[]',
        asset_files_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS website_info (
        id TEXT PRIMARY KEY,
        project_id TEXT UNIQUE NOT NULL,
        url TEXT,
        domain TEXT,
        repository TEXT,
        hosting TEXT,
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT,
        pages TEXT DEFAULT '[]',
        illustrator_file_path TEXT,
        reference_images_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketing_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'Idea',
        target_date TEXT,
        metrics TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        goal TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'Planned',
        channels_json TEXT DEFAULT '[]',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketing_accounts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        username TEXT,
        url TEXT,
        email TEXT,
        status TEXT DEFAULT 'Not Created',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketing_emails (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        email TEXT NOT NULL,
        type TEXT NOT NULL,
        usage TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketing_ideas (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        goal TEXT,
        channel TEXT,
        priority TEXT DEFAULT 'Medium',
        status TEXT DEFAULT 'Idea',
        expected_result TEXT,
        date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS marketing_metrics (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT,
        platform TEXT,
        metric_name TEXT NOT NULL,
        value REAL NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS content_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT DEFAULT 'Idea',
        scheduled_date TEXT,
        description TEXT,
        script TEXT,
        published_url TEXT,
        thumbnail TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        pinned INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS product_specs (
        id TEXT PRIMARY KEY,
        project_id TEXT UNIQUE NOT NULL,
        what_is_it TEXT DEFAULT '',
        problem_solved TEXT DEFAULT '',
        target_audience TEXT DEFAULT '',
        goals TEXT DEFAULT '',
        features_json TEXT DEFAULT '[]',
        user_flows TEXT DEFAULT '',
        general_requirements TEXT DEFAULT '',
        build_info_json TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `;

    this.db.exec(schema);

    // Safely apply column migrations for existing databases
    const brandMigrations = [
      'ALTER TABLE brand_assets ADD COLUMN primary_logo_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN alternative_logo_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN favicon_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN banner TEXT',
      'ALTER TABLE brand_assets ADD COLUMN banner_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN brand_manual_pdf TEXT',
      'ALTER TABLE brand_assets ADD COLUMN brand_manual_path TEXT',
      'ALTER TABLE brand_assets ADD COLUMN what_is_it TEXT',
      'ALTER TABLE brand_assets ADD COLUMN mission TEXT',
      'ALTER TABLE brand_assets ADD COLUMN secondary_typography TEXT DEFAULT "Inter, sans-serif"',
      'ALTER TABLE brand_assets ADD COLUMN colors_json TEXT DEFAULT "[]"',
      'ALTER TABLE brand_assets ADD COLUMN graphics_json TEXT DEFAULT "[]"',
      'ALTER TABLE brand_assets ADD COLUMN asset_files_json TEXT DEFAULT "[]"'
    ];

    for (const sql of brandMigrations) {
      try {
        this.db.run(sql);
      } catch {
        // column already exists
      }
    }

    const websiteMigrations = [
      'ALTER TABLE website_info ADD COLUMN illustrator_file_path TEXT',
      'ALTER TABLE website_info ADD COLUMN reference_images_json TEXT DEFAULT "[]"'
    ];

    for (const sql of websiteMigrations) {
      try {
        this.db.run(sql);
      } catch {
        // column already exists
      }
    }

    const marketingMigrations = [
      'ALTER TABLE content_items ADD COLUMN campaign_id TEXT',
      'ALTER TABLE content_items ADD COLUMN parent_idea_id TEXT',
      'ALTER TABLE content_items ADD COLUMN format TEXT DEFAULT "Other"',
      'ALTER TABLE content_items ADD COLUMN topic TEXT',
      'ALTER TABLE content_items ADD COLUMN hook TEXT',
      'ALTER TABLE content_items ADD COLUMN cta TEXT',
      'ALTER TABLE content_items ADD COLUMN hashtags TEXT',
      'ALTER TABLE content_items ADD COLUMN notes TEXT',
      'ALTER TABLE content_items ADD COLUMN goal TEXT',
      'ALTER TABLE marketing_ideas ADD COLUMN campaign_id TEXT',
      'ALTER TABLE tasks ADD COLUMN campaign_id TEXT'
    ];

    for (const sql of marketingMigrations) {
      try {
        this.db.run(sql);
      } catch {
        // column already exists
      }
    }

    const devMigrations = [
      'ALTER TABLE product_specs ADD COLUMN build_info_json TEXT DEFAULT "{}"'
    ];

    for (const sql of devMigrations) {
      try {
        this.db.run(sql);
      } catch {
        // column already exists
      }
    }

    const projectMigrations = [
      'ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT "program"'
    ];

    for (const sql of projectMigrations) {
      try {
        this.db.run(sql);
      } catch {
        // column already exists
      }
    }

    console.log('[DatabaseService] Database migrations executed successfully.');
  }

  public getDbPath(): string {
    return this.dbPath;
  }
}
