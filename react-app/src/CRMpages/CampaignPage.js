import React, { useEffect, useState } from 'react';
import {Card, Button, Row, Col, Form,Tabs,  Modal, Carousel, Tab} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../CRMstyles/CampaignPage.css';
import WorkflowContainer from "./WorkflowContainer";

const CampaignPage = () => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
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
                const response = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/user/${user.id}`);
                const campaigns = response.data.map(c => ({
                    ...c,
                    listIds: c.list_ids || [],
                }));
                const sortedCampaigns = campaigns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setCampaigns(sortedCampaigns);

                const listResponse = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/user/${user.id}`);
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
        setSelectedCampaignLists(campaign.listIds || []);
        setShowModal(true);
    };


    const handleSaveLists = async () => {
        try {
            const updatedCampaign = {
                ...selectedCampaign,
                list_ids: selectedCampaignLists,
            };

            await axios.put(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/${selectedCampaign.id}`, updatedCampaign);
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
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleRunCampaignAgain = async (campaignId) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await axios.post(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/send/${campaignId}`, { userId: user.id });
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
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCampaigns = campaigns.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(campaigns.length / itemsPerPage);

    return (

        <div className="campaign-page" style={{backgroundColor:'white'}}>
            {/* Active Campaigns Section with Carousel */}
            <Row>
                {/* Pagination Controls */}

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
