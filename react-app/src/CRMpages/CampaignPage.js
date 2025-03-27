import React, { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Form, Modal, Carousel } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CRMstyles/CampaignPage.css';
import WorkflowContainer from "./WorkflowContainer";

const CampaignPage = () => {
    const navigate = useNavigate();

    const [campaigns, setCampaigns] = useState([]);
    const [userLists, setUserLists] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [selectedCampaignLists, setSelectedCampaignLists] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.id) {
            try {
                const response = await axios.get(`/server/crm_function/api/campaigns/user/${user.id}`);
                const campaigns = response.data;
                const sortedCampaigns = campaigns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setCampaigns(sortedCampaigns);
                const listResponse = await axios.get(`/server/crm_function/api/lists/user/${user.id}`);
                setUserLists(listResponse.data);
            } catch (error) {
                console.error('Error fetching campaigns:', error);
            }
        }
    };

    const handlePreview = (htmlContent) => {
        const previewWindow = window.open('', 'Preview', 'width=600,height=800');
        previewWindow.document.write(`
        <html>
            <head>
                <title>Campaign Preview</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
        </html>
        `);
        previewWindow.document.close();
    };

    const handleEditLists = (campaign) => {
        setSelectedCampaign(campaign);
        setSelectedCampaignLists(campaign.list_ids || []);
        setShowModal(true);
    };

    const handleSaveLists = async () => {
        try {
            const updatedCampaign = {
                ...selectedCampaign,
                list_ids: selectedCampaignLists,
            };

            await axios.put(`/server/crm_function/api/campaigns/${selectedCampaign.id}`, updatedCampaign);
            setShowModal(false);
            fetchCampaigns();
            toast.success('Campaign lists updated successfully!');
        } catch (error) {
            console.error('Error updating campaign lists:', error);
            toast.error('Failed to update campaign lists.');
        }
    };

    const handleListChange = (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions);
        const selectedListIds = selectedOptions.map((option) => parseInt(option.value));
        setSelectedCampaignLists(selectedListIds);
    };

    const handleRunCampaignAgain = async (campaignId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await axios.post(`/server/crm_function/api/campaigns/send/${campaignId}`, { userId: user.id });
            toast.success('Campaign sent successfully!');
        } catch (error) {
            console.error('Error resending campaign:', error);
            toast.error('Failed to resend the campaign.');
        }
    };

    const getCampaignLists = (listIds) => {
        return listIds.map((id) => {
            const list = userLists.find((list) => list.id === id);
            return list ? list.name : `List ID: ${id}`;
        }).join(', ');
    };

    return (

        <div className="campaign-page" style={{backgroundColor:'white'}}>
            <h3 style={{textAlign:'center',color:'rgb(255, 112, 67)'}}>Campaigns and Automated Emails</h3>
            {/* Active Campaigns Section with Carousel */}
            <Row>
                <h4 style={{ textAlign: 'center' }}>Active Campaigns</h4>
                <small style={{ color: "gray", textAlign: 'center' }}>swipe to go through</small>
                <Col>
                    <Carousel
                        interval={null}
                        controls={true} // Enable navigation arrows
                        indicators={false}
                        className="mt-3"
                    >
                        {campaigns.map((campaign, index) => (
                            <Carousel.Item key={campaign.id} className="text-center">
                                <Card className="p-2 shadow-sm mx-auto" style={{ maxWidth: '500px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor:'white' }}>
                                        <div style={{ flex: 1, padding: '10px' }}>
                                            <h4 style={{ textAlign: 'center', color: '#333', fontSize: '1.2rem', marginBottom: '10px' }}>
                                                {campaign.name}
                                            </h4>
                                            <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '5px' }}>
                                                <strong>Lists Associated:</strong> {getCampaignLists(campaign.list_ids || [])}
                                            </p>
                                        </div>
                                        <img
                                            src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1732061697/marketing_nuyvhq.gif"
                                            alt="Campaign"
                                            style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '10px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px 0 10px' }}>
                                        <Button
                                            style={{ backgroundColor: '#0dcaf0', fontSize: '0.8rem' }}
                                            variant="primary"
                                            onClick={() => handlePreview(campaign.content)}
                                        >
                                            Preview
                                        </Button>
                                        <Button
                                            style={{ backgroundColor: '#fc6b01', fontSize: '0.8rem', color: 'white' }}
                                            variant="info"
                                            onClick={() => handleEditLists(campaign)}
                                        >
                                            Change Audience
                                        </Button>
                                        <Button
                                            style={{ background: 'linear-gradient(to right bottom, #34eb92, #23ad6a)', fontSize: '0.8rem' }}
                                            variant="success"
                                            onClick={() => handleRunCampaignAgain(campaign.id)}
                                        >
                                            Run Again
                                        </Button>
                                    </div>
                                </Card>
                                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                                    {index + 1} of {campaigns.length}
                                </div>
                            </Carousel.Item>
                        ))}
                    </Carousel>
                </Col>



            <ToastContainer position="top-right" autoClose={3000} />


                <WorkflowContainer />
            </Row>





            {/* Modal for editing campaign lists */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Lists for {selectedCampaign?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="listSubscriptions" className="mt-3">
                            <Form.Label>Lists</Form.Label>
                            <Form.Control
                                as="select"
                                multiple
                                value={selectedCampaignLists}
                                onChange={handleListChange}
                            >
                                {userLists.map((list) => (
                                    <option key={list.id} value={list.id}>
                                        {list.name}
                                    </option>
                                ))}
                            </Form.Control>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleSaveLists}>
                        Save
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CampaignPage;
