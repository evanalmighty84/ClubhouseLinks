import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const ListItem = ({ list, onDelete }) => {

    // Function to handle deletion of a list
    const handleDelete = async (id) => {
        try {
            // Call the API to delete the list
            const response = await fetch(`https://crm-function-app-5d4de511071d.herokuapp.com/server/crm_function/api/lists/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete list');
            }

            // Call the onDelete callback to update the parent component after deletion
            onDelete(id);
        } catch (error) {
            console.error('Error deleting list:', error);
        }
    };

    return (
        <tr>
            <td><Link to={`/lists/${list.id}`}>{list.name}</Link></td>
            <td>{list.type === 'private' ? 'Private' : 'Public'}</td>
            <td>{list.subscribers_count}</td>
            <td>{new Date(list.created_at).toLocaleDateString()}</td>
            <td>{new Date(list.updated_at).toLocaleDateString()}</td>
            <td>
                <ButtonGroup>
                    <Button variant="link" as={Link} to={`/lists/${list.id}`}>View</Button>
                    <Button variant="link" as={Link} to={`/lists/${list.id}/edit`}>Edit</Button>
                    <Button variant="danger" onClick={() => handleDelete(list.id)}>Delete</Button>
                </ButtonGroup>
            </td>
        </tr>
    );
};

export default ListItem;
