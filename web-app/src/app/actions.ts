"use server"

import { getConfig, saveConfig, SystemConfig } from "@/lib/config";
import { clearDataCache } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateSystemConfig(config: SystemConfig) {
    try {
        // Save the new configuration
        await saveConfig(config);
        
        // Clear the data cache so new data source is used
        clearDataCache();
        
        // Revalidate all pages to reflect the new data source
        revalidatePath('/', 'layout');
        
        return { success: true };
    } catch (error) {
        console.error('Failed to update system config:', error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

export async function getSystemConfig() {
    return await getConfig();
}
