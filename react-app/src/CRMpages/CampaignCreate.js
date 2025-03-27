import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DateTimePicker from 'react-datetime-picker';
import { advertisementTemplate } from '../CRMtemplates/advertisementTemplate'; // Import template
import '../CRMstyles/CampaignContent.css';
import { Form, Button, Row, Col, Tabs, Tab, Modal, Card } from 'react-bootstrap';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CampaignCreate = ({ campaigns }) => {

    const [userLists, setUserLists] = useState([]);
    const [activeTab, setActiveTab] = useState("campaign");
    const navigate = useNavigate();
    const location = useLocation();
    const { campaignData: initialCampaignData } = location.state || {};

    // Initialize state for campaign fields
    const [campaignData, setCampaignData] = useState({
        name: '',
        subject: '',
        fromAddress: 'noreply@user@yoursite.com',
        listIds: [],  // Array of list IDs
        template: 'advertisement',  // Default template
        messenger: 'email',
        tags: '',
        content: '',  // Content will be handled as an empty string initially
        urlSlug: '',
        metadata: {},
        sendLater: false,
        scheduledDate: new Date(),
        publishToArchive: false,
        userId: null, // Set userId once the user is authenticated
        ...initialCampaignData
    });

    // Initialize state for template content
    const [templateContent, setTemplateContent] = useState({
        highlightText: 'Enter your highlighted text here',
        image1: '',
        image2: '',
        image3: '',
        image4: '',
        section1text: 'Enter section 1 text here',
        section2text: 'Enter section 2 text here',
        section3text: 'Enter section 3 text here',
        section4text: 'Enter section 4 text here',
    });



        const [selectedCampaign, setSelectedCampaign] = useState(null);
        const [selectedCampaignLists, setSelectedCampaignLists] = useState([]);
        const [showModal, setShowModal] = useState(false);

        // Pagination state
        const [currentPage, setCurrentPage] = useState(1);
        const itemsPerPage = 5;

        useEffect(() => {
            const fetchUserLists = async () => {
                try {
                    const userId = JSON.parse(localStorage.getItem('user')).id;
                    const response = await axios.get(`/server/crm_function/api/lists/user/${userId}`);
                    setUserLists(response.data);
                } catch (error) {
                    console.error('Error fetching user lists:', error);
                }
            };
            fetchUserLists();
        }, []);

        // Pagination calculations
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentCampaigns = campaigns.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(campaigns.length / itemsPerPage);

        // Handle page change
        const handlePageChange = (pageNumber) => {
            setCurrentPage(pageNumber);
        };

        // Get campaign lists by list IDs
        const getCampaignLists = (listIds) => {
            return listIds
                .map((id) => {
                    const list = userLists.find((list) => list.id === id);
                    return list ? list.name : `List ID: ${id}`;
                })
                .join(', ');
        };

        // Handle running the campaign again
        const handleRunCampaignAgain = async (campaignId) => {
            try {
                const response = await axios.get(`/server/crm_function/api/campaigns/${campaignId}`);
                const campaignData = response.data;
                const userId = JSON.parse(localStorage.getItem('user')).id;

                await axios.post(`/server/crm_function/api/campaigns/send/${campaignId}`, { ...campaignData, userId });
                toast.success('Campaign sent successfully!');
            } catch (error) {
                console.error('Error resending campaign:', error);
                toast.error('Failed to resend the campaign.');
            }
        };

        // Open modal to edit lists
        const handleEditLists = (campaign) => {
            setSelectedCampaign(campaign);
            setSelectedCampaignLists(campaign.list_ids);
            setShowModal(true);
        };

        // Save updated lists
        const handleSaveLists = async () => {
            try {
                const updatedCampaign = { ...selectedCampaign, list_ids: selectedCampaignLists };
                await axios.put(`/server/crm_function/api/campaigns/${selectedCampaign.id}`, updatedCampaign);
                setShowModal(false);
                toast.success('Campaign lists updated successfully!');
            } catch (error) {
                console.error('Error updating campaign lists:', error);
                toast.error('Failed to update campaign lists.');
            }
        };

        // Handle multi-select list change


        // Handle preview


    // Fetch user lists
    useEffect(() => {
        const fetchUserLists = async () => {
            try {
                const userId = JSON.parse(localStorage.getItem('user')).id;
                const response = await axios.get(`/server/crm_function/api/lists/user/${userId}`);
                setUserLists(response.data);
            } catch (error) {
                console.error('Error fetching lists:', error);
            }
        };
        fetchUserLists();
    }, []);

    // Handle input changes for campaign fields
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCampaignData({ ...campaignData, [name]: value });
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


    // Handle input changes for template content
    const handleTemplateContentChange = (e) => {
        const { name, value } = e.target;
        setTemplateContent({ ...templateContent, [name]: value });
    };

    // Handle list selection
    const handleListChange = (e) => {
        const selectedListIds = Array.from(e.target.selectedOptions, option => option.value);
        setCampaignData({ ...campaignData, listIds: selectedListIds });
    };

    // Handle continue to the content tab
    const handleContinue = () => {
        setActiveTab('content');
    };

    // Handle file upload and update the image URL in the state
    const handleFileUpload = async (e, imageNum) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await axios.post('/server/crm_function/api/upload', formData);
                const imageUrl = response.data.url;
                setTemplateContent(prevState => ({ ...prevState, [`image${imageNum}`]: imageUrl }));
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload image.');
            }
        }
    };

    // Render the template content with user inputs
    const renderTemplateContent = () => {
        let htmlContent = advertisementTemplate
            .replace('[highlightText]', templateContent.highlightText || 'Enter your highlighted text here')
            .replace('[image1]', templateContent.image1 || 'https://plchldr.co/i/1000x800?&bg=4682B4&fc=ffffff&text=Image+1+Placeholder')
            .replace('[image2]', templateContent.image2 || 'https://plchldr.co/i/1000x800?&bg=4682B4&fc=ffffff&text=Image+2+Placeholder')
            .replace('[image3]', templateContent.image3 || 'https://plchldr.co/i/1000x800?&bg=4682B4&fc=ffffff&text=Image+3+Placeholder')
            .replace('[image4]', templateContent.image4 || 'https://plchldr.co/i/1000x800?&bg=4682B4&fc=ffffff&text=Image+4+Placeholder')
            .replace('[section1text]', templateContent.section1text || 'Enter section 1 text here')
            .replace('[section2text]', templateContent.section2text || 'Enter section 2 text here')
            .replace('[section3text]', templateContent.section3text || 'Enter section 3 text here')
            .replace('[section4text]', templateContent.section4text || 'Enter section 4 text here');

        return htmlContent;
    };

    // Handle form submission
    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        try {
            const user = JSON.parse(localStorage.getItem('user')); // Make sure this is set in localStorage
            const status = campaignData.sendLater ? 'scheduled' : 'sent';  // Determine status
            const campaignToSubmit = {
                ...campaignData,
                userId: user.id,
                content: renderTemplateContent(),  // Render final template content
                status,
                scheduledDate: campaignData.sendLater ? campaignData.scheduledDate : null
            };

            const response = await axios.post('/server/crm_function/api/campaigns/create', campaignToSubmit);
            console.log('Campaign created successfully:', response.data);
            navigate('/app/campaigns'); // Redirect to campaigns list
        } catch (error) {
            console.error('Error creating campaign:', error);
            alert('Failed to create the campaign.');
        }
    };

    // Validate template content fields
    const isTemplateContentValid = () => {
        const { highlightText, image1, image2, image3, image4, section1text, section2text, section3text, section4text } = templateContent;
        return highlightText.trim() !== '' &&
            image1.trim() !== '' &&
            image2.trim() !== '' &&
            image3.trim() !== '' &&
            image4.trim() !== '' &&
            section1text.trim() !== '' &&
            section2text.trim() !== '' &&
            section3text.trim() !== '' &&
            section4text.trim() !== '';
    };

    return (
        <div className="campaign-create-container p-4" style={{background:'linear-gradient(to bottom right, #f5c2d5, turquoise)'}}>
            <Row>
                <Col md={12}>
                    <Tabs activeKey={activeTab} onSelect={setActiveTab} id="campaign-tabs" className="mb-3">
                        {/* Campaign Tab */}
                        <Tab eventKey="campaign" title="Campaign">
                            <h3>Create Campaign</h3>
                            <Form>
                                {/* Name */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        placeholder="Campaign Name"
                                        value={campaignData.name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>

                                {/* Subject */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Subject</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="subject"
                                        placeholder="Campaign Subject"
                                        value={campaignData.subject}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>

                                {/* From Address */}
                                <Form.Group className="mb-3">
                                    <Form.Label>From Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="fromAddress"
                                        placeholder="noreply@user@yoursite.com"
                                        value={campaignData.fromAddress}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </Form.Group>

                                {/* Lists */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Select Lists</Form.Label>
                                    <Form.Select
                                        name="listIds"
                                        multiple
                                        value={campaignData.listIds}
                                        onChange={handleListChange}
                                    >
                                        {userLists.map(list => (
                                            <option key={list.id} value={list.id}>
                                                {list.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                {/* Continue Button */}
                                <Button type="button" variant="primary" onClick={handleContinue}>
                                    Continue
                                </Button>
                            </Form>
                        </Tab>

                        {/* Content Tab */}
                        <Tab eventKey="content" title="Content">
                            <Form>
                                {/* Editable Fields for Template */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Highlight Text</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        name="highlightText"
                                        placeholder="Enter highlight text"
                                        value={templateContent.highlightText}
                                        onChange={handleTemplateContentChange}
                                        rows={4}
                                    />
                                </Form.Group>

                                {/* New Section Text Fields */}
                                {[1, 2, 3, 4].map(num => (
                                    <Form.Group key={num} className="mb-3">
                                        <Form.Label>Section {num} Text</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            name={`section${num}text`}
                                            placeholder={`Enter section ${num} text`}
                                            value={templateContent[`section${num}text`]}
                                            onChange={handleTemplateContentChange}
                                            rows={3}
                                        />
                                    </Form.Group>
                                ))}

                                {/* Image Fields */}
                                {[1, 2, 3, 4].map(num => (
                                    <Form.Group key={num} className="mb-3">
                                        <Form.Label>Image {num}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name={`image${num}`}
                                            placeholder={`Enter image URL for image ${num} or upload below`}
                                            value={templateContent[`image${num}`]}
                                            onChange={handleTemplateContentChange}
                                        />
                                        <Form.Control
                                            type="file"
                                            name={`image${num}_upload`}
                                            onChange={(e) => handleFileUpload(e, num)}
                                            className="mt-2"
                                        />
                                    </Form.Group>
                                ))}

                                {/* Preview section */}
                                <h4>Template Preview</h4>
                                <div className="template-preview">
                                    <div dangerouslySetInnerHTML={{ __html: renderTemplateContent() }} />
                                </div>

                                {/* Send Later Toggle */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Send Later</Form.Label>
                                    <Form.Check
                                        type="switch"
                                        id="send-later-switch"
                                        label={campaignData.sendLater ? 'On' : 'Off'}
                                        checked={campaignData.sendLater}
                                        onChange={() => setCampaignData({ ...campaignData, sendLater: !campaignData.sendLater })}
                                    />
                                </Form.Group>

                                {/* DateTimePicker for scheduling */}
                                {campaignData.sendLater && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Pick a date and time</Form.Label>
                                        <DateTimePicker
                                            onChange={date => setCampaignData({ ...campaignData, scheduledDate: date })}
                                            value={campaignData.scheduledDate}
                                            minDate={new Date()}  // Can't schedule in the past
                                        />
                                    </Form.Group>
                                )}

                                {/* Create Campaign Button */}
                                <Button type="submit" variant="success" onClick={handleCreateCampaign} disabled={!isTemplateContentValid()}>
                                    Create Campaign
                                </Button>
                            </Form>
                        </Tab>

                        {/* Archive Tab */}
                        <Tab eventKey="archive" title="Archive">
                            <h3>Archived Campaigns</h3>
                            <Row>
                                <Col md={12}>
                                    <ul className="list-unstyled">
                                        {currentCampaigns.map((campaign) => (
                                            <li key={campaign.id}>
                                                <Card className="p-3 shadow-sm">
                                                    <h2 style={{ textAlign: 'center' }}>{campaign.name}</h2>
                                                    <p>
                                                        <strong>Lists Associated:</strong> {getCampaignLists(campaign.list_ids)}
                                                    </p>
                                                    <p>
                                                        <strong>Unsubscribe Count:</strong> {campaign.unsubscribeCount || 0}
                                                    </p>
                                                    <Button
                                                        style={{ background: 'linear-gradient(to bottom right, #ffdab3, orange' }}
                                                        variant="primary"
                                                        onClick={() => handlePreview(campaign.content)}
                                                    >
                                                        Preview
                                                    </Button>{' '}
                                                    <Button
                                                        style={{ background: 'linear-gradient(to bottom right, #b0d4e3, steelblue' }}
                                                        variant="info"
                                                        onClick={() => handleEditLists(campaign)}
                                                    >
                                                        Edit Lists
                                                    </Button>{' '}
                                                    <Button
                                                        style={{ background: 'linear-gradient(to right bottom, #34eb92, #23ad6a' }}
                                                        variant="success"
                                                        onClick={() => handleRunCampaignAgain(campaign.id)}
                                                    >
                                                        Run Campaign Again
                                                    </Button>
                                                </Card>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Pagination Controls */}
                                    <div className="pagination-controls mt-3">
                                        {Array.from({ length: totalPages }, (_, index) => (
                                            <Button
                                                key={index + 1}
                                                variant={index + 1 === currentPage ? 'primary' : 'light'}
                                                onClick={() => handlePageChange(index + 1)}
                                                className="mx-1"
                                            >
                                                {index + 1}
                                            </Button>
                                        ))}
                                    </div>
                                </Col>
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
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </div>
    );
};

export default CampaignCreate;
