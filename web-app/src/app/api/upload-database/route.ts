import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { clearDataCache } from '@/lib/db';
import { incrementConfigVersion } from '@/lib/config';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request) {
    try {
        // Check if running on Vercel (serverless environment)
        const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
        
        if (isVercel) {
            return NextResponse.json({
                error: 'File upload is not available in serverless deployment',
                message: 'Database files cannot be uploaded on Vercel. Please use the MySQL database connection instead.',
                suggestion: 'Go to Settings and configure MySQL connection to db.lenteagency.com'
            }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const fileType = formData.get('type') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 50MB.' },
                { status: 400 }
            );
        }

        const fileName = file.name.toLowerCase();
        const isSql = fileName.endsWith('.sql');
        const isJson = fileName.endsWith('.json');
        
        // Validate file type
        const allowedExtensions = ['.json', '.csv', '.sql'];
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
        
        if (!hasValidExtension) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: JSON, CSV, SQL' },
                { status: 400 }
            );
        }

        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const content = buffer.toString('utf-8');

        // Validate JSON structure if it's a JSON file
        if (isJson) {
            try {
                const jsonData = JSON.parse(content);
                
                // Check if it's a valid database export format
                const isValidFormat = (
                    // PHPMyAdmin format: array of tables
                    (Array.isArray(jsonData) && jsonData.some(item => item.type === 'table')) ||
                    // Direct format: object with table names as keys
                    (typeof jsonData === 'object' && !Array.isArray(jsonData) && (
                        jsonData.DailyReceipts || 
                        jsonData.Categories || 
                        jsonData.MenuItems ||
                        jsonData.OrderItems
                    ))
                );

                if (!isValidFormat) {
                    return NextResponse.json(
                        { error: 'Invalid JSON structure. Expected database export format.' },
                        { status: 400 }
                    );
                }
            } catch (e) {
                return NextResponse.json(
                    { error: 'Invalid JSON file. Could not parse.' },
                    { status: 400 }
                );
            }
        }

        // Determine destination path
        const projectRoot = path.resolve(process.cwd(), '..');
        let destinationPath = path.join(projectRoot, file.name);

        if (isJson) {
            destinationPath = path.join(projectRoot, 'cafe_management.json');
        } else if (fileName.endsWith('.csv')) {
            destinationPath = path.join(projectRoot, 'cafe_management.csv');
        } else if (isSql) {
            destinationPath = path.join(projectRoot, 'cafe_management.sql');
        }

        // Backup existing file if it exists
        try {
            const existingContent = await fs.readFile(destinationPath, 'utf-8');
            const backupPath = destinationPath + '.backup_' + Date.now();
            await fs.writeFile(backupPath, existingContent);
            console.log(`Backup created: ${backupPath}`);
        } catch (e) {
            // No existing file to backup
        }

        // Write new file
        await fs.writeFile(destinationPath, buffer); // Use buffer for SQL/all files to be safe

        // Logic for SQL Refresh
        if (isSql) {
            try {
                console.log('🔄 Starting Database Refresh Workflow...');
                
                // 1. Reset Database (Drop & Recreate) to prevent 'Table exists' errors
                const resetCmd = `docker exec -i cafe_db_local mysql -u root -proot -e "DROP DATABASE IF EXISTS cafe_management; CREATE DATABASE cafe_management;"`;
                console.log(`➡️ Resetting Database: ${resetCmd}`);
                await execAsync(resetCmd);

                // 2. Import SQL to Docker MySQL
                const importCmd = `docker exec -i cafe_db_local mysql -u root -proot cafe_management < "${destinationPath}"`;
                console.log(`➡️ Executing Import: ${importCmd}`);
                await execAsync(importCmd);
                console.log('✅ Import Successful');

                // 3. Sync to CSV
                const syncScript = path.join(process.cwd(), 'scripts', 'sync-db-to-csv.js');
                const syncCmd = `node "${syncScript}"`;
                console.log(`➡️ Executing Sync: ${syncCmd}`);
                const { stdout, stderr } = await execAsync(syncCmd);
                console.log('✅ Sync Output:', stdout);
                if (stderr) console.error('⚠️ Sync Stderr:', stderr);

                // Clear cache and increment version after successful refresh
                clearDataCache();
                incrementConfigVersion();

                return NextResponse.json({
                    success: true,
                    message: 'Database updated and synchronized successfully!',
                    fileName: file.name,
                    details: 'Imported to MySQL & Synced to CSV'
                });

            } catch (cmdError: any) {
                console.error('❌ Refresh Workflow Failed:', cmdError);
                return NextResponse.json({
                    error: `Database update failed: ${cmdError.message}`,
                    details: cmdError.toString()
                }, { status: 500 });
            }
        }

        // Generic cache clear for non-SQL files
        clearDataCache();
        incrementConfigVersion();

        // Get file stats for response
        const stats = await fs.stat(destinationPath);

        return NextResponse.json({
            success: true,
            message: 'Database file uploaded successfully',
            fileName: path.basename(destinationPath),
            fileSize: stats.size,
            uploadedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to upload file. Please try again.',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Get current database file info
export async function GET() {
    try {
        const projectRoot = path.resolve(process.cwd(), '..');
        const jsonPath = path.join(projectRoot, 'cafe_management.json');
        // We could also check CSV or SQL file stats here if needed, but keeping original logic for JSON info
        
        try {
            const stats = await fs.stat(jsonPath);
            const content = await fs.readFile(jsonPath, 'utf-8');
            const jsonData = JSON.parse(content);

            // Count records
            let recordCount = 0;
            let tableCount = 0;

            if (Array.isArray(jsonData)) {
                tableCount = jsonData.filter(item => item.type === 'table').length;
                jsonData.forEach(item => {
                    if (item.type === 'table' && Array.isArray(item.data)) {
                        recordCount += item.data.length;
                    }
                });
            } else if (typeof jsonData === 'object') {
                Object.keys(jsonData).forEach(key => {
                    if (Array.isArray(jsonData[key])) {
                        tableCount++;
                        recordCount += jsonData[key].length;
                    }
                });
            }

            return NextResponse.json({
                exists: true,
                fileName: 'cafe_management.json',
                fileSize: stats.size,
                lastModified: stats.mtime.toISOString(),
                tableCount,
                recordCount
            });
        } catch (e) {
            return NextResponse.json({
                exists: false,
                message: 'No database file found'
            });
        }
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to get file info' },
            { status: 500 }
        );
    }
}
