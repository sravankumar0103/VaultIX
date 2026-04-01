"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useTheme } from "@/app/ThemeContext"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { DEFAULT_THEME, getStoredDefaultTheme, isTheme, type Theme } from "@/lib/themePreferences"
import { clearLocalAuthSession, clearReturningUser, recoverFromAuthError } from "@/lib/authSession"
import {
    User as UserIcon,
    Mail,
    Sun,
    Moon,
    Trash2,
    MessageSquareWarning,
    Edit2,
    Check,
    X,
    AlertTriangle,
    Send,
    Shield,
    Palette,
} from "lucide-react"
import LoadingLogo from "@/components/LoadingLogo"

export default function AccountPage() {
    const router = useRouter()
    const { setDefaultTheme: applyDefaultTheme } = useTheme()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    // Edit mode
    const [isEditing, setIsEditing] = useState(false)

    // Profile fields
    const [displayName, setDisplayName] = useState("")
    const [email, setEmail] = useState("")

    // Default theme preference (persisted with label)
    const [defaultTheme, setDefaultTheme] = useState<Theme>(DEFAULT_THEME)

    // Delete account
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState("")
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

    // Complaint form
    const [complaintSubject, setComplaintSubject] = useState("")
    const [complaintBody, setComplaintBody] = useState("")

    // Toast
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        const getUser = async () => {
            const { data, error } = await supabase.auth.getUser()
            if (error) {
                const recovered = await recoverFromAuthError(error.message)
                if (!recovered) {
                    console.error("Failed to load user:", error)
                }
                router.push("/")
                setLoading(false)
                return
            }

            if (data?.user) {
                setUser(data.user)
                setDisplayName(data.user.user_metadata?.full_name || data.user.user_metadata?.name || "")
                setEmail(data.user.email || "")
                const accountTheme = isTheme(data.user.user_metadata?.theme_preference)
                    ? data.user.user_metadata.theme_preference
                    : getStoredDefaultTheme() ?? DEFAULT_THEME
                setDefaultTheme(accountTheme)
            } else {
                router.push("/")
            }
            setLoading(false)
        }
        getUser()
    }, [router])

    const handleSave = async () => {
        if (!user) return
        try {
            if (displayName !== (user.user_metadata?.full_name || user.user_metadata?.name || "")) {
                await supabase.auth.updateUser({ data: { full_name: displayName, name: displayName } })
            }
            if (email !== user.email) {
                await supabase.auth.updateUser({ email })
                showToast("Confirmation email sent to new address", "success")
                setIsEditing(false)
                return
            }
            showToast("Profile updated successfully", "success")
            setIsEditing(false)
        } catch {
            showToast("Update failed", "error")
        }
    }

    const handleDefaultTheme = async (t: Theme) => {
        const previousTheme = defaultTheme
        setDefaultTheme(t)
        applyDefaultTheme(t)

        // Persist to Supabase
        const { error } = await supabase.auth.updateUser({
            data: { theme_preference: t }
        })

        if (error) {
            setDefaultTheme(previousTheme)
            applyDefaultTheme(previousTheme)
            showToast("Failed to save preference to cloud", "error")
        } else {
            showToast(`Default theme set to ${t} (Synced to account)`, "success")
        }
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== "DELETE" || isDeletingAccount) return
        setIsDeletingAccount(true)

        try {
            // Get the current session JWT to authenticate the server-side call
            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData?.session?.access_token
            if (!token) { showToast("Not authenticated", "error"); return }

            const res = await fetch("/api/delete-account", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
            })

            if (!res.ok) {
                const body = await res.json()
                showToast(body.error || "Deletion failed", "error")
                return
            }

            // The auth user is already removed server-side, so clear the local session only.
            sessionStorage.clear()
            clearReturningUser()
            await clearLocalAuthSession()
            window.location.href = "/?deleted=true"
        } catch {
            showToast("Failed to delete account", "error")
        } finally {
            setIsDeletingAccount(false)
        }
    }

    const handleComplaint = async () => {
        if (!complaintSubject.trim() || !complaintBody.trim()) {
            showToast("Please fill in both subject and message", "error")
            return
        }

        try {
            const { error } = await supabase.from("complaints").insert({
                user_id: user?.id,
                user_email: email,
                subject: complaintSubject,
                body: complaintBody,
                status: "pending"
            })

            if (error) throw error

            // Trigger automated email alert
            fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: complaintSubject,
                    body: complaintBody,
                    userEmail: email,
                    userName: displayName
                })
            }).catch(e => console.error("Email notification failed:", e))

            setComplaintSubject("")
            setComplaintBody("")
            showToast("Report submitted successfully — thank you!", "success")
        } catch (err) {
            console.error("Feedback error:", err)
            showToast("Failed to send report. Please try again.", "error")
        }
    }

    const initials = displayName
        ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : email.slice(0, 2).toUpperCase()

    if (loading) {
        return (
            <LoadingLogo />
        )
    }

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 xl:gap-8 pb-16 pt-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
                <div className="max-w-full overflow-hidden">
                    <p className="text-lg md:text-xl font-medium text-themeMuted mb-1 truncate">Hey, {displayName || "there"}.</p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-themeText">Account</h1>
                </div>
                <div className="flex w-full sm:w-auto">
                    {!isEditing ? (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsEditing(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium text-xs shadow-md shadow-purple-500/20 transition-colors"
                        >
                            <Edit2 size={14} />
                            Edit Profile
                        </motion.button>
                    ) : (
                        <div className="flex gap-2 w-full">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-themeMuted text-xs border border-white/10 transition-colors"
                            >
                                <X size={14} /> <span className="sm:inline">Cancel</span>
                            </button>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleSave}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-xs shadow-md shadow-green-500/20 transition-colors"
                            >
                                <Check size={14} /> <span className="sm:inline">Save</span>
                            </motion.button>
                        </div>
                    )}
                </div>
            </div>

            {/* Avatar + Name */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5 border border-white/10 bg-themeCard flex flex-col sm:flex-row items-center sm:items-start gap-5"
            >
                <div className="w-16 h-16 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl font-bold text-purple-500 shrink-0 shadow-inner">
                    {initials}
                </div>                <div className="flex-1 w-full flex flex-col gap-4 text-center sm:text-left">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-themeMuted uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1.5 mb-0.5">
                            <UserIcon size={10} /> Display Name
                        </label>
                        {isEditing ? (
                            <input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full p-2.5 text-sm rounded-xl bg-themeSurface border border-white/10 text-themeText focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all placeholder:text-themeMuted/30"
                                placeholder="Your name"
                            />
                        ) : (
                            <p className="text-themeText font-bold text-lg">{displayName || <span className="text-themeMuted/50 italic font-normal">Not set</span>}</p>
                        )}
                    </div>
 
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-themeMuted uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1.5 mb-0.5">
                            <Mail size={10} /> Email Address
                        </label>
                        {isEditing ? (
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-2.5 text-sm rounded-xl bg-themeSurface border border-white/10 text-themeText focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all placeholder:text-themeMuted/30"
                                placeholder="your@email.com"
                            />
                        ) : (
                            <p className="text-themeText font-medium text-sm opacity-90">{email}</p>
                        )}
                    </div>
                </div>

            </motion.div>

            {/* Default Theme */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass rounded-2xl p-5 border border-white/10 bg-themeCard flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                        <Palette size={16} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm text-themeText">Appearance</h2>
                        <p className="text-[11px] text-themeMuted mt-0.5">Control the default theme for your workspace</p>
                    </div>
                </div>

                <div className="flex bg-themeSurface border border-white/5 p-1 rounded-xl w-full sm:w-auto">
                    {(["light", "dark"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => handleDefaultTheme(t)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md transition-all font-medium text-xs ${defaultTheme === t
                                ? "bg-themeCard text-themeText shadow-sm border border-white/10"
                                : "text-themeMuted hover:text-themeText hover:bg-white/5"
                                }`}
                        >
                            {t === "light" ? <Sun size={12} /> : <Moon size={12} />}
                            <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Complaints / Feedback */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-5 border border-white/10 bg-themeCard"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                        <MessageSquareWarning size={16} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm text-themeText">Report a Bug / Feedback</h2>
                        <p className="text-[11px] text-themeMuted mt-0.5">Reach the developer directly</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-themeMuted uppercase tracking-widest">Subject</label>
                        <input
                            value={complaintSubject}
                            onChange={(e) => setComplaintSubject(e.target.value)}
                            className="w-full p-2.5 text-sm rounded-xl bg-themeSurface border border-white/10 text-themeText focus:ring-1 focus:ring-orange-500/50 focus:outline-none transition-all placeholder:text-themeMuted/50"
                            placeholder="e.g. Bookmarks not saving correctly"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-themeMuted uppercase tracking-widest">Message</label>
                        <textarea
                            value={complaintBody}
                            onChange={(e) => setComplaintBody(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 text-sm rounded-xl bg-themeSurface border border-white/10 text-themeText focus:ring-1 focus:ring-orange-500/50 focus:outline-none transition-all placeholder:text-themeMuted/50 resize-none"
                            placeholder="Describe the issue..."
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleComplaint}
                        className="self-end flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs shadow-md shadow-orange-500/20 transition-colors"
                    >
                        <Send size={12} />
                        Send Report
                    </motion.button>
                </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass rounded-2xl p-5 border border-red-500/20 bg-red-500/5"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                        <Shield size={16} />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm text-red-500">Danger Zone</h2>
                        <p className="text-[11px] text-themeMuted mt-0.5">Proceed with caution</p>
                    </div>
                </div>

                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-medium text-xs transition-all"
                    >
                        <Trash2 size={14} />
                        Delete Account Permanently
                    </button>
                ) : (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col gap-4"
                        >
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-400 leading-relaxed">
                                    This will <strong>permanently delete</strong> your account. Type <span className="font-mono font-bold">DELETE</span> to confirm.
                                </p>
                            </div>
                            <input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE"
                                className="w-full p-2.5 text-sm rounded-xl bg-themeSurface border border-red-500/30 text-themeText focus:ring-1 focus:ring-red-500/50 focus:outline-none transition-all font-mono placeholder:text-themeMuted/40"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText("") }}
                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-themeMuted text-xs border border-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs transition-all"
                                >
                                    <Trash2 size={12} />
                                    {isDeletingAccount ? "Deleting..." : "Confirm Delete"}
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                )}
            </motion.div>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                        <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`fixed bottom-6 left-6 right-6 sm:left-auto sm:right-8 sm:w-80 flex items-center gap-3 px-5 py-4 rounded-2xl text-white font-bold shadow-2xl z-50 ${toast.type === "success" ? "bg-green-600 shadow-green-600/20" : "bg-red-600 shadow-red-600/20"
                            }`}
                    >
                        <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
                            {toast.type === "success" ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
                        </div>
                        <p className="text-sm">{toast.message}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
