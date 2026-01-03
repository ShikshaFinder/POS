"use client"

import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/ui/footer"
import { Check } from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Navbar />

            <main className="flex-grow pt-20 pb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4 font-display">
                            Enterprise Pricing
                        </h1>
                        <p className="text-xl text-gray-500">
                            Custom solutions tailored to your data volume and transformation complexity.
                        </p>
                    </div>

                    {/* Early Access Banner */}
                    <div className="max-w-4xl mx-auto mb-12 bg-gradient-to-r from-orange-100 to-purple-100 border border-purple-200 rounded-xl p-4 flex items-center justify-center gap-3">
                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">EARLY ACCESS</span>
                        <span className="text-sm font-medium text-gray-800">Priority onboarding and dedicated support for early enterprise partners until January 2026.</span>
                    </div>

                    {/* Pricing Card */}
                    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
                        <div className="p-8 text-center bg-gray-900 text-white">
                            <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
                            <div className="text-5xl font-bold mb-2 tracking-tight">Custom</div>
                            <p className="text-gray-400">Tailored to your requirements</p>
                        </div>
                        <div className="p-8">
                            <ul className="space-y-4 mb-8">
                                {[
                                    "Unlimited transformations",
                                    "Custom schema setup & mapping",
                                    "Dedicated Success Manager",
                                    "99.9% Uptime SLA",
                                    "On-premise deployment option",
                                    "Custom API integrations",
                                    "Priority feature requests",
                                    "Team training & onboarding"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start">
                                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                                        <span className="text-gray-600">{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link href="/book-demo">
                                <Button className="w-full h-12 text-lg" variant="gradient">
                                    Book a Consultation
                                </Button>
                            </Link>
                            <p className="text-xs text-center text-gray-400 mt-4">
                                No credit card required for consultation
                            </p>
                        </div>
                    </div>

                    {/* FAQ */}
                    <div className="max-w-3xl mx-auto mt-24">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
                        <div className="space-y-6">
                            {[
                                { q: "How is pricing calculated?", a: "Pricing is primarily based on monthly transformation volume (rows processed) and the complexity of your custom schema requirements." },
                                { q: "Do you offer on-premise deployment?", a: "Yes, for enterprise customers with strict compliance needs, we offer self-hosted execution agents that keep data within your VPC." },
                                { q: "Can I get a trial?", a: "We offer Paid Proof of Concepts (POCs) for enterprise teams to validate the solution before committing to a long-term contract." }
                            ].map((faq, i) => (
                                <div key={i} className="bg-white rounded-lg p-6 shadow-sm border">
                                    <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                                    <p className="text-gray-500">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
