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
    if (envDataSource === 'mysql' || envDataSource === 'json') {
        return { dataSource: envDataSource };
    }

    // Fall back to config file
    try {
        const content = await fs.readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        // Log warning but don't crash - default to JSON
        console.warn('Config file not found, using default JSON data source');
        return { dataSource: 'json' };
    }
}

export async function saveConfig(config: SystemConfig) {
    try {
        await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
        // Increment version to invalidate all caches
        incrementConfigVersion();
    } catch (error) {
        console.error('Failed to save config:', error);
        throw new Error('Unable to save configuration. Check file permissions.');
    }
}
