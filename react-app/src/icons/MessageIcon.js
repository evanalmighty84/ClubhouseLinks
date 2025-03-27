// MessageIcon.js
import React, { useEffect, useState } from 'react';

const MessageIcon = () => {
    const [showAnimation, setShowAnimation] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShowAnimation(false), 7000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {showAnimation ? (
                <img
                    src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1731189188/CrmImages/recentactivityicon_aeft95.gif"
                    alt="Message Icon Animation"
                    width="64"
                    height="64"
                />
            ) : (
                <img
                    src="https://asset.cloudinary.com/duz4vhtcn/staticMessageImage" // Replace with the URL of the static image
                    alt="Message Icon Static"
                    width="64"
                    height="64"
                />
            )}
        </div>
    );
};

export default MessageIcon;
