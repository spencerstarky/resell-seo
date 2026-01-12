export default function TermsOfService() {
    return (
        <div className="container" style={{ padding: '4rem 0', maxWidth: '800px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem' }}>Terms of Service</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Last Updated: January 2026</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    By accessing or using ResellSEO ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>2. Description of Service</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    ResellSEO provides tools to help eBay sellers optimize their listing titles. While we strive to improve search visibility, we do not guarantee specific sales results, rankings, or performance metrics.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>3. Subscriptions & Payments</h2>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--color-text-dim)', lineHeight: '1.6' }}>
                    <li><strong>Billing:</strong> The Service is billed on an annual basis. You authorize us to charge your payment method for the subscription fee.</li>
                    <li><strong>Renewal:</strong> Subscriptions automatically renew unless canceled before the renewal date.</li>
                    <li><strong>Cancellation:</strong> You may cancel your subscription at any time via your Account settings. Access continues until the end of the current billing period.</li>
                    <li><strong>Refunds:</strong> Payments are generally non-refundable. Exceptions may be made at our discretion for technical issues.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>4. User Responsibilities</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    You are responsible for the content of your eBay listings. ResellSEO is not liable for any account suspensions, policy violations, or data loss associated with your eBay account. You agree to use the Service in compliance with eBay's policies.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>5. Limitation of Liability</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    To the maximum extent permitted by law, ResellSEO shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the Service.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>6. Contact</h2>
                <p style={{ lineHeight: '1.6', color: 'var(--color-text-dim)' }}>
                    For support or legal inquiries, contact us at: <a href="mailto:support@resellseo.app" style={{ color: 'var(--color-primary)' }}>support@resellseo.app</a>
                </p>
            </section>
        </div>
    );
}
