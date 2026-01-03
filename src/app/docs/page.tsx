"use client"

import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/ui/footer"
import { Search, Book, Zap, FileText, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            <Navbar />

            <main className="flex-grow">
                {/* Docs Header */}
                <div className="bg-gray-50 border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Documentation</h1>
                        <p className="text-lg text-gray-500 mb-8 max-w-3xl">
                            Everything you need to integrate Morphix into your data pipelines.
                        </p>
                        <div className="relative max-w-2xl">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <Input
                                placeholder="Search documentation..."
                                className="pl-10 h-12 bg-white shadow-sm border-gray-300 text-lg"
                            />
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-12">
                    {/* Sidebar */}
                    <aside className="w-full md:w-64 flex-shrink-0">
                        <nav className="space-y-8 sticky top-24">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-4 px-2">Getting Started</h4>
                                <ul className="space-y-1">
                                    <li><a href="#" className="block px-2 py-1.5 text-primary bg-primary/5 font-medium rounded-md">Overview</a></li>
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Quick Start</a></li>
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">First Transform</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-4 px-2">Core Concepts</h4>
                                <ul className="space-y-1">
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Schemas & Mapping</a></li>
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Validation Rules</a></li>
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Transform Plans</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-4 px-2">API Reference</h4>
                                <ul className="space-y-1">
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Authentication</a></li>
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Endpoints</a></li>
                                    <li><a href="#" className="block px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md">Errors</a></li>
                                </ul>
                            </div>
                        </nav>
                    </aside>

                    {/* Content Content - Mockup */}
                    <div className="flex-grow max-w-4xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                            <div className="border rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer">
                                <Book className="w-8 h-8 text-purple-600 mb-4" />
                                <h3 className="font-bold text-gray-900 mb-2">Getting Started</h3>
                                <p className="text-gray-500 text-sm">5 minute setup guide to your first transformation.</p>
                            </div>
                            <div className="border rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer">
                                <Zap className="w-8 h-8 text-orange-500 mb-4" />
                                <h3 className="font-bold text-gray-900 mb-2">API Reference</h3>
                                <p className="text-gray-500 text-sm">Complete API documentation with examples.</p>
                            </div>
                            <div className="border rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer">
                                <FileText className="w-8 h-8 text-green-500 mb-4" />
                                <h3 className="font-bold text-gray-900 mb-2">Guides</h3>
                                <p className="text-gray-500 text-sm">Step-by-step tutorials for common use cases.</p>
                            </div>
                        </div>

                        <div className="prose prose-purple max-w-none">
                            <h2>Welcome to Morphix</h2>
                            <p>Morphix is the AI-powered data transformation engine for enterprises. This documentation will help you integrate Morphix into your existing data pipelines.</p>

                            <h3>Quick Start</h3>
                            <p>Transform your first file using cURL:</p>

                            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <span className="text-purple-400">curl</span> -X POST https://api.morphix.io/v1/transform \<br />
                                &nbsp;&nbsp;-H <span className="text-green-400">"Authorization: Bearer YOUR_API_KEY"</span> \<br />
                                &nbsp;&nbsp;-F <span className="text-green-400">"file=@data.xlsx"</span>
                            </div>

                            <h3 className="mt-8">Next Steps</h3>
                            <ul className="space-y-2 list-none pl-0">
                                {['Define your target schema', 'Configure transformation rules', 'Set up webhooks'].map(item => (
                                    <li key={item} className="flex items-center gap-2 text-primary hover:underline cursor-pointer">
                                        <ChevronRight className="w-4 h-4" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
