import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button, Form, Toast, ToastContainer } from 'react-bootstrap';
import VideoOverlay from '../CRMpages/CRMutils/dashboardanimations';

const SignUp = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showModal, setShowModal] = useState(false); // Modal visibility
    const [validationError, setValidationError] = useState(''); // Validation error message
    const navigate = useNavigate();

    // Handle sign-up
    const handleSignUp = async (e) => {
        e.preventDefault();
        setValidationError(''); // Clear previous errors

        try {
            const response = await axios.post('/server/crm_function/api/auth/signup/', { email, password, name });
            setShowModal(true); // Show modal for success
        } catch (error) {
            console.error('Sign-up failed', error.response);

            // Check if the error is from the backend and has a specific message
            if (error.response && error.response.data && error.response.data.error) {
                setValidationError(error.response.data.error);
            } else {
                setValidationError('An unexpected error occurred. Please try again.');
            }
        }
    };

    // Handle modal close and redirect to sign-in
    const handleModalClose = () => {
        setShowModal(false);
        navigate('/app/signin'); // Redirect to sign-in page
    };

    return (
        <div>
            {/* Sign-Up Form */}
            <VideoOverlay />
            <Form onSubmit={handleSignUp} className="p-4 rounded shadow bg-white" style={{ margin: 'auto', maxWidth: '1000px', width: '100%' }}>
                <h3 className="text-center mb-4">Sign Up</h3>

                {/* Name Field */}
                <Form.Group className="mb-3" controlId="formBasicName">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        required
                        isInvalid={validationError === 'Name is required'}
                    />
                    <Form.Control.Feedback type="invalid">
                        {validationError === 'Name is required' && validationError}
                    </Form.Control.Feedback>
                </Form.Group>

                {/* Email Field */}
                <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email"
                        required
                        isInvalid={validationError === 'User already exists'}
                    />
                    <Form.Control.Feedback type="invalid">
                        {validationError === 'User already exists' && validationError}
                    </Form.Control.Feedback>
                </Form.Group>

                {/* Password Field */}
                <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        isInvalid={validationError === 'Invalid password'}
                    />
                    <Form.Control.Feedback type="invalid">
                        {validationError === 'Invalid password' && validationError}
                    </Form.Control.Feedback>
                </Form.Group>

                {/* Sign-Up Button */}
                <Button style={{ backgroundColor: 'steelblue' }} variant="primary" type="submit" className="w-100">
                    Sign Up
                </Button>
            </Form>

            {/* Modal Prompting Email Verification */}
            <Modal show={showModal} onHide={handleModalClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Email Verification</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Sign-up successful! Please check your email inbox for a verification link to complete the process.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="success" onClick={handleModalClose}>
                        Go to Sign In
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default SignUp;
