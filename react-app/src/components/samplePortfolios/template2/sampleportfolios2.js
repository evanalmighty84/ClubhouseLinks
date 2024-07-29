import React, { useState, useEffect } from 'react';
import AOS from 'aos';


import BookingIframe from "../../common/Iframe";
import HeroVideo from '../videos/vecteezy_the-vet-is-taking-the-pug-dog-on-her-arms_35314315 (1).mp4';
import HeroPoster from '../videos/vecteezy_the-vet-is-taking-the-pug-dog-on-her-arms_35314315 (1).mp4';
import HomeImage from '../../home.png'
import ClubhousePoster from '../images/people/vecteezy_doctor-examines-sick-dog-ai-generated_28622043.jpg'
import ClubhouseVideo from '../videos/Revolutionize Your Pet Grooming Business_ AI-Powered Solutions.mp4'
import Image1 from '../images/vecteezy_ai-generated-doctor-poses-with-a-dog-in-front-of-a-blue_38819562.jpeg';
import Image2 from '../images/vecteezy_ai-generated-doctor-poses-with-a-dog-in-front-of-a-blue_38819564.jpeg';
import Image3 from '../images/people/vecteezy_doctor-examines-sick-dog-ai-generated_28622043.jpg';
import Image4 from '../images/vecteezy_ai-generated-happy-veterinary-clinic-vibes_40513845.jpg';
import Image5 from '../images/people/working-business-lady.jpg';
import ElenaImage from '../images/vecteezy_cute-smart-pug-puppy-dog-in-the-backyard_45797973.jpg';
import NewsImage1 from '../images/vecteezy_person-holding-a-smartphone-with-a-screen-showing-5-yellow_8510218.jpg';
import NewsImage2 from '../images/vecteezy_dog-in-real-life-happy-moment-with-pet_24637537.jpg';
import NewsImage3 from '../videos/vecteezy_two-brown-dogs-digging-the-ground-for-hunting-fat-pets_32544191.gif';
import PortfolioImage1 from '../images/people/vecteezy_pet-hairdresser-woman-cutting-fur-of-cute-yellow-dog_11930357.jpg';
import PortfolioImage2 from '../images/people/vecteezy_dog-in-real-life-happy-moment-with-pet_24637503.jpg';
import PortfolioImage3 from '../images/vecteezy_woman-s-hand-giving-a-dry-bath-to-an-orange-cat-in-the-house_39652123.jpg';
import PortfolioImage4 from '../images/people/vecteezy_ai-generated-globe-books-and-cute-dog-in-graduation-cap-on_37227259.jpeg';
import Typist from "react-typist";
import DaysmartPlugin from "../../common/Test";
import ClubhousePromo from "../../common/ClubhousePromo";

const SamplePortfolio2 = () => {
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
<ClubhousePromo/>

                <section className="hero" id="hero" style={{ marginBottom:'0%',marginTop:'5%'}}>

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
                                        <a className="nav-link" href="./sampleportfolios2#hero">
                                            Home
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./sampleportfolios2#portfolio">
                                            Pets
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./sampleportfolios2#portfolio">
                                            Links
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./sampleportfolios2#news">
                                            Sponsorship and More
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./sampleportfolios2#news">
                                       PetStream App
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./sampleportfolios2#news">
                                           Pet Palace Login
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="./sampleportfolios2#news">
                                            Pet Palace Sign Up
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
                <section className="" id="about">
                    <div className="container mb-5 pb-lg-5">
                        <div className="row">
                            <div className="col-12">

                                <h2 className="mb-3" data-aos="fade-up">
                                Welcome!
                                </h2>
                            </div>
                            <div className="col-lg-6 col-12 mt-3 mb-lg-5">

                                <p className="me-4" data-aos="fade-up" data-aos-delay="300">
                                    Welcome to Pet  Palace, {' '}
                                    <a rel="nofollow" href="http://paypal.me/templatemo" target="_blank">
                                        the ultimate destination for pampering your furry friends!
                                    </a>{' '}
                                    At our state-of-the-art facility, we offer top-notch grooming services tailored to meet the unique needs of every pet.
                                    {' '}
                                    <a rel="nofollow" href="https://templatemo.com/tm-567-nomad-force" target="_parent">
                                        From luxurious baths and stylish haircuts to nail trimming and ear cleaning, our professional and caring staff ensures your pet looks and feels their best.
                                    </a>{' '}
                                    With a focus on comfort and safety, Pet Palace is dedicated to providing a stress-free, enjoyable grooming experience for your beloved companion. <br />
                                    <br />
                                        </p>
                            </div>
                            <div className="col-lg-6 col-12 mt-lg-3 mb-lg-5">
                                <p data-aos="fade-up" data-aos-delay="500">
                                    Treat your dog or cat to the royal treatment they deserve at Pet Palace!
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
Pet Palace is dedicated to making your pet's stay as comfrotable as possible                                    </h3>
                                    <p className="text-secondary-white-color" data-aos="fade-up">
                                        Over 20 years serving our community
                                    </p>
                                    <div className="mt-3 custom-links">
                                        <a href="./sampleportfolios2#news" className="text-white custom-link" data-aos="zoom-in" data-aos-delay="100">
                                           Read about Us
                                        </a>
                                        <a href="./sampleportfolios2#contact" className="text-white custom-link" data-aos="zoom-in" data-aos-delay="300">
                                            Contact us
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
                                                <h3 className="text-white mb-0">Mallory R.</h3>
                                                <p className="text-secondary-white-color mb-0">Small Breeds Groomer</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 1 ? 'active' : ''}`}>
                                            <img src={Image4} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-primary">
                                                <h3 className="text-white mb-0">Morgan S.</h3>
                                                <p className="text-secondary-white-color mb-0">Large Breeds Groomer</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 2 ? 'active' : ''}`}>
                                            <img src={Image1} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-success">
                                                <h3 className="text-white mb-0">Patrick W.</h3>
                                                <p className="text-secondary-white-color mb-0">In House Vet</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 3 ? 'active' : ''}`}>
                                            <img src={Image2} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-info">
                                                <h3 className="text-white mb-0">Robinson H.</h3>
                                                <p className="text-secondary-white-color mb-0">Dog/Cat Grooming Director</p>
                                            </div>
                                        </div>
                                        <div className={`carousel-item ${carouselIndex === 4 ? 'active' : ''}`}>
                                            <img src={Image5} className="img-fluid team-image" alt="" />
                                            <div className="team-thumb bg-danger">
                                                <h3 className="text-white mb-0">Rachel M.</h3>
                                                <p className="text-secondary-white-color mb-0">Owner of Doggy Palace</p>
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
                                   Services
                                </h2>
                            </div>
                            <div className="col-lg-6 col-12">
                                <div className="portfolio-thumb mb-5" data-aos="fade-up">
                                    <a href={PortfolioImage1} className="image-popup">
                                        <img src={PortfolioImage1} className="img-fluid portfolio-image" alt="" />
                                    </a>
                                    <div className="portfolio-info">
                                        <h4 className="portfolio-title mb-0">Grooming</h4>
                                        <p className="text-danger">7 days a week. Available 365 days</p>
                                    </div>
                                </div>
                                <div className="portfolio-thumb" data-aos="fade-up">
                                    <a href={PortfolioImage2} className="image-popup">
                                        <img src={PortfolioImage2} className="img-fluid portfolio-image" alt="" />
                                    </a>
                                    <div className="portfolio-info">
                                        <h4 className="portfolio-title mb-0">Daycamp</h4>
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
                                        <h4 className="portfolio-title mb-0">Boarding</h4>
                                        <p className="text-warning">Luxury boarding facilities with three different rooms to choose from. We also
                                            have a cat room.</p>
                                    </div>
                                </div>
                                <div className="portfolio-thumb" data-aos="fade-up">
                                    <a href={PortfolioImage4} className="image-popup">
                                        <img src={PortfolioImage4} className="img-fluid portfolio-image" alt="" />
                                    </a>
                                    <div className="portfolio-info">
                                        <h4 className="portfolio-title mb-0">Training</h4>
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
                                   News and Events
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
                                           Pet Palace Reviews from customers
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
                                                    Doggy Summer Training Camp
                                                </a>
                                            </h5>
                                            <div className="d-flex flex-wrap">
              <span className="text-muted me-2">
                <i className="bi-geo-alt-fill me-1 mb-2 mb-lg-0"></i>
                Pet Palace
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
                                        <div style={{backgroundColor:'black'}} className="news-category  text-white">PetStream</div>
                                    </div>
                                    <div className="news-bottom w-100">
                                        <div className="news-text-info">
                                            <h5 className="news-title">
                                                <a  style={{color:'black'}} href="news-detail.html" className="news-title-link">
                                                    The New Pet Stream App is here!
                                                </a>
                                                Now view recordings of your pet's having a blast!
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

export default SamplePortfolio2;