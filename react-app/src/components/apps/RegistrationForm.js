// @ts-nocheck
import React, {useState} from 'react';
import './registrationForm.css'; // Import CSS for styling
import axios from 'axios';

const RegistrationForm = ({email}) => {
    // State variables for form fields and validation errors
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [teamName, setTeamName] = useState('');
    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');

    console.log('this is the email that is being passed through', email);

    // Function to handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();


        // Validate first name
        if (!firstName) {
            setFirstNameError('First name is required');
            return;
        } else {
            setFirstNameError('');
        }

        // Validate last name
        if (!lastName) {
            setLastNameError('Last name is required');
            return;
        } else {
            setLastNameError('');
        }

        // Concatenate firstName and lastName into name
        const name = firstName + ' ' + lastName;

        try {
            // Send a POST request to register the parent
            const response = await axios.post('/server/alien_city_function/api/registerParent', {
                email,
                name,
                teamName
            });

            // Handle success response
            console.log('Parent registered successfully:', response.data);
        } catch (error) {
            // Handle error
            console.error('Error registering parent:', error);
        }

        // Reset form fields

        setFirstName('');
        setLastName('');
        setTeamName('');
    };

    return (
        <div className="form-container">
            <form onSubmit={handleSubmit} className="form">
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        disabled
                    />

                </div>
                <div className="form-group">
                    <label>First Name</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                    {firstNameError && <span className="error">{firstNameError}</span>}
                </div>
                <div className="form-group">
                    <label>Last Name</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                    {lastNameError && <span className="error">{lastNameError}</span>}
                </div>
                <div className="form-group">
                    <label>Team Name</label>
                    <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                    />
                </div>
                <button type="submit">Submit</button>
            </form>
        </div>
    );
};

export default RegistrationForm;
