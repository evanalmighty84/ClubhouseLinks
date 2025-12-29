import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';

const SignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [validationError, setValidationError] = useState('');
    const [showModal, setShowModal] = useState(true);
    const navigate = useNavigate();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setValidationError('');

        try {
            const response = await axios.post(
                'https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/auth/signin/',
                { email, password }
            );

            const { user, token } = response.data;

            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);

            navigate('/dashboard');
        } catch (error) {
            console.error('Sign-in failed', error);

            if (error.response?.data?.error) {
                setValidationError(error.response.data.error);
            } else {
                setValidationError('An unexpected error occurred. Please try again.');
            }
        }
    };

    const handleSignUp = () => {
        setShowModal(false);
        navigate('/signup');
    };

    // ✅ NEW
    const handlePrivacyPolicy = () => {
        setShowModal(false);
        navigate('/privacy-policy');
    };

    return (
        <Modal show={showModal} onHide={() => setShowModal(false)} centered>
            <Button
                disabled
                style={{ backgroundColor: 'steelblue', opacity: '1.0' }}
                variant="primary"
                className="w-100"
            >
                <h2 style={{ padding: '20px' }}>Clubhouse Links CRM</h2>
            </Button>

            <Modal.Header closeButton />

            <Modal.Body>
                <Form onSubmit={handleSignIn}>
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

                    {validationError &&
                        !['User not found', 'Invalid password'].includes(validationError) && (
                            <div className="text-danger mb-3">{validationError}</div>
                        )}

                    <Button
                        style={{ backgroundColor: 'steelblue' }}
                        variant="primary"
                        type="submit"
                        className="w-100"
                    >
                        Sign In
                    </Button>
                </Form>
            </Modal.Body>

            <Modal.Footer className="flex-column">
                <div className="text-center w-100 mb-2">
                    <span>Don't have an account yet? </span>
                    <Button style={{ color: 'green' }} variant="link" onClick={handleSignUp}>
                        Click here to sign up
                    </Button>
                </div>

                {/* ✅ NEW Privacy Policy link */}
                <div className="text-center w-100">
                    <Button
                        variant="link"
                        style={{ fontSize: '0.85rem', color: 'steelblue' }}
                        onClick={handlePrivacyPolicy}
                    >
                        Privacy Policy
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default SignIn;
