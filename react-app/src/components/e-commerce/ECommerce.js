import React from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';
import wordpressTheme from '../React-in-WordPress-Series-1.png';
import commerceJoinedImages from '../Magento-shopify-woocommerce-1024x673.png';
import wordpressLogo from '../3d-fluency-wordpress.png';

const ECommerce = () => {
    return (
        <Container className="text-center">
            <Row className="justify-content-center">
                <Col md={8}>
                    <Image
                        src={wordpressLogo}
                        fluid
                        className="d-none d-md-block mx-auto" // Center on medium (md) and larger screens
                        style={{ marginTop: '1em', width: '25%' }} // Smaller size for larger screens
                    />
                    <Image
                        src={wordpressLogo}
                        fluid
                        className="d-block d-md-none mx-auto" // Center on small (sm) and smaller screens
                        style={{ marginTop: '1em', width: '100%' }} // Full width for smaller screens
                    />
                    <p style={{ marginTop: '1em' }}>
                        <a href="./ECommerce#">Link to Envato Market coming soon</a>
                    </p>
                </Col>
            </Row>
            <Row className="justify-content-center">
                <Col md={8}>
                    <h2>Clubhouse E-Commerce Sites</h2>
                    <p>
                        E-Commerce is the way to go when selling products to your consumers. Our web development tools
                        are going to make your online platform easy to keep everything in one place. With Wordpress integration, and Data analytics,
                        you'll know what's hot and what's not.
                    </p>
                    <Image
                        src={commerceJoinedImages}
                        fluid
                        className="d-none d-md-block mx-auto" // Center on medium (md) and larger screens
                        style={{ marginTop: '1em', width: '50%' }} // Smaller size for larger screens
                    />
                    <Image
                        src={commerceJoinedImages}
                        fluid
                        className="d-block d-md-none mx-auto" // Center on small (sm) and smaller screens
                        style={{ marginTop: '1em', width: '100%' }} // Full width for smaller screens
                    />
                    <p>
                        Add shopify as well as other plugins to your site when using our service. Exponentially increase your sales and automation
                        with customized business architecture that you can't find anywhere else.
                    </p>
                    <Image
                        src={wordpressTheme}
                        fluid
                        className="d-none d-md-block mx-auto" // Center on medium (md) and larger screens
                        style={{ marginTop: '1em', width: '50%' }} // Smaller size for larger screens
                    />
                    <Image
                        src={wordpressTheme}
                        fluid
                        className="d-block d-md-none mx-auto" // Center on small (sm) and smaller screens
                        style={{ marginTop: '1em', width: '100%' }} // Full width for smaller screens
                    />
                </Col>
            </Row>
        </Container>
    );
};

export default ECommerce;
