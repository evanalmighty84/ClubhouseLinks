import React, { useEffect, useRef, useState } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './NewServicesSection.css';


const NewServicesSection = ({
                                services = [],
                                logo,
                                title = 'Website Services',
                            }) => {
    const safeServices = Array.isArray(services) ? services : [];

    const getServiceTitle = (service) =>
        service.title || service.name || service.serviceTitle || 'Service';

    const getServiceDescription = (service) =>
        service.description || service.text || service.summary || '';

    const getServiceImage = (service) =>
        service.image || service.icon || service.img || service.photo;

    const getServiceLink = (service) =>
        service.link || service.path || service.to || service.url;
    const heroRef = useRef(null);
    const [showLogo] = useState(true);
    const [pulseLogo, setPulseLogo] = useState(true);

    useEffect(() => {
        AOS.init({ duration: 800, once: true, offset: 120 });
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPulseLogo(false);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <section className="new-services-section">
            <div className="new-services-bg-grid" />
            <div className="new-services-bg-glow" />

            <div className="new-services-hero">
                <div className="row justify-content-center mb-5">
                    <div ref={heroRef} className="col-12 text-center">
                        {logo && (
                            <img
                                src={logo}
                                alt="Clubhouse Links Logo"
                                className={`new-services-logo ${pulseLogo ? 'new-services-logo-pulse-10s' : ''}`}
                            />
                        )}

                        {showLogo && (
                            <h2
                                className="new-services-title"
                                data-aos="fade-down"
                            >
                                {title}
                            </h2>
                        )}
                    </div>
                </div>
            </div>

            <div className="new-services-grid">
                {safeServices.map((service, index) => {
                    const serviceTitle = getServiceTitle(service);
                    const serviceDescription = getServiceDescription(service);
                    const serviceImage = getServiceImage(service);
                    const serviceLink = getServiceLink(service);

                    const cardContent = (
                        <div className="new-service-card">
                            {serviceImage && (
                                <div
                                    className="new-service-image-wrap"
                                    style={{ "--service-image": `url(${serviceImage})` }}
                                >
                                    <img
                                        src={serviceImage}
                                        alt={serviceTitle}
                                        className="new-service-image"
                                    />
                                </div>
                            )}

                            <div className="new-service-content">
                                <h3>{serviceTitle}</h3>

                                {serviceDescription && (
                                    <p>{serviceDescription}</p>
                                )}

                                {serviceLink && (
                                    <span className="new-service-cta">
                                        Learn More
                                    </span>
                                )}
                            </div>
                        </div>
                    );

                    return serviceLink ? (
                        <a
                            href={serviceLink}
                            className="new-service-card-link"
                            key={`${serviceTitle}-${index}`}
                        >
                            {cardContent}
                        </a>
                    ) : (
                        <div key={`${serviceTitle}-${index}`}>
                            {cardContent}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default NewServicesSection;