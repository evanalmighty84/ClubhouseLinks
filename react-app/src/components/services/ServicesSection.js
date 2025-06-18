// ServicesSection.jsx
import React, { useEffect, useRef, useState } from 'react';
import AOS from 'aos';
import Typist from 'react-typist';
import 'aos/dist/aos.css';
import 'react-typist/dist/Typist.css';
import './Services.css';

const ServicesSection = ({
                           services,
                           heroGif,
                           heroLogo,
                           fullScreen = false,
                           heroSwapDelay = 24000,
                         }) => {
  const gradient = 'linear-gradient(to bottom, black, steelblue, black)';
  const bodyRefs = useRef([]);
  const heroRef = useRef(null);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    // 1. init AOS
    AOS.init({ duration: 800, once: true, offset: 120 });

    // 2. equalize service-body heights
    setTimeout(() => {
      const heights = bodyRefs.current.map(el => el?.getBoundingClientRect().height || 0);
      const max = Math.max(...heights);
      bodyRefs.current.forEach(el => el && (el.style.minHeight = `${max}px`));
    }, 600);

    // 3. swap hero after delay
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
          // clean up
          setTimeout(() => {
            container.style.height = '';
            container.style.transition = '';
          }, 700);
        });
      } else {
        setShowLogo(true);
      }
    }, heroSwapDelay);

    return () => clearTimeout(timer);
  }, [heroSwapDelay]);

  return (
      <section id="services" style={{ backgroundColor: '#fff', paddingTop: '20px' }}>
        <div className="container">
          {/* Hero */}
          <div className="row justify-content-center mb-4">
            <div
                ref={heroRef}
                className="col-12 text-center"
                style={{ overflow: 'hidden' }}
            >
              <img
                  src={showLogo ? heroLogo : heroGif}
                  alt="Clubhouse Logo"
                  style={{
                    display: 'block',
                    margin: '0 auto',
                    height: 'auto',
                    width: showLogo ? '50%' : '100%',
                    maxWidth: showLogo ? '350px' : undefined,
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
                        marginTop: '1rem',
                      }}
                      data-aos="fade-down"
                      data-aos-delay="200"
                  >
                    Unlimited Design and Implementation
                  </h2>
              )}
            </div>
          </div>

          {/* Services grid */}
          <div className="row">
            {services.map((s, i) => (
                <div
                    className={fullScreen ? 'col-12 mb-4' : 'col-md-6 mb-4'}
                    key={i}
                >
                  <div
                      className="media blog-thumb flex-column"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                      data-aos="fade-up"
                      data-aos-delay={200 * i}
                  >
                    <img
                        src={s.image}
                        alt={s.title}
                        className="media-object"
                        style={{
                          width: '100%',
                          height: '500px',
                          objectFit: 'cover',
                          WebkitBoxReflect:
                              'below 0px linear-gradient(transparent, rgba(255,255,255,0.2))',
                        }}
                    />
                    <div
                        className="media-body"
                        ref={el => (bodyRefs.current[i] = el)}
                        style={{
                          background: gradient,
                          padding: '20px',
                          marginTop: '10px',
                          width: '100%',
                          textAlign: 'center',
                          color: 'white',
                          overflow: 'hidden',
                        }}
                    >
                      <Typist
                          avgTypingDelay={50}
                          startDelay={200}
                          cursor={{ show: false }}
                      >
                        <h3 style={{ marginBottom: '1rem', color: 'white' }}>
                          {s.title}
                        </h3>
                      </Typist>
                      <p style={{ margin: 0, fontSize: '1rem', color: 'white' }}>
                        {s.description}
                      </p>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </section>
  );
};

export default ServicesSection;
