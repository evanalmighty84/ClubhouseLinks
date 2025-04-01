import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Modal, Button, Form, Table,  } from 'react-bootstrap';
import { toast } from 'react-toastify';
import axios from 'axios';
import './CalendarScheduler.css';

const localizer = momentLocalizer(moment);

const CalendarScheduler = ({ guestMode = false })  => {
    const [events, setEvents] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [filteredSubscribers, setFilteredSubscribers] = useState([]);
    const [lists, setAllLists] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSubscribers, setSelectedSubscribers] = useState([]);
    const [actionType, setActionType] = useState('');
    const [note, setNote] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [eventDetails, setEventDetails] = useState(null);
    const [queuedEmails, setQueuedEmails] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [queuedSMS, setQueuedSMS] = useState([]);

    const mockSubscribers = [
        { id: 1, name: 'Jane Doe', email: 'jane@example.com', scheduled_email: moment().add(1, 'days').toISOString(), notes: 'Follow-up', template_name: 'Welcome' },
        { id: 2, name: 'John Smith', email: 'john@example.com', scheduled_meeting: moment().add(2, 'days').toISOString(), notes: 'Demo Call', template_name: '' },
    ];

    const mockTemplates = [
        { id: 1, name: 'Welcome', category: 'Onboarding', content: '<h1>Welcome!</h1>' },
        { id: 2, name: 'Follow-up', category: 'Engagement', content: '<h1>Follow Up</h1>' }
    ];

    const fetchQueuedEmails = async (subscriberId) => {
        try {
            const response = await axios.get(`/server/crm_function/api/subscribers/${subscriberId}/queued-emails`);
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

    const handleSearchChange = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        const filtered = subscribers.filter((sub) =>
            sub.name.toLowerCase().includes(query) ||
            sub.email.toLowerCase().includes(query)
        );
        setFilteredSubscribers(filtered);
    };

    const fetchSubscribers = async () => {
        if (guestMode) {
            setSubscribers(mockSubscribers);
            setFilteredSubscribers(mockSubscribers);
            return;
        }
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`/server/crm_function/api/subscribers/user/${user.id}`);
            const data = await response.json();
            if (response.ok) {
                setSubscribers(data);
                setFilteredSubscribers(data);
            }
        } catch (error) {
            console.error('Error fetching subscribers:', error);
        }
    };

    const fetchQueuedSMS = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`/server/crm_function/api/smsqueue/scheduled/${user.id}`);
            const data = await response.json();
            if (response.ok) {
                setQueuedSMS(data);
            } else {
                setQueuedSMS([]);
                console.error('Failed to load queued SMS', data);
            }
        } catch (error) {
            console.error('Error fetching queued SMS:', error);
            setQueuedSMS([]);
        }
    };


    const fetchLists = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await fetch(`/server/crm_function/api/lists/user/${user.id}`);
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
            const response = await fetch(`/server/crm_function/api/templates/user/${user.id}`);
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

            const response = await fetch(`/server/crm_function/api/subscribers/${subscriber.id}/unschedule`, {
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
    const formatNoteWithDate = (note) => {
        if (!note) return 'No notes available.';

        return note.replace(
            /\[([A-Z_]+)\s+on\s+([\d\-T:.Z]+)\]/g,
            (match, type, rawDate) => {
                const formatted = moment.utc(rawDate).local().format('MMMM Do YYYY, h:mm A');
                return `[${type} on ${formatted}]`;
            }
        );

    }




    const handleSchedule = async () => {
        try {
            const response = await fetch('/server/crm_function/api/subscribers/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscriberIds: selectedSubscribers,
                    type: actionType,
                    date: selectedDate.toISOString(), // ✅ Ensures the backend gets UTC timestamp
                    notes: note,
                }),
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Unknown error');

            toast.success('Subscribers scheduled successfully!');

            if (result.failed?.length) {
                toast.warning(`The following subscribers were skipped due to missing phone numbers:\n${result.failed.join(', ')}`);
            }

            setShowModal(false);
            fetchSubscribers();
            fetchQueuedSMS();
        } catch (error) {
            console.error('Error scheduling:', error);
            toast.error('Error scheduling');
        }
    };





    // ✅ Will handle only subscriber events (email, call, meeting, other)
    const convertSubscribersToEvents = () => {
        return subscribers.flatMap(sub => {
            const events = [];
            const styleMap = {
                email: 'event-email',
                phone_call: 'event-call',
                meeting: 'event-meeting',
                other: 'event-other',
            };

            const formatDate = (date) => moment(date).format('MMMM Do YYYY, h:mm A');

            if (sub.scheduled_email) {
                const date = moment(sub.scheduled_email).toDate();
                events.push({
                    title: `Email - ${sub.name}`,
                    start: date,
                    end: date,
                    formattedDate: formatDate(date),
                    notes: sub.notes,
                    templateName: sub.template_name,
                    className: styleMap.email
                });
            }

            if (sub.scheduled_phone_call) {
                const date = moment(sub.scheduled_phone_call).toDate();
                events.push({
                    title: `Call - ${sub.name}`,
                    start: date,
                    end: date,
                    formattedDate: formatDate(date),
                    notes: sub.notes,
                    className: styleMap.phone_call
                });
            }

            if (sub.scheduled_meeting) {
                const date = moment(sub.scheduled_meeting).toDate();
                events.push({
                    title: `Meeting - ${sub.name}`,
                    start: date,
                    end: date,
                    formattedDate: formatDate(date),
                    notes: sub.notes,
                    className: styleMap.meeting
                });
            }

            if (sub.scheduled_other) {
                const date = moment(sub.scheduled_other).toDate();
                events.push({
                    title: `Other - ${sub.name}`,
                    start: date,
                    end: date,
                    formattedDate: formatDate(date),
                    notes: sub.notes,
                    className: styleMap.other
                });
            }

            return events;
        });
    };

// ✅ New Function: Handles SMS Queue events
    const convertScheduledSMSToEvents = () => {
        return queuedSMS.map(sms => {
            const subscriber = subscribers.find(sub => sub.id === sms.subscriber_id);
            return {
                title: `Text - ${subscriber ? subscriber.name : 'Unknown Subscriber'}`,
                start: new Date(sms.scheduled_time),
                end: new Date(sms.scheduled_time),
                notes: subscriber?.notes || '', // <-- grab notes from subscribers table
                className: 'event-text',
            };
        });
    };





    const eventPropGetter = (event) => {
        const styles = {
            'event-email': {
                background: 'linear-gradient(to right bottom, rgb(255, 218, 179), orange)',
                color: 'black'
            },
            'event-call': {
                background: 'linear-gradient(to right bottom, rgb(52, 235, 146), rgb(35, 173, 106))',
                color: 'white'
            },
            'event-meeting': {
                background: 'linear-gradient(to right bottom, rgb(169, 216, 216), cadetblue)',
                color: 'white'
            },
            'event-other': {
                background: 'lightgray',
                color: 'black'
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
        fetchQueuedSMS();
    }, []);

    useEffect(() => {
        const combinedEvents = [
            ...convertSubscribersToEvents(),
            ...convertScheduledSMSToEvents()
        ];
        setEvents(combinedEvents);
    }, [subscribers, queuedSMS]);


    return (
        <div>
            <h2 style={{ textAlign: 'center', color: '#ff7043' }}>Calendar Scheduler</h2>
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
                views={{ month: true, week: true, day: true, agenda: true }}
            />

            <Modal show={showModal} onHide={() => { setShowModal(false); setEventDetails(null); setActionType(''); }} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {eventDetails ? eventDetails.title : `Schedule on ${selectedDate?.toLocaleString()}`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {eventDetails && queuedEmails.length > 0 && (
                        <div className="mb-3">
                            <h5>Queued Emails</h5>
                            <Table striped bordered hover responsive>
                                <thead>
                                <tr>
                                    <th>Send Time</th>
                                    <th>Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                {queuedEmails.map((email) => (
                                    <tr key={email.id}>
                                        <td>{new Date(email.send_time).toLocaleString()}</td>
                                        <td>{email.status}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                    {eventDetails && (
                        <>
                            {(() => {
                                const subscriberName = eventDetails.title?.split(" - ")[1];
                                const subscriber = subscribers.find(sub => sub.name === subscriberName);
                                const relevantSMS = queuedSMS.filter(sms => sms.subscriber_id === subscriber?.id);
                                return (
                                    relevantSMS.length > 0 && (
                                        <div className="mb-3">
                                            <h5>Queued Text Messages</h5>
                                            <Table striped bordered hover responsive>
                                                <thead>
                                                <tr>
                                                    <th>Send Time</th>
                                                    <th>Message</th>
                                                    <th>Status</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {relevantSMS.map((sms) => (
                                                    <tr key={sms.id}>
                                                        <td>{moment(sms.scheduled_time).format('MMMM Do YYYY, h:mm A')}</td>
                                                        <td>{sms.message}</td>
                                                        <td>{sms.status}</td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    )
                                );
                            })()}
                        </>
                    )}


                    {eventDetails ? (
                        <>
                            {eventDetails.templateName && (
                                <div className="mb-2">
                                    <strong>Template:</strong> {eventDetails.templateName}{' '}
                                    {eventDetails.templateContent && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => handlePreview(eventDetails.templateContent)}
                                        >
                                            Preview
                                        </Button>
                                    )}
                                </div>
                            )}
                            <p><strong>Notes:</strong></p>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{formatNoteWithDate(eventDetails.notes)}</pre>
                            <p>
                                <strong>Scheduled {eventDetails.title?.split(' - ')[0] || 'Event'} Time:</strong>{' '}
                                {moment(eventDetails.start).format('MMMM Do YYYY, h:mm A')}
                            </p>

                        </>
                    ) : (
                        <>
                            <Form.Group>
                                <Form.Label>Search Subscribers</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by name or email"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                />
                            </Form.Group>
                            <Form.Group className="mt-2">
                                <Form.Label>Select Subscribers</Form.Label>
                                <Form.Control as="select" multiple value={selectedSubscribers} onChange={(e) => setSelectedSubscribers(Array.from(e.target.selectedOptions, option => option.value))}>
                                    {filteredSubscribers.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name} ({sub.email})</option>
                                    ))}
                                </Form.Control>
                            </Form.Group>

                            <Form.Group className="mt-3">
                                <Form.Label>Action Type</Form.Label>
                                <Form.Select value={actionType} onChange={(e) => setActionType(e.target.value)}>
                                    <option value="">Select Action</option>
                                    <option value="email">Email</option>
                                    <option value="phone_call">Phone Call</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="other">Other</option>
                                    <option value="text">Text Message</option> {/* <-- Add this */}
                                </Form.Select>
                            </Form.Group>


                            <Form.Group className="mt-3">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                            </Form.Group>

                            {actionType === 'email' && (
                                <div className="mt-4">
                                    <h5>Choose a Template</h5>
                                    <Table striped bordered hover responsive>
                                        <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Category</th>
                                            <th>Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {templates.map((template, index) => (
                                            <tr key={template.id}>
                                                <td>{index + 1}</td>
                                                <td>{template.category}</td>
                                                <td>
                                                    <Button size="sm" onClick={() => handlePreview(template.content)}>
                                                        Preview
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan="3" className="text-center">
                                                <Button variant="secondary" size="sm">Start Blank Email</Button>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {eventDetails && (
                        <Button variant="danger" onClick={handleDeleteEvent}>Delete from Calendar</Button>
                    )}
                    <Button variant="secondary" onClick={() => { setShowModal(false); setEventDetails(null); setActionType(''); }}>Close</Button>
                    {!eventDetails && (
                        <Button variant="primary" onClick={handleSchedule} disabled={!actionType || !selectedSubscribers.length}>Save</Button>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CalendarScheduler;
