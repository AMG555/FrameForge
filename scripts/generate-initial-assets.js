/**
 * Generate Initial Asset Library
 *
 * Generates a starter set of composable assets. Characters are generic/neutral
 * so they work for any topic — not locked to any historical period or style.
 * Customise ASSET_DEFINITIONS before running for your project.
 *
 * Total: ~47 composable assets
 *
 * Usage:
 *   node scripts/generate-initial-assets.js [--dry-run]
 */

const { AssetLibrary } = require('../src/asset-library/asset-library');

// Asset definitions — edit these to match your project's visual identity.
const ASSET_DEFINITIONS = {
  characters: [
    {
      id: 'narrator',
      description: 'Friendly narrator figure, simple flat-design illustration, neutral modern clothing',
      poses: ['standing', 'running', 'sitting', 'jumping'],
      emotions: ['neutral', 'happy', 'angry', 'sad', 'surprised', 'determined']
    },
    {
      id: 'expert',
      description: 'Professional expert figure, smart casual clothing, confident posture, simple flat-design illustration',
      poses: ['standing', 'running', 'sitting', 'jumping'],
      emotions: ['neutral', 'happy', 'angry', 'sad', 'surprised', 'relaxed']
    }
  ],
  
  props: [
    { id: 'spear', description: 'Stone-tipped wooden spear' },
    { id: 'phone', description: 'Modern smartphone with glowing screen' },
    { id: 'fire', description: 'Campfire with orange flames' },
    { id: 'wheel', description: 'Simple wooden wheel' },
    { id: 'car', description: 'Modern car (side view)' },
    { id: 'meat', description: 'Raw meat on bone' },
    { id: 'burger', description: 'Fast food hamburger' },
    { id: 'cave_painting', description: 'Primitive cave wall art' },
    { id: 'laptop', description: 'Modern laptop computer' },
    { id: 'club', description: 'Wooden club weapon' },
    { id: 'credit_card', description: 'Plastic credit card' },
    { id: 'mammoth', description: 'Woolly mammoth (cartoon)' },
    { id: 'clock', description: 'Modern analog clock' },
    { id: 'sun', description: 'Simple sun icon' },
    { id: 'moon', description: 'Crescent moon icon' }
  ],
  
  backgrounds: [
    { id: 'forest', description: 'Dense prehistoric forest with tall trees' },
    { id: 'cave', description: 'Dark cave entrance with rocky walls' },
    { id: 'city', description: 'Modern city skyline with tall buildings' },
    { id: 'savanna', description: 'African savanna with grass plains' },
    { id: 'office', description: 'Modern office cubicle workspace' },
    { id: 'mountain', description: 'Rocky mountain landscape' },
    { id: 'beach', description: 'Sandy beach with ocean waves' },
    { id: 'night', description: 'Night sky with stars' },
    { id: 'desert', description: 'Sandy desert with dunes' },
    { id: 'village', description: 'Primitive tribal village with huts' }
  ],
  
  effects: [
    { id: 'arrow', description: 'Curved arrow pointer (SVG)' },
    { id: 'question', description: 'Question mark icon (SVG)' },
    { id: 'exclamation', description: 'Exclamation mark icon (SVG)' },
    { id: 'vs', description: 'VS text (versus symbol, SVG)' },
    { id: 'sparkle', description: 'Sparkle/star effect (SVG)' },
    { id: 'lightning', description: 'Lightning bolt (SVG)' },
    { id: 'heart', description: 'Heart icon (SVG)' },
    { id: 'skull', description: 'Skull danger icon (SVG)' },
    { id: 'checkmark', description: 'Checkmark icon (SVG)' },
    { id: 'x_mark', description: 'X mark / cross (SVG)' }
  ]
};

async function generateAssets(dryRun = false) {
  console.log('🎨 Generating Initial Asset Library\n');
  console.log('='.repeat(60));
  
  const library = new AssetLibrary();
  await library.initialize();
  
  let totalGenerated = 0;
  let totalSkipped = 0;
  
  // Generate character identities
  console.log('\n👤 CHARACTER IDENTITIES');
  console.log('-'.repeat(60));
  
  for (const char of ASSET_DEFINITIONS.characters) {
    const query = {
      asset_type: 'character_identity',
      character_id: char.id
    };
    
    const existing = await library.findAsset(query);
    
    if (existing) {
      console.log(`⏭️  Skipping ${char.id} (already exists)`);
      totalSkipped++;
    } else {
      console.log(`🎨 Generating ${char.id}...`);
      
      if (!dryRun) {
        try {
          await library.generateAsset({
            asset_type: 'character_identity',
            character_id: char.id,
            visual_description: char.description
          });
          totalGenerated++;
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      } else {
        console.log(`   [DRY RUN] Would generate: ${char.description}`);
        totalGenerated++;
      }
    }
  }
  
  // Generate poses
  console.log('\n🏃 POSES');
  console.log('-'.repeat(60));
  
  for (const char of ASSET_DEFINITIONS.characters) {
    for (const pose of char.poses) {
      const query = {
        asset_type: 'pose',
        character_id: char.id,
        pose: pose
      };
      
      const existing = await library.findAsset(query);
      
      if (existing) {
        console.log(`⏭️  Skipping ${char.id}/${pose} (already exists)`);
        totalSkipped++;
      } else {
        console.log(`🎨 Generating ${char.id}/${pose}...`);
        
        if (!dryRun) {
          try {
            await library.generateAsset({
              asset_type: 'pose',
              character_id: char.id,
              pose: pose,
              visual_description: `${char.description}, ${pose} pose`
            });
            totalGenerated++;
          } catch (error) {
            console.error(`   ❌ Failed: ${error.message}`);
          }
        } else {
          console.log(`   [DRY RUN] Would generate: ${char.description}, ${pose} pose`);
          totalGenerated++;
        }
      }
    }
  }
  
  // Generate emotions
  console.log('\n😀 EMOTIONS');
  console.log('-'.repeat(60));
  
  for (const char of ASSET_DEFINITIONS.characters) {
    for (const emotion of char.emotions) {
      const query = {
        asset_type: 'emotion',
        character_id: char.id,
        emotion: emotion
      };
      
      const existing = await library.findAsset(query);
      
      if (existing) {
        console.log(`⏭️  Skipping ${char.id}/${emotion} (already exists)`);
        totalSkipped++;
      } else {
        console.log(`🎨 Generating ${char.id}/${emotion}...`);
        
        if (!dryRun) {
          try {
            await library.generateAsset({
              asset_type: 'emotion',
              character_id: char.id,
              emotion: emotion,
              visual_description: `Face with ${emotion} expression, close-up`
            });
            totalGenerated++;
          } catch (error) {
            console.error(`   ❌ Failed: ${error.message}`);
          }
        } else {
          console.log(`   [DRY RUN] Would generate: Face with ${emotion} expression`);
          totalGenerated++;
        }
      }
    }
  }
  
  // Generate props
  console.log('\n🔧 PROPS');
  console.log('-'.repeat(60));
  
  for (const prop of ASSET_DEFINITIONS.props) {
    const query = {
      asset_type: 'prop',
      character_id: prop.id
    };
    
    const existing = await library.findAsset(query);
    
    if (existing) {
      console.log(`⏭️  Skipping ${prop.id} (already exists)`);
      totalSkipped++;
    } else {
      console.log(`🎨 Generating ${prop.id}...`);
      
      if (!dryRun) {
        try {
          await library.generateAsset({
            asset_type: 'prop',
            character_id: prop.id,
            visual_description: prop.description
          });
          totalGenerated++;
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      } else {
        console.log(`   [DRY RUN] Would generate: ${prop.description}`);
        totalGenerated++;
      }
    }
  }
  
  // Generate backgrounds
  console.log('\n🏞️  BACKGROUNDS');
  console.log('-'.repeat(60));
  
  for (const bg of ASSET_DEFINITIONS.backgrounds) {
    const query = {
      asset_type: 'background',
      character_id: bg.id
    };
    
    const existing = await library.findAsset(query);
    
    if (existing) {
      console.log(`⏭️  Skipping ${bg.id} (already exists)`);
      totalSkipped++;
    } else {
      console.log(`🎨 Generating ${bg.id}...`);
      
      if (!dryRun) {
        try {
          await library.generateAsset({
            asset_type: 'background',
            character_id: bg.id,
            visual_description: bg.description
          });
          totalGenerated++;
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      } else {
        console.log(`   [DRY RUN] Would generate: ${bg.description}`);
        totalGenerated++;
      }
    }
  }
  
  // Generate effects
  console.log('\n✨ EFFECTS');
  console.log('-'.repeat(60));
  
  for (const effect of ASSET_DEFINITIONS.effects) {
    const query = {
      asset_type: 'effect',
      character_id: effect.id
    };
    
    const existing = await library.findAsset(query);
    
    if (existing) {
      console.log(`⏭️  Skipping ${effect.id} (already exists)`);
      totalSkipped++;
    } else {
      console.log(`🎨 Generating ${effect.id}...`);
      
      if (!dryRun) {
        try {
          await library.generateAsset({
            asset_type: 'effect',
            character_id: effect.id,
            visual_description: effect.description
          });
          totalGenerated++;
        } catch (error) {
          console.error(`   ❌ Failed: ${error.message}`);
        }
      } else {
        console.log(`   [DRY RUN] Would generate: ${effect.description}`);
        totalGenerated++;
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 GENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Assets generated: ${totalGenerated}`);
  console.log(`Assets skipped: ${totalSkipped}`);
  console.log(`Total assets: ${totalGenerated + totalSkipped}`);
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No assets were actually generated');
  }
  
  console.log('\n✅ Asset generation complete!\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

if (dryRun) {
  console.log('🔍 Running in DRY RUN mode\n');
}

// Run generation
generateAssets(dryRun)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Generation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
