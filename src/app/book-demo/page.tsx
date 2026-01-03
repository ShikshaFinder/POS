"use client"

import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2 } from "lucide-react"
import { sendToWhatsApp } from "@/lib/whatsapp"
import { FormEvent, useState } from "react"

export default function BookDemoPage() {
    const [loading, setLoading] = useState(false)

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)

        // Extract form data
        const formData = new FormData(e.currentTarget)
        const data: Record<string, string> = {}
        formData.forEach((value, key) => {
            data[key] = value.toString()
        })

        // Send to WhatsApp
        sendToWhatsApp(data, "New Demo Request from Morphix Website:")
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Navbar />

            <main className="flex-grow flex flex-col md:flex-row">
                {/* Left Side - Content */}
                <div className="w-full md:w-1/2 bg-gray-50 p-12 lg:p-24 flex flex-col justify-center">
                    <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-display">
                        See Morphix in Action
                    </h1>
                    <p className="text-xl text-gray-600 mb-12">
                        Get a personalized walkthrough tailored to your team's specific data challenges.
                    </p>

                    <div className="space-y-8">
                        {[
                            { title: "30-minute expert session", desc: "No sales fluff. Deep dive into product capabilities." },
                            { title: "Live product walkthrough", desc: "See how we handle your specific file formats." },
                            { title: "Custom use case discussion", desc: "We'll build a transformation plan for your needs." },
                            { title: "Q&A with data engineers", desc: "Technical deep dive into security and API integration." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                                    <p className="text-gray-500">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <p className="italic text-gray-600 text-lg">
                            "The demo showed us exactly how Morphix could reduce our onboarding time from weeks to minutes. It was a no-brainer."
                        </p>
                        <div className="mt-4 font-semibold text-gray-900">— Sarah Chen, VP of Data at FinTech Co.</div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-12 lg:p-24 flex flex-col justify-center">
                    <div className="max-w-md mx-auto w-full">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input name="firstName" id="firstName" placeholder="John" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input name="lastName" id="lastName" placeholder="Doe" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Work Email</Label>
                                <Input name="email" id="email" type="email" placeholder="john@company.com" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company">Company Name</Label>
                                <Input name="company" id="company" placeholder="Acme Inc." required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="size">Company Size</Label>
                                <select name="size" id="size" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                    <option value="">Select...</option>
                                    <option value="1-50">1-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201-1000">201-1,000 employees</option>
                                    <option value="1000+">1,000+ employees</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="usecase">Primary Use Case</Label>
                                <textarea
                                    name="usecase"
                                    id="usecase"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="e.g. Migrating customer data from Excel to Salesforce..."
                                />
                            </div>

                            <Button type="submit" className="w-full h-12 text-lg" variant="gradient" disabled={loading}>
                                {loading ? "Opening WhatsApp..." : "Book Demo"}
                            </Button>

                            <p className="text-xs text-center text-gray-400">
                                By submitting, you agree to our Privacy Policy.
                            </p>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    )
}
