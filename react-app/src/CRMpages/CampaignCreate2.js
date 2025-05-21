import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Tabs, Tab, Card, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../CRMstyles/CampaignContent.css';
import Lottie from "lottie-react";
import animationData from "../CRMcomponents/Animation - 1741235903291.json";


// Utility function to generate the email preview HTML
const preparePreviewData = (data) => {
    const preparedImages = data.images.map((img) => {
        if (img instanceof File) {
            return URL.createObjectURL(img); // Convert file to local preview URL
        }
        return img; // Already a string URL
    });

    return {
        ...data,
        images: preparedImages
    };
};
const uploadImageToNode = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/upload', {
        method: 'POST',
        body: formData
    });

    const data = await res.json();
    return data.url; // will be used in images[]
};


const generatePreviewHTML = (category, data) => {
    const formattedContactInfo = (data.contactInfo || '').replace(/\n/g, '<br>');

    const emailBodies = data.emailBodies || []; // 👈 fallback to empty array
    const images = data.images || [];           // 👈 fallback to empty array

    const emailContent = emailBodies.map((body, index) => {
        const image = images[index] || ''; // Match each image with the emailBodies
        return `
            ${body ? `<p style="text-align: center">${body}</p>` : `<p>Email Body ${index + 1} Placeholder</p>`}
            ${
            image
                ? `<img src="${image}" alt="Image ${index + 1}" style="width: 100%; max-width: 560px; margin: 10px auto; border-radius: 8px;" />`
                : ''
        }
        `;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; margin: 0 auto; padding: 20px; max-width: 600px;">
        <h1 style="text-align: center; font-size: 24px;">${data.subject || 'Your Campaign Subject'}</h1>
        <div style="text-align: center; margin: 20px 0;">
            ${
        data.logo
            ? `<img src="${data.logo}" alt="Logo" style="max-width: 200px; margin-bottom: 10px;" />`
            : '<span style="color: gray;">No Logo yet</span>'
    }
        </div>
        <p style="text-align: center; font-size: 18px; color: #555;">${data.pitch || 'Pitch Text Here'}</p>
        <hr style="margin: 20px 0; border: 1px solid #ddd;" />
        <div style="text-align: left; margin: 20px 0;">
            ${emailContent}
        </div>
        <hr style="margin: 20px 0; border: 1px solid #ddd;" />
        <div style="text-align: center; margin: 20px 0;">
            ${
        data.logo
            ? `<img src="${data.logo}" alt="Logo" style="max-width:200px; margin-bottom: 10px;" />`
            : '<span style="color: gray;">No Logo yet</span>'
    }
        </div>
        <p style="text-align: center; color: gray;">${formattedContactInfo}</p>
        <footer style="text-align: center; color: gray;"></footer>
        ${(data.attachments || []).map((url, index) => `
    <p style="text-align:center;">
        <a href="${url}" target="_blank">Download Attachment ${index + 1}</a>
    </p>
`).join('')}

    </div>`;
};



const CampaignCreate = ({ campaigns, selectedCategory }) => {
    const [activeTab, setActiveTab] = useState('details');
    const [campaignData, setCampaignData] = useState({
        name: '',
        subject: '',
        logo: '',
        contactInfo: '',
        website: '',
        pitch: '',
        emailBodies: selectedCategory === 'Sale' ? [''] : ['', '', '', ''], // Adjusted initialization
        images: selectedCategory === 'Sale' ? [''] : ['', '', '', ''], // Adjusted initialization
        listIds: [],
    });
    const [userLists, setUserLists] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [selectedCampaignLists, setSelectedCampaignLists] = useState([]);
    const navigate = useNavigate();
    const itemsPerPage = 5;
    const [useFileUpload, setUseFileUpload] = useState(false);
    const [searchModalQuery, setSearchModalQuery] = useState(''); // For modal search
    const [showAnimation, setShowAnimation] = useState(true);
    const placeholderImage = 'https://res.cloudinary.com/duz4vhtcn/image/upload/v1741238955/58485771a6aca45b5a5c95b8_zmvivg.png';
    const [imageLoaded, setImageLoaded] = useState(false); // Track if the image has loaded

// Filtered lists based on search query
    const filteredModalLists = userLists.filter((list) =>
        list.name.toLowerCase().includes(searchModalQuery.toLowerCase())
    );

    const [searchQuery, setSearchQuery] = useState(''); // State for search input
    const [filteredLists, setFilteredLists] = useState([]); // Filtered lists for display



    useEffect(() => {
        // Set a timeout to switch to the image after 5 seconds
        const timer = setTimeout(() => {
            setShowAnimation(false); // Switch to image after 5 seconds
        }, 8000);
        return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
        // Filter userLists based on search query
        const filtered = userLists.filter((list) =>
            list.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredLists(filtered);
    }, [searchQuery, userLists]); // Runs when searchQuery or userLists changes


    const isSale = selectedCategory === 'Sale';

    useEffect(() => {
        const fetchUserLists = async () => {
            try {
                const userId = JSON.parse(localStorage.getItem('user')).id;
                const response = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/user/${userId}`);
                setUserLists(response.data);
                console.log(userLists.toString(),'here is the user list')
            } catch (error) {
                console.error('Error fetching lists:', error);
                setUserLists([]);
            }
        };
        fetchUserLists();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCampaignData({ ...campaignData, [name]: value });
    };

    const handleImageLoad = () => {
        setImageLoaded(true); // Set imageLoaded to true once the image is fully loaded
    };

    const handleArrayInputChange = (index, type, value) => {
        const updatedArray = [...campaignData[type]];
        updatedArray[index] = value;
        setCampaignData({ ...campaignData, [type]: updatedArray });
    };

    const handleListChange = (e) => {
        const selectedListIds = Array.from(e.target.selectedOptions, (option) => option.value);
        setCampaignData({ ...campaignData, listIds: selectedListIds });
    };

    const handleEditLists = (campaign) => {
        setSelectedCampaign(campaign); // Set the selected campaign
        setSelectedCampaignLists(campaign.listIds); // Populate the selected lists
        setShowModal(true); // Show the modal
    };
    const handleSaveLists = async () => {
        try {
            const updatedCampaign = { ...selectedCampaign, listIds: selectedCampaignLists };
            await axios.put(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/${selectedCampaign.id}`, updatedCampaign);
            setShowModal(false); // Close the modal
            alert('Campaign lists updated successfully!');
        } catch (error) {
            console.error('Error updating campaign lists:', error);
            alert('Failed to update campaign lists.');
        }
    };


    const handleCreateCampaign = async (e) => {
        e.preventDefault();

        try {
            const user = JSON.parse(localStorage.getItem('user')); // Get current user

            // 🔁 Upload images if they are File objects
            const uploadedImages = await Promise.all(
                campaignData.images.map(async (img) => {
                    if (img instanceof File) {
                        return await uploadImageToNode(img);
                    }
                    return img; // it's already a URL
                })
            );

            // ✅ Upload attachments if they are File objects
            const uploadedAttachments = await Promise.all(
                (campaignData.attachments || []).map(async (file) => {
                    if (file instanceof File) {
                        const formData = new FormData();
                        formData.append('image', file); // using same endpoint
                        const res = await fetch('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/upload', {
                            method: 'POST',
                            body: formData
                        });
                        const data = await res.json();
                        return data.url;
                    }
                    return file; // already a URL
                })
            );

            // ✨ Build new campaignData with uploaded assets
            const finalData = {
                ...campaignData,
                images: uploadedImages,
                attachments: uploadedAttachments
            };

            // 🔥 Generate preview HTML with real image URLs
            const campaignToSubmit = {
                ...finalData,
                userId: user.id,
                content: generatePreviewHTML(selectedCategory, finalData),
                status: 'sent',
                scheduledDate: null
            };

            // 🚀 Submit to backend
            const response = await axios.post('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/create', campaignToSubmit);
            console.log('Campaign created successfully:', response.data);

            // ✅ Navigate away
            navigate('/dashboard');

        } catch (error) {
            console.error('Error creating campaign:', error);
            alert('Failed to create the campaign.');
        }
    };






    const getCampaignLists = (listIds = []) => {
        // Ensure listIds is always an array
        return listIds
            .map((id) => {
                const list = userLists.find((list) => list.id === id);
                return list ? list.name : `List ID: ${id}`;
            })
            .join(', ');
    };

    const handleRunCampaignAgain = async (campaignId) => {
        try {
            // Fetch the existing campaign data
            const response = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/${campaignId}`);
            const campaignData = response.data;
            const userId = JSON.parse(localStorage.getItem('user')).id;

            // Resend the campaign
            await axios.post(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/campaigns/send/${campaignId}`, { ...campaignData, userId });
            alert('Campaign sent successfully!');
        } catch (error) {
            console.error('Error resending campaign:', error);
            alert('Failed to resend the campaign.');
        }
    };

    const handlePreview = (htmlContent) => {
        const previewWindow = window.open('', 'Preview', 'width=600,height=800');
        previewWindow.document.write(`
        <html>
            <head>
                <title>Campaign Preview</title>
                <style>
           /*         body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }*/
                </style>
            </head>
            <body>
                ${htmlContent}
            </body>
        </html>
    `);
        previewWindow.document.close();
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCampaigns = campaigns.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(campaigns.length / itemsPerPage);




// Handle page change
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };
    const previewData = preparePreviewData(campaignData);
    return (
        <div className="campaign-create-container p-4" style={{   borderRadius: '8px',
            gap: '20px',
            marginLeft:'10em',
            marginRight:'10em',
            borderStyle:'solid',
            borderWidth:'3em',
            borderColor:'antiquewhite', background:'linear-gradient(45deg, #287ea7, transparent)' }}>
            <Row>
                {/* Left Form Section */}
                <Col md={6}>
                    <Tabs activeKey={activeTab} onSelect={(tab) => setActiveTab(tab)} className="mb-3">
                        {/* Details Tab */}
                        <Tab eventKey="details" title="Details">
                            <h3 style={{textAlign:'center',textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)'}} className="text-white"> {selectedCategory} Email Details</h3>



                            <Form>
                                {/* Campaign Name */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Campaign Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={campaignData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter name"
                                    />
                                </Form.Group>

                                {/* Campaign Subject */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Campaign Subject</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="subject"
                                        value={campaignData.subject}
                                        onChange={handleInputChange}
                                        placeholder="Enter campaign subject"
                                    />
                                </Form.Group>

                                {/* Logo URL */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Logo URL</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="logo"
                                        value={campaignData.logo}
                                        onChange={handleInputChange}
                                        placeholder="Enter logo URL"
                                    />
                                </Form.Group>

                                {/* Contact Info */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Contact Info</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        name="contactInfo"
                                        value={campaignData.contactInfo}
                                        onChange={handleInputChange}
                                        placeholder="Enter contact info (multiple lines)"
                                        style={{ textIndent: '0', paddingLeft: '10px' }} // Explicitly remove indent
                                    />
                                </Form.Group>

                                {/* Unsubscribe Link */}


                                {/* Select Lists with Search Filter */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Select Lists</Form.Label>

                                    {/* Search Input */}
                                    <Form.Control
                                        type="text"
                                        placeholder="Search lists..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="mb-2"
                                    />

                                    {/* Filtered Select Dropdown */}
                                    <Form.Select
                                        name="listIds"
                                        multiple
                                        value={campaignData.listIds}
                                        onChange={handleListChange}
                                    >
                                        {filteredLists.map((list) => (
                                            <option key={list.id} value={list.id}>
                                                {list.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Attachments (PDF, DOCX, etc.)</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                        multiple
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            setCampaignData({ ...campaignData, attachments: files });
                                        }}
                                    />
                                </Form.Group>



                                {/* Continue to Content Button */}
                                <Button onClick={() => setActiveTab('content')}>Continue to Content</Button>
                            </Form>

                        </Tab>

                        {/* Content Tab */}
                        <Tab eventKey="content" title="Content">
                            <h3 style={{textAlign:'center',textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)'}} class='text-white'>Enter {selectedCategory} Email Content</h3>
                            <Button
                                variant="secondary"
                                className="mb-3"
                                onClick={() => setUseFileUpload(prev => !prev)}
                            >
                                {useFileUpload ? 'Switch to URL Input' : 'Switch to File Upload'}
                            </Button>

                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Pitch</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="pitch"
                                        value={campaignData.pitch}
                                        onChange={handleInputChange}
                                        placeholder="Enter pitch text"
                                    />
                                </Form.Group>
                                {[...Array(isSale ? 1 : 4)].map((_, index) => (
                                    <Form.Group className="mb-3" key={index}>
                                        <Form.Label>Email Body {index + 1}</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={campaignData.emailBodies[index]}
                                            onChange={(e) => handleArrayInputChange(index, 'emailBodies', e.target.value)}
                                            placeholder={`Enter content for Email Body ${index + 1}`}
                                        />
                                    </Form.Group>
                                ))}

                                {[...Array(isSale ? 1 : 4)].map((_, index) => (
                                    <Form.Group className="mb-3" key={index}>
                                        <Form.Label>Image {index + 1}</Form.Label>
                                        {useFileUpload ? (
                                            <Form.Control
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        // Optionally upload file or just store it in state
                                                        const updatedImages = [...campaignData.images];
                                                        updatedImages[index] = file;
                                                        setCampaignData({ ...campaignData, images: updatedImages });
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <Form.Control
                                                type="text"
                                                value={campaignData.images[index]}
                                                onChange={(e) =>
                                                    handleArrayInputChange(index, 'images', e.target.value)
                                                }
                                                placeholder={`Enter image URL for Image ${index + 1}`}
                                            />
                                        )}
                                    </Form.Group>
                                ))}

                                <Button onClick={handleCreateCampaign}>Send Campaign</Button>
                            </Form>
                        </Tab>

                        {/* Archive Tab */}
                        <Tab eventKey="archive" title="Archive">
                            <h3 style={{textAlign:'center'}}>Archived Campaigns</h3>
                            <Row>
                                <Col md={12}>
                                    <ul className="list-unstyled">
                                        {currentCampaigns.map((campaign) => (
                                            <li key={campaign.id}>
                                                <Card className="p-2 shadow-sm recent-campaign-card" style={{ marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: 'white' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',backgroundColor:'white' }}>
                                                        {/* Campaign Info */}
                                                        <div style={{ flex: 1, padding: '10px' }}>
                                                            <h4 style={{ textAlign: 'center', color: 'black', fontSize: '1.2rem', marginBottom: '10px' }}>
                                                                {campaign.name}
                                                            </h4>
                                                            <p style={{ color: 'black', fontSize: '0.9rem', marginBottom: '5px' }}>
                                                                <strong>Lists Associated:</strong> {getCampaignLists(campaign.listIds)}
                                                            </p>
                                                            <p style={{ color: 'black', fontSize: '0.9rem', marginBottom: '5px' }}>
                                                                <strong>Unsubscribe Count:</strong> {campaign.unsubscribeCount || 0}
                                                            </p>
                                                        </div>

                                                        {/* Campaign Image */}
                                                        <img
                                                            src="https://res.cloudinary.com/duz4vhtcn/image/upload/v1732061697/marketing_nuyvhq.gif"
                                                            alt="Campaign"
                                                            style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '10px' }}
                                                        />
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px 0 10px' }}>
                                                        <Button
                                                            style={{ backgroundColor: '#0dcaf0', fontSize: '0.8rem' }}
                                                            variant="primary"
                                                            onClick={() => handlePreview(campaign.content)}
                                                        >
                                                            Preview
                                                        </Button>
                                                        <Button
                                                            style={{ backgroundColor: '#fc6b01', fontSize: '0.8rem',color:'white' }}
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

                {/* Right Preview Section */}
                <Col md={6}>
                    <div>
                        {/* Display animation for 5 seconds */}
                        {showAnimation ? (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0px' }}>
                                <Lottie animationData={animationData} style={{ width: '150px', height: '150px' }} />
                            </div>
                        ) : (
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>

                                <img
                                    src={placeholderImage}
                                    alt="Placeholder"
                                    style={{
                                        width: '150px',
                                        height: '150px',
                                        opacity: imageLoaded ? 1 : 0, // Fade in when the image is loaded
                                        transition: 'opacity 1s ease-in', // Smooth fade in effect
                                    }}
                                    onLoad={handleImageLoad} // Set imageLoaded to true when the image loads
                                />
                            </div>
                        )}
                    </div>
                    <div className="email-preview" style={{ marginTop: '38px', border: '1px solid #ddd', borderRadius: '8px', paddingTop: '25px', background: '#fff' }}>
                        <h3 className="text-center">Email Preview</h3>
                        <div
                            dangerouslySetInnerHTML={{
                                __html: generatePreviewHTML(selectedCategory, previewData), // ✅ Use same prepared data
                            }}
                        />
                    </div>                </Col>
            </Row>
        </div>
    );
};

export default CampaignCreate;
