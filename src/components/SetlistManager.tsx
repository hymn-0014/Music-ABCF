import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const SetlistManager = () => {
    const [songs, setSongs] = useState([]);

    // Load setlist from localStorage on component mount
    useEffect(() => {
        const savedSetlist = JSON.parse(localStorage.getItem('setlist')) || [];
        setSongs(savedSetlist);
    }, []);

    // Save setlist to localStorage
    const saveSetlist = () => {
        localStorage.setItem('setlist', JSON.stringify(songs));
    };

    // Handle drag and drop
    const onDragEnd = (result) => {
        if (!result.destination) return;
        const updatedSongs = Array.from(songs);
        const [removed] = updatedSongs.splice(result.source.index, 1);
        updatedSongs.splice(result.destination.index, 0, removed);
        setSongs(updatedSongs);
    };

    // Add new song
    const addSong = (song) => {
        if (song && !songs.includes(song)) {
            setSongs([...songs, song]);
        }
    };

    // Remove a song
    const removeSong = (index) => {
        const updatedSongs = songs.filter((_, i) => i !== index);
        setSongs(updatedSongs);
    };

    return (
        <div>
            <h2>Setlist Manager</h2>
            <button onClick={saveSetlist}>Save Setlist</button>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="setlist">
                    {(provided) => (
                        <ul ref={provided.innerRef} {...provided.droppableProps}>
                            {songs.map((song, index) => (
                                <Draggable key={song} draggableId={song} index={index}>
                                    {(provided) => (
                                        <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                            {song}
                                            <button onClick={() => removeSong(index)}>Remove</button>
                                        </li>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </ul>
                    )}
                </Droppable>
            </DragDropContext>
            <input type="text" placeholder="Add a new song" onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    addSong(e.target.value);
                    e.target.value = '';
                }
            }} />
        </div>
    );
};

export default SetlistManager;