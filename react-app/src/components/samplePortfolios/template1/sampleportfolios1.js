import React, { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './css/bootstrap.min.css';
import './css/bootstrap-icons.css';
import './css/magnific-popup.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import './css/aos.css';
import './css/templatemo-nomad-force.css';

import HeroVideo from '../videos/soccerkids3.mp4';
import HeroPoster from '../videos/792bd98f3e617786c850493560e11c45.jpg';
import HomeImage from '../../home.png'
import Image1 from '../images/people/asia-business-woman-feeling-happy-smiling-looking-camera-while-relax-home-office.jpg';
import Image2 from '../images/people/happy-african-american-professional-manager-smiling-looking-camera-headshot-portrait.jpg';
import Image3 from '../images/people/studio-shot-beautiful-happy-retired-caucasian-female-with-pixie-hairdo-crossing-arms-her-chest-having-confident-look-smiling-broadly.jpg';
import Image4 from '../images/people/project-leder-with-disabilities-looking-front-sitting-immobilized-wheelchair-business-office-room.jpg';
import Image5 from '../images/people/working-business-lady.jpg';
import ElenaImage from '../images/people/pexels-gerardo-vazquez-garcia-3475787-5194384.jpg';
import NewsImage1 from '../images/people/Plano-Sports-Authority.jpeg';
import NewsImage2 from '../images/people/basketball-camp.jpeg';
import NewsImage3 from '../videos/TeamStreamFinal.gif';
import PortfolioImage1 from '../images/people/Soccer1.jpg';
import PortfolioImage2 from '../images/people/basketball2.jpg';
import PortfolioImage3 from '../images/people/softball.webp';
import PortfolioImage4 from '../images/people/volleyball3.jpeg';
import Typist from "react-typist";

const SamplePortfolio = () => {
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

                <section className="hero" id="hero" style={{ width:'95%', marginTop:'0px'}}>
                    <p style={{padding:'1em'}}> Our Website building is second to none. We can offer live streaming integration for bigger clients
                        as well as pinpoint website animation for a smaller company looking to stand out.
                        This page demonstrates a balance between the two for recreational sports web site.
                    </p>
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
                                        <a className="nav-link" href="../sampleportfolios#hero">
                                            Home
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="../sampleportfolios#portfolio">
                                            Sports
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="../sampleportfolios#portfolio">
                                            Links
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="../sampleportfolios#news">
                                            Sponsorship and More
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="../sampleportfolios#news">
                                            Parent Corner
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="../sampleportfolios#news">
                                            Daysmart Login
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="../sampleportfolios#news">
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
                            autoPlay
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
                <section className="section-padding pb-0" id="about">
                    <div className="container mb-5 pb-lg-5">
                        <div className="row">
                            <div className="col-12">
                                <h2 className="mb-3" data-aos="fade-up">
                                    About Us...
                                </h2>
                            </div>
                            <div className="col-lg-6 col-12 mt-3 mb-lg-5">
                                <p className="me-4" data-aos="fade-up" data-aos-delay="300">
                                    PSA was founded {' '}
                                    <a rel="nofollow" href="http://paypal.me/templatemo" target="_blank">
                                        as a non-profit organization in December 1970
                                    </a>{' '}
                                    when the local individual sports leagues incorporated to form one administrative youth sports organization{' '}
                                    <a rel="nofollow" href="https://templatemo.com/tm-567-nomad-force" target="_parent">
                                        PSA provides quality year-round recreational and competitive youth sports leagues
                                    </a>{' '}
                                    to over 100,000 youth who live the North Texas area.  PSA offers: Basketball, Soccer, Volleyball, Tackle Football, Flag Football, Cheerleading, Baseball, Fastpitch Softball, Martial Arts, Dance Team, Summer Camps, Winter Break Camps, Spring Break Camps, and Rugby.  <br />
                                    <br />
                                    Additionally, PSA offers club or select sports with Texas Thunder Soccer Club and STORM Volleyball Club along with Basketball Skills, Volleyball Clinics and Soccer Skills.
                                </p>
                            </div>
                            <div className="col-lg-6 col-12 mt-lg-3 mb-lg-5">
                                <p data-aos="fade-up" data-aos-delay="500">
                                    With the growth of Plano, McKinney, Frisco, Allen, Collin County and the surrounding areas with the
                                    demands of sports facilities needed to play indoor sports and outdoor sports, PSA embarked on new horizons with the
                                    building of PSA 1, PSA 2, PSA Murphy, and PSA McKinney.  PSA leads all other youth organizations with centers housing 38+ basketball
                                    and volleyball courts and four indoor turf arenas.
                                    PSA also offers Adult indoor soccer and Adult basketball.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-lg-3 col-12 p-0">
                                <img src={ElenaImage} className="img-fluid about-image" alt="" />
                            </div>
                            <div className="col-lg-3 col-12 bg-dark">
                                <div className="d-flex flex-column flex-wrap justify-content-center h-100 py-5 px-4 pt-lg-4 pb-lg-0">
                                    <h3 className="text-white mb-3" data-aos="fade-up">
                                        PSA is dedicated to seeing every young person who wants to play sports have that opportunity.
                                    </h3>
                                    <p className="text-secondary-white-color" data-aos="fade-up">
                                        Over 50 years serving community involvement
                                    </p>
                                    <div className="mt-3 custom-links">
                                        <a href="../sampleportfolios#news" className="text-white custom-link" data-aos="zoom-in" data-aos-delay="100">
                                            Read News & Events
                                        </a>
                                        <a href="../sampleportfolios#contact" className="text-white custom-link" data-aos="zoom-in" data-aos-delay="300">
                                            Work with Us
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-6 col-12 p-0">
                                <section id="myCarousel" className="carousel slide carousel-fade" data-bs-ride="carousel">
                                    <div className="carousel-inner">
                                        <div className={`carousel-item ${carouselIndex === 0 ? 'active' : ''}`}>
                                            <img src={Image3} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-warning">
                                                <h3 className="text-white mb-0">Susane R.</h3>
                                                <p className="text-secondary-white-color mb-0">Program Director</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 1 ? 'active' : ''}`}>
                                            <img src={Image4} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-primary">
                                                <h3 className="text-white mb-0">Morgan S.</h3>
                                                <p className="text-secondary-white-color mb-0">Site Director</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 2 ? 'active' : ''}`}>
                                            <img src={Image1} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-success">
                                                <h3 className="text-white mb-0">Naomi W.</h3>
                                                <p className="text-secondary-white-color mb-0">Gymnastics Director</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 3 ? 'active' : ''}`}>
                                            <img src={Image2} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-info">
                                                <h3 className="text-white mb-0">Robinson H.</h3>
                                                <p className="text-secondary-white-color mb-0">Basketball Director</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 4 ? 'active' : ''}`}>
                                            <img src={Image5} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-danger">
                                                <h3 className="text-white mb-0">Jane M.</h3>
                                                <p className="text-secondary-white-color mb-0">Project Management</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="carousel-control-prev" type="button" onClick={() => handleCarouselControl('prev')}>
                                        <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                                        <span className="visually-hidden">Previous</span>
                                    </button>
                                    <button className="carousel-control-next" type="button" onClick={() => handleCarouselControl('next')}>
                                        <span className="carousel-control-next-icon" aria-hidden="true"></span>
                                        <span className="visually-hidden">Next</span>
                                    </button>
                                </section>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section-padding" id="portfolio">
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <h2 className="mb-5 text-center" data-aos="fade-up">
                                    Sports
                                </h2>
                            </div>
                            <div className="col-lg-6 col-12">
                                <div className="portfolio-thumb mb-5" data-aos="fade-up">
                                    <a href={PortfolioImage1} className="image-popup">
                                        <img src={PortfolioImage1} className="img-fluid portfolio-image" alt="" />
                                    </a>
                                    <div className="portfolio-info">
                                        <h4 className="portfolio-title mb-0">Soccer</h4>
                                        <p className="text-danger">June1st- August 8th</p>
                                    </div>
                                </div>
                                <div className="portfolio-thumb" data-aos="fade-up">
                                    <a href={PortfolioImage2} className="image-popup">
                                        <img src={PortfolioImage2} className="img-fluid portfolio-image" alt="" />
                                    </a>
                                    <div className="portfolio-info">
                                        <h4 className="portfolio-title mb-0">Basketball</h4>
                                        <p className="text-success">June 6th- August 1st</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-6 col-12">
                                <div className="portfolio-thumb mt-5 mt-lg-0 mb-5" data-aos="fade-up">
                                    <a href={PortfolioImage3} className="image-popup">
                                        <img src={PortfolioImage3} className="img-fluid portfolio-image" alt="" />
                                    </a>
                                    <div className="portfolio-info">
                                        <h4 className="portfolio-title mb-0">Softball</h4>
                                        <p className="text-warning">June 12th - August 16th</p>
                                    </div>
                                </div>
                                <div className="portfolio-thumb" data-aos="fade-up">
                                    <a href={PortfolioImage4} className="image-popup">
                                        <img src={PortfolioImage4} className="img-fluid portfolio-image" alt="" />
                                    </a>
                                    <div className="portfolio-info">
                                        <h4 className="portfolio-title mb-0">Volleyball</h4>
                                        <p className="text-info">June 2nd - August 11th</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="news section-padding" id="news">
                    <div className="container">
                        <div className="row">
                            <div className="col-12">
                                <h2 className="mb-5 text-center" data-aos="fade-up">
                                    News & Events
                                </h2>
                            </div>
                            <div className="col-lg-6 col-12 mb-5 mb-lg-0">
                                <div className="news-thumb" data-aos="fade-up">
                                    <a href="news-detail.html" className="news-image-hover news-image-hover-warning">
                                        <img src={NewsImage1} className="img-fluid large-news-image news-image" alt="" />
                                    </a>
                                    <div className="news-category bg-warning text-white">News</div>
                                    <div className="news-text-info">
                                        <h5 className="news-title">
                                            <a href="news-detail.html" className="news-title-link">
                                                Plano Sports Authority named Texas' best facilities for
                                                community Sports by Dallas Magazine
                                            </a>
                                        </h5>
                                        <span className="text-muted">22 hours ago</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-6 col-12">
                                <div className="news-thumb news-two-column d-flex flex-column flex-lg-row" data-aos="fade-up">
                                    <div className="news-top w-100">
                                        <a href="news-detail.html" className="news-image-hover news-image-hover-primary">
                                            <img src={NewsImage2} className="img-fluid news-image" alt="" />
                                        </a>
                                        <div className="news-category bg-primary text-white">Camps</div>
                                    </div>
                                    <div className="news-bottom w-100">
                                        <div className="news-text-info">
                                            <h5 className="news-title">
                                                <a href="news-detail.html" className="news-title-link">
                                                    Mavericks Summer Basketball Camp
                                                </a>
                                            </h5>
                                            <div className="d-flex flex-wrap">
              <span className="text-muted me-2">
                <i className="bi-geo-alt-fill me-1 mb-2 mb-lg-0"></i>
                PSA 1
              </span>
                                                <span className="text-muted">July 16 - July 18th</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div  className="news-thumb news-two-column d-flex flex-column flex-lg-row" data-aos="fade-up">
                                    <div className="news-top w-100" data-aos="fade-up">
                                        <a href="news-detail.html" className="news-image-hover news-image-hover-success">
                                            <img style={{borderColor:'black', borderStyle:'solid'}} src={NewsImage3} className="img-fluid news-image" alt="" />
                                        </a>
                                        <div style={{backgroundColor:'black'}} className="news-category  text-white">TeamStream</div>
                                    </div>
                                    <div className="news-bottom w-100">
                                        <div className="news-text-info">
                                            <h5 className="news-title">
                                                <a  style={{color:'black'}} href="news-detail.html" className="news-title-link">
                                                    The New Team Stream App is here!
                                                </a>
                                                Now create recordings for your team to use as a coaches tool!
                                            </h5>
                                            <span className="text-muted">6 days ago</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>


            </main>
        </div>

    );
};

export default SamplePortfolio;