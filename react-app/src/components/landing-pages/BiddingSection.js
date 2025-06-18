// src/components/BiddingSection.jsx
import React, { useEffect, useRef, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './BiddingSection.css';
import BiddingData from './BiddingData';

// hero assets
import Unlimited from '../WideMovieLogo.gif';
import Logo from '../Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png';

const gradient = 'linear-gradient(to bottom, black, steelblue, black)';

const BiddingSection = () => {
    const [showLogo, setShowLogo] = useState(false);
    const heroRef = useRef(null);
    const bodyRefs = useRef([]);

    useEffect(() => {
        AOS.init({ duration: 800, once: true, offset: 120 });

        // hero GIF → logo swap after ~24s
        const timer = setTimeout(() => {
            const container = heroRef.current;
            if (!container) {
                setShowLogo(true);
                return;
            }
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
        }, 24000);

        // equalize card heights
        setTimeout(() => {
            const heights = bodyRefs.current.map(el => (el ? el.getBoundingClientRect().height : 0));
            const maxH = Math.max(...heights);
            bodyRefs.current.forEach(el => el && (el.style.minHeight = `${maxH}px`));
        }, 600);

        return () => clearTimeout(timer);
    }, []);

    return (
        <section id="bidding" style={{ backgroundColor: '#fff', padding: '20px 0' }}>
            <div className="container">
                {/* Hero animation */}
                <div className="row justify-content-center mb-4">
                    <div
                        ref={heroRef}
                        className="col-12 text-center"
                        style={{ overflow: 'hidden' }}
                    >
                        <img
                            src={showLogo ? Logo : Unlimited}
                            alt="Clubhouse Logo"
                            style={{
                                display: 'block',
                                margin: '0 auto',
                                width: showLogo ? '50%' : '100%',
                                maxWidth: showLogo ? '350px' : undefined,
                                height: 'auto'
                            }}
                        />
                        {showLogo && (
                            <h2
                                style={{
                                    backgroundImage:
                                        'linear-gradient(to right, black, steelblue, #ff0080, black)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                    WebkitTextFillColor: 'transparent',
                                    fontWeight: 'bold',
                                    fontFamily: 'cursive',
                                    marginTop: '1rem'
                                }}
                                data-aos="fade-down"
                                data-aos-delay="200"
                            >
                                Our Bidding Platform
                            </h2>
                        )}
                    </div>
                </div>

                <h2 className="text-center mb-5" style={{color:'black'}}>How Our Bidding Works</h2>

                <div className="row">
                    {BiddingData.map((item, i) => (
                        <div className="col-md-6 mb-4" key={i}>
                            <div
                                className="media bidding-thumb flex-column align-items-center"
                                data-aos="fade-up"
                                data-aos-delay={200 * i}
                                style={{ width: '100%' }}
                            >
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="media-object rounded"
                                    style={{ width: '100%', height: '450px', objectFit: 'cover' }}
                                />
                                <div
                                    className="media-body text-center"
                                    ref={el => (bodyRefs.current[i] = el)}
                                    style={{
                                        background: gradient,
                                        color: '#fff',
                                        padding: '1.5rem',
                                        marginTop: '1rem'
                                    }}
                                >
                                    <h3 style={{ marginBottom: '1rem' ,color:'white'}}>{item.title}</h3>
                                    <p
                                        style={{ fontSize: '0.95rem', lineHeight: '1.6',color:'white' }}
                                        dangerouslySetInnerHTML={{ __html: item.description }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BiddingSection;
