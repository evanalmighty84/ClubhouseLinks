import React from 'react';
import { Card, Col } from 'react-bootstrap';
import { FaIndustry, FaHistory, FaFileAlt } from 'react-icons/fa';

const WorkflowCard = ({ workflow }) => {
    const cardStyle = {
        color: 'white',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderStyle: 'solid',
        borderColor: 'white',
        borderWidth: '.5em'
    };

    return (
        <Col xs={12} md={6} lg={3} className="mb-4">
            <Card style={cardStyle}>
                <Card.Img as={FaFileAlt} size={48} className="m-3" style={{ color: '#28a745' }} />
                <Card.Body style={{ background: 'linear-gradient(to right bottom, #34eb92, #23ad6a)' }}>
                    <Card.Title>{workflow.name}</Card.Title>
                    <Card.Text>
                        <strong>Industry:</strong> {workflow.industryTag || 'Any'}
                    </Card.Text>
                    <Card.Text>
                        <strong>Activity:</strong> {workflow.activity || 'Any'}
                    </Card.Text>
                    <Card.Text>
                        <strong>Template:</strong> {workflow.templateName}
                    </Card.Text>
                </Card.Body>
            </Card>
        </Col>
    );
};

export default WorkflowCard;
