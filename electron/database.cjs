const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

let db = null

function getDbPath() {
  const userDataPath = app.getPath('userData')
  const newPath = path.join(userDataPath, 'meridiano.db')
  // Migrate from old name if needed
  if (!require('fs').existsSync(newPath)) {
    const oldPath = path.join(userDataPath, 'pos-meridiano.db')
    if (require('fs').existsSync(oldPath)) {
      require('fs').copyFileSync(oldPath, newPath)
    }
  }
  return newPath
}

function getDb() {
  if (db) return db
  const dbPath = getDbPath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema()
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nombre TEXT DEFAULT '',
      descripcion TEXT,
      categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
      metal TEXT NOT NULL DEFAULT 'chapa',
      peso_gramos REAL,
      costo_mano_obra REAL DEFAULT 0,
      costo_compra REAL DEFAULT 0,
      precio_fijo REAL,
      stock INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      imagen_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS precios_metales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT UNIQUE NOT NULL,
      oro_24k_por_gramo REAL NOT NULL,
      oro_14k_por_gramo REAL NOT NULL,
      oro_10k_por_gramo REAL NOT NULL,
      plata_por_gramo REAL NOT NULL,
      tipo_cambio REAL,
      fuente TEXT DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      subtotal REAL NOT NULL,
      descuento REAL DEFAULT 0,
      total REAL NOT NULL,
      metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
      notas TEXT,
      precio_oro_24k_usado REAL,
      precio_oro_14k_usado REAL,
      precio_oro_10k_usado REAL,
      precio_plata_usado REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL REFERENCES ventas(id),
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      metal TEXT,
      peso_gramos REAL,
      costo_mano_obra REAL,
      costo_compra REAL
    );

    CREATE TABLE IF NOT EXISTS cortes_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT UNIQUE NOT NULL,
      fondo_inicial REAL DEFAULT 0,
      ventas_efectivo REAL DEFAULT 0,
      ventas_tarjeta REAL DEFAULT 0,
      ventas_transferencia REAL DEFAULT 0,
      ventas_otro REAL DEFAULT 0,
      efectivo_esperado REAL DEFAULT 0,
      efectivo_real REAL DEFAULT 0,
      diferencia REAL DEFAULT 0,
      notas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS config_tienda (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      nombre TEXT DEFAULT 'Mi Joyeria',
      slogan TEXT,
      logo_path TEXT,
      color_preset TEXT DEFAULT 'grafito',
      fuente_preset TEXT DEFAULT 'profesional',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Migration: add tipo_cambio column if missing
  const cols = db.prepare("PRAGMA table_info(precios_metales)").all()
  if (!cols.find(c => c.name === 'tipo_cambio')) {
    db.exec('ALTER TABLE precios_metales ADD COLUMN tipo_cambio REAL')
  }

  // Migration: add backup columns to config_tienda
  const configCols = db.prepare("PRAGMA table_info(config_tienda)").all()
  if (!configCols.find(c => c.name === 'backup_carpeta')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN backup_carpeta TEXT')
  }
  if (!configCols.find(c => c.name === 'backup_ultimo')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN backup_ultimo TEXT')
  }

  // Migration: add etiqueta size columns to config_tienda
  if (!configCols.find(c => c.name === 'etiqueta_ancho_mm')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN etiqueta_ancho_mm REAL DEFAULT 50')
  }
  if (!configCols.find(c => c.name === 'etiqueta_alto_mm')) {
    db.exec('ALTER TABLE config_tienda ADD COLUMN etiqueta_alto_mm REAL DEFAULT 10')
  }

  // Migration: add pin_hash column to usuarios
  const usuariosCols = db.prepare("PRAGMA table_info(usuarios)").all()
  if (!usuariosCols.find(c => c.name === 'pin_hash')) {
    db.exec('ALTER TABLE usuarios ADD COLUMN pin_hash TEXT')
  }

  // Migration: add estatus column to ventas
  const ventasCols = db.prepare("PRAGMA table_info(ventas)").all()
  if (!ventasCols.find(c => c.name === 'estatus')) {
    db.exec("ALTER TABLE ventas ADD COLUMN estatus TEXT DEFAULT 'completada'")
  }

  // Indexes for report performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at);
    CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta_id ON detalle_ventas(venta_id);
    CREATE INDEX IF NOT EXISTS idx_detalle_ventas_producto_id ON detalle_ventas(producto_id);
    CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
  `)

  // Seed config if empty
  const configRow = db.prepare('SELECT id FROM config_tienda WHERE id = 1').get()
  if (!configRow) {
    db.prepare('INSERT INTO config_tienda (id) VALUES (1)').run()
  }
}

function seedDefaultUser() {
  const bcrypt = require('bcryptjs')
  const existing = db.prepare('SELECT id, pin_hash FROM usuarios LIMIT 1').get()
  if (!existing) {
    const passwordHash = bcrypt.hashSync('admin123', 10)
    const pinHash = bcrypt.hashSync('1234', 10)
    db.prepare('INSERT INTO usuarios (nombre, email, password_hash, pin_hash) VALUES (?, ?, ?, ?)').run(
      'Administrador', 'admin@meridiano.com', passwordHash, pinHash
    )
  } else if (!existing.pin_hash) {
    const pinHash = bcrypt.hashSync('1234', 10)
    db.prepare('UPDATE usuarios SET pin_hash = ? WHERE id = ?').run(pinHash, existing.id)
  }
}

function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

module.exports = { getDb, getDbPath, seedDefaultUser, closeDb }
