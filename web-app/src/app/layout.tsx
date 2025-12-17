import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const cairo = Cairo({ subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
    title: "لوحة تحكم المقهى الذكية",
    description: "مراقبة متقدمة وتحليلات الذكاء الاصطناعي",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ar" dir="rtl" className="dark">
            <body className={cairo.className}>
                <div className="flex h-screen overflow-hidden">
                    <aside className="w-64 border-l bg-background hidden md:block">
                        <Sidebar />
                    </aside>
                    <main className="flex-1 overflow-y-auto bg-background">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
