import React from 'react';
import { Container, Row, Col, Image, Card } from 'react-bootstrap';
import facebookBusiness from '../facebookbusiness.png';
import facebookBusinessIcon from '../icons8-facebook-business-suite.svg';
import facebookBusinessStrategy from '../img.png';
import './Marketing.css';
import { FaPaperPlane, FaEnvelopeOpenText, FaPercentage, FaMousePointer, FaChartLine, FaChartBar } from 'react-icons/fa';


const Marketing = () => {
    return (
        <Container className="text-center">


            <Row className="justify-content-center">
                <Col md={8}>
                    <Image
                        src={facebookBusinessIcon}
                        fluid
                        className="d-none d-md-block mx-auto"
                        style={{ marginTop: '1em', width: '25%' }}
                    />
                    <Image
                        src={facebookBusinessIcon}
                        fluid
                        className="d-block d-md-none mx-auto"
                        style={{ marginTop: '1em', width: '100%' }}
                    />
                    <p className="text-center" style={{ maxWidth: '700px', margin: '0 auto', fontStyle: 'italic', marginBottom: '1rem' }}>
                        Understanding how your audience engages with your emails is crucial for crafting an effective strategy. Reporting and link tracking allow you to see what’s working, what’s not, and where interest is peaking — helping you build a smarter, more intentional follow-up plan that moves people through your messaging with purpose.
                    </p>

                    {/* CAMPAIGN REPORT SECTION */}
                    <Card className="mt-4 text-start">
                        <Card.Body>
                            <Card.Title className="text-center">
                                <FaChartBar style={{ color: 'hotpink', marginRight: '0.4em' }} />
                                Campaign Report
                            </Card.Title>                            <p><strong>Why I'm Sharing This After 40+ Years in Health and Life Insurance</strong></p>
                            <ul className="list-unstyled text-start">
                                <li><FaPaperPlane className="me-2" style={{ color: 'darkblue' }} /> <strong>Total Sent:</strong> 150</li>
                                <li><FaEnvelopeOpenText className="me-2" style={{ color: 'limegreen' }} /> <strong>Total Opened:</strong> 125</li>
                                <li><FaChartLine className="me-2" style={{ color: 'dodgerblue' }} /> <strong>Open Rate:</strong> 83.33%</li>
                                <li><FaMousePointer className="me-2" style={{ color: 'indigo' }} /> <strong>Total Clicked:</strong> 100</li>
                                <li><FaPercentage className="me-2" style={{ color: 'violet' }} /> <strong>Click Rate:</strong> 66.67%</li>
                            </ul>

                            <hr />
                            <p className="text-center" style={{backgroundColor:'lightyellow', maxWidth: '700px', margin: '1.5rem auto 1rem auto', fontStyle: 'italic' }}>
                                Here's a preview of the email your audience received. After your campaign has run, Alongside performance stats, our A.I. analyzes the content to suggest subtle improvements that could boost engagement — from subject lines to call-to-action placement. Small changes can make a big difference.
                            </p>
<hr/>
                            <h5>Email Preview:</h5>
                            <p><strong>Why I'm Sharing This After 40+ Years in Health and Life Insurance</strong></p>
                            <p>
                                I've seen firsthand how powerful prevention can be. Insurance helps protect people if something happens — but what about protecting your health before?
                            </p>
                            <p>
                                I have learned that your health is your most valuable asset. If there is one natural remedy that’s stood out to me, it's Blackseed Oil!
                                <br />
                                “It's been called the remedy for everything but death” — and for good reason.
                                <br />
                                From supporting your immune system to easing inflammation and boosting energy, Blackseed oil has helped me & many others for less than a dollar a day.
                            </p>
                            <p>
                                Please take about 9 minutes to watch this powerful video on how Blackseed Oil can improve your health. It just might be the most important thing you could do today for your well-being.
                                <br />
                                👉 <a href="https://youtu.be/oUdz3ooyoqE?si=zrJNkMzl2htn_BZk" target="_blank" rel="noreferrer">Watch Video</a>
                            </p>
                            <p>
                                This natural oil has been trusted for centuries — and today, it's helping people like us stay active, independent, and well.
                                <br />
                                🌿 <a href="https://getyourblackseedoil.com" target="_blank" rel="noreferrer">Visit: getyourblackseedoil.com</a>
                                <br />
                                Get started today!
                            </p>
                            <p>
                                <strong>Evan Ligon</strong>
                                <br />
                                <a href="https://getyourblackseedoil.com" target="_blank" rel="noreferrer">getyourblackseedoil.com</a>
                                <br />
                                📞 (214) 556-5210
                                <br />
                                📎 <em>Download Attachment 1</em>
                            </p>
                        </Card.Body>
                    </Card>


                </Col>
            </Row>

  {/*          <Row className="justify-content-center">
                <Col md={8}>
                    <h2>Clubhouse Marketing</h2>
                    <p>
                        In today's digital age, having a strong online presence is crucial for growing businesses to succeed...
                    </p>
                    <Image
                        src={facebookBusiness}
                        fluid
                        className="d-none d-md-block mx-auto"
                        style={{ marginTop: '1em', width: '50%' }}
                    />
                    <Image
                        src={facebookBusiness}
                        fluid
                        className="d-block d-md-none mx-auto"
                        style={{ marginTop: '1em', width: '100%' }}
                    />
                    <p>
                        According to a study conducted by Kleiner Perkins...
                    </p>
                    <Image
                        src={facebookBusinessStrategy}
                        fluid
                        className="d-none d-md-block mx-auto"
                        style={{ marginTop: '1em', width: '50%' }}
                    />
                    <Image
                        src={facebookBusinessStrategy}
                        fluid
                        className="d-block d-md-none mx-auto"
                        style={{ marginTop: '1em', width: '100%' }}
                    />
                </Col>
            </Row>*/}
        </Container>
    );
};

export default Marketing;
