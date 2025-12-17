import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { clearDataCache } from '@/lib/db';
import { incrementConfigVersion } from '@/lib/config';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(req: Request) {
    try {
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

        // Validate file type
        const allowedTypes = ['application/json', 'text/csv', 'application/sql'];
        const allowedExtensions = ['.json', '.csv', '.sql'];
        
        const fileName = file.name.toLowerCase();
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
        if (fileName.endsWith('.json')) {
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
        let destinationPath: string;

        if (fileName.endsWith('.json')) {
            destinationPath = path.join(projectRoot, 'cafe_management.json');
        } else if (fileName.endsWith('.csv')) {
            destinationPath = path.join(projectRoot, 'cafe_management.csv');
        } else if (fileName.endsWith('.sql')) {
            destinationPath = path.join(projectRoot, 'cafe_management.sql');
        } else {
            destinationPath = path.join(projectRoot, file.name);
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
        await fs.writeFile(destinationPath, content, 'utf-8');

        // Clear cache and increment config version
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
            { error: 'Failed to upload file. Please try again.' },
            { status: 500 }
        );
    }
}

// Get current database file info
export async function GET() {
    try {
        const projectRoot = path.resolve(process.cwd(), '..');
        const jsonPath = path.join(projectRoot, 'cafe_management.json');

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
