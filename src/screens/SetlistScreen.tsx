import React, { useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const SetlistScreen = () => {
    const [setlist, setSetlist] = useState([]);

    const saveSetlist = () => {
        // Function to save setlist functionality
    };

    const loadSetlist = () => {
        // Function to load setlist functionality
    };

    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }
        const items = Array.from(setlist);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSetlist(items);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="setlist">
                {(provided) => (
                    <FlatList
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        data={setlist}
                        renderItem={({ item, index }) => (
                            <Draggable draggableId={item.id} index={index} key={item.id}>
                                {(provided) => (
                                    <View
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={styles.item}
                                    >
                                        <Text>{item.title}</Text>
                                    </View>
                                )}
                            </Draggable>
                        )}
                        keyExtractor={item => item.id}
                    />
                )}
            </Droppable>
            <Button title="Save Setlist" onPress={saveSetlist} />
            <Button title="Load Setlist" onPress={loadSetlist} />
        </DragDropContext>
    );
};

const styles = StyleSheet.create({
    item: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
});

export default SetlistScreen;