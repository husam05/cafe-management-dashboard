"use server"

import { getConfig, saveConfig, SystemConfig } from "@/lib/config";
import { clearDataCache } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateSystemConfig(config: SystemConfig) {
    // Save the new configuration
    await saveConfig(config);
    
    // Clear the data cache so new data source is used
    clearDataCache();
    
    // Revalidate all pages to reflect the new data source
    revalidatePath('/', 'layout');
    
    return { success: true };
}

export async function getSystemConfig() {
    return await getConfig();
}
