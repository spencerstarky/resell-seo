'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase-server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { data: { session }, error } = await supabase.auth.signUp(data)

    if (error) {
        console.error('Signup Error:', error)
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    if (!session) {
        // Email confirmation is required
        redirect('/login?message=Check your email to confirm account')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
