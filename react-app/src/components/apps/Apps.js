import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import RegistrationForm from './RegistrationForm';
import TeamStreamGif from '../samplePortfolios/videos/TeamStreamFinal.gif';
import PetStreamGif from '../../components/samplePortfolios/videos/vecteezy_two-brown-dogs-digging-the-ground-for-hunting-fat-pets_32544191.gif';

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
            const idToken = response.credential; // Access the credential directly
            const backendResponse = await axios.post(`/server/home_page_function/api/login`, { idToken });
            const { accessToken } = backendResponse.data;
            const { name } = backendResponse.data;
            const { email } = backendResponse.data;
            const { storeName } = backendResponse.data;
            const { role } = backendResponse.data;

            // Store token securely (e.g., in localStorage)
            localStorage.setItem('accessToken', accessToken);
            setAccessToken(accessToken); // Set the access token state
            setName(name);
            setEmail(email);
            setStoreName(storeName);
            setRole(role);

            // Redirect or perform other actions after successful login
            console.log('User response is', response);
            console.log('User accessToken is ', accessToken);
            console.log('User name is ', name);
            console.log('User email is ', email);
            console.log('User store name is ', storeName);
            console.log('User role is ', role);

            if (role === 'NewPetParent') {
                setShowRegistration(true);
                console.log(role);
            } else {
                navigate(`/app/petDashboard/${storeName}/${name}`, {
                    state: {
                        email,
                        accessToken,
                        name,
                        storeName,
                        role
                    }
                }); // Redirect to /app/petDashboard if accessToken and email are present
            }
        } catch (error) {
            console.error('Login failed:', error);
            // Handle login error (e.g., display error message)
        }
    };

    const handleError = (error) => {
        console.error('Google login failed:', error);
        // Handle login failure (e.g., display error message)
    };

    useEffect(() => {
        console.log(accessToken); // Log the access token state when it changes
    }, [accessToken]);

    return (
        <Container style={{ display: 'inline-flex' }}>
            <Row>
                <Col>
                    <Image src={TeamStreamGif} fluid style={{ marginTop: '1em', paddingRight: '5em' }} />
                    <GoogleLogin
                        clientId="179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com"
                        onSuccess={handleSuccess}
                        onFailure={handleError}
                    />
                    {showRegistration && <RegistrationForm email={email} />}

                    <Image width='640px' src={PetStreamGif} fluid style={{ marginTop: '1em', paddingRight: '5em' }} />
                    <GoogleLogin
                        clientId="179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com"
                        onSuccess={handleSuccess}
                        onFailure={handleError}
                    />
                    {showRegistration && <RegistrationForm email={email} />}
                </Col>
            </Row>
            <Row>
                <Col>
                    <h2>Clubhouse Links Apps Integration</h2>
                    <p>
                        Our apps are second to none. Whether it's our face animator or live sports streaming and recording,
                        we offer valuable use cases for all of our clients.
                    </p>
                    <p>
                        If you have an app idea, we can make it come to life with top-notch, enterprise-level development.
                    </p>
                </Col>
            </Row>
        </Container>
    );
};

export default Apps;
