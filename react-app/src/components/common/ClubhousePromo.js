import React, { useRef, useState } from 'react';
import ClubhousePoster from '../../components/samplePortfolios/images/people/vecteezy_doctor-examines-sick-dog-ai-generated_28622043.jpg';
import ClubhouseVideo from '../samplePortfolios/videos/Revolutionize Your Pet Grooming Business_ AI-Powered Solutions.mp4';
import Typist from 'react-typist'; // Assuming you use Typist for text animation

const ClubhousePromo = ({ video }) => {
    const videoRef = useRef(null);
    const [showText, setShowText] = useState(true);

    const handleVideoPlay = () => {
        setShowText(false); // Hide text when video starts playing
    };

    return (
        <div>
        <section className="hero" id="hero" style={{ margin: '5%', marginBottom: '10em', marginTop: '0px', height: '100%' }}>
            <p style={{ padding: '1em' }}>
                Our Website building is second to none. We can offer live streaming integration for bigger clients
                as well as pinpoint website animation for a smaller company looking to stand out.
                This page demonstrates a balance between the two for a pet daycare.
            </p>
            <section className="hero" id="hero" style={{ margin: '5%', marginBottom: '10em', marginTop: '0em', height: '100%' }}>
                <div className="container">
                </div>

                {showText && (
                    <div className="heroText">
                        <h1 className="text-white mt-5 mb-lg-4" data-aos="zoom-in" data-aos-delay="800">
                            How we're transforming PetCare
                        </h1>
                        <p className="text-secondary-white-color" data-aos="fade-up" data-aos-delay="1000">
                            For the pet lovers <strong className="custom-underline">community</strong>
                        </p>
                    </div>
                )}

                <div className="videoWrapper">
                    <video
                        ref={videoRef}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        className="custom-video"
                        poster={ClubhousePoster}
                        controls
                        onPlay={handleVideoPlay} // Hide text when video starts playing
                    >
                        <source src={ClubhouseVideo} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
                <div className="overlay"></div>
            </section>
        </section>
        </div>
    );
};

export default ClubhousePromo;
