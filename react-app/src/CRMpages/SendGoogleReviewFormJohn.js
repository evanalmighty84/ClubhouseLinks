import React, { useState } from 'react';
import { motion } from 'framer-motion';

const JohnHeusinkveldProfile = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/templates/send-thank-you-form-john', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email })
            });

            if (!response.ok) throw new Error('Something went wrong');

            alert('Thank you for subscribing!');
            setName('');
            setEmail('');
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit form. Please try again later.');
        }
    };

    return (
        <div style={{ fontFamily: 'Open Sans, sans-serif', backgroundColor: '#f7f7f7', margin: 0 }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    maxWidth: '1000px',
                    margin: '60px auto',
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }}
            >
                <div style={{ flex: '1 1 300px', padding: '20px', textAlign: 'center' }}>
                    <img
                        src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1740678993/Johnsheadshot_twwhf2.jpg"
                        alt="john Heusinkveld"
                        style={{ width: '180px', borderRadius: '50%', marginBottom: '15px' }}
                    />
                    <h2 style={{ marginBottom: '5px', color: '#1a3c64' }}>john Heusinkveld</h2>
                    <p><strong>Call:</strong> (214) 460-4433</p>
                    <p><strong>Email:</strong> <a href="mailto:johnh@thgc.com">johnh@thgc.com</a></p>

                    <form onSubmit={handleFormSubmit} style={{ marginTop: '20px' }}>
                        <h4>Get Email Updates</h4>
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={{
                                padding: '8px',
                                margin: '8px 0',
                                width: '80%',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}
                        />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                padding: '8px',
                                margin: '8px 0',
                                width: '80%',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                padding: '10px 18px',
                                backgroundColor: '#1a3c64',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                fontWeight: 'bold',
                                marginTop: '10px'
                            }}
                        >
                            Subscribe
                        </button>
                    </form>
                </div>

                <div style={{ flex: '2 1 400px', padding: '20px' }}>
                    <h3 style={{ color: '#1a3c64', marginTop: 0 }}>Please Write me a review!</h3>
                    <p>PO Box 118643, <br />Carrollton, TX 75011</p>
                    <p><strong>Phone:</strong> (972) 208-8797</p>
                    <div style={{ marginTop: '20px' }}>
                        <iframe
                            src="https://maps.google.com/maps?q=PO%20Box%20118643,%20Carrollton,%20TX%2075011&t=&z=15&ie=UTF8&iwloc=&output=embed"
                            width="100%"
                            height="250"
                            style={{ border: 0, borderRadius: '8px' }}
                            allowFullScreen=""
                            loading="lazy"
                            title="Google Map"
                        ></iframe>
                    </div>

                    <a
                        href="https://g.co/kgs/92q4sNf"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            marginTop: '20px',
                            padding: '10px 18px',
                            backgroundColor: '#fbbc05',
                            color: '#202124',
                            fontWeight: 'bold',
                            border: 'none',
                            borderRadius: '5px',
                            textDecoration: 'none'
                        }}
                    >
                        Leave a Google Review
                    </a>
                </div>
            </motion.div>
        </div>
    );
};

export default JohnHeusinkveldProfile;
