"use client"

import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/ui/footer"
import { Users, Building2, Wallet, ShoppingBag, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function SolutionsPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />

            <main className="flex-grow pt-20 pb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-6 font-display">
                            Solutions for Every Industry
                        </h1>
                        <p className="text-xl text-gray-500">
                            See how Morphix standardizes messy data flows across different sectors and departments.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            {
                                title: "CRM Data Import",
                                desc: "Stop manually cleaning lead lists. Automatically standardize names, emails, and company fields before importing to Salesforce or HubSpot.",
                                icon: Users,
                                color: "bg-blue-100 text-blue-600",
                                tags: ["Salesforce", "HubSpot", "Pipedrive"]
                            },
                            {
                                title: "ERP Migrations",
                                desc: "Migrating legacy systems? Map 10,000+ columns from old mainframes to modern cloud ERPs with AI-assisted schema mapping.",
                                icon: Building2,
                                color: "bg-purple-100 text-purple-600",
                                tags: ["SAP", "NetSuite", "Oracle"]
                            },
                            {
                                title: "Financial Reconciliation",
                                desc: "Consolidate invoices, expense reports, and bank statements from different formats into a single unified ledger format.",
                                icon: Wallet,
                                color: "bg-green-100 text-green-600",
                                tags: ["QuickBooks", "Xero", "Excel"]
                            },
                            {
                                title: "E-commerce Catalog",
                                desc: "Standardize product data from thousands of suppliers. Normalize attributes, categories, and image links instantly.",
                                icon: ShoppingBag,
                                color: "bg-orange-100 text-orange-600",
                                tags: ["Shopify", "Magento", "Amazon"]
                            }
                        ].map((sol, i) => (
                            <Card key={i} className="p-8 hover:shadow-lg transition-shadow border-gray-100">
                                <div className={`w-14 h-14 rounded-xl ${sol.color} flex items-center justify-center mb-6`}>
                                    <sol.icon className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">{sol.title}</h3>
                                <p className="text-gray-500 mb-6 text-lg">{sol.desc}</p>

                                <div className="flex flex-wrap gap-2 mb-6">
                                    {sol.tags.map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-gray-50 text-gray-600 text-sm font-medium rounded-full border">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <Button variant="ghost" className="p-0 h-auto font-semibold text-primary hover:bg-transparent hover:text-primary/80 group">
                                    Learn more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Card>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-24 text-center bg-gray-50 rounded-2xl p-12 lg:p-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">Don't see your use case?</h2>
                        <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
                            Our AI is agnostic to data types. If it's structured data (rows and columns), we can transform it.
                        </p>
                        <Button size="lg" variant="default" onClick={() => {
                            const url = `https://wa.me/15551234567?text=${encodeURIComponent("I'd like to discuss a custom use case for Morphix.")}`
                            window.open(url, "_blank")
                        }}>
                            Discuss Your Use Case
                        </Button>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
