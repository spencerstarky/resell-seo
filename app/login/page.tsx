import LoginForm from '@/components/LoginForm'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const error = params?.error
    const message = params?.message

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card glass" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '2rem' }} className="text-gradient">ResellSEO</h1>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>Account Access</h2>

                {(error || message) && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: error ? 'rgba(255, 100, 100, 0.2)' : 'rgba(100, 255, 100, 0.2)',
                        border: `1px solid ${error ? 'red' : 'green'}`,
                        color: 'white',
                        fontSize: '0.9rem',
                        textAlign: 'center'
                    }}>
                        {error || message}
                    </div>
                )}

                <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                    <button
                        style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', color: 'white', borderBottom: '2px solid white', cursor: 'pointer' }}
                    >
                        Sign In
                    </button>
                    {/* Simplified toggle for now, mostly to isolate the Login form for password managers */}
                </div>

                <LoginForm />
            </div>
        </div>
    )
}
