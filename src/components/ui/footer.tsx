import Link from "next/link"

export function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
                <div className="flex justify-center space-x-6 md:order-2">
                    <Link href="#" className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">Product</span>
                        Product
                    </Link>
                    <Link href="/docs" className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">Docs</span>
                        Docs
                    </Link>
                    <Link href="#" className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">Blog</span>
                        Blog
                    </Link>
                    <Link href="#" className="text-gray-400 hover:text-gray-500">
                        <span className="sr-only">Contact</span>
                        Contact
                    </Link>
                </div>
                <div className="mt-8 md:mt-0 md:order-1">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4 md:mb-0">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                            M
                        </div>
                        <p className="text-center text-base text-gray-400">
                            &copy; 2025 Morphix. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
