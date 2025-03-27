// DocumentIcon.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const DocumentIcon = () => {
    const [isAnimating, setIsAnimating] = useState(true);

    // Stop the animation after 7 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimating(false);
        }, 7000); // 7000 ms = 7 seconds

        return () => clearTimeout(timer); // Cleanup the timer on component unmount
    }, []);

    return (
        <div style={{ width: '100px', height: '100px', position: 'relative' }}>
            <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 64 64"
                width="100%"
                height="100%"
                animate={isAnimating ? { y: [0, -5, 0] } : {}}
                transition={{
                    duration: 1,
                    repeat: isAnimating ? Infinity : 0, // Stop repeating after 7 seconds
                    repeatType: 'reverse'
                }}
            >
                {/* Background document - shadow effect */}
                <rect
                    x="8"
                    y="8"
                    width="40"
                    height="52"
                    fill="none"
                    stroke="#000"
                    strokeWidth="2"
                    opacity="0.2"
                />
                {/* Middle document */}
                <rect
                    x="6"
                    y="6"
                    width="40"
                    height="52"
                    fill="none"
                    stroke="#000"
                    strokeWidth="2"
                    opacity="0.6"
                />
                {/* Foreground document */}
                <rect
                    x="4"
                    y="4"
                    width="40"
                    height="52"
                    fill="white"
                    stroke="#000"
                    strokeWidth="2"
                />
                {/* "Text lines" on the foreground document */}
                <line
                    x1="10"
                    y1="14"
                    x2="30"
                    y2="14"
                    stroke="#4cd2d7"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <line
                    x1="10"
                    y1="22"
                    x2="35"
                    y2="22"
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <line
                    x1="10"
                    y1="30"
                    x2="35"
                    y2="30"
                    stroke="#4cd2d7"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                <line
                    x1="10"
                    y1="38"
                    x2="35"
                    y2="38"
                    stroke="#000"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </motion.svg>
        </div>
    );
};

export default DocumentIcon;
