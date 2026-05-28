import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Modal, Button, Form } from "react-bootstrap";
import crmImage from "../components/Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png";
import "./SignInCyberpunk.css";

const SignIn = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [validationError, setValidationError] = useState("");
    const [showModal, setShowModal] = useState(true);
    const navigate = useNavigate();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setValidationError("");

        try {
            const response = await axios.post(
                "https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/auth/signin/",
                { email, password }
            );

            const { user, token } = response.data;

            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("token", token);

            navigate("/dashboard");
        } catch (error) {
            console.error("Sign-in failed", error);

            if (error.response?.data?.error) {
                setValidationError(error.response.data.error);
            } else {
                setValidationError("An unexpected error occurred. Please try again.");
            }
        }
    };

    const handleSignUp = () => {
        setShowModal(false);
        navigate("/signup");
    };

    const handlePrivacyPolicy = () => {
        setShowModal(false);
        navigate("/privacy-policy");
    };

    return (
        <Modal
            show={showModal}
            onHide={() => setShowModal(false)}
            centered
            dialogClassName="cyber-signin-dialog"
            contentClassName="cyber-signin-modal"
        >
            <Modal.Header closeButton className="cyber-signin-header">
                <div className="cyber-brand-wrap">
                    <img src={crmImage} alt="Clubhouse Links CRM" className="cyber-crm-img" />

                    <div>
                        <p className="cyber-kicker">AI Lead Command Center</p>
                        <h2>Clubhouse Links CRM</h2>
                        <span>Secure operator access</span>
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body className="cyber-signin-body">
                <Form onSubmit={handleSignIn}>
                    <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                            className="cyber-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="operator@email.com"
                            required
                            isInvalid={validationError === "User not found"}
                        />
                        <Form.Control.Feedback type="invalid">
                            {validationError === "User not found" && validationError}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="formBasicPassword">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            className="cyber-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter access key"
                            required
                            isInvalid={validationError === "Invalid password"}
                        />
                        <Form.Control.Feedback type="invalid">
                            {validationError === "Invalid password" && validationError}
                        </Form.Control.Feedback>
                    </Form.Group>

                    {validationError &&
                        !["User not found", "Invalid password"].includes(validationError) && (
                            <div className="cyber-error">{validationError}</div>
                        )}

                    <Button type="submit" className="cyber-submit w-100">
                        Sign In
                    </Button>
                </Form>
            </Modal.Body>

            <Modal.Footer className="cyber-signin-footer">
                <div>
                    Don&apos;t have an account yet?
                    <Button variant="link" onClick={handleSignUp} className="cyber-link">
                        Click here to sign up
                    </Button>
                </div>

                <Button variant="link" onClick={handlePrivacyPolicy} className="cyber-privacy">
                    Privacy Policy
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default SignIn;