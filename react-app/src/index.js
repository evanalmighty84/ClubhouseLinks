import React, { Component } from "react";
import { render } from "react-dom";
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    useLocation
} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { GoogleOAuthProvider } from "@react-oauth/google";


const query = new URLSearchParams(window.location.search);
const redirectPath = query.get('redirect');
if (redirectPath && window.location.pathname === "/") {
    window.history.replaceState({}, '', redirectPath);
}

// Your Components
import Checkout from "./Checkout";
import Success from "./Success";
import Cancel from "./Cancel";
import Header from "./components/common/Header";
import TopBar from "./CRMcomponents/Topbar";
import AI from "./components/ai-projects/AI";
import Marketing from "./components/marketing/Marketing";
import ECommerce from "./components/e-commerce/ECommerce";
import Reviews from "./components/reviews/Reviews";
import Apps from "./components/apps/Apps";
import SamplePortfolios from "./components/samplePortfolios/sampleportfolios";
import PSAPortfolio from "./components/samplePortfolios/template1/sampleportfolios1";
import BlogsPage from "./components/blogs/blogspage";
import PetDashboard from "./components/apps/petDashborad";
import WebServices from "./WebServices";
import SamplePortfolios4 from "./components/samplePortfolios/templatemo_591_villa_agency/SamplePortfolios4";
import Dashboard from "./CRMpages/Dashboard";
import CampaignPage from "./CRMpages/CampaignPage";
import SendGoogleReviewForm from "./CRMpages/SendGoogleReviewFormBrad";
import SendGoogleReviewForm2 from "./CRMpages/SendGoogleReviewFormTerri";
import SendGoogleReviewForm3 from "./CRMpages/SendGoogleReviewFormJohn";
import SendGoogleReviewForm4 from "./CRMpages/SendGoogleReviewFormDavid";
import WorkflowPage from "./CRMpages/WorkflowContainer";
import CampaignCreate from "./CRMpages/CampaignCreate";
import CampaignContent from "./CRMpages/CampaignContent";
import SignUp from "./CRMpages/SignUp";
import SignIn from "./CRMpages/SignIn";
import ListsPage from "./CRMcomponents/Lists/ListsPage";
import ListForm from "./CRMcomponents/Lists/ListForm";
import NonUserDashboard from "./CRMcomponents/NonUserDashboard";
import SubscribersPage from "./CRMcomponents/Subscribers/SubscribersPage";
import SubscriberDetails from "./CRMcomponents/Subscribers/SubscriberDetails";
import SubscribersForm from "./CRMcomponents/Subscribers/SubscribersForm";
import UnsubscribePage from "./CRMpages/UnsubscribePage";
import Settings from "./CRMpages/Settings";
import SMSConsentPage from "./CRMpages/ConsentPage";
import EmailVerified from "./CRMpages/EmailVerified";
import EmailQueuedPage from "./CRMpages/EmailQueuedPage";

import "./index.css";

const stripePromise = loadStripe("pk_live_4s4TtIY6HXHbiKpHOoFGvQRf");

const ConditionalHeader = () => {
    const location = useLocation();
    const hideHeaderRoutes = [
        "/BradMcClain",
        "/TerriPescatore",
        "/johnHeusinkveld",
        "/davidDixon"
    ];
    const showTopBarRoutes = [
        "/dashboard",
        "/campaigns",
        "/workflow",
        "/campaigns/create",
        "/campaigns/content",
        "/subscribers",
        "/subscribers/new",
        "/subscribers/:id/edit",
        "/lists",
        "/emailqueued",
        "/lists/new",
        "/settings"
    ];
    const shouldHideHeader = hideHeaderRoutes.includes(location.pathname);
    const showTopBar = showTopBarRoutes.some(route =>
        location.pathname.startsWith(route)
    );

    if (shouldHideHeader) return null;
    return (
        <>
            {showTopBar ? <TopBar /> : <Header />}
            <div style={{ marginTop: showTopBar ? "100px" : "0px" }}></div>
        </>
    );
};

class App extends Component {
    render() {
        const ProtectedRoute = ({ children }) => {
            const user = localStorage.getItem("user");
            if (!user) return <Navigate to="/signin" replace />;
            return children;
        };

        return (
            <GoogleOAuthProvider clientId="179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com">
                <BrowserRouter basename={process.env.NODE_ENV === 'production' ? '/ClubhouseLinks' : '/'}>


                <ConditionalHeader />
                    <Elements stripe={stripePromise}>
                        <Routes>
                            <Route path="/" element={<NonUserDashboard />} />
                            <Route path="/samplePortfolios2" element={<PSAPortfolio />} />
                            <Route path="/samplePortfolios" element={<SamplePortfolios />} />
                            <Route path="/BradMcClain" element={<SendGoogleReviewForm />} />
                            <Route path="/TerriPescatore" element={<SendGoogleReviewForm2 />} />
                            <Route path="/JohnHeusinkveld" element={<SendGoogleReviewForm3 />} />
                            <Route path="/DavidDixon" element={<SendGoogleReviewForm4 />} />
                            <Route path="/sms-optin-consent" element={<SMSConsentPage />} />
                            <Route path="/contactUs" element={<WebServices />} />
                            <Route path="/blogs" element={<BlogsPage />} />
                            <Route path="/aiProjects" element={<AI />} />
                            <Route path="/clubhouseMarketing" element={<Marketing />} />
                            <Route path="/eCommerce" element={<ECommerce />} />
                            <Route path="/onlineReviews" element={<Reviews />} />
                            <Route path="/appstore" element={<Apps />} />
                            <Route path="/petDashboard/:storeName/:name" element={<PetDashboard />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="/samplePortfolios4" element={<SamplePortfolios4 />} />
                            <Route path="/success" element={<Success />} />
                            <Route path="/cancel" element={<Cancel />} />
                            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                            <Route path="/campaigns" element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />
                            <Route path="/campaigns/create" element={<ProtectedRoute><CampaignCreate /></ProtectedRoute>} />
                            <Route path="/campaigns/content" element={<ProtectedRoute><CampaignContent /></ProtectedRoute>} />
                            <Route path="/workflow" element={<ProtectedRoute><WorkflowPage /></ProtectedRoute>} />
                            <Route path="/subscribers" element={<ProtectedRoute><SubscribersPage /></ProtectedRoute>} />
                            <Route path="/subscribers/new" element={<ProtectedRoute><SubscribersForm /></ProtectedRoute>} />
                            <Route path="/subscribers/:id/edit" element={<ProtectedRoute><SubscriberDetails /></ProtectedRoute>} />
                            <Route path="/verify-email-success" element={<EmailVerified />} />
                            <Route path="/lists" element={<ProtectedRoute><ListsPage /></ProtectedRoute>} />
                            <Route path="/emailqueued" element={<ProtectedRoute><EmailQueuedPage /></ProtectedRoute>} />
                            <Route path="/lists/new" element={<ProtectedRoute><ListForm /></ProtectedRoute>} />
                            <Route path="/lists/:id/edit" element={<ProtectedRoute><ListForm /></ProtectedRoute>} />
                            <Route path="/signup" element={<SignUp />} />
                            <Route path="/signin" element={<SignIn />} />
                            <Route path="/unsubscribe-success" element={<UnsubscribePage />} />
                            <Route path="*" element={<div style={{ padding: '2rem', color: 'red' }}>❌ 404 - Page Not Found</div>} />
                        </Routes>
                    </Elements>
                </BrowserRouter>
            </GoogleOAuthProvider>
        );
    }
}

render(<App />, document.getElementById("root"));
