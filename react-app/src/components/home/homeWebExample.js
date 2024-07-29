import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './css/bootstrap.min.css';
import './css/bootstrap-icons.css';
import './css/magnific-popup.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import './css/aos.css';
import './css/templatemo-nomad-force.css';

import HeroVideo from '../samplePortfolios/videos/soccerkids3.mp4';
import HeroPoster from '../samplePortfolios/videos/792bd98f3e617786c850493560e11c45.jpg';
import HomeImage from '../home.png'

import Typist from "react-typist";

const HomeWebExample = () => {
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
        services: {
            branding: false,
            digitalExperiences: false,
            webDevelopment: false,
        },
    });

    useEffect(() => {
        AOS.init({
            duration: 2000,
            once: true,
        });
        AOS.refresh();
    }, []);

    const handleCarouselControl = (direction) => {
        if (direction === 'prev') {
            setCarouselIndex((prevIndex) => (prevIndex === 0 ? 4 : prevIndex - 1));
        } else {
            setCarouselIndex((prevIndex) => (prevIndex === 4 ? 0 : prevIndex + 1));
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData({
                ...formData,
                services: { ...formData.services, [name]: checked },
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission (e.g., send data to server)
        console.log('Form submitted:', formData);
    };

    return (

        <div>

            <main>

                <section className="hero" id="hero" style={{ width:'95%'}}>
                    <Typist
                        cursor={{ hideWhenDone: true }}
                        avgTypingDelay={30}
                        stdTypingDelay={20}
                    >
                        <span className="nameText">WordPress Integration </span>
                        <br /><br />
                        <Typist.Delay ms={500} />
                        <span className="descriptionText">Web Architecture</span>
                        <Typist.Backspace count={16} delay={300} />
                        <span className="descriptionText"> Analytic Integration</span>
                        <Typist.Backspace count={20} delay={300} />
                        <span className="descriptionText"></span>
                        <Typist.Backspace count={13} delay={300} />
                        <span className="descriptionText">Data Security</span>
                        <Typist.Backspace count={13} delay={300} />
                        <span className="descriptionText">API Integration</span>
                        <Typist.Backspace count={15} delay={300} />
                        <span className="descriptionText">Fullstack experience</span>
                        <Typist.Backspace count={20} delay={300} />
                        <span className="descriptionText">Wordpress Integration</span>
                    </Typist>

                    <hr style={{color:'black'}}/>
                </section>
                <section className="hero" id="hero" style={{ width:'95%',marginTop:'0em'}}>

                    <nav className="navbar navbar-expand-lg bg-light shadow-lg example">
                        <div className="container">
                            <a className="navbar-brand" href="index.html" style={{paddingLeft:'1em'}}>
                                <img width={'35em'}  src={HomeImage} />
                            </a>
                            <button style={{paddingRight:'2em'}}
                                className="navbar-toggler"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#navbarNav"
                                aria-controls="navbarNav"
                                aria-expanded="false"
                                aria-label="Toggle navigation"
                            >
                                <span className="navbar-toggler-icon"></span>
                            </button>
                            <div className="collapse navbar-collapse" id="navbarNav">
                                <ul className="navbar-nav mx-auto">
                                    <li className="nav-item active">
                                        <a className="nav-link" href="./homeWebExample#hero">
                                            Home
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./homeWebExample#portfolio">
                                            Sports
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./homeWebExample#portfolio">
                                            Links
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./homeWebExample#news">
                                            Sponsorship and More
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./homeWebExample#news">
                                            Parent Corner
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./homeWebExample#news">
                                            Daysmart Login
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./homeWebExample#news">
                                            Daysmart Sign Up
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </nav>
                    <div className="heroText">
                        <h1 className="text-white mt-5 mb-lg-4" data-aos="zoom-in" data-aos-delay="800">
                            Example Website
                        </h1>
                        <p className="text-secondary-white-color" data-aos="fade-up" data-aos-delay="1000">
                            For the kids, For the <strong className="custom-underline">community</strong>
                        </p>
                    </div>
                    <div className="videoWrapper">
                        <video
                            loop
                            muted
                            className="custom-video"
                            poster={HeroPoster}
                        >
                            <source src={HeroVideo} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    <div className="overlay"></div>
                </section>


            </main>
        </div>

    );
};

export default HomeWebExample;
