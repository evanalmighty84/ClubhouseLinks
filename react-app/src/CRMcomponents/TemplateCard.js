import React from 'react';
import { Card, Col, Button } from 'react-bootstrap';
import { FaFileAlt } from 'react-icons/fa';
import AnimatedSavedTemplateIcon from "../icons/AnimatedSavedTemplateIcon";

const TemplateCard = ({ template }) => {
    const handlePreview = () => {
        const previewWindow = window.open('', 'Preview', 'width=600,height=800');
        previewWindow.document.write(`
            <html>
                <head><title>Template Preview</title></head>
                <body>${template.content}</body>
            </html>
        `);
        previewWindow.document.close();
    };

    return (
        <Col xs={12} md={6} lg={3} className="mb-4">
            <Card style={{ borderStyle: 'solid', borderColor: 'white', borderWidth: '.5em' }}>
             <AnimatedSavedTemplateIcon/>
                <Card.Body style={{ background: 'linear-gradient(to bottom right, #a9d8d8, indigo)' }}>
                    <Card.Title>{template.name}</Card.Title>
                    <Button onClick={handlePreview} variant="primary" style={{ marginTop: '10px' }}>
                        Preview
                    </Button>
                </Card.Body>
            </Card>
        </Col>
    );
};

export default TemplateCard;
