import fs from 'fs/promises';
import path from 'path';

// Use environment variable or resolve path relative to workspace root
const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(process.cwd(), '..', 'system_config.json');

// Track config version for cache invalidation
let configVersion = 0;

export function getConfigVersion(): number {
    return configVersion;
}

export function incrementConfigVersion(): void {
    configVersion++;
}

export interface SystemConfig {
    dataSource: 'json' | 'mysql';
    mysql?: {
        host: string;
        user: string;
        password?: string;
        database: string;
    };
}

export async function getConfig(): Promise<SystemConfig> {
    // First check environment variable for data source
    const envDataSource = process.env.DATA_SOURCE;
    
    // If mysql is requested, verify DATABASE_URL exists
    if (envDataSource === 'mysql') {
        if (process.env.DATABASE_URL) {
            return { dataSource: 'mysql' };
        } else {
            // DATABASE_URL not set, fall back to JSON
            console.warn('DATA_SOURCE=mysql but DATABASE_URL not set, falling back to JSON');
            return { dataSource: 'json' };
        }
    }
    
    if (envDataSource === 'json') {
        return { dataSource: 'json' };
    }

    // Fall back to config file
    try {
        const content = await fs.readFile(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(content);
        
        // If config says mysql but no DATABASE_URL, fall back to JSON
        if (config.dataSource === 'mysql' && !process.env.DATABASE_URL) {
            console.warn('Config says mysql but DATABASE_URL not set, falling back to JSON');
            return { dataSource: 'json' };
        }
        
        return config;
    } catch (error) {
        // Log warning but don't crash - default to JSON
        console.warn('Config file not found, using default JSON data source');
        return { dataSource: 'json' };
    }
}

export async function saveConfig(config: SystemConfig) {
    // Check if running on Vercel (serverless environment)
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    
    if (isVercel) {
        throw new Error('Cannot save configuration on Vercel. Please set DATABASE_URL and DATA_SOURCE environment variables in Vercel Dashboard → Settings → Environment Variables.');
    }
    
    try {
        await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
        // Increment version to invalidate all caches
        incrementConfigVersion();
    } catch (error) {
        console.error('Failed to save config:', error);
        throw new Error('Unable to save configuration. Check file permissions.');
    }
}
