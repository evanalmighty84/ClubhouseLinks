import React, { useEffect, useState } from 'react';
import { Button, Table, Row, Modal, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ListForm from './ListForm';
import '../../CRMstyles/ListsPage.css'; // Custom CRMstyles

const ListsPage = ({ guestMode = false }) => {
    const [lists, setLists] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedList, setSelectedList] = useState(null);
    const [userId, setUserId] = useState(null); // Store the userId here

    const mockLists = [
        { id: 1, name: 'Sample List A', subscriber_count: 15, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Sample List B', subscriber_count: 42, created_at: new Date(), updated_at: new Date() },
        { id: 3, name: 'Demo List', subscriber_count: 8, created_at: new Date(), updated_at: new Date() },
    ];

    useEffect(() => {
        if (guestMode) {
            setLists(mockLists);
            return;
        }
        const user = localStorage.getItem('user');
        if (user) {
            const { id } = JSON.parse(user);
            setUserId(id);
            fetchLists(id);
        }
    }, []);

    const fetchLists = async (userId) => {
        try {
            const response = await fetch(`/server/crm_function/api/lists/user/${userId}`);
            const data = await response.json();
            setLists(data);
        } catch (err) {
            console.error('Error fetching lists:', err);
            toast.error('Error fetching lists!');
        }
    };

    const handleViewClick = (list) => {
        setSelectedList(list);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setSelectedList(null);
        setShowModal(false);
    };

    const handleSaveSuccess = () => {
        if (!guestMode) fetchLists(userId);
        toast.success('List saved successfully!');
        handleCloseModal();
    };

    const handleDeleteList = async (listId) => {
        if (!listId || guestMode) return;

        try {
            const response = await fetch(`/server/crm_function/api/lists/${listId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                toast.success('List deleted successfully!');
                fetchLists(userId);
            } else {
                throw new Error('Failed to delete list');
            }
        } catch (error) {
            toast.error('Error deleting list');
            console.error('Error deleting list:', error);
        }
    };

    return (
        <Card className="" style={{ height: '100%', backgroundColor: 'white', marginBottom: '0px' }}>
            <div className="lists-page p-4">
                <h3 style={{ textAlign: 'center', color: 'rgb(255, 112, 67)' }}>Lists {guestMode && ''}</h3>

                <div className="d-flex justify-content-end mb-3">
                    <Button
                        variant="primary"
                        onClick={() => handleViewClick(null)}
                        style={{ fontSize: '1rem', padding: '10px 20px' }}
                    >
                        + New
                    </Button>
                </div>

                <Table striped bordered hover responsive>
                    <thead style={{ background: 'linear-gradient(to right bottom, rgb(52, 235, 146), rgb(35, 173, 106)' }}>
                    <tr>
                        <th>Name</th>
                        <th>Subscribers</th>
                        <th>Created</th>
                        <th>Updated</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {lists.length > 0 ? (
                        lists.map((list) => (
                            <tr key={list.id}>
                                <td>{list.name}</td>
                                <td>{list.subscriber_count || 0}</td>
                                <td>{new Date(list.created_at).toLocaleDateString()}</td>
                                <td>{new Date(list.updated_at).toLocaleDateString()}</td>
                                <td>
                                    <Button variant="info" onClick={() => handleViewClick(list)}>
                                        View
                                    </Button>{' '}
                                    {!guestMode && (
                                        <Button variant="danger" onClick={() => handleDeleteList(list.id)}>
                                            Delete
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5">No lists available.</td>
                        </tr>
                    )}
                    </tbody>
                </Table>

                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>{selectedList ? 'Edit List' : 'Create New List'}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {!guestMode ? (
                            <ListForm initialList={selectedList || {}} onSaveSuccess={handleSaveSuccess} userId={userId} />
                        ) : (
                            <p>Guest mode: This is a demo.</p>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </Card>
    );
};

export default ListsPage;
