// utils/dateUtils.js

import { format, subDays } from 'date-fns';

// Helper function to get the dynamic time periods for the last 30 days
export const getTimePeriodsForLast30Days = () => {
    const today = new Date();
    const periods = [];

    // Split the last 30 days into 5 intervals of 6 days each
    for (let i = 0; i < 5; i++) {
        const end = subDays(today, i * 6);
        const start = subDays(end, 5);  // Create a 6-day period
        periods.unshift({
            start: format(start, 'MMM dd'),  // Format start date
            end: format(end, 'MMM dd'),      // Format end date
            newContacts: Math.floor(Math.random() * 10),  // Replace with actual data
            unsubscribes: Math.floor(Math.random() * 5),  // Replace with actual data
            bounces: Math.floor(Math.random() * 3),       // Replace with actual data
        });
    }

    return periods;
};
