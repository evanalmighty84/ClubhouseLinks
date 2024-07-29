import React, { Component } from "react";
import { render } from "react-dom";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Checkout from './Checkout'; // Your Checkout Component
import Success from './Success'; // Your Success Component
import Cancel from './Cancel'; // Your Cancel Component
import Header from "./components/common/Header";
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
import './index.css'

const stripePromise = loadStripe('pk_live_4s4TtIY6HXHbiKpHOoFGvQRf'); // Replace with your publishable key
//test key pk_test_OugHDMBWAshVGpzNnzXkORC6
class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: "React"
        };
    }

    render() {
        return (
            <GoogleOAuthProvider clientId="179478627002-th39iebli3b17dg5mkj4vu32sneo8mt9.apps.googleusercontent.com">
                <div>
                    <Router>
                        <Header />
                        <Elements stripe={stripePromise}>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/app/index.html" element={<HomePage />} />
                                <Route path="/app" element={<HomePage />} />
                                <Route path="/app/samplePortfolios2" element={<PSAPortfolio/>} />
                                <Route path="/app/samplePortfolios" element={<SamplePortfolios />} />
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
                            </Routes>
                        </Elements>
                    </Router>
                </div>
            </GoogleOAuthProvider>
        );
    }
}

render(<App />, document.getElementById("root"));
