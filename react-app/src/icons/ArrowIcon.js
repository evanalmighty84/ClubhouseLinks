// ArrowIcon.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ArrowIcon = () => {
    const [isAnimating, setIsAnimating] = useState(true);

    // Stop the animation after 7 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimating(false);
        }, 7000); // 7000 ms = 7 seconds

        return () => clearTimeout(timer); // Cleanup timer on component unmount
    }, []);

    // Define animation variants
    const arrowVariants = {
        animate: {
            x: isAnimating ? [0, 5, 0] : 0 // Move the arrow to the right and back if animating
        },
        transition: {
            duration: 0.5, // Duration of each move
            repeat: isAnimating ? Infinity : 0, // Repeat indefinitely if animating
        }
    };

    return (
        <div style={{ display: 'flex', gap: '5px' }}>
            <motion.div
                initial="initial"
                animate="animate"
                transition={arrowVariants.transition}
                variants={arrowVariants}
                style={{ fontSize: '2rem', color: 'black' }}
            >
                &#10140;
            </motion.div>
            <motion.div
                initial="initial"
                animate="animate"
                transition={arrowVariants.transition}
                variants={arrowVariants}
                style={{ fontSize: '2rem', color: 'black' }}
            >
                &#10140;
            </motion.div>
            <motion.div
                initial="initial"
                animate="animate"
                transition={arrowVariants.transition}
                variants={arrowVariants}
                style={{ fontSize: '2rem', color: '#4cd2d7' }}
            >
                &#10140;
            </motion.div>
        </div>
    );
};

export default ArrowIcon;
