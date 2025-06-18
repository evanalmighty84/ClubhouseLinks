import React, { useState } from 'react';
import Portfolio1 from '../clientportfolio1.jpeg';
import Portfolio2 from '../clientportfolio2.jpeg';
import Portfolio3 from '../clientportfolio3.jpeg';
import Portfolio4 from '../clientportfolio4.jpeg';
import Portfolio5 from '../clientportfolio5.jpeg';
import Portfolio6 from '../clientportfolio6.jpeg';
import Portfolio7 from '../clientportfolio7.jpeg';
import Portfolio8 from '../clientportfolio8.jpeg';
import './ClientPortfolios.css';

const allPortfolios = [
    {
        title: 'Life Insurance Planner',
        description: 'A clean, informative site that helps clients easily explore life insurance options.',
        image: Portfolio4,
        category: 'Insurance',
    },
    {
        title: 'Workforce Training Agency',
        description: 'Highlights training programs, certifications, and career paths.',
        image: Portfolio1,
        category: 'Education',
    },
    {
        title: 'Pool Service – Clearly1',
        description: 'CRM-integrated site with alerts, route scheduling, and service tracking.',
        image: Portfolio2,
        category: 'Pool',
    },
    {
        title: 'Pool Service – Eclipse Pool Service',
        description: 'Pool cleaning site with login portals and SMS notifications.',
        image: Portfolio3,
        category: 'Pool',
    },
    {
        title: 'General Contractor',
        description: 'Showcases builds, renovations, and bid request tools.',
        image: Portfolio6,
        category: 'Contractor',
    },
    {
        title: 'Roofing Contractor',
        description: 'Highlights projects, testimonials, and quote requests.',
        image: Portfolio5,
        category: 'Roofing',
    },
    {
        title: 'Photography',
        description: 'Family Portraits, Landscape Photography and more',
        image: Portfolio7,
        category: 'Photography',
    },
    {
        title: 'Pool Service – Mercedes Pool Service',
        description: 'Showcases online store, Youtube Channel, and Social Media Advertising',
        image: Portfolio8,
        category: 'Pool',
    }
];

const ClientPortfolios = () => {
    const [filter, setFilter] = useState('All');

    const filtered = filter === 'All'
        ? allPortfolios
        : allPortfolios.filter(p => p.category === filter);

    const uniqueCategories = ['All', ...Array.from(new Set(allPortfolios.map(p => p.category)))];

    return (
        <section className="portfolio-section">
            <div className="portfolio-header">
                <h2>Client Portfolios</h2>
                <select
                    className="portfolio-filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    {uniqueCategories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            <div className="portfolio-grid">
                {filtered.map((p, i) => (
                    <div className="portfolio-card" key={i}>
                        <img src={p.image} alt={p.title} className="portfolio-img" />
                        <div className="portfolio-overlay">
                            <h5 style={{color:'white'}}>{p.title}</h5>
                            <p style={{color:'white'}}>{p.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ClientPortfolios;
