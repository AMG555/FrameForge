/**
 * Asset Library - Composable Asset Management System
 * 
 * Manages reusable visual assets with consistent style for video production.
 * Uses composable character system: identity + pose + emotion
 * 
 * Architecture:
 * - Metadata filtering (primary): Fast PostgreSQL lookup
 * - Semantic search (fallback): Embedding similarity if no metadata match
 * - Generation: Pollinations API with style consistency
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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
      
      if (semanticMatch && semanticMatch.similarity > this.similarityThreshold) {
        console.log(`✅ Found semantic match (similarity: ${semanticMatch.similarity.toFixed(3)})`);
        return semanticMatch.asset;
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
    
    // Find component assets
    const identity = await this.findAsset({
      asset_type: 'character_identity',
      character_id: characterId
    });
    
    const poseAsset = await this.findAsset({
      asset_type: 'pose',
      character_id: characterId,
      pose: pose
    });
    
    const emotionAsset = await this.findAsset({
      asset_type: 'emotion',
      character_id: characterId,
      emotion: emotion
    });
    
    if (!identity || !poseAsset || !emotionAsset) {
      throw new Error(`Missing components for ${characterId}/${pose}/${emotion}`);
    }
    
    // Compose layers using ImageMagick or sharp
    const outputPath = path.join(
      this.assetsDir,
      'composed',
      `${characterId}_${pose}_${emotion}.png`
    );
    
    // TODO: Implement actual image composition
    // For now, return pose asset as placeholder
    console.log(`   ⚠️  Composition not yet implemented, using pose asset`);
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
    // TODO: Implement actual semantic search with embeddings
    // For now, return null (no fallback)
    console.log('   ⚠️  Semantic search not yet implemented');
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
    const model = 'flux'; // or 'turbo' for faster generation
    const seed = this._generateSeed(description);
    
    const url = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt));
    url.searchParams.set('width', '1920');
    url.searchParams.set('height', '1080');
    url.searchParams.set('model', model);
    url.searchParams.set('nologo', 'true');
    url.searchParams.set('seed', seed.toString());
    
    console.log(`   Calling Pollinations API (${model}, seed: ${seed})...`);
    
    // In production, use actual HTTP fetch
    // For now, return the URL
    return url.toString();
  }

  async _downloadAsset(imageUrl, description) {
    // Determine file path based on asset type
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
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // TODO: Implement actual download
    console.log(`   ⚠️  Download not implemented, would save to: ${fullPath}`);
    
    return relativePath;
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
    
    await fs.writeFile(
      this.metadataFile,
      JSON.stringify(registry, null, 2),
      'utf8'
    );
  }

  _generateAssetId(description) {
    const parts = [
      description.character_id || 'generic',
      description.asset_type,
      description.pose || '',
      description.emotion || '',
      Date.now()
    ];
    
    return parts.filter(Boolean).join('_');
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
