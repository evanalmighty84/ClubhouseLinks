import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const PoolReferral = () => {
    const [showModal, setShowModal] = useState(true);
    const [showBackground, setShowBackground] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        referralFirstName: '',
        referralLastName: '',
        referralBusinessName: '',
        referralPaymentUsername: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const closeModal = () => {
        setShowModal(false);
        setShowBackground(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(
                'http://localhost:5000/server/crm_function/api/pool/poolreferrals/',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                }
            );
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || response.statusText);
            }
            // Optionally handle success response
        } catch (err) {
            console.error('Error submitting referral:', err);
        }
        closeModal();
    };

    const backgroundUrl = showBackground
        ? 'https://res.cloudinary.com/duz4vhtcn/image/upload/v1747787727/7CAF164F-418F-445A-8925-DFE931A4981E_dr4i4q.jpg'
        : 'https://res.cloudinary.com/duz4vhtcn/image/upload/v1748019452/853872-hd_1920_1080_25fps_hooash.gif';

    return (
        <div
            style={{
                backgroundImage: `url('${backgroundUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: showModal ? 'center' : 'flex-start',
                justifyContent: 'center',
                paddingTop: showModal ? 0 : '4rem',
            }}
        >
            {/* Modal Form */}
            {showModal && (
                <>
                    <div className="modal show d-block" tabIndex="-1" style={{ zIndex: 10 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Pool Referral</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={closeModal}
                                    />
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={handleSubmit}>
                                        {/* User Details */}
                                        <div className="mb-3">
                                            <label htmlFor="firstName" className="form-label">
                                                Customer First Name
                                            </label>
                                            <input
                                                id="firstName"
                                                name="firstName"
                                                type="text"
                                                className="form-control"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="lastName" className="form-label">
                                                Customer Last Name
                                            </label>
                                            <input
                                                id="lastName"
                                                name="lastName"
                                                type="text"
                                                className="form-control"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="phone" className="form-label">
                                                Customer Phone Number
                                            </label>
                                            <input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                className="form-control"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <hr />

                                        {/* Referral Details */}
                                        <div className="mb-3">
                                            <label htmlFor="referralFirstName" className="form-label">
                                                Referral First Name
                                            </label>
                                            <input
                                                id="referralFirstName"
                                                name="referralFirstName"
                                                type="text"
                                                className="form-control"
                                                value={formData.referralFirstName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="referralLastName" className="form-label">
                                                Referral Last Name
                                            </label>
                                            <input
                                                id="referralLastName"
                                                name="referralLastName"
                                                type="text"
                                                className="form-control"
                                                value={formData.referralLastName}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="referralBusinessName" className="form-label">
                                                Referral Business Name
                                            </label>
                                            <input
                                                id="referralBusinessName"
                                                name="referralBusinessName"
                                                type="text"
                                                className="form-control"
                                                value={formData.referralBusinessName}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label htmlFor="referralPaymentUsername" className="form-label">
                                                Referral Venmo/PayPal Username
                                            </label>
                                            <input
                                                id="referralPaymentUsername"
                                                name="referralPaymentUsername"
                                                type="text"
                                                className="form-control"
                                                value={formData.referralPaymentUsername}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <button type="submit" className="btn btn-primary w-100">
                                            Submit Referral
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" style={{ zIndex: 5 }} />
                </>
            )}

            {/* Post-Submission Message */}
            {!showModal && (
                <div
                    style={{
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                        padding: '2rem',
                        borderRadius: '0.5rem',
                        maxWidth: '600px',
                        textAlign: 'center',
                        zIndex: 10,
                        marginTop: '20rem',
                    }}
                >
                    <p>
                        Sending leads to <strong>Clubhouse Links</strong> helps us connect customers with top-notch pool maintenance companies. By partnering with us, you’ll see increased business for your clients—pool maintenance companies—and in turn, more demand for your pool store or distribution business. Let’s grow together!
                    </p>
                </div>
            )}
        </div>
    );
};

export default PoolReferral;
