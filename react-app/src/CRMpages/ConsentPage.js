import React from 'react';
import './SMSConsentPage.css'; // optional if you want external styling

const SMSConsentPage = () => {
    return (
        <div className="sms-consent-container">
            <h1>SMS Opt-In Consent</h1>
            <p>
                By providing your phone number through ClubhouseCRM, you are consenting to receive SMS messages related to your subscribed services, appointment reminders, updates, and notifications.
            </p>
            <p>
                We respect your privacy. You will only receive messages relevant to your interaction with ClubhouseCRM and its affiliated services.
            </p>
            <p>
                You may opt-out of SMS communications at any time by replying STOP to any message or contacting our support.
            </p>
            <h3>What you are consenting to:</h3>
            <ul>
                <li>Receiving SMS reminders, notifications, and updates.</li>
                <li>Frequency of messages may vary.</li>
                <li>Standard message and data rates may apply.</li>
                <li>You can opt-out anytime by replying STOP.</li>
            </ul>
            <p>
                By continuing to use ClubhouseCRM and providing your phone number, you acknowledge and agree to this consent.
            </p>
            <div className="footer">
                <small>&copy; {new Date().getFullYear()} ClubhouseCRM. All rights reserved.</small>
            </div>
        </div>
    );
};

export default SMSConsentPage;
