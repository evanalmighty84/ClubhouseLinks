import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DaysmartPlugin = () => {
    const [pluginContent, setPluginContent] = useState('');

    useEffect(() => {
        const fetchPluginContent = async () => {
            try {
                const response = await axios.get('/server/home_page_function/daysmart-plugin'); // Route on your Node.js server
                setPluginContent(response.data);
            } catch (error) {
                console.error('Error fetching Daysmart plugin:', error);
            }
        };

        fetchPluginContent();
    }, []);

    return (
        <div>
            {/* Render the plugin content fetched from the backend */}
            <iframe
                title="Daysmart Plugin"
                srcDoc={pluginContent} // Set the iframe content dynamically
                width="100%"
                height="600"
                frameBorder="0"
            />
        </div>
    );
};

export default DaysmartPlugin;
