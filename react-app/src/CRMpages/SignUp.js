import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Modal, Button, Form } from "react-bootstrap";
import { Turnstile } from "@marsidev/react-turnstile";

import VideoOverlay from "../components/WideMovieLogo.gif";
import crmImage from "../components/Untitled_design_7_o9dfvi_c_crop,w_1116,h_628,ar_16_9.png";
import "./SignUpCyberpunk.css";

const SignUp = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    // Spam protection
    const [turnstileToken, setTurnstileToken] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");

    // UI state
    const [showModal, setShowModal] = useState(false);
    const [validationError, setValidationError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    const handleSignUp = async (e) => {
        e.preventDefault();

        setValidationError("");

        /*
         * Do not allow submission unless Cloudflare
         * Turnstile has successfully produced a token.
         */
        if (!turnstileToken) {
            setValidationError(
                "Please complete the security verification."
            );
            return;
        }

        /*
         * Prevent double-click / repeated submissions.
         */
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            await axios.post(
                "https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/auth/signup/",
                {
                    email,
                    password,
                    name,

                    /*
                     * Cloudflare Turnstile token.
                     * The backend verifies this against
                     * TURNSTILE_SECRET_KEY.
                     */
                    turnstileToken,

                    /*
                     * Honeypot field.
                     *
                     * A real user will never see or fill this.
                     * Bots that automatically populate inputs
                     * may fill it and get silently rejected.
                     */
                    companyWebsite,
                }
            );

            setShowModal(true);

        } catch (error) {
            console.error("Sign-up failed", error.response);

            /*
             * Rate limiter response
             */
            if (error.response?.status === 429) {
                setValidationError(
                    "Too many signup attempts. Please try again later."
                );

                return;
            }

            /*
             * Backend Turnstile failure
             */
            if (error.response?.status === 403) {
                setValidationError(
                    error.response?.data?.error ||
                    "Security verification failed. Please try again."
                );

                /*
                 * Force another Turnstile verification.
                 */
                setTurnstileToken("");

                return;
            }

            if (error.response?.data?.error) {
                setValidationError(
                    error.response.data.error
                );
            } else {
                setValidationError(
                    "An unexpected error occurred. Please try again."
                );
            }

        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        navigate("/signin");
    };

    return (
        <div className="cyber-signup-page">

            <Form
                onSubmit={handleSignUp}
                className="cyber-signup-card"
            >

                {/*
                 * ============================================
                 * HONEYPOT
                 * ============================================
                 *
                 * Intentionally hidden off-screen.
                 *
                 * Do NOT use type="hidden".
                 * Some bots know to ignore hidden inputs.
                 */}
                <div
                    style={{
                        position: "absolute",
                        left: "-10000px",
                        top: "auto",
                        width: "1px",
                        height: "1px",
                        overflow: "hidden",
                    }}
                    aria-hidden="true"
                >
                    <label htmlFor="companyWebsite">
                        Company Website
                    </label>

                    <input
                        id="companyWebsite"
                        name="companyWebsite"
                        type="text"
                        value={companyWebsite}
                        onChange={(e) =>
                            setCompanyWebsite(e.target.value)
                        }
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </div>


                <div className="cyber-signup-header">
                    <img
                        src={crmImage}
                        alt="Clubhouse Links CRM"
                        className="cyber-signup-img"
                    />

                    <div>
                        <p className="cyber-kicker">
                            New Operator Access
                        </p>

                        <h2>
                            Clubhouse Links CRM Sign Up
                        </h2>

                        <span>
                            Create your AI lead command profile
                        </span>
                    </div>
                </div>


                <Form.Group
                    className="mb-3"
                    controlId="formBasicName"
                >
                    <Form.Label>
                        Name
                    </Form.Label>

                    <Form.Control
                        className="cyber-input"
                        type="text"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                        placeholder="Enter your name"
                        required
                        maxLength={100}
                        isInvalid={
                            validationError === "Name is required"
                        }
                    />

                    <Form.Control.Feedback type="invalid">
                        {validationError === "Name is required" &&
                            validationError}
                    </Form.Control.Feedback>
                </Form.Group>


                <Form.Group
                    className="mb-3"
                    controlId="formBasicEmail"
                >
                    <Form.Label>
                        Email
                    </Form.Label>

                    <Form.Control
                        className="cyber-input"
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        placeholder="operator@email.com"
                        required
                        maxLength={254}
                        autoComplete="email"
                        isInvalid={
                            validationError ===
                            "User already exists"
                        }
                    />

                    <Form.Control.Feedback type="invalid">
                        {validationError ===
                            "User already exists" &&
                            validationError}
                    </Form.Control.Feedback>
                </Form.Group>


                <Form.Group
                    className="mb-3"
                    controlId="formBasicPassword"
                >
                    <Form.Label>
                        Password
                    </Form.Label>

                    <Form.Control
                        className="cyber-input"
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        placeholder="Create access key"
                        required
                        minLength={6}
                        maxLength={200}
                        autoComplete="new-password"
                        isInvalid={
                            validationError ===
                            "Invalid password"
                        }
                    />

                    <Form.Control.Feedback type="invalid">
                        {validationError ===
                            "Invalid password" &&
                            validationError}
                    </Form.Control.Feedback>
                </Form.Group>


                {/*
                 * ============================================
                 * CLOUDFLARE TURNSTILE
                 * ============================================
                 */}
                <div
                    className="mb-3"
                    style={{
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <Turnstile
                        siteKey={
                            process.env
                                .REACT_APP_TURNSTILE_SITE_KEY
                        }

                        onSuccess={(token) => {
                            setTurnstileToken(token);
                            setValidationError("");
                        }}

                        onExpire={() => {
                            setTurnstileToken("");
                        }}

                        onError={() => {
                            setTurnstileToken("");

                            setValidationError(
                                "Security verification failed. Please try again."
                            );
                        }}
                    />
                </div>


                {validationError &&
                    ![
                        "Name is required",
                        "User already exists",
                        "Invalid password",
                    ].includes(validationError) && (
                        <div className="cyber-error">
                            {validationError}
                        </div>
                    )}


                <Button
                    type="submit"
                    className="cyber-submit w-100"
                    disabled={
                        isSubmitting ||
                        !turnstileToken
                    }
                >
                    {isSubmitting
                        ? "Creating Account..."
                        : "Create Account"}
                </Button>

            </Form>


            <Modal
                show={showModal}
                onHide={handleModalClose}
                centered
                contentClassName="cyber-success-modal"
            >
                <Modal.Header
                    closeButton
                    className="cyber-success-header"
                >
                    <Modal.Title>
                        Email Verification
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body className="cyber-success-body">
                    <p>
                        Sign-up successful! Please check your
                        email inbox for a verification link to
                        complete the process.
                    </p>
                </Modal.Body>

                <Modal.Footer className="cyber-success-footer">
                    <Button
                        onClick={handleModalClose}
                        className="cyber-submit"
                    >
                        Go to Sign In
                    </Button>
                </Modal.Footer>
            </Modal>


            <img
                src={VideoOverlay}
                alt="Clubhouse Links animation"
                className="cyber-signup-gif"
            />

        </div>
    );
};

export default SignUp;