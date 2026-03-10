'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const supabase = createClient()

    async function signInWithGoogle() {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'openid email profile',
            },
        })
    }

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="p-8 text-white text-center">
                <h1 className="mb-4">Dopmaxxing</h1>
                <button
                    type="button"
                    className="text-body bg-neutral-secondary-medium box-border border border-default-medium hover:bg-neutral-tertiary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary shadow-xs font-medium leading-5 rounded-base text-sm px-4 py-2.5 focus:outline-none"
                    onClick={signInWithGoogle}
                >
                    Sign in
                </button>
            </div>
        </div>
    )
}
