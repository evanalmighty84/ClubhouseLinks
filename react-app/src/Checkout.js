import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Form, Button, Container, Row, Col, Card, Table } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import DesignImage1 from './components/OrderSummaryDesign1.png'
import DesignImage2 from './components/OrderSummaryDesign2.png'
import DesignImage3 from './components/OrderSummaryDesign3.png'
import './checkout.css'; // Import the custom CSS file

const colors = [
    'white',
    'linear-gradient(to bottom right, #ffecb3, #ffd700)',
    'linear-gradient(to bottom right, #a9d8d8, cadetblue)',
    'linear-gradient(to bottom right, #34eb92, #23ad6a)',
    'linear-gradient(to bottom right, #f5c2d5, #de4e7f)',
    'linear-gradient(to bottom right, #b0d4e3, steelblue)',
    'linear-gradient(to bottom right, #f7e0c4, brown)',
];

const Checkout = () => {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const location = useLocation();
    const [cart, setCart] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [selectedOptions, setSelectedOptions] = useState({
        Subscriptions: 'Monthly Plan - $0 (First Month Free)',
        Website: 'Basic Package - $199.99',
        Systems: '',
    });
    const [portfolioItem, setPortfolioItem] = useState(null);

    useEffect(() => {
        if (location.state?.cartItem) {
            setPortfolioItem(location.state.cartItem);
        }
    }, [location.state]);

    const baseMonthlyPrice = 59.99;
    const premiumMonthlyPrice = 69.99;
    const yearlyPrice = 599.99;

    const calculateSubscriptionPrice = (planType) => {
        if (planType === 'Yearly Plan - $599.99') {
            return yearlyPrice;
        }
        return selectedOptions.Subscriptions.includes('Yearly') ? yearlyPrice : baseMonthlyPrice;
    };

    const updateTotalPrice = (cartItems) => {
        const prices = cartItems.map(item => {
            const priceMatch = item.selectedOption?.match(/\$([\d.]+)/);
            return priceMatch ? parseFloat(priceMatch[1]) * 100 : 0; // Convert dollars to cents
        });
        setTotalPrice(prices.reduce((acc, curr) => acc + curr, 0));
    };

    useEffect(() => {
        const subscriptionPrice = calculateSubscriptionPrice(selectedOptions.Subscriptions);
        const initialCart = [
            {
                type: 'Subscriptions',
                selectedOption: `${selectedOptions.Subscriptions}`
            },
            {
                type: 'Website',
                selectedOption: `${selectedOptions.Website}`
            },
            {
                type: 'Systems',
                selectedOption: `${selectedOptions.Systems}`
            }
        ];

        if (portfolioItem) {
            initialCart[0].selectedOption = `Subscription Plan - ${selectedOptions.Subscriptions} - $${subscriptionPrice.toFixed(2)}`;
        }

        setCart(initialCart);
        updateTotalPrice(initialCart);
    }, [portfolioItem, selectedOptions]);

    const handleAddToCart = (type, value) => {
        setSelectedOptions(prevOptions => ({
            ...prevOptions,
            [type]: value
        }));

        // Update cart with new selections
        const updatedCart = [...cart];
        const option = {
            type,
            selectedOption: value
        };

        // Find and update existing item in cart or add new item
        const index = updatedCart.findIndex(item => item.type === type);
        if (index > -1) {
            updatedCart[index] = option;
        } else {
            updatedCart.push(option);
        }

        setCart(updatedCart);
        updateTotalPrice(updatedCart);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!stripe || !elements) return;

        const cardElement = elements.getElement(CardElement);
        const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
        });

        if (error) {
            console.error('Error creating payment method:', error);
        } else {
            const { id } = paymentMethod;
            try {
                const response = await fetch('/server/home_page_function/create-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_method_id: id, amount: totalPrice }),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const { client_secret } = await response.json();
                if (client_secret) {
                    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(client_secret);

                    if (confirmError) {
                        console.error('Error confirming card payment:', confirmError);
                    } else if (paymentIntent.status === 'succeeded') {
                        navigate('/success');
                    } else if (paymentIntent.status === 'requires_action') {
                        // Payment requires additional actions
                        window.location.href = paymentIntent.next_action.use_stripe_sdk.redirect_to_url;
                    } else {
                        navigate('/cancel');
                    }
                } else {
                    console.error('Client secret is missing.');
                }
            } catch (error) {
                console.error('Error fetching payment intent:', error);
                navigate('/cancel');
            }
        }
    };

    const renderOrderSummary = () => {
        return (
            <Card className="mb-3">
                <Card.Header className="bg-primary text-white">
                    <h4>Order Summary</h4>
                </Card.Header>
                <Card.Body>
                    {cart.map((item, index) => (
                        <div key={index} className="mb-2">
                            <div><strong>{item.type}:</strong> {item.selectedOption}</div>
                        </div>
                    ))}
                    {portfolioItem && (
                        <>
                            <h5>Selected Design:</h5>
                 {/*           <p>{portfolioItem.design}</p>*/}
                            {console.log(portfolioItem.design)}

                            {/* Conditionally render the image based on portfolioItem.design */}
                            <div style={{paddingBottom:'2em'}}>
                                {portfolioItem.design === 'design1' && (
                                    <img
                                        src={DesignImage1}
                                        alt="Design 1"
                                        style={{ marginLeft: '15px', height: '100px', width: 'auto' }}
                                    />
                                )}
                                {portfolioItem.design === 'design2' && (
                                    <img
                                        src={DesignImage2}
                                        alt="Design 2"
                                        style={{ marginLeft: '15px', height: '100px', width: 'auto' }}
                                    />
                                )}
                                {portfolioItem.design === 'design3' && (
                                    <img
                                        src={DesignImage3}
                                        alt="Design 3"
                                        style={{ marginLeft: '15px', height: '100px', width: 'auto' }}
                                    />
                                )}
                            </div>

                            <h5>Selected Gradient:</h5>
                            <p>{portfolioItem.gradient}</p>
                        </>
                    )}

                    <h3>Total: ${(totalPrice / 100).toFixed(2)}</h3>
                </Card.Body>
            </Card>
        );
    };

    return (
        <div style={{ minHeight: '100vh', padding: '20px' }}>
            <Container>
                <Row className="justify-content-md-center mb-4">
                    <Col md="6">
                        <h2 className="my-4 text-center">Checkout</h2>
                    </Col>
                </Row>
                <Row>
                    <Col md="4" className="d-flex flex-column" style={{ padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                        <Card className="shadow-sm border-light flex-grow-1">
                            <Card.Header className="bg-primary text-white text-center">
                                <h4>Subscriptions</h4>
                            </Card.Header>
                            <Card.Body className="d-flex flex-column">
                                <Card.Text>
                                    Enjoy access to our premium features and Email and Chat support with flexible subscription plans.
                                </Card.Text>
                                <div className="table-responsive mt-4">
                                    <Table striped bordered hover>
                                        <thead>
                                        <tr>
                                            <th>Subscription</th>
                                            <th style={{backgroundColor:'#CD7E42'}}>Bronze</th>
                                            <th style={{background: 'linear-gradient(to right, #E8B690, #CD7E42, #995824)'}}>Bronze Plus</th>
                                            <th style={{backgroundColor:'#C0C0C0'}}>Silver</th>
                                            <th style={{background: 'linear-gradient(to right, #F0F0F0, #C0C0C0, #8C8C8C)'}}>Silver Plus</th>
                                            <th style={{backgroundColor:'#FFAE01'}}>Gold</th>
                                            <th style={{background: 'linear-gradient(to right, #FFE29C, #FFAE01, #D48800)'}}>Gold Plus</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        <tr>
                                            <td data-label="Subscription" style={{color:'black'}}>Monthly</td>
                                            <td data-label="Bronze" style={{background: colors[5], color:'white'}}>Subscription to help guide you with Google Tag Manager, Campaign templates, and more solutions to target repeat customers, plus implementations to build a faster website without code for faster load times</td>
                                            <td data-label="Bronze Plus" style={{background: colors[5], color:'white'}}>Bronze package + monthly custom personal web developer additions to your website upon request, including new color schemes, updates to Text and any pictures of your choosing</td>
                                            <td data-label="Silver" style={{background: colors[3], color:'white'}}>Bronze Plus package + Google Business Page Setup + CMS integration</td>
                                            <td data-label="Silver Plus" style={{background: colors[3], color:'white'}}>Silver package + Social Media Business Page Setup and Integration. Facebook, and Instagram + Web management for Social Media posts and updates monthly</td>
                                            <td data-label="Gold" style={{background: colors[2], color:'white'}}>Silver Plus package + SEO custom optimization with code specifically matching your industry on your website</td>
                                            <td data-label="Gold Plus" style={{background: colors[2], color:'white'}}>Gold package + Any website of any kind with additions like custom payment solutions, Database Integrations, Customer Portal, Rewards Programs, Internal Clubhouse Links CRM software</td>
                                        </tr>
                                        <tr>
                                            <td data-label="Subscription">Yearly</td>
                                            <td data-label="Bronze" style={{background: colors[5], color:'white'}}>Subscription to help your site every way possible to help you with Google Tag Manager, Campaign templates to target repeat customers, and insights into faster website code and faster load times</td>
                                            <td data-label="Bronze Plus" style={{background: colors[5], color:'white'}}>Bronze package + monthly custom personal web developer additions to your website upon request, including new color schemes, updates to Text and any pictures of your choosing</td>
                                            <td data-label="Silver" style={{background: colors[3], color:'white'}}>Bronze Plus package + Google Business Page Setup + CMS integration</td>
                                            <td data-label="Silver Plus" style={{background: colors[3], color:'white'}}>Silver package + Social Media Business Page Setup and Integration. Facebook, and Instagram + Web management for Social Media posts and updates monthly</td>
                                            <td data-label="Gold" style={{background: colors[2], color:'white'}}>Silver Plus package + SEO custom optimization with code specifically matching your industry on your website</td>
                                            <td data-label="Gold Plus" style={{background: colors[2], color:'white'}}>Gold package + Any website of any kind with additions like custom payment solutions, Database Integrations, Customer Portal, Rewards Programs, Internal Clubhouse Links CRM software</td>
                                        </tr>
                                        </tbody>
                                    </Table>
                                </div>

                                <Form.Group controlId="subscriptionsSelect" className="mb-3">
                                    <Form.Label>Select Subscription Plan</Form.Label>
                                    <Form.Control
                                        as="select"
                                        value={selectedOptions.Subscriptions}
                                        onChange={(e) => handleAddToCart('Subscriptions', e.target.value)}
                                    >
                                        <option value="Monthly Plan - $0 (First Month Free)">Monthly Plan - $0 (First Month Free)</option>
                                        <option value="Yearly Plan - $0 (First Month Free)">Yearly Plan - $599.99 (First Month Free)</option>
                                    </Form.Control>
                                </Form.Group>
                                <Button variant="primary" block className="mt-auto">
                                    Subscribe Now
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md="4" className="d-flex flex-column" style={{ padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                        <Card className="shadow-sm border-light flex-grow-1">
                            <Card.Header className="bg-primary text-white text-center">
                                <h4>Website Building</h4>
                            </Card.Header>
                            <Card.Body className="d-flex flex-column">
                                <Card.Text>
                                    Build a stunning website with our professional website building services.
                                </Card.Text>
                                <Form.Group controlId="WebsiteSelect" className="mb-3">
                                    <Form.Label>Select Website Building Package</Form.Label>
                                    <Form.Control
                                        as="select"
                                        value={selectedOptions.Website}
                                        onChange={(e) => handleAddToCart('Website', e.target.value)}
                                    >
                                        <option value="Basic Package - $199.99">Basic Package - $199.99</option>
                                        <option value="Advanced Package - $299.99">Advanced Package (Custom Design)  - $299.99</option>
                                    </Form.Control>
                                </Form.Group>
                                <Button variant="primary" block className="mt-auto">
                                    Choose Package
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md="4" className="d-flex flex-column" style={{ padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
                        <Card className="shadow-sm border-light flex-grow-1">
                            <Card.Header className="bg-primary text-white text-center">
                                <h4>CMS + CRM</h4>
                            </Card.Header>
                            <Card.Body className="d-flex flex-column">
                                <Card.Text>
                                    Check out our special bundles and save more!
                                </Card.Text>
                                <Form.Group controlId="bundlesSelect" className="mb-3">
                                    <Form.Label>Select Systems</Form.Label>
                                    <Form.Control
                                        as="select"
                                        value={selectedOptions.Systems}
                                        onChange={(e) => handleAddToCart('Systems', e.target.value)}
                                    >
                                        <option value="">Select an option</option>
                                        <option value="Monthly Plan CMS - $49.99 ">Monthly Plan CMS  - $49.99</option>
                                        <option value="Monthly Plan  CRM - $39.99">Monthly Plan CRM - $39.99</option>
                                        <option value="Monthly Plan CMS + CRM - $59.99">Monthly PlanCMS + CRM - $59.99</option>
                                    </Form.Control>
                                </Form.Group>
                                <Button variant="primary" block className="mt-auto">
                                    Select a System
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                <Row className="justify-content-md-center">
                    <Col md="8">
                        {renderOrderSummary()}
                    </Col>
                </Row>
                <Row className="justify-content-md-center">
                    <Col md="8">
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Card Details</Form.Label>
                                <CardElement className="form-control" />
                            </Form.Group>
                            <Button type="submit" variant="primary" disabled={!stripe}>
                                Pay Now
                            </Button>
                        </Form>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Checkout;
