"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                                M
                            </div>
                            <span className="font-bold text-xl tracking-tight">Morphix</span>
                        </Link>
                        <div className="hidden md:ml-10 md:flex md:space-x-8">
                            <Link href="/solutions" className="text-gray-500 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                Solutions
                            </Link>
                            <Link href="/docs" className="text-gray-500 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                Docs
                            </Link>
                            <Link href="/pricing" className="text-gray-500 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                Pricing
                            </Link>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                        <Link href="/demo">
                            <Button variant="ghost">Watch Demo</Button>
                        </Link>
                        <Link href="/book-demo">
                            <Button variant="default">Book Demo</Button>
                        </Link>
                    </div>
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background border-b">
                        <Link
                            href="/solutions"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                        >
                            Solutions
                        </Link>
                        <Link
                            href="/docs"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                        >
                            Docs
                        </Link>
                        <Link
                            href="/pricing"
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
                        >
                            Pricing
                        </Link>
                        <div className="pt-4 flex flex-col gap-2">
                            <Link href="/demo" className="w-full">
                                <Button variant="ghost" className="w-full justify-start">Watch Demo</Button>
                            </Link>
                            <Link href="/book-demo" className="w-full">
                                <Button variant="default" className="w-full">Book Demo</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    )
}
