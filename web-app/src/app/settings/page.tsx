"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Upload, FileJson, HardDrive, RefreshCw } from "lucide-react"
import { getSystemConfig, updateSystemConfig } from "@/app/actions"

interface FileInfo {
    exists: boolean;
    fileName?: string;
    fileSize?: number;
    lastModified?: string;
    tableCount?: number;
    recordCount?: number;
}

export default function SettingsPage() {
    const [dbType, setDbType] = useState("json")
    const [host, setHost] = useState("")
    const [user, setUser] = useState("")
    const [password, setPassword] = useState("")
    const [database, setDatabase] = useState("cafe_management")
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState("")
    const [isVercel, setIsVercel] = useState(false)
    const [hasEnvDatabaseUrl, setHasEnvDatabaseUrl] = useState(false)

    // File upload state
    const [uploading, setUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
    const [uploadMessage, setUploadMessage] = useState("")
    const [importMode, setImportMode] = useState<"replace" | "append">("replace")
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
    const [loadingFileInfo, setLoadingFileInfo] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch current database file info
    const fetchFileInfo = async () => {
        setLoadingFileInfo(true)
        try {
            const response = await fetch('/api/upload-database')
            if (response.ok) {
                const info = await response.json()
                setFileInfo(info)
            }
        } catch (e) {
            console.error('Failed to fetch file info:', e)
        } finally {
            setLoadingFileInfo(false)
        }
    }

    useEffect(() => {
        getSystemConfig().then((config: any) => {
            setDbType(config.dataSource)
            setIsVercel(config.isVercel || false)
            setHasEnvDatabaseUrl(config.hasEnvDatabaseUrl || false)
            if (config.mysql) {
                setHost(config.mysql.host)
                setUser(config.mysql.user)
                setDatabase(config.mysql.database)
            }
        })
        fetchFileInfo()
    }, [])

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadStatus("idle")
        setUploadMessage("")

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('type', file.name.split('.').pop() || 'json')
            formData.append('mode', importMode)

            const response = await fetch('/api/upload-database', {
                method: 'POST',
                body: formData
            })

            const result = await response.json()

            if (response.ok) {
                setUploadStatus("success")
                setUploadMessage(`تم رفع الملف بنجاح: ${result.fileName} | File uploaded successfully`)
                // Refresh file info
                fetchFileInfo()
            } else {
                setUploadStatus("error")
                const errorMessage = result.message
                    ? `${result.error}\n${result.message}${result.suggestion ? '\n' + result.suggestion : ''}`
                    : result.error || 'Upload failed'
                setUploadMessage(errorMessage)
            }
        } catch (e) {
            console.error('Upload error:', e)
            setUploadStatus("error")
            const errorMsg = e instanceof Error ? e.message : 'فشل في رفع الملف. يرجى المحاولة مرة أخرى. | Upload failed. Please try again.'
            setUploadMessage(errorMsg)
        } finally {
            setUploading(false)
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const handleSave = async () => {
        setStatus("idle")
        setErrorMessage("")

        if (dbType === "mysql" && !host) {
            setStatus("error")
            setErrorMessage("Host is required for MySQL connection")
            return
        }

        try {
            const result = await updateSystemConfig({
                dataSource: dbType as 'json' | 'mysql',
                mysql: dbType === 'mysql' ? { host, user, password, database } : undefined
            })

            if (result.success) {
                setStatus("success")
            } else {
                setStatus("error")
                setErrorMessage(result.error || "Failed to save configuration")
            }
        } catch (e) {
            console.error(e)
            setStatus("error")
            setErrorMessage(e instanceof Error ? e.message : "An unexpected error occurred")
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
            </div>

            {/* Vercel Environment Notice */}
            {isVercel && (
                <Alert className={hasEnvDatabaseUrl ? "border-green-500 bg-green-50" : "border-yellow-500 bg-yellow-50"}>
                    <AlertCircle className={`h-4 w-4 ${hasEnvDatabaseUrl ? "text-green-600" : "text-yellow-600"}`} />
                    <AlertTitle className={hasEnvDatabaseUrl ? "text-green-800" : "text-yellow-800"}>
                        {hasEnvDatabaseUrl ? "✅ متصل بقاعدة البيانات | Connected to Database" : "⚠️ بيئة Vercel | Vercel Environment"}
                    </AlertTitle>
                    <AlertDescription className={hasEnvDatabaseUrl ? "text-green-700" : "text-yellow-700"}>
                        {hasEnvDatabaseUrl ? (
                            "قاعدة البيانات متصلة عبر متغيرات البيئة. | Database connected via environment variables."
                        ) : (
                            <>
                                لا يمكن حفظ الإعدادات على Vercel. يجب ضبط متغيرات البيئة من لوحة تحكم Vercel.
                                <br />
                                Cannot save settings on Vercel. Set environment variables in Vercel Dashboard → Settings → Environment Variables:
                                <br />
                                <code className="bg-yellow-100 px-1 rounded text-sm">DATA_SOURCE=mysql</code>
                                <br />
                                <code className="bg-yellow-100 px-1 rounded text-sm">DATABASE_URL=mysql://hossam:password@db.lenteagency.com:3306/cafe_management</code>
                            </>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Database Connection</CardTitle>
                        <CardDescription>Configure the data source for the dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="source-type">Data Source</Label>
                            <Select value={dbType} onValueChange={setDbType} disabled={isVercel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="json">Local JSON File (Test/Offline)</SelectItem>
                                    <SelectItem value="mysql">Live Database (MySQL/MariaDB)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {dbType === "mysql" && (
                            <div className="space-y-4 border rounded-md p-4 bg-muted/50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="host">Host</Label>
                                        <Input id="host" placeholder="localhost" value={host} onChange={(e) => setHost(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="port">Port</Label>
                                        <Input id="port" placeholder="3306" defaultValue="3306" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="user">User</Label>
                                        <Input id="user" placeholder="root" value={user} onChange={(e) => setUser(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="database">Database Name</Label>
                                        <Input id="database" value={database} onChange={(e) => setDatabase(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>
                        )}

                        {status === "success" && (
                            <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <AlertTitle className="text-green-700 dark:text-green-300">تم الحفظ بنجاح</AlertTitle>
                                <AlertDescription className="text-green-600 dark:text-green-400">
                                    تم حفظ الإعدادات وتحديث مصدر البيانات. جميع الصفحات ستستخدم البيانات الجديدة الآن.
                                    <br />
                                    <span className="font-medium">Configuration saved! All pages will now use the new data source.</span>
                                </AlertDescription>
                            </Alert>
                        )}

                        {status === "error" && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>خطأ / Error</AlertTitle>
                                <AlertDescription>
                                    {errorMessage || "فشل في الحفظ. يرجى التحقق من الإعدادات. / Failed to save. Please check your settings."}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => window.location.reload()}>
                                تحديث الصفحة / Refresh
                            </Button>
                            <Button onClick={handleSave}>
                                {dbType === "mysql" ? "حفظ والاتصال / Save & Connect" : "حفظ الإعدادات / Save"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* File Upload Card */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            استيراد ذكي للبيانات / Smart Data Import
                        </CardTitle>
                        <CardDescription>
                            استيراد ملفات SQL (من phpMyAdmin) أو تحديث النظام
                            <br />
                            Import SQL dumps (from phpMyAdmin), JSON, or update system data
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Current File Info */}
                        {loadingFileInfo ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                جاري التحميل... / Loading...
                            </div>
                        ) : fileInfo?.exists ? (
                            <div className="border rounded-lg p-4 bg-muted/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileJson className="h-5 w-5 text-blue-500" />
                                    <span className="font-medium">الملف الحالي / Current File</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block">الاسم / Name</span>
                                        <span className="font-mono">{fileInfo.fileName}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">الحجم / Size</span>
                                        <span>{formatFileSize(fileInfo.fileSize || 0)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">الجداول / Tables</span>
                                        <span>{fileInfo.tableCount || 0}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">السجلات / Records</span>
                                        <span>{fileInfo.recordCount?.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                                {fileInfo.lastModified && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        آخر تعديل / Last Modified: {new Date(fileInfo.lastModified).toLocaleString('ar-EG')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-muted-foreground">
                                لم يتم العثور على ملف قاعدة بيانات / No database file found
                            </div>
                        )}

                        {/* Upload Area */}
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            <HardDrive className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                            <div className="mb-3">
                                <span className="block text-lg font-medium">سحب وإفلات أو اختر ملف SQL/JSON</span>
                                <span className="block text-sm text-muted-foreground">Drag & drop or choose SQL/JSON file</span>
                            </div>
                            <div className="flex justify-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,.csv,.sql"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="database-upload"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            جاري الرفع... / Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            اختر ملف / Browse Files
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                الصيغ المدعومة: JSON, CSV, SQL | الحد الأقصى: 50 ميغابايت
                                <br />
                                Supported formats: JSON, CSV, SQL | Max size: 50MB
                            </p>
                        </div>

                        {/* Import Mode Selection */}
                        <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-md border">
                            <div className="flex-1">
                                <Label className="text-base">وضع الاستيراد / Import Mode</Label>
                                <p className="text-xs text-muted-foreground">
                                    {importMode === 'replace'
                                        ? "استبدال كامل: يمسح البيانات الحالية ويستبدلها (مستحسن للنسخ الاحتياطي)"
                                        : "دمج/إضافة: ينفذ الملف فوق البيانات الحالية (للتحديثات الصغيرة)"}
                                </p>
                            </div>
                            <Select value={importMode} onValueChange={(v: "replace" | "append") => setImportMode(v)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="replace">استبدال (Replace)</SelectItem>
                                    <SelectItem value="append">إضافة (Append)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Upload Status */}
                        {uploadStatus === "success" && (
                            <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <AlertTitle className="text-green-700 dark:text-green-300">نجح الرفع / Upload Successful</AlertTitle>
                                <AlertDescription className="text-green-600 dark:text-green-400">
                                    {uploadMessage}
                                    <br />
                                    <span className="text-sm">تم تحديث الذاكرة المؤقتة. ستظهر البيانات الجديدة في جميع الصفحات.</span>
                                </AlertDescription>
                            </Alert>
                        )}

                        {uploadStatus === "error" && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>خطأ في الرفع / Upload Error</AlertTitle>
                                <AlertDescription>{uploadMessage}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
