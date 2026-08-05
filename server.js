const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp')
const app = express();
const PORT = process.env.PORT || 3000;
const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data', 'products.json');
const uploadsDir = path.join(rootDir, 'uploads');
const adminPassword = process.env.ADMIN_PASSWORD || 'owner123';

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataFile)) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, '[]');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'brownes-admin-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
}));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(rootDir));

function readProducts() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeProducts(products) {
  fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
}
async function optimiseImage(file) {
  const filename = `${path.parse(file.filename).name}.webp`;
  const output = path.join(uploadsDir, filename);

  await sharp(file.path)
    .resize({
      width: 1200,
      withoutEnlargement: true
    })
    .webp({ quality: 80 })
    .toFile(output);

  fs.unlinkSync(file.path);

  return {
    name: file.originalname,
    path: `/uploads/${filename}`
  };
}
function requireOwner(req, res, next) {
  if (req.session && req.session.user === 'owner') {
    return next();
  }
  return res.status(401).json({ error: 'Owner access required.' });
}


app.get('/', (_req, res) => {
  res.sendFile(path.join(rootDir, 'brownes-of-naas.html'));
});

app.get('/api/products', (_req, res) => {
  const products = readProducts();
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const products = readProducts();
  const product = products.find(item => item.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'owner' && password === adminPassword) {
    req.session.user = 'owner';
    return res.json({ ok: true, message: 'Owner authenticated.' });
  }
  return res.status(401).json({ error: 'Incorrect login details.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ isOwner: Boolean(req.session && req.session.user === 'owner') });
});

app.post('/api/products', requireOwner, upload.array('images', 4), async (req, res) => {
  const products = readProducts();
  const title = String(req.body.title || '').trim();
  const tagline = String(req.body.tagline || '').trim();
  const price = String(req.body.price || '').trim();
  const description = String(req.body.description || '').trim();
  const features = String(req.body.features || '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  if (!title || !price || !description || !tagline) {
    return res.status(400).json({ error: 'Title, tagline, price and description are required.' });
  }

  const uploadedImages = [];

  for (const file of (req.files || [])) {
    uploadedImages.push(await optimiseImage(file));
  }

  const product = {
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    title,
    tagline,
    price,
    description,
    features,
    images: uploadedImages.length ? uploadedImages : [
      { name: 'placeholder-image', path: '/uploads/default-product.jpg' }
    ]
  };

  products.unshift(product);
  writeProducts(products);
  res.status(201).json({ ok: true, product });
});

app.put('/api/products/:id', requireOwner, upload.array('images', 4), async (req, res) => {
  const products = readProducts();
  const product = products.find(item => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  product.title = String(req.body.title || product.title).trim();
  product.tagline = String(req.body.tagline || product.tagline).trim();
  product.price = String(req.body.price || product.price).trim();
  product.description = String(req.body.description || product.description).trim();
  product.features = String(req.body.features || '')
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  if (req.files && req.files.length) {
    product.images = [];

    for (const file of req.files) {
      product.images.push(await optimiseImage(file));
    }
  }

  writeProducts(products);
  return res.json({ ok: true, product });
});

app.delete('/api/products/:id', requireOwner, (req, res) => {
  const products = readProducts();
  const index = products.findIndex(item => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products.splice(index, 1);
  writeProducts(products);
  return res.json({ ok: true, deletedId: req.params.id });
});

app.listen(PORT, () => {
  console.log(`Brownes storefront backend running at http://localhost:${PORT}`);
  console.log('Owner password is:', adminPassword);
});
