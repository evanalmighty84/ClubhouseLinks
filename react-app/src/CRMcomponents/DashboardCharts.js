import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardCharts = ({ totalSubscribers = 0, timePeriods = [] }) => {
    // Dynamically map timePeriods to the chart data
    const data = timePeriods.map((period, index) => ({
        name: period.name,  // Use the actual period range from the backend response
        TotalSubscribers: totalSubscribers,
        NewContacts: period.newContacts || 0,
        Unsubscribes: period.unsubscribes || 0,
        Bounces: period.bounces || 0,
        Opens: period.opens || 0,
        Clicks: period.clicks || 0
    }));

    return (
        <div className="dashboard-chart">
            <h2>Contacts - Last 30 days</h2>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="TotalSubscribers" fill="cadetblue" />
                    <Bar dataKey="NewContacts" fill="steelblue" />
                    <Bar dataKey="Unsubscribes" fill="#de4e7f" />
                    <Bar dataKey="Bounces" fill="orange" />
                    <Bar dataKey="Opens" fill="#8884d8" />
                    <Bar dataKey="Clicks" fill="#82ca9d" />
                </BarChart>
            </ResponsiveContainer>

            <div className="chart-summary mt-4" style={summaryStyle}>
                <h4 style={summaryTitleStyle}>Summary:</h4>
                <div style={summaryItemStyle}>
                    <span style={summaryLabelStyle}><strong>Total Subscribers:</strong></span>
                    <span style={summaryValueStyle}>{totalSubscribers}</span>
                </div>
                <div style={summaryItemStyle}>
                    <span style={summaryLabelStyle}><strong>New Contacts:</strong></span>
                    <span style={summaryValueStyle}>{timePeriods.reduce((sum, p) => sum + p.newContacts, 0)}</span>
                </div>
                <div style={summaryItemStyle}>
                    <span style={summaryLabelStyle}><strong>Unsubscribes:</strong></span>
                    <span style={summaryValueStyle}>{timePeriods.reduce((sum, p) => sum + p.unsubscribes, 0)}</span>
                </div>
                <div style={summaryItemStyle}>
                    <span style={summaryLabelStyle}><strong>Bounces:</strong></span>
                    <span style={summaryValueStyle}>{timePeriods.reduce((sum, p) => sum + p.bounces, 0)}</span>
                </div>
                <div style={summaryItemStyle}>
                    <span style={summaryLabelStyle}><strong>Opens:</strong></span>
                    <span style={summaryValueStyle}>{timePeriods.reduce((sum, p) => sum + p.opens, 0)}</span>
                </div>
                <div style={summaryItemStyle}>
                    <span style={summaryLabelStyle}><strong>Clicks:</strong></span>
                    <span style={summaryValueStyle}>{timePeriods.reduce((sum, p) => sum + p.clicks, 0)}</span>
                </div>
            </div>
        </div>
    );
};

// Inline styling for summary
const summaryStyle = {
    background: '#f9f9f9',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '20px auto',
};

const summaryTitleStyle = {
    fontSize: '1.5rem',
    marginBottom: '15px',
    textAlign: 'center',
    fontWeight: 'bold'
};

const summaryItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '1.2rem',
};

const summaryLabelStyle = {
    fontWeight: 'bold',
    color: '#333'
};

const summaryValueStyle = {
    fontWeight: 'bold',
    color: '#4682b4'
};

export default DashboardCharts;
