import React from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import facebookBusiness from '../facebookbusiness.png';
import facebookBusinessIcon from '../icons8-facebook-business-suite.svg';
import facebookBusinessStrategy from '../img.png';

const Marketing = () => {
    return (
        <Container className="text-center">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Image
                        src={facebookBusinessIcon}
                        fluid
                        className="d-none d-md-block mx-auto" // Center on medium (md) and larger screens
                        style={{ marginTop: '1em', width: '25%' }} // Smaller size for larger screens
                    />
                    <Image
                        src={facebookBusinessIcon}
                        fluid
                        className="d-block d-md-none mx-auto" // Center on small (sm) and smaller screens
                        style={{ marginTop: '1em', width: '100%' }} // Full width for smaller screens
                    />
                    <p style={{ marginTop: '1em' }}>
                        <a href="https://www.facebook.com/profile.php?id=100075825412940">Link to Clubhouse Marketing Facebook Business Page</a>
                    </p>
                </Col>
            </Row>
            <Row className="justify-content-center">
                <Col md={8}>
                    <h2>Clubhouse Marketing</h2>
                    <p>
                        In today's digital age, having a strong online presence is crucial for growing businesses to succeed. One of the most effective ways to establish an online presence is by having a Facebook Business Page. Facebook for business creates a vast potential audience to tap into, as the majority of your business's consumers are on Facebook as well.
                    </p>
                    <Image
                        src={facebookBusiness}
                        fluid
                        className="d-none d-md-block mx-auto" // Center on medium (md) and larger screens
                        style={{ marginTop: '1em', width: '50%' }} // Smaller size for larger screens
                    />
                    <Image
                        src={facebookBusiness}
                        fluid
                        className="d-block d-md-none mx-auto" // Center on small (sm) and smaller screens
                        style={{ marginTop: '1em', width: '100%' }} // Full width for smaller screens
                    />
                    <p>
                        According to a study conducted by Kleiner Perkins, 78% of American consumers have discovered products or businesses on Facebook, and 77% of consumers have made purchases after seeing a product on Facebook. This statistic alone highlights the importance of having a Facebook presence for growing businesses.
                    </p>
                    <Image
                        src={facebookBusinessStrategy}
                        fluid
                        className="d-none d-md-block mx-auto" // Center on medium (md) and larger screens
                        style={{ marginTop: '1em', width: '50%' }} // Smaller size for larger screens
                    />
                    <Image
                        src={facebookBusinessStrategy}
                        fluid
                        className="d-block d-md-none mx-auto" // Center on small (sm) and smaller screens
                        style={{ marginTop: '1em', width: '100%' }} // Full width for smaller screens
                    />
                </Col>
            </Row>
        </Container>
    );
};

export default Marketing;
