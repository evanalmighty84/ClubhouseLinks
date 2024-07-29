import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Table, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import placeholderImage from '../samplePortfolios/images/people/vecteezy_woman-s-hand-giving-a-dry-bath-to-an-orange-cat-in-the-house_39652123.jpg'; // Replace with actual dog grooming images

function PetDashboard({ email, accessToken, name, storeName, role }) {
    const [videos, setVideos] = useState([]);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                // Replace with actual API endpoint for fetching dog grooming videos
                const response = await axios.get('/api/dog-grooming-videos');
                setVideos(response.data);
            } catch (error) {
                console.error('Error fetching videos:', error);
            }
        };

        fetchVideos();
    }, []);

    return (
        <Container fluid style={{ color: 'white' }}>
            {/* Top Section with Image */}
            <Row>
                <Col>
                    <img src={placeholderImage} alt="Placeholder" style={{ width: '100%', marginBottom: '1em' }} />
                </Col>
            </Row>

            {/* Middle Section - Dog Grooming Information */}
            <Row>
                <Col md={12}>
                    <Card className="mb-3" style={{ backgroundColor: 'brown', color: 'white' }}>
                        <Card.Body>
                            <Card.Title>{storeName}</Card.Title>
                            <Card.Text>
                                Our apps are second to none. Whether it's our face animator or live sports streaming and recording,
                                we offer valuable use cases for all of our clients.
                            </Card.Text>
                            <Card.Text>
                                If you have an app idea, we can make it come to life with top-notch, enterprise-level development.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Bottom Section - Dog Grooming Videos and Placeholder Components */}
            <Row>
                {/* Dog Grooming Videos */}
                <Col md={6}>
                    <Card className="mb-3" style={{ backgroundColor: 'steelblue', color: 'white' }}>
                        <Card.Body>
                            <Card.Title>{name}</Card.Title>
                            <Table striped bordered hover responsive className="mb-0">
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Video Title</th>
                                    <th>Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                {videos.map((video, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{video.title}</td>
                                        <td>
                                            <OverlayTrigger overlay={<Tooltip>Edit Video</Tooltip>}>
                                                <Button variant="info" size="sm" className="mr-1">
                                                    Edit
                                                </Button>
                                            </OverlayTrigger>
                                            <OverlayTrigger overlay={<Tooltip>Delete Video</Tooltip>}>
                                                <Button variant="danger" size="sm">
                                                    Delete
                                                </Button>
                                            </OverlayTrigger>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Placeholder Components */}
                <Col md={6}>
                    <Row>
                        <Col md={4}>
                            <Card className="mb-3" style={{ backgroundColor: '#de4e7f', color: 'white' }}>
                                <Card.Body>
                                    <Card.Title>Vaccinations Records 1</Card.Title>
                                    <Card.Text>
                                        Vaccinated 9/24
                                        Vaccinated 7/22
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="mb-3" style={{ backgroundColor: '#008B00', color: 'white' }}>
                                <Card.Body>
                                    <Card.Title>Medical Records</Card.Title>
                                    <Card.Text>
                                        Medication 1
                                        Medication 2
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="mb-3" style={{ backgroundColor: 'cadetblue', color: 'white' }}>
                                <Card.Body>
                                    <Card.Title>Grooming Records</Card.Title>
                                    <Card.Text>
                                        Bath
                                        Shampoo
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Container>
    );
}

export default PetDashboard;
