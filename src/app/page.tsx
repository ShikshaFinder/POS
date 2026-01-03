"use client"

import Link from "next/link"
import { ArrowRight, Check, Play, Upload, Database, FileSpreadsheet, Lock, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/ui/footer"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Hero3D } from "@/components/hero-3d"

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        {/* --- HERO SECTION --- */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-50/50 to-white -z-20" />
          <Hero3D />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <motion.div
              className="text-center max-w-4xl mx-auto mb-16"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-6">
                Now available for Enterprise
              </motion.div>
              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6 font-display">
                Transform Any Data, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  Instantly.
                </span>
              </motion.h1>
              <motion.p variants={itemVariants} className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto mb-10">
                From messy spreadsheets to perfect databases. AI-powered data transformation for modern enterprises.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/book-demo">
                  <Button size="lg" variant="gradient" className="w-full sm:w-auto text-lg px-8 h-12">
                    Book a Demo
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 h-12 gap-2">
                    <Play className="w-4 h-4 ml-1 fill-current" /> Watch Demo
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Animation Placeholder / Visual */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative mx-auto max-w-5xl rounded-2xl border bg-white/50 backdrop-blur-sm p-4 shadow-2xl ring-1 ring-gray-900/10"
            >
              <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  {/* Blob Animations via Tailwind (globals.css/tw-animate dependency) */}
                  <div className="w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse absolute top-0 left-0"></div>
                  <div className="w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse absolute bottom-0 right-0"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center z-10 p-8 w-full max-w-4xl">
                  {/* Step 1 */}
                  <Card className="p-6 bg-white shadow-lg border-l-4 border-l-red-400 transform md:-rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-3 mb-3 text-red-600">
                      <FileSpreadsheet className="w-6 h-6" />
                      <span className="font-semibold text-sm">Messy Data.xlsx</span>
                    </div>
                    <div className="space-y-2 opacity-50">
                      <div className="h-2 bg-gray-200 rounded w-full"></div>
                      <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </Card>

                  <div className="flex justify-center text-primary">
                    <ArrowRight className="w-8 h-8 animate-pulse" />
                  </div>

                  {/* Step 2 */}
                  <Card className="p-6 bg-white shadow-lg border-l-4 border-l-green-500 transform md:rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="flex items-center gap-3 mb-3 text-green-600">
                      <Database className="w-6 h-6" />
                      <span className="font-semibold text-sm">Clean_DB.sql</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-green-100 rounded w-full"></div>
                      <div className="h-2 bg-green-100 rounded w-full"></div>
                      <div className="h-2 bg-green-100 rounded w-3/4"></div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- TRUSTED BY --- */}
        <section className="py-12 border-y bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm font-semibold text-gray-500 tracking-wide uppercase mb-8">
              Trusted by 100+ innovative data teams
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {['Acme Corp', 'GlobalBank', 'TechStart', 'DataFlow', 'CloudScale'].map((company) => (
                <div key={company} className="flex justify-center">
                  <span className="text-xl font-bold text-gray-400">{company}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Three steps to perfect data
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Stop writing custom scripts. Let Morphix handle the heavy lifting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-gray-200 via-primary/30 to-gray-200 -z-10" />

              {[
                {
                  icon: Upload,
                  title: "1. Upload Your Data",
                  desc: "Drag and drop any file: Excel, CSV, JSON, or connect via API. We handle files up to 5GB."
                },
                {
                  icon: SparkleIcon,
                  title: "2. AI Transforms It",
                  desc: "Our AI auto-detects schemas, fixes errors, and maps columns to your target destination instantly."
                },
                {
                  icon: Database,
                  title: "3. Export & Sync",
                  desc: "Download clean files or sync directly to Salesforce, HubSpot, Postgres, or your Data Warehouse."
                }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="w-24 h-24 rounded-2xl bg-white border shadow-xl flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                    <step.icon className={`w-10 h-10 ${i === 1 ? 'text-primary' : 'text-gray-600'}`} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- FEATURES --- */}
        <section className="py-24 bg-gray-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl mb-6">
                  Everything you need to <br /> transform data at scale
                </h2>
                <div className="space-y-8">
                  {[
                    {
                      title: "AI-Powered Schema Detection",
                      desc: "Automatically understands messy headers and structures, mapping them to your standardized schema with 99% accuracy.",
                      icon: Zap
                    },
                    {
                      title: "Smart Validations & Enrichment",
                      desc: "Validate emails, phones, and addresses. Enrich data with external APIs automatically during the pipeline.",
                      icon: Check
                    },
                    {
                      title: "Enterprise Grade Security",
                      desc: "SOC2 Type II compliant. End-to-end encryption. Your data is deleted after processing.",
                      icon: Lock
                    }
                  ].map((feat, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 flex-shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <feat.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{feat.title}</h3>
                        <p className="mt-2 text-gray-500">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Visual */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-orange-500 rounded-2xl opacity-10 blur-2xl"></div>
                <div className="relative rounded-2xl bg-white border shadow-2xl overflow-hidden">
                  <div className="bg-gray-50 border-b px-4 py-3 flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-500 mb-2">
                        <span>Confidence Score</span>
                        <span className="text-green-600">98.5%</span>
                      </div>
                      {/* Mock Schema Map */}
                      {[
                        { src: "Cust Name", dest: "full_name", status: "Matched" },
                        { src: "E-mail Addr", dest: "email_address", status: "Matched" },
                        { src: "Ph #", dest: "phone_number", status: "Formatted" },
                        { src: "Joined", dest: "created_at", status: "Converted" },
                      ].map((row, k) => (
                        <div key={k} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <span className="text-gray-700 font-mono text-sm">{row.src}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="text-purple-600 font-mono text-sm">{row.dest}</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{row.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* --- STATS --- */}
        <section className="bg-primary text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { val: "10M+", label: "Rows Processed" },
                { val: "99.9%", label: "Accuracy Rate" },
                { val: "50+", label: "File Formats" },
                { val: "<10s", label: "Avg Transform Time" }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.val}</div>
                  <div className="text-purple-200 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- CTA --- */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-white -z-10"></div>
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 mb-6 font-display">
              Ready to transform your data?
            </h2>
            <p className="text-xl text-gray-500 mb-10">
              Get a personalized demo for your use case and see why leading data teams trust Morphix.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/book-demo">
                <Button size="lg" variant="gradient" className="w-full sm:w-auto text-lg px-8 h-14 shadow-xl shadow-purple-200">
                  Book a Demo
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 h-14">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="2">
      <path d="M12 2L14.4 7.2L20 9L14.4 10.8L12 16L9.6 10.8L4 9L9.6 7.2L12 2Z" fill="currentColor" fillOpacity="0.2" />
    </svg>
  )
}
