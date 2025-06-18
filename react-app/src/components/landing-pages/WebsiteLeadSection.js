// src/components/WebsiteLeadSection.js

import React, { useEffect, useRef, useState } from 'react';
import websiteLeadData from './WebsiteLeadData';
import heroLogo from '../Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png';
import VideoOverlay from '../../CRMpages/CRMutils/dashboardanimations';

const WebsiteLeadSection = () => {
    const { title, subtitle, description, benefits, stats, cta, image } = websiteLeadData;

    const heroRef = useRef(null);
    const [showLogo, setShowLogo] = useState(false);

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
                    }, 700);
                });
            } else {
                setShowLogo(true);
            }
        }, 8000); // Adjust delay here (8s)

        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
            {/* HERO ANIMATION */}
            <div ref={heroRef} style={{ overflow: 'hidden', textAlign: 'center' }}>
                {!showLogo ? (
                    <VideoOverlay />
                ) : (
                    <>
                        <img
                            src={heroLogo}
                            alt="Logo"
                            style={{
                                display: 'block',
                                margin: '0 auto',
                                height: 'auto',
                                width: '50%',
                                maxWidth: '350px',
                            }}
                        />
                        <h2
                            style={{
                                backgroundImage: 'linear-gradient(to right, black, steelblue, #ff0080, black)',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: 'bold',
                                fontFamily: 'cursive',
                                marginTop: '1rem',
                            }}
                        >
                            Website Lead Generation Services
                        </h2>
                    </>
                )}
            </div>

            {/* MAIN SECTION */}
            <section className="website-lead-section" style={{ padding: '3rem 1rem', background: '#f9f9f9' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>{title}</h2>
                    <h4 style={{ color: '#555', marginTop: '0.5rem' }}>{subtitle}</h4>
                    <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>{description}</p>

                    <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '1.5rem', paddingLeft: '0' }}>
                        {benefits.map((benefit, index) => (
                            <li key={index} style={{ marginBottom: '0.5rem', listStyle: 'disc inside' }}>
                                {benefit}
                            </li>
                        ))}
                    </ul>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                        <div><strong>🚀 Conversion Rate:</strong> {stats.conversionRate}</div>
                        <div><strong>⚡ Avg. Response:</strong> {stats.avgResponseTime}</div>
                        <div><strong>🏆 Clients:</strong> {stats.clientsServed}</div>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <a
                            href={cta.link}
                            className="btn btn-primary"
                            style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem' }}
                        >
                            {cta.text}
                        </a>
                    </div>

                    <div style={{ marginTop: '2rem' }}>
                        <img
                            src={image}
                            alt="Website Lead Example"
                            style={{ maxWidth: '100%', height: 'auto', borderRadius: '12px' }}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default WebsiteLeadSection;
