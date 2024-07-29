import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css'; // Import AOS styles

import Component1 from './template2/sampleportfolios2'; // Import your components
import Component2 from './templatemo_591_villa_agency/SamplePortfolios4';
import Component3 from './templatemo_587_tiya_golf_club/SamplePortfolios3';
import { Form } from "react-bootstrap";
import { useNavigate } from 'react-router-dom';

const gradients = [
    'white',
    'linear-gradient(to bottom right, #ffecb3, #ffd700)',
    'linear-gradient(to bottom right, #a9d8d8, cadetblue)',
    'linear-gradient(to bottom right, #7fc87f, #008B00)',
    'linear-gradient(to bottom right, #f5c2d5, #de4e7f)',
    'linear-gradient(to bottom right, #ffdab3, orange)',
    'linear-gradient(to bottom right, #b0d4e3, steelblue)',
    'linear-gradient(to bottom right, #f7e0c4, brown)',
];

const SamplePortfolio = () => {
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState('design1');
    const [selectedGradientIndex, setSelectedGradientIndex] = useState(0); // Default gradient index
    const navigate = useNavigate();

    useEffect(() => {
        AOS.init({
            duration: 2000,
            once: true,
        });
        AOS.refresh();
    }, []);



    const handleGradientChange = (event) => {
        setSelectedGradientIndex(event.target.value);
    };

    const handleCarouselControl = (direction) => {
        if (direction === 'prev') {
            setCarouselIndex((prevIndex) => (prevIndex === 0 ? gradients.length - 1 : prevIndex - 1));
        } else {
            setCarouselIndex((prevIndex) => (prevIndex === gradients.length - 1 ? 0 : prevIndex + 1));
        }
    };

    const handleOptionChange = (e) => {
        setSelectedOption(e.target.value);
    };

    const handleAddToCart = () => {
        const cartItem = {
            design: selectedOption,
            gradient: gradients[selectedGradientIndex],
            gradientIndex: selectedGradientIndex
        };
        navigate('/app/checkout', { state: { cartItem } });
    };

    const renderSelectedComponent = () => {
        switch (selectedOption) {
            case 'design1':
                return <Component1 />;
            case 'design2':
                return <Component2 />;
            case 'design3':
                return <Component3 />;
            default:
                return <Component1 />;
        }
    };

    return (
        <div>
            <main>
                <section className="section-padding" id="portfolio">
                    <div className="col-12">
                        <h2 className="mb-5 text-center" data-aos="fade-up">
                            Choose a <strong> Web Design Portfolio</strong>
                        </h2>
                    </div>
                    <div style={{ margin: 'auto' }} className="col-6 mb-4 text-center">
                        <select className="form-select" value={selectedOption} onChange={handleOptionChange}>
                            <option value="design1">Design 1</option>
                            <option value="design2">Design 2</option>
                            <option value="design3">Design 3</option>
                        </select>
                        <Form style={{ paddingTop: '2em' }}>
                            <Form.Group controlId="gradientSelect">
                                <Form.Label>Select Background Gradient</Form.Label>
                                <Form.Control
                                    as="select"
                                    value={selectedGradientIndex}
                                    onChange={handleGradientChange}
                                >
                                    {gradients.map((gradient, index) => (
                                        <option key={index} value={index}>
                                            Gradient {index + 1}
                                            {index > 0 && ' * (Premium Gradient)'}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Form>
                        <button style={{ background: 'linear-gradient(to bottom right, #7fc87f, #008B00)', borderColor: 'white' }} className="btn btn-primary mt-3" onClick={handleAddToCart}>Add to Cart</button>
                    </div>
                    <hr />
                    <div style={{ background: gradients[selectedGradientIndex], minHeight: '100vh', padding: '20px' }} className="container">
                        <div className="row">
                            <div className="col-12">
                                {renderSelectedComponent()}
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SamplePortfolio;
