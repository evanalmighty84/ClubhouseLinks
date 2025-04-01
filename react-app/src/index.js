import React, { Component } from "react";
import { render } from "react-dom";
import { HashRouter as Router, Routes, Route, useLocation, N } from "react-router-dom";
import { Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Checkout from './Checkout';
import Success from './Success';
import Cancel from './Cancel';
import Header from "./components/common/Header";
import TopBar from './CRMcomponents/Topbar';
import AI from "./components/ai-projects/AI";
import Marketing from "./components/marketing/Marketing";
import ECommerce from "./components/e-commerce/ECommerce";
import Reviews from "./components/reviews/Reviews";
import Apps from "./components/apps/Apps";
import HomePage from "./components/home/homepage";
import SamplePortfolios from "./components/samplePortfolios/sampleportfolios";
import PSAPortfolio from "./components/samplePortfolios/template1/sampleportfolios1";
import BlogsPage from "./components/blogs/blogspage";
import PetDashboard from "./components/apps/petDashborad";
import WebServices from "./WebServices";
import SamplePortfolios4 from "./components/samplePortfolios/templatemo_591_villa_agency/SamplePortfolios4";
import Dashboard from './CRMpages/Dashboard';
import CampaignPage from './CRMpages/CampaignPage';
import SendThankYouReviewForm from "./CRMpages/SendThankYouReviewForm";
import WorkflowPage from './CRMpages/WorkflowContainer';
import CampaignCreate from './CRMpages/CampaignCreate';
import CampaignContent from './CRMpages/CampaignContent';
import SignUp from './CRMpages/SignUp';
import SignIn from './CRMpages/SignIn';
import ListsPage from "./CRMcomponents/Lists/ListsPage";
import ListForm from "./CRMcomponents/Lists/ListForm";
import NonUserDashboard from "./CRMcomponents/NonUserDashboard"
import SubscribersPage from './CRMcomponents/Subscribers/SubscribersPage';
import SubscriberDetails from './CRMcomponents/Subscribers/SubscriberDetails';
import SubscribersForm from "./CRMcomponents/Subscribers/SubscribersForm";
import UnsubscribePage from "./CRMpages/UnsubscribePage";
import Settings from "./CRMpages/Settings";
import './index.css';
import EmailVerified from "./CRMpages/EmailVerified";
import EmailQueuedPage from "./CRMpages/EmailQueuedPage";

const stripePromise = loadStripe('pk_live_4s4TtIY6HXHbiKpHOoFGvQRf'); // Replace with your publishable key

// New function to determine the current location and conditionally render Header or TopBar
const ConditionalHeader = () => {
    const location = useLocation();

    // Define the routes where the TopBar should be shown
    const showTopBarRoutes = [
        '/app/dashboard',
        '/app/campaigns',
        '/app/workflow',
        '/campaigns/create',
        '/campaigns/content',
        '/app/subscribers',
        '/subscribers/new',
        '/subscribers/:id/edit',
        '/app/lists',
        '/app/emailqueued',
        '/lists/new',
        '/app/settings'


    ];

    // Check if the current path matches one of the TopBar routes
    const showTopBar = showTopBarRoutes.some(route => location.pathname.startsWith(route));

    return (
        <>
            {showTopBar ? <TopBar /> : <Header />}
            <div style={{ marginTop: showTopBar ? '100px' : '0px' }}>
                {/* Apply larger margin if TopBar is shown */}
            </div>
        </>
    );
};


class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: "React"
        };
    }





    render() {


        const ProtectedRoute = ({ children }) => {
            const user = localStorage.getItem("user");

            // If the user is not logged in, redirect to the Sign In page
            if (!user) {
                return <Navigate to="/app/signin" replace />;
            }

            // If the user is logged in, render the child component
            return children;
        };
        return (
            <GoogleOAuthProvider clientId="179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com">
                <div>
                    <Router>
                        <ConditionalHeader />
                        <Elements stripe={stripePromise}>
                            <Routes>
                                {/* Homepage */}
                         {/*       <Route path="/" element={<HomePage />} />*/}
                                <Route path="/" element={<NonUserDashboard />} />

                                {/* Other Routes */}
                                <Route path="/app/samplePortfolios2" element={<PSAPortfolio />} />
                                <Route path="/app/samplePortfolios" element={<SamplePortfolios />} />
                                <Route path="/app/SendThankYouReviewForm" element={<SendThankYouReviewForm />} />
                                <Route path="/app/contactUs" element={<WebServices />} />
                                <Route path="/app/blogs" element={<BlogsPage />} />
                                <Route path="/app/aiProjects" element={<AI />} />
                                <Route path="/app/clubhouseMarketing" element={<Marketing />} />
                                <Route path="/app/eCommerce" element={<ECommerce />} />
                                <Route path="/app/onlineReviews" element={<Reviews />} />
                                <Route path="/app/appstore" element={<Apps />} />
                                <Route path="/app/petDashboard/:storeName/:name" element={<PetDashboard />} />
                                <Route path="/app/checkout" element={<Checkout />} />
                                <Route path="/app/samplePortfolios4" element={<SamplePortfolios4 />} />
                                <Route path="/app/success" element={<Success />} />
                                <Route path="/app/cancel" element={<Cancel />} />
                                {/* Dashboard, Campaigns, Subscribers, and Lists */}
                                <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                                <Route path="/app/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                                <Route path="/app/campaigns" element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
                                <Route path="/campaigns/create" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
                                <Route path="/campaigns/content" element={<ProtectedRoute><CampaignContent /></ProtectedRoute>} />
                                <Route path="/app/workflow" element={<ProtectedRoute><WorkflowPage /></ProtectedRoute>} />
                                <Route path="/app/subscribers" element={<ProtectedRoute><SubscribersPage /></ProtectedRoute>} />
                                <Route path="/subscribers/new" element={<ProtectedRoute><SubscribersForm /></ProtectedRoute>} />
                                <Route path="/app/subscribers/:id/edit" element={<ProtectedRoute><SubscriberDetails /></ProtectedRoute>} />
                                <Route path="/app/verify-email-success" element={<EmailVerified />} />
                                <Route path="/app/lists" element={<ProtectedRoute><ListsPage /></ProtectedRoute>} />
                                <Route path="/app/emailqueued" element={<ProtectedRoute><EmailQueuedPage /></ProtectedRoute>} />
                                <Route path="/lists/new" element={<ProtectedRoute><ListForm /></ProtectedRoute>} />
                                <Route path="/app/lists/:id/edit" element={<ProtectedRoute><ListForm /></ProtectedRoute>} />

                                {/* Authentication */}
                                <Route path="/app/signup" element={<SignUp />} />
                                <Route path="/app/signin" element={<SignIn />} />


                                {/* Unsubscribe Routes */}
                                <Route path="/app/unsubscribe-success"  element={<UnsubscribePage />}  />
                            </Routes>
                        </Elements>
                    </Router>
                </div>
            </GoogleOAuthProvider>
        );
    }
}

render(<App />, document.getElementById("root"));