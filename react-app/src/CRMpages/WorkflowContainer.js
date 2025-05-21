import React, { useState, useEffect } from 'react';
import { Toast, Button } from 'react-bootstrap';
import CreateWorkflowForm from '../CRMcomponents/CreateWorkflowForm';
import TemplateCreate from '../CRMcomponents/TemplateCreate';
import CampaignCreate from '../CRMpages/CampaignCreate2';
import axios from "axios";

const WorkflowContainer = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedInterval, setSelectedInterval] = useState(0);
    const [showTemplateCreate, setShowTemplateCreate] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [campaigns, setCampaigns] = useState([]);
    const [userLists, setUserLists] = useState([]);

    const fetchCampaigns = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
            try {
                const response = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/user/${user.id}`);
                const campaigns = response.data;
                const sortedCampaigns = campaigns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setCampaigns(sortedCampaigns);

                const listResponse = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/user/${user.id}`);
                setUserLists(listResponse.data);
            } catch (error) {
                console.error('Error fetching campaigns:', error);
            }
        }
    };
    const handleCreateWorkflow = (workflow) => {
        if (workflow.name) {
            setSelectedCategory(workflow.name);

            if (workflow.activity) {
                setSelectedInterval(workflow.activity);
            } else {
                setSelectedInterval(0); // Optional: Assign a fallback value
            }

            setShowTemplateCreate(true);
        } else {
            setShowToast(true);
        }
    };


    useEffect(() => {
        fetchCampaigns();
    }, []);

    return (
        <div className="container py-5 pt-0 pb-0">
            {/* Go Back Button */}


            {/* Conditionally Render Template */}
            {showTemplateCreate ? (
                selectedCategory === 'Sale' || selectedCategory === 'Advertisement' ? (

                    <CampaignCreate campaigns={campaigns} selectedCategory={selectedCategory} />
                ) : (
                    <TemplateCreate selectedInterval={selectedInterval} selectedCategory={selectedCategory} />
                )
            ) : (
                <CreateWorkflowForm templates={templates} onCreateWorkflow={handleCreateWorkflow} />
            )}
            <Button
                variant="secondary"
                onClick={() => setShowTemplateCreate(false)}
                style={{ display: 'block', margin: '4em auto', fontSize: '16px' }}
            >
                Start Over
            </Button>
            <Toast
                onClose={() => setShowToast(false)}
                show={showToast}
                delay={3000}
                autohide
                style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}
            >
                <Toast.Header>
                    <strong className="mr-auto">Warning</strong>
                </Toast.Header>
                <Toast.Body>Please select a Workflow Category before proceeding.</Toast.Body>
            </Toast>
        </div>
    );
};

export default WorkflowContainer;
