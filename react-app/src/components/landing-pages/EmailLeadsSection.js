import React, { useEffect, useRef, useState } from 'react';
import EmailLeadsForm from './EmailLeadsForm';
import heroLogo from '../Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png';
import emailCampaignImage from '../emailcampaign.jpeg';

const EmailLeadSection = () => {
    const heroRef = useRef(null);
    const [showLogo, setShowLogo] = useState(false);

    const emailData = {
        title: 'Convert Readers into Clients with Targeted Emails',
        subtitle: 'Email Leads That Engage & Perform',
        description:
            'Email marketing remains one of the most effective and cost-efficient ways to reach your audience. Our automated workflows and dynamic content delivery help turn cold leads into warm conversations — and warm conversations into closed business.',
        benefits: [
            '📬 Track who opens, clicks, and replies',
            '🎯 A/B test subject lines and calls to action',
            '🧠 Use A.I. to improve deliverability and content',
            '⚡ Automatically segment based on behavior',
            '📈 Real-time performance dashboards',
        ],
        stats: {
            openRate: '42.6%',
            clickRate: '18.3%',
            conversionRate: '7.9%',
        },
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const container = heroRef.current;
            if (container) {
                const oldH = container.getBoundingClientRect().height;
                setShowLogo(true);
                requestAnimationFrame(() => {
                    const newH = container.getBoundingClientRect().height;
                    container.style.height = `${oldH}px`;
                    container.style.transition = 'height 1.6s ease';
                    requestAnimationFrame(() => {
                        container.style.height = `${newH}px`;
                    });
                    setTimeout(() => {
                        container.style.height = '';
                        container.style.transition = '';
                    }, 100);
                });
            } else {
                setShowLogo(true);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            {/* HERO LOGO ANIMATION */}
            <div ref={heroRef} style={{ overflow: 'hidden', textAlign: 'center' }}>
                {showLogo && (
                    <>
                        <img
                            src={heroLogo}
                            alt="Email Logo"
                            style={{
                                display: 'block',
                                margin: '0 auto',
                                height: 'auto',
                                width: '50%',
                                maxWidth: '350px',
                                borderRadius: '12px',
                            }}
                        />
                        <h2
                            style={{
                                backgroundImage: 'linear-gradient(to right, #ff8a00, #e52e71)',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 'bold',
                                fontFamily: 'cursive',
                                marginTop: '1rem',
                            }}
                        >
                            Email Lead Generation Services
                        </h2>
                    </>
                )}
            </div>

            {/* MAIN CONTENT */}
            <section style={{ padding: '3rem 1rem', background: '#f9f9f9' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                    <h4 style={{ color: '#555', marginTop: '0.5rem' }}>{emailData.subtitle}</h4>
                    <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>{emailData.description}</p>

                    <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '1.5rem', paddingLeft: '0' }}>
                        {emailData.benefits.map((benefit, index) => (
                            <li key={index} style={{ marginBottom: '0.5rem', listStyle: 'disc inside' }}>
                                {benefit}
                            </li>
                        ))}
                    </ul>

                    <div style={{ marginTop: '2rem' }}>
                        <img
                            src={emailCampaignImage}
                            alt="Email Campaign Example"
                            style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px' }}
                        />
                    </div>

                    <EmailLeadsForm />

                    <div
                        style={{
                            marginTop: '2rem',
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '2rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div>
                            <strong>📨 Open Rate:</strong> {emailData.stats.openRate}
                        </div>
                        <div>
                            <strong>🔗 Click Rate:</strong> {emailData.stats.clickRate}
                        </div>
                        <div>
                            <strong>🚀 Conversion Rate:</strong> {emailData.stats.conversionRate}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default EmailLeadSection;
