import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import axios from 'axios';
import './CalendarScheduler.css'; // Custom styles for header/columns/events

const localizer = momentLocalizer(moment);

const CalendarScheduler = () => {
    const [events, setEvents] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [lists, setAllLists] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSubscribers, setSelectedSubscribers] = useState([]);
    const [actionType, setActionType] = useState('');
    const [note, setNote] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [eventDetails, setEventDetails] = useState(null);
    const [queuedEmails, setQueuedEmails] = useState([]);

    const fetchQueuedEmails = async (subscriberId) => {
        try {
            const response = await axios.get(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${subscriberId}/queued-emails`);
            if (Array.isArray(response.data)) {
                setQueuedEmails(response.data);
            } else {
                setQueuedEmails([]);
            }
        } catch (error) {
            console.error("Error fetching queued emails:", error);
            setQueuedEmails([]);
        }
    };

    const fetchSubscribers = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/user/${user.id}`);
            const data = await response.json();
            if (response.ok) {
                setSubscribers(data);
            }
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        }
    };

    const fetchLists = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/user/${user.id}`);
            const data = await response.json();
            if (response.ok) {
                setAllLists(data);
            }
        } catch (error) {
            console.error('Error fetching lists:', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/templates/user/${user.id}`);
            const data = await response.json();
            if (response.ok) {
                setTemplates(data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
        }
    };

    const handleDateClick = async (slotInfo) => {
        await fetchTemplates();
        setSelectedDate(slotInfo.start);
        setShowModal(true);
    };

    const handleEventClick = async (event) => {
        await fetchTemplates();

        const subscriberName = event.title.split(" - ")[1];
        const subscriber = subscribers.find(sub => sub.name === subscriberName);

        if (subscriber) {
            await fetchQueuedEmails(subscriber.id);
        }

        const matchedTemplate = templates.find(t => t.name === event.templateName);
        setEventDetails({
            ...event,
            templateContent: matchedTemplate?.content,
        });

        setSelectedDate(event.start);
        setActionType(event.title.toLowerCase().split(" - ")[0]);
        setShowModal(true);
    };

    const handleDeleteEvent = async () => {
        if (!eventDetails) return;

        try {
            const subscriberName = eventDetails.title.split(" - ")[1];
            const subscriber = subscribers.find(sub => sub.name === subscriberName);
            if (!subscriber) return;

            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/${subscriber.id}/unschedule`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: actionType })
            });

            if (response.ok) {
                setShowModal(false);
                fetchSubscribers();
            }
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const handlePreview = (html) => {
        const newWindow = window.open();
        newWindow.document.write(html);
        newWindow.document.close();
    };

    const handleSchedule = async () => {
        try {
            const response = await fetch('https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/subscribers/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriberIds: selectedSubscribers,
                    type: actionType,
                    date: selectedDate,
                    notes: note,
                })
            });
            if (response.ok) {
                setShowModal(false);
                fetchSubscribers();
            }
        } catch (error) {
            console.error('Error scheduling event:', error);
        }
    };

    const convertSubscribersToEvents = () => {
        return subscribers.flatMap(sub => {
            const events = [];
            const styleMap = {
                email: 'event-email',
                phone_call: 'event-call',
                meeting: 'event-meeting',
                other: 'event-other',
            };
            if (sub.scheduled_email) {
                events.push({
                    title: `Email - ${sub.name}`,
                    start: new Date(sub.scheduled_email),
                    end: new Date(sub.scheduled_email),
                    notes: sub.notes,
                    templateName: sub.template_name,
                    className: styleMap.email
                });
            }
            if (sub.scheduled_phone_call) {
                events.push({
                    title: `Call - ${sub.name}`,
                    start: new Date(sub.scheduled_phone_call),
                    end: new Date(sub.scheduled_phone_call),
                    notes: sub.notes,
                    className: styleMap.phone_call
                });
            }
            if (sub.scheduled_meeting) {
                events.push({
                    title: `Meeting - ${sub.name}`,
                    start: new Date(sub.scheduled_meeting),
                    end: new Date(sub.scheduled_meeting),
                    notes: sub.notes,
                    className: styleMap.meeting
                });
            }
            if (sub.scheduled_other) {
                events.push({
                    title: `Other - ${sub.name}`,
                    start: new Date(sub.scheduled_other),
                    end: new Date(sub.scheduled_other),
                    notes: sub.notes,
                    className: styleMap.other
                });
            }
            return events;
        });
    };

    const eventPropGetter = (event) => {
        const styles = {
            'event-email': {
                background: 'linear-gradient(to right bottom, rgb(255, 218, 179), orange)',
                color: 'black',
                borderRadius: '6px',
                padding: '2px 6px'
            },
            'event-call': {
                background: 'linear-gradient(to right bottom, rgb(52, 235, 146), rgb(35, 173, 106))',
                color: 'white',
                borderRadius: '6px',
                padding: '2px 6px'
            },
            'event-meeting': {
                background: 'linear-gradient(to right bottom, rgb(169, 216, 216), cadetblue)',
                color: 'white',
                borderRadius: '6px',
                padding: '2px 6px'
            },
            'event-other': {
                background: 'lightgray',
                color: 'black',
                borderRadius: '6px',
                padding: '2px 6px'
            }
        };
        return {
            style: styles[event.className] || {}
        };
    };

    useEffect(() => {
        fetchSubscribers();
        fetchLists();
        fetchTemplates();
    }, []);

    useEffect(() => {
        setEvents(convertSubscribersToEvents());
    }, [subscribers]);

    return (
        <div className="calendar-wrapper">
            <h2 style={{ textAlign: 'center', color: 'orange' }}>Calendar Scheduler</h2>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                selectable
                onSelectSlot={handleDateClick}
                onSelectEvent={handleEventClick}
                eventPropGetter={eventPropGetter}
                className="custom-calendar"
            />

            {/* Modal here remains unchanged */}
        </div>
    );
};

export default CalendarScheduler;
