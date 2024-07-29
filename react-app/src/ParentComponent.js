import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FaPhoneAlt } from 'react-icons/fa';
import PhonePopupComponent1 from './components/common/PhonePopupComponent1';
import PhonePopupComponent2 from './components/common/PhonePopupComponent2';
import './components/common/PhonePopup.css';

const ParentComponent = () => {
    const [showModalOnLoad, setShowModalOnLoad] = useState(false);
    const [showModalOnClick, setShowModalOnClick] = useState(false);

    useEffect(() => {
        // Show the modal on page load
        setShowModalOnLoad(true);
    }, []);

    const handleCloseOnLoad = () => setShowModalOnLoad(false);
    const handleCloseOnClick = () => setShowModalOnClick(false);
    const handleShowOnClick = () => setShowModalOnClick(true);

    return (
        <Container>
            <Row className="justify-content-md-center mb-4">
                <Col md="6" className="text-center">
                    <h2 className="my-4">Contact/Hire</h2>
                    <Button
                        variant="link"
                        className="phone-button"
                        onClick={handleShowOnClick}
                    >
                        <FaPhoneAlt className="phone-icon" />
                    </Button>
                </Col>
            </Row>

            {/* Modal triggered by page load */}
            <PhonePopupComponent1
                phoneNumber="+1234567890"
                show={showModalOnLoad}
                handleClose={handleCloseOnLoad}
            />

            {/* Modal triggered by button click */}
            <PhonePopupComponent2
                phoneNumber="+1234567890"
                show={showModalOnClick}
                handleClose={handleCloseOnClick}
            />
        </Container>
    );
};

export default ParentComponent;
