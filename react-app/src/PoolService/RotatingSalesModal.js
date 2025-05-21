import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import './RotatingSalesModal.css';

import Image1 from './images/Home.png';
import Image2 from './images/before-after-fort-worth-pool-remodel.jpg';
import Image3 from './images/sel-marin.jpeg'; // Replace with another appropriate image

const modalSlides = [
    {
        color: '#ffffff',
        image: Image1,
        content: (
            <>
                <h2 className="text-white text-center">Why Choose Us?</h2>
                <ul className="text-white">
                    <li><strong>✅ Stunning Websites Built for Pool Professionals</strong></li>
                    <p>Mobile-responsive designs that make your business shine.</p>
                    <li><strong>✅ Rank Higher with Smart SEO</strong></li>
                    <p>Get found on Google by local customers looking for pool services.</p>
                </ul>
            </>
        )
    },
    {
        color: '#ffffff',
        image: Image2,
        content: (
            <>
                <h2 className="text-dark text-center">Lead Generation That Works</h2>
                <ul className="text-dark">
                    <li><strong>✅ Text-to-Phone Contact Forms</strong></li>
                    <p>Never miss a lead—get texts instantly.</p>
                    <li><strong>✅ Google Business Page Optimization</strong></li>
                    <p>Boost local visibility and bring in traffic that converts.</p>
                </ul>
            </>
        )
    },
    {
        color: '#ffffff',
        image: Image3,
        content: (
            <>
                <h2 className="text-white text-center">Social Media Marketing</h2>
                <ul className="text-white">
                    <li><strong>✅ Facebook & Instagram Ad Management</strong></li>
                    <p>We run campaigns that turn views into real customers.</p>
                </ul>
            </>
        )
    }
];

const RotatingSalesModal = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showModal, setShowModal] = useState(true);
    const [showMainContent, setShowMainContent] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % modalSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleSkip = () => {
        setCurrentSlide((prev) => (prev + 1) % modalSlides.length);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setShowMainContent(true);
    };

    return (
        <div>
            {!showMainContent && (
                <Modal show={showModal} onHide={handleCloseModal} centered>
                    <div style={{ backgroundColor: modalSlides[currentSlide].color }} className="p-4">
                        <img
                            src={modalSlides[currentSlide].image}
                            alt="slide"
                            className="w-100 mb-3 rounded"
                            style={{ maxHeight: '250px', objectFit: 'cover' }}
                        />
                        <div>{modalSlides[currentSlide].content}</div>
                        <div className="text-center mt-4 d-flex justify-content-between">
                            <Button variant="dark" onClick={handleSkip}>Skip</Button>
                            <Button variant="light" onClick={handleCloseModal}>Close</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {showMainContent && (
                <div className="main-content container py-5 text-white bg-light rounded">
                    <h1 style={{color:'black'}} className="text-center mb-4">What We Do</h1>
                    <p className="lead">
                        At Clubhouse Links Media, we build websites specifically for pool service professionals. Our designs are mobile-friendly, SEO-rich, and visually impactful to help you stand out from competitors.
                    </p>
                    <p>
                        We include smart tools like lead forms that send contact info to your phone in real time. Plus, we optimize your Google Business Profile and manage your Facebook/Instagram ad campaigns to maximize leads.
                    </p>
                    <div className="text-center mt-5">
                        <img src={Image2} alt="Before and After Pool" className="img-fluid rounded mb-4" />
                        <img src={Image3} alt="Luxury Pool" className="img-fluid rounded" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RotatingSalesModal;
