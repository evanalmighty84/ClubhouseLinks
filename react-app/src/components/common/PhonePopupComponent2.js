import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaPhoneAlt } from 'react-icons/fa';
import './PhonePopup.css';

const PhonePopupComponent2 = ({ phoneNumber, show, handleClose }) => {
    const handleCall = () => {
        window.location.href = `tel:${phoneNumber}`;
    };

    return (
        <Modal show={show} onHide={handleClose} dialogClassName="custom-modal">
            <Modal.Header closeButton>
                <Modal.Title>Call Us</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                <FaPhoneAlt className="phone-icon" />
                <h4>Need assistance?</h4>
                <p>Call us now at <strong>{phoneNumber}</strong></p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleCall}>
                    Call Now
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PhonePopupComponent2;
