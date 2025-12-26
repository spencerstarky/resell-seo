'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login, signup } from '@/app/login/actions';

export default function LoginForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    return (
        <form
            id="login-form"
            name="login-form"
            method="POST"
            action={isLogin ? login : signup}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    {isLogin ? 'Welcome back! Please enter your details.' : 'Start optimizing your eBay titles for free.'}
                </p>
            </div>

            <div>
                <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                    placeholder="you@example.com"
                />
            </div>

            <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="password" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Password</label>
                    {!isLogin && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>Min. 6 characters</span>
                    )}
                </div>
                <div style={{ position: 'relative' }}>
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        required
                        minLength={6}
                        style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0'
                        }}
                        title={showPassword ? "Hide password" : "Show password"}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {isLogin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                        type="checkbox"
                        id="remember"
                        name="remember"
                        defaultChecked
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                    />
                    <label htmlFor="remember" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                        Stay logged in on this device
                    </label>
                </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}>
                {isLogin ? 'Sign In' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                {isLogin ? (
                    <>New user? <button type="button" onClick={() => setIsLogin(false)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', padding: '0' }}>Create an account</button></>
                ) : (
                    <>Already have an account? <button type="button" onClick={() => setIsLogin(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer', padding: '0' }}>Sign in instead</button></>
                )}
            </div>
        </form>
    );
}
