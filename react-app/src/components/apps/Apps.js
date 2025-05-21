import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import CrmPicture from '../CRMPicture.jpg';
import RegistrationForm from './RegistrationForm';
import WeatherGif from '../samplePortfolios/videos/Storm.gif';
import HOAGif from '../samplePortfolios/videos/HOA.gif'
import TeamStreamGif from '../samplePortfolios/videos/TeamStreamFinal.gif';
import PetStreamGif from '../../components/samplePortfolios/videos/vecteezy_two-brown-dogs-digging-the-ground-for-hunting-fat-pets_32544191.gif';
import './appstore.css'
const Apps = () => {
    const [accessToken, setAccessToken] = useState('');
    const [name, setName] = useState('');
    const [storeName, setStoreName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [showRegistration, setShowRegistration] = useState(null);
    const navigate = useNavigate();

    const handleSuccess = async (response) => {
        try {
            const idToken = response.credential;
            const backendResponse = await axios.post(`/server/home_page_function/api/login`, { idToken });
            const { accessToken, name, email, storeName, role } = backendResponse.data;

            localStorage.setItem('accessToken', accessToken);
            setAccessToken(accessToken);
            setName(name);
            setEmail(email);
            setStoreName(storeName);
            setRole(role);

            if (role === 'NewPetParent') {
                setShowRegistration(true);
            } else {
                navigate(`/app/petDashboard/${storeName}/${name}`, {
                    state: { email, accessToken, name, storeName, role }
                });
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleError = (error) => {
        console.error('Google login failed:', error);
    };

    useEffect(() => {
        console.log(accessToken);
    }, [accessToken]);

    return (
        <Container fluid className="mt-4">
            <Row>
                {/* Left Column - Images and Google Sign-in */}
                <Col lg={6} className="d-flex flex-column align-items-center">

                    {/* Highlighted available section */}
                    <div className="mb-4" onClick={() => navigate('/signin')} style={{cursor: 'pointer', width: '100%', maxWidth: '400px', border: '2px solid green', position: 'relative', boxShadow: '0 4px 8px rgba(0, 128, 0, 0.5)', padding: '10px' }}>
                        <Image src={CrmPicture} style={{ width: '100%', height: '300px', objectFit: 'cover' }} fluid />
                        <span style={{ color: 'green', fontWeight: 'bold', position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(255,255,255,0.8)', padding: '5px 10px' }}>
        Available Now
    </span>
                        <p className="subtle-glow-text" style={{ paddingTop: '5px' }}> Our CRM allows you to stay connected with your clients when you need it the most
                        </p>
                    </div>

                    {/* Unavailable section 1 */}
                    <div className="mb-4" style={{ width: '100%', maxWidth: '400px', border: '1px solid #de4e7f', position: 'relative', padding: '10px' }}>
                        <Image src={TeamStreamGif} style={{ width: '100%', height: '300px', objectFit: 'cover' }} fluid />
                        <GoogleLogin
                            clientId="179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com"
                            onSuccess={handleSuccess}
                            onFailure={handleError}
                            buttonText="Sign in"
                            className="w-100 mt-2"
                            disabled
                        />
                        <span style={{ color: '#de4e7f', fontWeight: 'bold', position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(255,255,255,0.8)', padding: '5px 10px' }}>
                            Coming Soon
                        </span>
                        <p className="subtle-glow-text" style={{ paddingTop: '5px' }}>Stream your teams online</p>
                    </div>

                    {/* Unavailable section 2 */}
                    <div className="mb-4" style={{ width: '100%', maxWidth: '400px', border: '1px solid #de4e7f', position: 'relative', padding: '10px' }}>
                        <Image src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1738008528/DEC45041-201E-4621-A0BB-B03AF8BC13DA_h0lqfa.jpg" style={{ width: '100%', height: '300px', objectFit: 'cover' }} fluid />
                       {/* <GoogleLogin
                            clientId="179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com"
                            onSuccess={handleSuccess}
                            onFailure={handleError}
                            buttonText="Sign in"
                            className="w-100 mt-2"
                            disabled
                        />*/}

                        <span style={{ color: 'green', fontWeight: 'bold', position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(255,255,255,0.8)', padding: '5px 10px' }}>
        Available Now
    </span>
                        <p className="subtle-glow-text" style={{ paddingTop: '5px' }}>Edit your website without any coding required. Add pictures and more for just $29.99 a month.</p>

                    </div>
                </Col>

                {/* Right Column - Clubhouse Links Apps Integration and additional placeholders */}
                <Col lg={6} className="d-flex flex-column justify-content-center order-first order-lg-2">
                    {/* I want this section to come first on mobile   */}
                    <div>
                        <h2 style={{color:'black', textAlign:'center'}}>Clubhouse Links Apps Integration</h2>
                        <p>
                            Our apps are second to none. Whether it's our face animator or live sports streaming and recording,
                            we offer valuable use cases for all of our clients.
                        </p>
                        <p>
                            If you have an app idea, we can make it come to life with top-notch, enterprise-level development.
                        </p>
                    </div>

                    {/* New Placeholder image 1 */}
                    <a style={{cursor:'pointer'}} href="app/samplePortfolios#/app/samplePortfolios">  <div className="mb-4" style={{ width: '100%',  border: '1px solid #de4e7f', position: 'relative', padding: '10px' }}>
                        <Image src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1738006875/F3183F48-0316-492A-9664-E41C457CD21D_cnd5jo.jpg" style={{ width: '100%', height: '300px', objectFit: 'cover' }} fluid />
                        <span style={{ color: 'green', fontWeight: 'bold', position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(255,255,255,0.8)', padding: '5px 10px' }}>
        Available Now
    </span>
                        <p className="subtle-glow-text" style={{ paddingTop: '5px' }}> Our Website builder allows you to make your own templates with your own touch! try it today
                        </p>
                        </div></a>

                    {/* New Placeholder image 2 */}
                    <a href="https://www.clubhouselinks.com/pool">
                    <div className="mb-4" style={{ width: '100%',  border: '1px solid #de4e7f', position: 'relative', padding: '10px' }}>
                        <Image src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1747787727/7CAF164F-418F-445A-8925-DFE931A4981E_dr4i4q.jpg" style={{ width: '100%', height: '300px', objectFit: 'cover' }} fluid />
                        <span style={{ color: 'green', fontWeight: 'bold', position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'rgba(255,255,255,0.8)', padding: '5px 10px' }}>
        Available Now
    </span>

                        <p className="subtle-glow-text" style={{ paddingTop: '5px' }}>
                           Get an SEO website that serves you Pool Leads from A.I.
                        </p>
                    </div>
                    </a>
                </Col>
            </Row>
        </Container>
    );
};

export default Apps;
