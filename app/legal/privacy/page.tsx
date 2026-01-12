export default function PrivacyPolicy() {
    return (
        <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>Privacy Policy</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Last Updated: January 2026</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>1. Introduction</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    ResellSEO ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>2. Information We Collect</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
                    We collect the following types of information:
                </p>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--color-text-dim)', lineHeight: '1.6' }}>
                    <li><strong>Account Information:</strong> Email address and authentication details provided via Supabase or eBay.</li>
                    <li><strong>Listing Data:</strong> eBay item titles, images, and performance metrics necessary to provide our optimization service.</li>
                    <li><strong>Usage Data:</strong> Information about how you interact with our dashboard and tools.</li>
                    <li><strong>Payment Information:</strong> We do not store credit card details. All payment processing is handled securely by Stripe.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>3. How We Use Your Data</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    We use your data solely to:
                    <br />- Provide and improve the title optimization service.
                    <br />- Process subscription payments.
                    <br />- Communicate important account updates.
                    <br />- We do <strong>not</strong> sell your data to third parties.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>4. Third-Party Services</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    We share data with trusted third-party providers to run our service:
                    <br />- <strong>Supabase:</strong> For database and authentication services.
                    <br />- <strong>Stripe:</strong> For secure payment processing.
                    <br />- <strong>eBay API:</strong> To fetch and update your listing information.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>5. Contact Us</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    If you have questions about this policy, please contact us at: <a href="mailto:support@resellseo.app" style={{ color: 'var(--color-primary)' }}>support@resellseo.app</a>
                </p>
            </section>
        </div>
    );
}
