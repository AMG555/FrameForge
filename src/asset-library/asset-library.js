/**
 * Asset Library - Composable Asset Management System
 * 
 * Manages reusable visual assets with consistent style for video production.
 * Uses composable character system: identity + pose + emotion
 * 
 * Architecture:
 * - Metadata filtering (primary): Fast PostgreSQL lookup
 * - Semantic search (fallback): Embedding similarity if no metadata match
 * - Generation: Procedural SVG / local visual composition
 */

const fs     = require('fs').promises;
const fsSync = require('fs');
const path   = require('path');
const crypto = require('crypto');
const https  = require('https');
const http   = require('http');

class AssetLibrary {
  constructor(config = {}) {
    this.assetsDir = config.assetsDir || path.join(__dirname, '../../assets');
    this.metadataFile = path.join(this.assetsDir, 'metadata', 'assets.json');
    this.embeddingsFile = path.join(this.assetsDir, 'metadata', 'embeddings.json');
    
    this.assets = new Map();
    this.embeddings = new Map();
    this.initialized = false;
    
    // Style parameters for consistency
    this.styleParams = {
      ink_style: 'clean_line',
      color_palette: ['#000000', '#FFFFFF', '#8B4513', '#D2691E'],
      line_weight: 3,
      resolution: '1920x1080'
    };
    
    // Semantic similarity threshold
    this.similarityThreshold = config.similarityThreshold || 0.85;
    
    // Asset generation timeout
    this.generationTimeout = config.generationTimeout || 180000; // 3 minutes
  }

  /**
   * Initialize asset library - Load registry from disk
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🎨 Initializing Asset Library...');
    const startTime = Date.now();
    
    try {
      // Ensure directories exist
      await this._ensureDirectories();
      
      // Load asset registry
      await this._loadAssetRegistry();
      
      // Load embeddings cache
      await this._loadEmbeddings();
      
      const loadTime = Date.now() - startTime;
      
      if (loadTime > 10000) {
        console.warn(`⚠️  Asset library loaded in ${loadTime}ms (>10s threshold)`);
      } else {
        console.log(`✅ Asset library loaded: ${this.assets.size} assets in ${loadTime}ms`);
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize asset library:', error.message);
      throw error;
    }
  }

  /**
   * Find asset by query (metadata filtering + semantic fallback)
   * 
   * @param {Object} query - Asset query
   * @param {string} query.asset_type - 'character_identity', 'pose', 'emotion', 'prop', 'background', 'effect'
   * @param {string} [query.character_id] - Character identifier
   * @param {string} [query.pose] - Pose variant
   * @param {string} [query.emotion] - Emotion overlay
   * @param {string} [query.visual_description] - Fallback semantic search
   * @returns {Promise<Asset|null>}
   */
  async findAsset(query) {
    if (!this.initialized) await this.initialize();
    
    console.log('🔍 Finding asset:', query);
    
    // Step 1: Metadata filtering (primary)
    const metadataMatches = this._filterByMetadata(query);
    
    if (metadataMatches.length > 0) {
      console.log(`✅ Found ${metadataMatches.length} metadata match(es)`);
      return metadataMatches[0]; // Return best match
    }
    
    // Step 2: Semantic search (fallback)
    if (query.visual_description) {
      console.log('🔍 Trying semantic fallback...');
      const semanticMatch = await this._semanticSearch(query.visual_description);

      // _semanticSearch returns the asset directly (not a {similarity, asset} wrapper)
      if (semanticMatch) {
        console.log(`✅ Found semantic match`);
        return semanticMatch;
      }
    }
    
    console.log('❌ No matching asset found');
    return null;
  }

  /**
   * Generate new asset with style consistency
   * 
   * @param {Object} description - Asset description
   * @param {string} description.asset_type
   * @param {string} description.character_id
   * @param {string} description.visual_description
   * @param {string} [description.pose]
   * @param {string} [description.emotion]
   * @returns {Promise<Asset>}
   */
  async generateAsset(description) {
    if (!this.initialized) await this.initialize();
    
    console.log('🎨 Generating new asset:', description.visual_description);
    
    const maxAttempts = 3;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < maxAttempts) {
      attempt++;
      
      try {
        console.log(`   Attempt ${attempt}/${maxAttempts}...`);
        
        // Build generation prompt with style parameters
        const prompt = this._buildGenerationPrompt(description);
        
        // Generate via Pollinations
        const imageUrl = await this._callPollinationsAPI(prompt, description);
        
        // Download and save asset
        const filePath = await this._downloadAsset(imageUrl, description);
        
        // Create asset metadata
        const asset = {
          asset_id: this._generateAssetId(description),
          asset_type: description.asset_type,
          character_id: description.character_id || null,
          pose: description.pose || null,
          emotion: description.emotion || null,
          visual_description: description.visual_description,
          file_path: filePath,
          style_parameters: this.styleParams,
          metadata: {
            creation_date: new Date().toISOString(),
            usage_count: 0,
            variants: []
          },
          schema_version: '1.0.0'
        };
        
        // Validate style consistency
        const validation = await this.validateAsset(asset);
        if (!validation.valid) {
          throw new Error(`Style validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Save to registry
        await this._saveAsset(asset);
        
        console.log(`✅ Asset generated: ${asset.asset_id}`);
        return asset;
        
      } catch (error) {
        lastError = error;
        console.error(`   ❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          await this._sleep(2000); // Wait 2s before retry
        }
      }
    }
    
    throw new Error(`Asset generation failed after ${maxAttempts} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Compose character from identity + pose + emotion layers
   * 
   * @param {string} characterId - Character identifier
   * @param {string} pose - Pose variant
   * @param {string} emotion - Emotion overlay
   * @returns {Promise<string>} - Path to composed image
   */
  async composeCharacter(characterId, pose, emotion) {
    if (!this.initialized) await this.initialize();

    console.log(`🎭 Composing character: ${characterId} / ${pose} / ${emotion}`);

    const identity = await this.findAsset({ asset_type: 'character_identity', character_id: characterId });
    const poseAsset = await this.findAsset({ asset_type: 'pose', character_id: characterId, pose });
    const emotionAsset = await this.findAsset({ asset_type: 'emotion', character_id: characterId, emotion });

    if (!identity || !poseAsset) {
      throw new Error(`Missing base components for ${characterId}/${pose}/${emotion}`);
    }

    const outputPath = path.join(this.assetsDir, 'composed', `${characterId}_${pose}_${emotion}.png`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // If output already exists (cache hit), return immediately
    try {
      await fs.access(outputPath);
      console.log(`   ✅ Using cached composition: ${outputPath}`);
      return outputPath;
    } catch { /* not cached — compose */ }

    // Try FFmpeg overlay composition (identity base + pose overlay + optional emotion overlay)
    const { spawnSync } = require('child_process');
    const layers = [identity.file_path, poseAsset.file_path];
    if (emotionAsset) layers.push(emotionAsset.file_path);

    // Build FFmpeg filter: stack overlays with overlay=0:0, alpha blending
    const inputs = layers.flatMap(p => ['-i', p]);
    let filterComplex, mapArg;
    if (layers.length === 3) {
      filterComplex = '[0:v][1:v]overlay=0:0[tmp];[tmp][2:v]overlay=0:0[out]';
      mapArg = '[out]';
    } else {
      filterComplex = '[0:v][1:v]overlay=0:0[out]';
      mapArg = '[out]';
    }

    const ffmpegResult = spawnSync('ffmpeg', [
      '-nostdin', '-y',
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', mapArg,
      '-frames:v', '1',
      outputPath,
    ], { timeout: 30000, encoding: 'utf8' });

    if (ffmpegResult.status === 0 && fsSync.existsSync(outputPath)) {
      console.log(`   ✅ FFmpeg composition complete: ${outputPath}`);
      return outputPath;
    }

    // FFmpeg unavailable or failed — fall back to pose-only asset
    console.warn(`   ⚠️  FFmpeg composition failed (${ffmpegResult.stderr?.slice(0, 120)}), using pose asset`);
    return poseAsset.file_path;
  }

  /**
   * Validate asset style consistency
   * 
   * @param {Asset} asset - Asset to validate
   * @returns {Promise<ValidationResult>}
   */
  async validateAsset(asset) {
    const errors = [];
    
    // Check file exists
    try {
      await fs.access(asset.file_path);
    } catch {
      errors.push('File does not exist');
    }
    
    // Check style parameters match
    if (!asset.style_parameters) {
      errors.push('Missing style parameters');
    } else {
      if (asset.style_parameters.ink_style !== this.styleParams.ink_style) {
        errors.push(`Ink style mismatch: expected ${this.styleParams.ink_style}`);
      }
      
      if (asset.style_parameters.line_weight < 2 || asset.style_parameters.line_weight > 4) {
        errors.push('Line weight out of range (2-4)');
      }
      
      if (asset.style_parameters.resolution !== this.styleParams.resolution) {
        errors.push(`Resolution mismatch: expected ${this.styleParams.resolution}`);
      }
    }
    
    // Check schema version
    if (!asset.schema_version) {
      errors.push('Missing schema version');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * List assets by filter
   * 
   * @param {Object} filter - Filter criteria
   * @returns {Promise<Asset[]>}
   */
  async listAssets(filter = {}) {
    if (!this.initialized) await this.initialize();
    
    let results = Array.from(this.assets.values());
    
    if (filter.asset_type) {
      results = results.filter(a => a.asset_type === filter.asset_type);
    }
    
    if (filter.character_id) {
      results = results.filter(a => a.character_id === filter.character_id);
    }
    
    return results;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  async _ensureDirectories() {
    const dirs = [
      path.join(this.assetsDir, 'characters'),
      path.join(this.assetsDir, 'props'),
      path.join(this.assetsDir, 'backgrounds'),
      path.join(this.assetsDir, 'effects'),
      path.join(this.assetsDir, 'metadata'),
      path.join(this.assetsDir, 'composed')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async _loadAssetRegistry() {
    try {
      const content = await fs.readFile(this.metadataFile, 'utf8');
      const registry = JSON.parse(content);
      
      for (const asset of registry.assets || []) {
        this.assets.set(asset.asset_id, asset);
      }
      
      console.log(`   Loaded ${this.assets.size} assets from registry`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('   No existing registry, starting fresh');
        await this._saveRegistry();
      } else {
        throw error;
      }
    }
  }

  async _loadEmbeddings() {
    try {
      const content = await fs.readFile(this.embeddingsFile, 'utf8');
      const embeddings = JSON.parse(content);
      
      for (const [assetId, embedding] of Object.entries(embeddings)) {
        this.embeddings.set(assetId, embedding);
      }
      
      console.log(`   Loaded ${this.embeddings.size} embeddings`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('   No embeddings cache, will build on demand');
      } else {
        throw error;
      }
    }
  }

  _filterByMetadata(query) {
    const results = [];
    
    for (const asset of this.assets.values()) {
      let matches = true;
      
      if (query.asset_type && asset.asset_type !== query.asset_type) {
        matches = false;
      }
      
      if (query.character_id && asset.character_id !== query.character_id) {
        matches = false;
      }
      
      if (query.pose && asset.pose !== query.pose && asset.pose !== null) {
        matches = false;
      }
      
      if (query.emotion && asset.emotion !== query.emotion && asset.emotion !== null) {
        matches = false;
      }
      
      if (matches) {
        results.push(asset);
      }
    }
    
    return results;
  }

  async _semanticSearch(description) {
    // Keyword-based semantic search against visual_description fields in the registry.
    // No embedding API required — scores by term overlap.
    if (this.assets.size === 0) return null;

    const queryText = (
      description.visual_description || description.character_id || ''
    ).toLowerCase();

    if (!queryText) return null;

    const queryTerms = queryText
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);

    if (queryTerms.length === 0) return null;

    let bestAsset = null;
    let bestScore = 0;

    for (const asset of this.assets.values()) {
      // Skip type mismatch if asset_type is specified
      if (description.asset_type && asset.asset_type !== description.asset_type) continue;

      const corpus = [
        asset.visual_description || '',
        asset.asset_type || '',
        asset.character_id || '',
        asset.pose || '',
        asset.emotion || '',
        ...(asset.tags || []),
      ].join(' ').toLowerCase();

      const matchCount = queryTerms.filter(t => corpus.includes(t)).length;
      const score = matchCount / queryTerms.length;

      if (score > bestScore) {
        bestScore = score;
        bestAsset = asset;
      }
    }

    // Require at least 30% term overlap to be a meaningful match
    if (bestScore >= 0.3) {
      console.log(`   🔍 Semantic search match (score ${(bestScore * 100).toFixed(0)}%): ${bestAsset.asset_id}`);
      return bestAsset;
    }

    return null;
  }

  _buildGenerationPrompt(description) {
    const basePrompt = [
      description.visual_description,
      'Simple History style',
      'Ink Explainer style',
      'Educational whiteboard animation',
      'Thick black ink marker outlines',
      'Flat colors',
      'Pure white background',
      'Comic book illustration',
      'Clear silhouette',
      'Expressive cartoon face',
      'No photorealism',
      'No text',
      'No watermark'
    ];
    
    return basePrompt.join(', ');
  }

  async _callPollinationsAPI(prompt, description) {
    const model = process.env.POLLINATIONS_MODEL || 'flux';
    const seed  = this._generateSeed(description);

    const imageUrl = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt));
    imageUrl.searchParams.set('width',   '1920');
    imageUrl.searchParams.set('height',  '1080');
    imageUrl.searchParams.set('model',   model);
    imageUrl.searchParams.set('nologo',  'true');
    imageUrl.searchParams.set('seed',    seed.toString());

    console.log(`   Calling Pollinations API (${model}, seed: ${seed})...`);

    // Return just the URL string — generateAsset → _downloadAsset does the actual download.
    // Previously this called _downloadAsset itself which caused a double-download when
    // generateAsset also called _downloadAsset with the returned path.
    return imageUrl.toString();
  }

  async _downloadAsset(imageUrl, description) {
    // ── Determine output path ──────────────────────────────────────────────────
    let relativePath;
    if (description.asset_type === 'character_identity') {
      relativePath = `characters/${description.character_id}/identity_v1.png`;
    } else if (description.asset_type === 'pose') {
      relativePath = `characters/${description.character_id}/poses/${description.pose}.png`;
    } else if (description.asset_type === 'emotion') {
      relativePath = `characters/${description.character_id}/emotions/${description.emotion}.png`;
    } else if (description.asset_type === 'prop') {
      relativePath = `props/${description.character_id || 'generic'}.png`;
    } else if (description.asset_type === 'background') {
      relativePath = `backgrounds/${description.character_id || 'generic'}.png`;
    } else if (description.asset_type === 'effect') {
      relativePath = `effects/${description.character_id || 'generic'}.svg`;
    } else {
      relativePath = `generated/${Date.now()}.png`;
    }

    const fullPath = path.join(this.assetsDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // ── HTTP download with redirect following (max 5 hops) ───────────────────
    await this._httpDownload(imageUrl, fullPath, 5);

    return fullPath;
  }

  /**
   * Download a URL to disk, following up to maxRedirects redirects.
   * Works with both http:// and https:// URLs.
   * @private
   */
  _httpDownload(url, destPath, maxRedirects) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(url, {
        timeout: 120_000,
        headers: { 'User-Agent': 'FrameForge/1.1 (+https://github.com/frameforge)' },
      }, (res) => {
        // Follow redirects
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)
            && res.headers.location && maxRedirects > 0) {
          res.resume(); // drain response
          return this._httpDownload(res.headers.location, destPath, maxRedirects - 1)
            .then(resolve).catch(reject);
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} downloading asset from ${url}`));
        }

        const writeStream = fsSync.createWriteStream(destPath);
        res.pipe(writeStream);

        writeStream.on('finish', () => {
          writeStream.close();
          resolve(destPath);
        });
        writeStream.on('error', (err) => {
          fsSync.unlink(destPath, () => {}); // clean up partial file
          reject(err);
        });
        res.on('error', (err) => {
          writeStream.destroy();
          fsSync.unlink(destPath, () => {});
          reject(err);
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout downloading asset from ${url}`));
      });
    });
  }

  async _saveAsset(asset) {
    this.assets.set(asset.asset_id, asset);
    await this._saveRegistry();
  }

  async _saveRegistry() {
    const registry = {
      schema_version: '1.0.0',
      last_updated: new Date().toISOString(),
      assets: Array.from(this.assets.values())
    };

    // Atomic write: write to a temp file then rename so concurrent reads never
    // see a partial JSON file, and concurrent saves don't corrupt each other.
    const tmpPath = this.metadataFile + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(registry, null, 2), 'utf8');
    await fs.rename(tmpPath, this.metadataFile);
  }

  _generateAssetId(description) {
    // Deterministic ID based on content, not time — ensures idempotency so
    // re-generating the same asset description returns the same ID and doesn't
    // create duplicate registry entries.
    const parts = [
      description.character_id || 'generic',
      description.asset_type,
      description.pose || '',
      description.emotion || '',
    ];
    const base = parts.filter(Boolean).join('_');
    // Short hash of the visual_description for uniqueness within the same type/character
    const hash = require('crypto')
      .createHash('sha256')
      .update(description.visual_description || base)
      .digest('hex')
      .slice(0, 8);
    return `${base}_${hash}`;
  }

  _generateSeed(description) {
    const str = JSON.stringify(description);
    const hash = crypto.createHash('md5').update(str).digest('hex');
    return parseInt(hash.substring(0, 8), 16) % 100000;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { AssetLibrary };
