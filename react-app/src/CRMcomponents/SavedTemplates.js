import React, { useEffect, useState } from 'react';
import { Row } from 'react-bootstrap';
import axios from 'axios';
import TemplateCard from './TemplateCard';

const SavedTemplates = () => {
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await axios.get('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/templates/all');
                setTemplates(response.data);
            } catch (error) {
                console.error('Error fetching templates:', error);
            }
        };

        fetchTemplates();
    }, []);

    return (
        <Row>
            {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
            ))}
        </Row>
    );
};

export default SavedTemplates;
