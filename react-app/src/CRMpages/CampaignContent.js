import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col, Tabs, Tab } from 'react-bootstrap';
import DateTimePicker from 'react-datetime-picker';
import axios from 'axios';
import '../CRMstyles/CampaignContent.css';

// Advertisement template
const advertisementTemplate = `
<div>
    <div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt">
        <div style="font-family: Verdana, Arial, Helvetica, sans-serif; font-size: 10pt">
            <div>
                <span class="font" style="font-family: 'trebuchet ms', arial, helvetica, sans-serif">
                    <span class="highlight" style="background-color:#FFFFFF">
                        <span class="colour" style="color:#717275">
                            <span class="font" style="font-family: 'Noto Sans JP', sans-serif">
                                <span class="size" style="font-size: 20px; font-weight: 300;">
                                    [highlightText]
                                </span>
                            </span>
                        </span>
                    </span>
                </span>
            </div>
            <div class="x_827423126align-center" style="text-align: center">
                <a href="https://www.clubhouselinks.com/app/#/app/samplePortfolios"
                   style="display: inline-block; padding: 10px 20px; font-size: 16px; font-weight: bold; color: #FFFFFF; background: linear-gradient(45deg, #40E0D0, #20B2AA); border-radius: 5px; text-align: center; text-decoration: none"
                   target="_blank">Click to start building</a>
            </div>
            <div>
                <br>
                <img src="[image1]" alt="Ad Image 1" width="100%">
                <br>
                <br>
                <img src="[image2]" alt="Ad Image 2" width="100%">
                <br>
                <img src="[image3]" alt="Ad Image 3" width="100%">
                <br>
                <img src="[image4]" alt="Ad Image 4" width="100%">
                <br>
                <img src="[image5]" alt="Ad Image 5" width="100%">
                <br>
                <img src="[image6]" alt="Ad Image 6" width="150" height="150">
            </div>
            <div>
                <span class="font" style="font-family:'trebuchet ms', arial, helvetica, sans-serif; font-size: 13.33px; color: #000000;">
                    &nbsp;&nbsp;Our first podcast is up detailing the power of A.I.
                    <b>&nbsp;You can listen to it by clicking the link below:</b>
                </span>
            </div>
            <div class="x_827423126align-center" style="text-align: center">
                <a href="https://open.spotify.com/episode/7KYNViI3HhSv4moUqhkTIJ?si=PWsatt_rSa-xtDsJ3mEuNA" target="_blank">
                    <img src="[image5]" alt="Podcast Ad" width="100%">
                </a>
                <a href="https://open.spotify.com/episode/7KYNViI3HhSv4moUqhkTIJ?si=PWsatt_rSa-xtDsJ3mEuNA" target="_blank" style="color:#009899; font-size:24px;">Listen Now</a>
            </div>
        </div>
    </div>
</div>`;


const CampaignCreate = () => {
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

    const [templateContent, setTemplateContent] = useState({
        highlightText: '',  // Text in span to be replaced
        image1: '',         // URLs for image placeholders
        image2: '',
        image3: '',
        image4: '',
        image5: '',
        image6: ''
    });

    const [userLists, setUserLists] = useState([]);
    const [activeTab, setActiveTab] = useState("campaign");

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
            navigate('/campaigns'); // Redirect to campaigns list
        } catch (error) {
            console.error('Error creating campaign:', error);
            alert('Failed to create the campaign.');
        }
    };

    // Render the template content with user inputs
    const renderTemplateContent = () => {
        let htmlContent = advertisementTemplate
            .replace('[highlightText]', templateContent.highlightText)
            .replace('[image1]', templateContent.image1)
            .replace('[image2]', templateContent.image2)
            .replace('[image3]', templateContent.image3)
            .replace('[image4]', templateContent.image4)
            .replace('[image5]', templateContent.image5)
            .replace('[image6]', templateContent.image6);

        return htmlContent;
    };

    // Validate template content fields
    const isTemplateContentValid = () => {
        const { highlightText, image1, image2, image3, image4, image5, image6 } = templateContent;
        return highlightText.trim() !== '' &&
            image1.trim() !== '' &&
            image2.trim() !== '' &&
            image3.trim() !== '' &&
            image4.trim() !== '' &&
            image5.trim() !== '' &&
            image6.trim() !== '';
    };

    return (
        <div className="campaign-create-container p-4">
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

                                {/* Image Fields */}
                                {[1, 2, 3, 4, 5, 6].map(num => (
                                    <Form.Group key={num} className="mb-3">
                                        <Form.Label>Image {num}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name={`image${num}`}
                                            placeholder={`Enter image URL for image ${num}`}
                                            value={templateContent[`image${num}`]}
                                            onChange={handleTemplateContentChange}
                                        />
                                    </Form.Group>
                                ))}

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
                            <Form.Group className="mb-3">
                                <Form.Label>Publish to Archive</Form.Label>
                                <Form.Check
                                    type="switch"
                                    name="publishToArchive"
                                    label="Publish this campaign to archive"
                                    checked={campaignData.publishToArchive}
                                    onChange={() =>
                                        setCampaignData({
                                            ...campaignData,
                                            publishToArchive: !campaignData.publishToArchive
                                        })
                                    }
                                />
                            </Form.Group>
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </div>
    );
};

export default CampaignCreate;
