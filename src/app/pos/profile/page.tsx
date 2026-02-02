'use client'

import { useSession } from 'next-auth/react'
import { User, Mail, Shield, Phone, Calendar, Edit2, Save, X, Briefcase, Camera, Trash2, MapPin, Globe } from 'lucide-react'
import { useState, useRef } from 'react'
import { toast } from 'sonner' // Assuming sonner is used for toasts based on other files

export default function ProfilePage() {
    const { data: session } = useSession()
    const userRole = (session?.user as any)?.role || 'Staff'
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isEditing, setIsEditing] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>((session?.user as any)?.image || null)
    const [profileData, setProfileData] = useState({
        name: session?.user?.name || '',
        email: session?.user?.email || '',
        phone: '+1 (555) 000-0000',
        location: 'New York, USA',
        website: 'flavipos.com',
        bio: 'Senior Store Manager with 5+ years of experience in retail operations and inventory management.',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setProfileData(prev => ({ ...prev, [name]: value }))
    }

    const handleSave = () => {
        setIsEditing(false)
        toast.success('Profile updated successfully')
        // Backend save logic would go here
    }

    const handleCancel = () => {
        setIsEditing(false)
        // Reset logic could go here
    }

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string)
                toast.success('Profile picture updated')
            }
            reader.readAsDataURL(file)
        }
    }

    const handleRemoveAvatar = () => {
        if (confirm('Are you sure you want to remove your profile picture?')) {
            setAvatarUrl(null)
            toast.success('Profile picture removed')
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header / Banner Area */}
            <div className="relative mb-24">
                {/* Cover Image */}
                <div className="h-48 w-full bg-gradient-to-r from-slate-800 to-slate-900 rounded-b-3xl shadow-md overflow-hidden relative">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                    <div className="absolute bottom-4 right-8 text-white/50 text-xs font-medium tracking-widest uppercase">Flavi POS Member</div>
                </div>

                {/* Profile Avatar Card */}
                <div className="absolute -bottom-16 left-8 sm:left-12 flex items-end">
                    <div className="relative group">
                        <div className="h-36 w-36 rounded-full p-1.5 bg-white shadow-2xl overflow-hidden ring-4 ring-white/50">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="h-full w-full rounded-full object-cover bg-gray-100" />
                            ) : (
                                <div className="h-full w-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-5xl font-bold shadow-inner">
                                    {profileData.name?.[0] || 'U'}
                                </div>
                            )}

                            {/* Edit Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all rounded-full p-4 backdrop-blur-sm cursor-default">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-white/20 hover:bg-white text-white hover:text-blue-600 rounded-full transition-all transform hover:scale-110"
                                    title="Upload photo"
                                >
                                    <Camera className="h-5 w-5" />
                                </button>
                                {avatarUrl && (
                                    <button
                                        onClick={handleRemoveAvatar}
                                        className="p-2 bg-white/20 hover:bg-white text-white hover:text-red-500 rounded-full transition-all transform hover:scale-110"
                                        title="Remove photo"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        {/* Status Indicator */}
                        <div className="absolute bottom-3 right-3 h-5 w-5 bg-green-500 border-4 border-white rounded-full" title="Online"></div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="absolute -bottom-14 right-4 sm:right-8 flex gap-3">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-white text-slate-700 hover:text-blue-600 border border-slate-200 px-5 py-2.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm"
                        >
                            <Edit2 className="h-4 w-4" />
                            <span>Edit Profile</span>
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={handleCancel}
                                className="bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-sm"
                            >
                                <X className="h-4 w-4" />
                                <span>Cancel</span>
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 text-sm transform hover:-translate-y-0.5"
                            >
                                <Save className="h-4 w-4" />
                                <span>Save Changes</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 sm:px-0">

                {/* Left Sidebar Info */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">{profileData.name}</h2>
                            <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-wide">{userRole}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-slate-600 group">
                                <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium truncate">{profileData.email}</span>
                            </div>

                            <div className="flex items-center gap-4 text-slate-600 group">
                                <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Phone className="h-5 w-5" />
                                </div>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={profileData.phone}
                                        onChange={handleChange}
                                        className="w-full text-sm font-medium border-b border-slate-300 focus:border-blue-500 outline-none pb-0.5 bg-transparent"
                                    />
                                ) : (
                                    <span className="text-sm font-medium">{profileData.phone}</span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-slate-600 group">
                                <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <MapPin className="h-5 w-5" />
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="location"
                                        value={profileData.location}
                                        onChange={handleChange}
                                        className="w-full text-sm font-medium border-b border-slate-300 focus:border-blue-500 outline-none pb-0.5 bg-transparent"
                                    />
                                ) : (
                                    <span className="text-sm font-medium">{profileData.location}</span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-slate-600 group">
                                <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Globe className="h-5 w-5" />
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="website"
                                        value={profileData.website}
                                        onChange={handleChange}
                                        className="w-full text-sm font-medium border-b border-slate-300 focus:border-blue-500 outline-none pb-0.5 bg-transparent"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">{profileData.website}</span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-slate-600 group">
                                <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Calendar className="h-5 w-5" />
                                </div>
                                <span className="text-sm font-medium">Joined {currentDate}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/20 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-4 -mb-4 h-24 w-24 rounded-full bg-white/20 blur-2xl"></div>

                        <div className="relative z-10">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Pro Account
                            </h3>
                            <p className="mt-2 text-indigo-100 text-sm">You have full access to all POS features including inventory, analytics, and staff management.</p>
                            <button className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm">
                                View Usage Logs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-6">
                    {/* About Section */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            About Me
                        </h3>
                        {isEditing ? (
                            <textarea
                                name="bio"
                                rows={4}
                                value={profileData.bio}
                                onChange={handleChange}
                                className="w-full text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        ) : (
                            <p className="text-slate-600 leading-relaxed text-base">
                                {profileData.bio}
                            </p>
                        )}
                    </div>

                    {/* General Settings Form */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            Work Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="group">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="name"
                                        disabled={!isEditing}
                                        value={profileData.name}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 text-slate-900 font-medium px-4 py-3 rounded-xl border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                                <input
                                    type="text"
                                    disabled
                                    value={userRole}
                                    className="w-full bg-slate-50 text-slate-500 font-medium px-4 py-3 rounded-xl border border-slate-200 cursor-not-allowed"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Employee ID</label>
                                <input
                                    type="text"
                                    disabled
                                    value="EMP-883920"
                                    className="w-full bg-slate-50 text-slate-500 font-medium px-4 py-3 rounded-xl border border-slate-200 cursor-not-allowed"
                                />
                            </div>

                            <div className="group">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                                <input
                                    type="text"
                                    disabled
                                    value="Sales & Inventory"
                                    className="w-full bg-slate-50 text-slate-500 font-medium px-4 py-3 rounded-xl border border-slate-200 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
