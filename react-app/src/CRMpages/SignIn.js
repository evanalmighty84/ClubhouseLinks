import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';

const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [validationError, setValidationError] = useState(''); // Validation error message
    const [showModal, setShowModal] = useState(true); // Control modal visibility
    const navigate = useNavigate();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setValidationError(''); // Clear previous errors

        try {
            const response = await axios.post('/server/crm_function/api/auth/signin/', { email, password });
            const { user, token } = response.data;

            // Store user and token in localStorage
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);

            // Redirect to dashboard after successful sign-in
            navigate('/app/dashboard');
        } catch (error) {
            console.error('Sign-in failed', error);

            // Check for backend error response and set appropriate validation error
            if (error.response && error.response.data && error.response.data.error) {
                setValidationError(error.response.data.error); // Use error message from backend
            } else {
                setValidationError('An unexpected error occurred. Please try again.');
            }
        }
    };

    const handleSignUp = () => {
        setShowModal(false); // Hide modal
        navigate('/app/signup'); // Redirect to sign-up page
    };

    return (
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Modal.Header closeButton>
                <Modal.Title>Sign In</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSignIn}>
                    {/* Email Field */}
                    <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email"
                            required
                            isInvalid={validationError === 'User not found'}
                        />
                        <Form.Control.Feedback type="invalid">
                            {validationError === 'User not found' && validationError}
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

                    {/* Validation Message */}
                    {validationError && !['User not found', 'Invalid password'].includes(validationError) && (
                        <div className="text-danger mb-3">{validationError}</div>
                    )}

                    {/* Sign-in Button */}
                    <Button style={{ backgroundColor: 'steelblue' }} variant="primary" type="submit" className="w-100">
                        Sign In
                    </Button>
                </Form>
            </Modal.Body>

            <Modal.Footer>
                <div className="text-center w-100">
                    <span>Don't have an account yet? </span>
                    <Button style={{ color: 'green' }} variant="link" onClick={handleSignUp}>
                        Click here to sign up
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default SignIn;
