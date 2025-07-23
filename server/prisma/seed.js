const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('[SEED] Starting AnythingLLM database seeding...');
    
    // Verify Prisma client is properly initialized and can connect
    await prisma.$connect();
    console.log('[SEED] ✅ Database connection established');
    
    // Check if system_settings table exists and has data
    let existingSettings;
    try {
      existingSettings = await prisma.system_settings.findFirst();
    } catch (tableError) {
      console.log('[SEED] ⚠️  system_settings table not accessible, skipping seed:', tableError.message);
      
      // In production, don't crash the deployment
      if (process.env.NODE_ENV === 'production') {
        console.log('[SEED] Production mode: continuing without seeding');
        return;
      }
      throw tableError;
    }
    
    if (existingSettings) {
      console.log('[SEED] System already initialized, skipping seed data creation');
      return;
    }
    
    // Define seed data
    const settings = [
      { label: "multi_user_mode", value: "false" },
      { label: "logo_filename", value: "anything-llm.png" },
    ];

    console.log('[SEED] Creating initial system settings...');
    
    // Create settings with individual error handling
    for (let setting of settings) {
      try {
        const existing = await prisma.system_settings.findUnique({
          where: { label: setting.label },
        });

        // Only create the setting if it doesn't already exist
        if (!existing) {
          await prisma.system_settings.create({
            data: setting,
          });
          console.log(`[SEED] ✅ Created setting: ${setting.label}`);
        } else {
          console.log(`[SEED] Setting already exists: ${setting.label}`);
        }
      } catch (settingError) {
        console.error(`[SEED] ❌ Failed to create setting ${setting.label}:`, settingError.message);
        
        // In production, log error but continue
        if (process.env.NODE_ENV !== 'production') {
          throw settingError;
        }
      }
    }
    
    console.log('[SEED] ✅ Database seeding completed successfully');
    
  } catch (error) {
    console.error('[SEED] ❌ Error during seeding:', error.message);
    
    // In production, don't crash the entire deployment
    if (process.env.NODE_ENV === 'production') {
      console.log('[SEED] Production mode: continuing with deployment despite seed issues');
      return;
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('[SEED] ❌ Seed process failed:', e);
    
    // Only exit with error in development
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });
