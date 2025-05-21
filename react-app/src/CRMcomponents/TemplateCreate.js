import React, { useState, useEffect,useRef } from 'react';
import { Form, Button, Tabs, Tab,Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../CRMstyles/TemplateCreate.css';
import animationData from './Animation - 1741235903291.json';
import Lottie from 'lottie-react';

const TemplateCreate = ({ selectedCategory, selectedInterval }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("details");
    const [reviewCount, setReviewCount] = useState(1);
    const [imageCount, setImageCount] = useState(1);
    const [bodyCount, setBodyCount] = useState(1);
    const [previewText, setPreviewText] = useState('EMAIL PREVIEW');
    const [showAnimation, setShowAnimation] = useState(true);
    const placeholderImage = 'https://res.cloudinary.com/duz4vhtcn/image/upload/v1741238955/58485771a6aca45b5a5c95b8_zmvivg.png';
    const [imageLoaded, setImageLoaded] = useState(false); // Track if the image has loaded


    const [customContent, setCustomContent] = useState({
        header: '',
        images: [{ url: '' }],
        pitch: '',
        emailBodies: Array(1).fill(''),
        placeholders: {},
        logo: '',
        contactInfo: '',
        contactInfo2: '',
        website: '',
        reviewLinks:[{ url: '' }]
    });

    const [templateData, setTemplateData] = useState({
        category: selectedCategory,
        interval:selectedInterval,
        user_id: '',
        content: ''
    });

    // Control playback based on iteration count


    useEffect(() => {
        // Set a timeout to switch to the image after 5 seconds
        const timer = setTimeout(() => {
            setShowAnimation(false); // Switch to image after 5 seconds
        }, 8000);
        return () => clearTimeout(timer);
    }, []);


    const handleImageLoad = () => {
        setImageLoaded(true); // Set imageLoaded to true once the image is fully loaded
    };
    // Set user_id from localStorage
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setTemplateData((prevData) => ({ ...prevData, user_id: user.id }));
        }
    }, []);

    // Adjust fields dynamically based on the category
    useEffect(() => {
        if (selectedCategory) {
            adjustFieldsForTemplate(selectedCategory);
        }
    }, [selectedCategory]);




    const adjustFieldsForTemplate = (category) => {
        let imagesNeeded = 1;
        let bodiesNeeded = 1;
        let reviewLinkNeeded = 2;
        let placeholders = { header: '', pitch: '' };

        switch (category) {
            case 'Advertisement':
                imagesNeeded = 3;
                bodiesNeeded = 3;
                placeholders = {
                    header: 'Advertisement Header',
                    pitch: 'Advertisement Pitch'
                };
                break;
            case 'Top of Mind':
                imagesNeeded = 1;
                bodiesNeeded = 1;
                placeholders = {
                    header: 'Top of Mind Header',
                    pitch: 'Top of Mind Pitch'
                };
                break;
            case 'Opened Email List':
                imagesNeeded = 3;
                bodiesNeeded = 4;
                placeholders = {
                    header: 'Opened Email List Header',
                    pitch: 'Opened Email List Pitch'
                };
                break;
            case 'Opened Email Hot List':
                imagesNeeded = 3;
                bodiesNeeded = 4;
                placeholders = {
                    header: 'Hot List Header',
                    pitch: 'Hot List Pitch'
                };
                break;
            case 'Thank You':
                imagesNeeded = 1;
                bodiesNeeded = 1;
                reviewLinkNeeded = 2;
                placeholders = {
                    header: 'Thank You Header',
                    pitch: 'Thank You Pitch'
                };
                break;
            case 'Sale':
                imagesNeeded = 1;
                bodiesNeeded = 1;
                placeholders = {
                    header: 'Sale Header',
                    pitch: 'Sale Pitch'
                };
                break;
            default:
                imagesNeeded = 1;
                bodiesNeeded = 1;
        }

        setImageCount(imagesNeeded);
        setBodyCount(bodiesNeeded);
        setCustomContent((prevContent) => ({
            ...prevContent,
            images: Array(imagesNeeded).fill({ url: '' }),
            reviewLinks: Array(reviewLinkNeeded).fill({ url: '' }),
            emailBodies: Array(bodiesNeeded).fill(''),
            placeholders
        }));
    };

    const handleCustomContentChange = (field, value) => {
        setCustomContent((prevContent) => ({
            ...prevContent,
            [field]: value
        }));
    };

    const handleBodyChange = (index, value) => {
        const updatedBodies = [...customContent.emailBodies];
        updatedBodies[index] = value;
        setCustomContent((prevContent) => ({
            ...prevContent,
            emailBodies: updatedBodies
        }));
    };

    const handleImageUrlChange = (index, value) => {
        const updatedImages = [...customContent.images];
        updatedImages[index] = { ...updatedImages[index], url: value };
        setCustomContent((prevContent) => ({
            ...prevContent,
            images: updatedImages
        }));
    };
    const handleReviewUrlChange = (index, value) => {
        const updatedReviewLinks = [...customContent.reviewLinks];
        updatedReviewLinks[index] = { ...updatedReviewLinks[index], url: value };
        setCustomContent((prevContent) => ({
            ...prevContent,
            reviewLinks: updatedReviewLinks
        }));
    };


    const renderTemplateContent = () => {
        const generateEmailContent = (emailBodies, images, reviewLinks) =>
            emailBodies
                .map((body, index) => `
            <p>${body || `Email Body ${index + 1} Placeholder`}</p>
            ${
                    images[index]?.url
                        ? `<img src="${images[index].url}" alt="Image ${index + 1}" style="width: 100%; max-width: 560px; margin: 10px auto; border-radius: 8px;" />`
                        : ''
                }
            ${
                    reviewLinks && reviewLinks[index]?.url
                        ? `<div style="margin: 10px 0;"><a href="${reviewLinks[index].url}" target="_blank" style="color: #1a73e8; text-decoration: none;">If you found our service to be solid, Leave us a Google or Yelp  review!</a></div>`
                        : ''
                }
        `)
                .join('');


        return `
<div style="font-family: Arial, sans-serif; margin: 0 auto; padding: 20px; max-width: 600px;">
    <h1 style="text-align: center; font-size: 24px;">${customContent.header || 'Your Template Header'}</h1>
    <div style="text-align: center; margin: 20px 0;">
        ${
            customContent.logo
                ? `<img src="${customContent.logo}" alt="Logo" style="max-width: 100px; margin-bottom: 10px;" />`
                : '<span style="color: gray;">No Logo</span>'
        }
    </div>
    <p style="text-align: center; font-size: 18px; color: #555;">${customContent.pitch || 'Your pitch here'}</p>
    <hr style="margin: 20px 0; border: 1px solid #ddd;" />
    <div style="text-align: center; margin: 20px 0; font-family:Calibri">
        ${generateEmailContent(customContent.emailBodies, customContent.images, customContent.reviewLinks)}

    </div>
    <hr style="margin: 20px 0; border: 1px solid #ddd;" />
    <footer style="text-align: center; color: gray;">
        <p style="text-align: center">${customContent.contactInfo || 'Your Contact Information Here'}
        <br>
        
        <p style="text-align: center">${customContent.contactInfo2 || 'Your 2nd line of Contact  Information Here'}

            <div style="text-align: center; margin: 20px 0;"></p>
        ${
            customContent.logo
                ? `<img src="${customContent.logo}" alt="Logo" style="max-width: 50px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto; margin-top: auto; margin-bottom: auto;" />
`
                : '<span style="color: gray;">No Logo</span>'
        }
        
        <div style="text-align: center">
   ${
            customContent.website
                ? `<a style="text-align: center;" href="${customContent.website}" alt="Website" style="max-width: 50px; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto; margin-top: auto; margin-bottom: auto;" >${customContent.website}</a>
`
                : '<span style="color: gray;">No Website</span>'
        }
    </div>
</div>
    </div>
      
    </footer>
</div>`;
    };

    const handleSaveTemplate = async () => {
        const templateToSave = {
            category: selectedCategory,
            interval: selectedInterval,
            user_id: templateData.user_id,
            content: renderTemplateContent()
        };
console.log('here is the selected category and interval',selectedCategory + selectedInterval)
        try {
            const response = await axios.post('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/templates/create', templateToSave);
            if (response.status === 200 || response.status === 201) {
                alert('Template saved successfully!');
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template.');
        }
    };

    return (
        <div
            className="template-create-container p-4"
            style={{
                background: (() => {
                    switch (selectedCategory) {
                        case 'Opened Email Hot List':
                            return 'linear-gradient(45deg, rgb(223 15 15), transparent)';
                        case 'Opened Email List':
                            return 'linear-gradient(45deg, rgb(255, 112, 67), transparent)';
                        case 'Top of Mind':
                            return 'linear-gradient(45deg, #287ea7, transparent)';
                        case 'Thank You':
                            return 'linear-gradient(45deg, rgb(16 31 230), transparent)';
                        default:
                            return 'rgb(100, 195, 190)';
                    }
                })(),
                borderRadius: '8px',
                gap: '20px',
                marginLeft:'10em',
                marginRight:'10em',
                borderStyle:'solid',
                borderWidth:'3em',
                borderColor:'antiquewhite',
            }}
        >
            <div className="form-section" style={{ flex: '1' }}>
                <h3 style={{ textAlign: 'center',textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)' }} className="text-white">
                    Edit Your {selectedCategory} Automated Email
                </h3>
                {/* Lottie Animation */}




                <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                    <Tab eventKey="details" title="Details">
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Logo (URL)</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter logo URL"
                                    value={customContent.logo}
                                    onChange={(e) => handleCustomContentChange('logo', e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Review Link(s)</Form.Label>
                                {customContent.reviewLinks.map((reviewLink, index) => (
                                    <Form.Control
                                        key={index}
                                        type="text"
                                        className="mb-2"
                                        placeholder={`Review Link URL ${index + 1}`}
                                        value={reviewLink.url}
                                        onChange={(e) => handleReviewUrlChange(index, e.target.value)}
                                    />
                                ))}
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Contact Info</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Enter contact info"
                                    value={customContent.contactInfo}
                                    onChange={(e) => handleCustomContentChange('contactInfo', e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Contact Info 2nd Line</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Enter contact info"
                                    value={customContent.contactInfo2}
                                    onChange={(e) => handleCustomContentChange('contactInfo2', e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Website Link</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter website URL"
                                    value={customContent.website}
                                    onChange={(e) => handleCustomContentChange('website', e.target.value)}
                                />
                            </Form.Group>

                            <Button
                                variant="primary"
                                onClick={() => setActiveTab('content')}
                                style={{
                                    background: 'cornflowerblue',
                                    border: 'none'
                                }}
                            >
                                Continue to Content
                            </Button>
                        </Form>
                    </Tab>
                    <Tab eventKey="content" title="Content">
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>{customContent.placeholders.header || 'Header'}</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder={customContent.placeholders.header || 'Enter header text'}
                                    value={customContent.header}
                                    onChange={(e) => handleCustomContentChange('header', e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>{customContent.placeholders.pitch || 'Pitch'}</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder={customContent.placeholders.pitch || 'Enter pitch text'}
                                    value={customContent.pitch}
                                    onChange={(e) => handleCustomContentChange('pitch', e.target.value)}
                                />
                            </Form.Group>
                            {Array.from({ length: imageCount }).map((_, i) => (
                                <Form.Group key={i} className="mb-3">
                                    <Form.Label>{`Image ${i + 1}`}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter image URL"
                                        value={customContent.images[i]?.url || ''}
                                        onChange={(e) => handleImageUrlChange(i, e.target.value)}
                                    />
                                </Form.Group>
                            ))}
                            {Array.from({ length: bodyCount }).map((_, i) => (
                                <Form.Group key={i} className="mb-3">
                                    <Form.Label>{`Email Body ${i + 1}`}</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        placeholder={`Email Body ${i + 1}`}
                                        value={customContent.emailBodies[i] || ''}
                                        onChange={(e) => handleBodyChange(i, e.target.value)}
                                    />
                                </Form.Group>
                            ))}
                            <Button
                                variant="success"
                                onClick={handleSaveTemplate}
                                className="mt-2"
                                style={{
                                    background: 'linear-gradient(to right, #4CAF50, #81C784)',
                                    border: 'none'
                                }}
                            >
                                Save Template
                            </Button>
                        </Form>
                    </Tab>
                </Tabs>
            </div>

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
            <div
                style={{
                    borderStyle:'dashed',
                    flex: '1',
                    padding: '20px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    color: '#333',
                    overflow: 'auto'
                }}
                className="email-preview"
                dangerouslySetInnerHTML={{ __html: renderTemplateContent() }}
            />
            </Col>
        </div>


    );
};

export default TemplateCreate;
