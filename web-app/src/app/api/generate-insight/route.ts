import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { loadData } from '@/lib/db';
import { 
    generateFullReport, 
    generateForecastReport, 
    generateAnomaliesReport, 
    generateRecommendationsReport 
} from '@/lib/ai-insights';
import {
    loadCsvData,
    generateCsvFullReport,
    generateCsvForecastReport,
    generateCsvAnomaliesReport,
    generateCsvRecommendationsReport
} from '@/lib/csv-ai-insights';

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// Rate limiting - simple in-memory store (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    
    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }
    
    if (record.count >= RATE_LIMIT) {
        return false;
    }
    
    record.count++;
    return true;
}

// Validate prompt input
function validatePrompt(prompt: unknown): string {
    if (typeof prompt !== 'string') {
        throw new Error('Invalid prompt type');
    }
    
    // Whitelist allowed prompt types
    const allowedPrompts = ['full_report', 'forecast_only', 'detect_anomalies', 'recommendations'];
    if (!allowedPrompts.includes(prompt)) {
        throw new Error('Invalid prompt value');
    }
    
    return prompt;
}

// Execute Python script securely using spawn (no shell)
function executePython(pythonPath: string, scriptPath: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(pythonPath, [scriptPath, ...args], {
            timeout: 30000, // 30 second timeout
        });
        
        let stdout = '';
        let stderr = '';
        const maxBuffer = 1024 * 1024; // 1MB max output
        
        childProcess.stdout.on('data', (data) => {
            if (stdout.length < maxBuffer) {
                stdout += data.toString();
            }
        });
        
        childProcess.stderr.on('data', (data) => {
            if (stderr.length < maxBuffer) {
                stderr += data.toString();
            }
        });
        
        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(`Python process exited with code ${code}: ${stderr}`));
            }
        });
        
        childProcess.on('error', (err) => {
            reject(err);
        });
    });
}

export async function POST(req: Request) {
    try {
        // Rate limiting
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
        if (!checkRateLimit(clientIp)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        
        // Validate and sanitize input
        const prompt = validatePrompt(body.prompt);

        // On Vercel, use CSV-based AI engine (richer data)
        if (isVercel) {
            console.log('Using CSV AI engine (Vercel environment)');
            
            // Try CSV data first (more comprehensive)
            const csvData = await loadCsvData();
            
            if (csvData && (csvData.orders.length > 0 || csvData.dailyReceipts.length > 0)) {
                console.log(`CSV loaded: ${csvData.orders.length} orders, ${csvData.dailyReceipts.length} receipts`);
                let result: string;
                
                switch (prompt) {
                    case 'full_report':
                        result = generateCsvFullReport(csvData);
                        break;
                    case 'forecast_only':
                        result = generateCsvForecastReport(csvData);
                        break;
                    case 'detect_anomalies':
                        result = generateCsvAnomaliesReport(csvData);
                        break;
                    case 'recommendations':
                        result = generateCsvRecommendationsReport(csvData);
                        break;
                    default:
                        result = generateCsvFullReport(csvData);
                }
                
                return NextResponse.json({ text: result });
            }
            
            // Fallback to JSON data
            console.log('Falling back to JSON data');
            const dbData = await loadData();
            let result: string;
            
            switch (prompt) {
                case 'full_report':
                    result = generateFullReport(dbData);
                    break;
                case 'forecast_only':
                    result = generateForecastReport(dbData);
                    break;
                case 'detect_anomalies':
                    result = generateAnomaliesReport(dbData);
                    break;
                case 'recommendations':
                    result = generateRecommendationsReport(dbData);
                    break;
                default:
                    result = generateFullReport(dbData);
            }
            
            return NextResponse.json({ text: result });
        }

        // Local development: Try CSV first, then Python, then JS fallback
        const csvData = await loadCsvData();
        if (csvData && (csvData.orders.length > 0 || csvData.dailyReceipts.length > 0)) {
            console.log(`Using CSV data: ${csvData.orders.length} orders`);
            let result: string;
            
            switch (prompt) {
                case 'full_report':
                    result = generateCsvFullReport(csvData);
                    break;
                case 'forecast_only':
                    result = generateCsvForecastReport(csvData);
                    break;
                case 'detect_anomalies':
                    result = generateCsvAnomaliesReport(csvData);
                    break;
                case 'recommendations':
                    result = generateCsvRecommendationsReport(csvData);
                    break;
                default:
                    result = generateCsvFullReport(csvData);
            }
            
            return NextResponse.json({ text: result });
        }
        
        // Fallback: Try Python
        const dbData = await loadData();
        const pythonPath = process.env.PYTHON_PATH || '/home/ai/miniconda3/envs/webai/bin/python';
        const scriptPath = path.join(process.cwd(), 'scripts/predict_custom.py');

        // Check if Python script exists
        let usePython = false;
        try {
            await fs.access(scriptPath);
            await fs.access(pythonPath);
            usePython = true;
        } catch {
            console.log('Python not available, using JavaScript AI engine');
        }

        if (usePython) {
            // Use secure temp directory with unique filename
            const tempDir = os.tmpdir();
            const tempFileName = `cafe_data_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.json`;
            const tempFilePath = path.join(tempDir, tempFileName);

            // Write data with restricted permissions
            await fs.writeFile(tempFilePath, JSON.stringify(dbData), { mode: 0o600 });

            try {
                // Execute Python securely using spawn (no shell injection possible)
                const { stdout, stderr } = await executePython(pythonPath, scriptPath, [prompt, tempFilePath]);

                if (stderr && stderr.trim().length > 0) {
                    console.warn("Python Stderr:", stderr);
                }

                return NextResponse.json({ text: stdout.trim() });
            } finally {
                // Always cleanup temp file
                await fs.unlink(tempFilePath).catch(() => { });
            }
        } else {
            // Fallback to JavaScript AI engine
            let result: string;
            
            switch (prompt) {
                case 'full_report':
                    result = generateFullReport(dbData);
                    break;
                case 'forecast_only':
                    result = generateForecastReport(dbData);
                    break;
                case 'detect_anomalies':
                    result = generateAnomaliesReport(dbData);
                    break;
                case 'recommendations':
                    result = generateRecommendationsReport(dbData);
                    break;
                default:
                    result = generateFullReport(dbData);
            }
            
            return NextResponse.json({ text: result });
        }
    } catch (error) {
        console.error('Error generating insight:', error);
        
        // Don't expose internal error details to client
        return NextResponse.json(
            { error: 'Failed to generate insights. Please try again.' },
            { status: 500 }
        );
    }
}
