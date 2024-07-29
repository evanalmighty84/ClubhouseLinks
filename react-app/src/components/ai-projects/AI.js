import React from 'react';
import { Container, Row, Col, Image } from 'react-bootstrap';

const SampleComponent = () => {
    return (
        <Container>
            <Row>
                <Col>
                    <Image src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1696268242/Banner_box1cg.gif" fluid style={{ marginTop: '1em' }} />
                    <p style={{ marginTop: '1em' }}>
                        <a href="https://www.clubhousesportslink.com">Link to Clubhouse Sports</a>
                    </p>
                </Col>
            </Row>
            <Row>
                <Col>
                    <h2>Artificial Intelligence Integration </h2>
                    <p>
                        Our AI projects enhance what is already great and makes it even greater. Using the latest machine learning and
                        large language model algorithims, we are able to automate ui design techniques and dynamic data not to mention
                        animate projects to life. Our clubhouse sports link is a great example of this
                    </p>
                    <p>
                      Clubhouse Sports Links leverages AI go automate news stories to create dynamic content with animated
                        photo-realistic images. It also leverages youtube api video content customization through the power of AI.
                    </p>
                </Col>
            </Row>
        </Container>
    );
};

export default SampleComponent;
