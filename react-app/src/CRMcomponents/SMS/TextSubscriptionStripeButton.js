// TextSubscriptionStripeButton.js
import React, { useEffect, useState } from 'react';

const TextSubscriptionStripeButton = () => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]')) {
            const script = document.createElement('script');
            script.src = "https://js.stripe.com/v3/buy-button.js";
            script.async = true;
            script.onload = () => setLoaded(true);
            document.body.appendChild(script);
        } else {
            setLoaded(true); // already loaded
        }
    }, []);

    if (!loaded) return null; // don't try to render button until ready

    return (
        <stripe-buy-button
            buy-button-id="buy_btn_1R9Z0oLVTbVnCRoaNLCeGXZ6"
            publishable-key="pk_live_4s4TtIY6HXHbiKpHOoFGvQRf"
        />
    );
};

export default TextSubscriptionStripeButton;
