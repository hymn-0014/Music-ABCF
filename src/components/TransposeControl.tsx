import React, { useState } from 'react';

const TransposeControl: React.FC = () => {
    const [transposeLevel, setTransposeLevel] = useState(0);
    const [sharp, setSharp] = useState(true);

    const incrementTranspose = () => setTransposeLevel(transposeLevel + 1);
    const decrementTranspose = () => setTransposeLevel(transposeLevel - 1);
    const toggleSharpFlat = () => setSharp(!sharp);

    return (
        <div>
            <h2>Transpose Control</h2>
            <div>
                <button onClick={decrementTranspose}>-</button>
                <span>{transposeLevel}</span>
                <button onClick={incrementTranspose}>+</button>
            </div>
            <div>
                <button onClick={toggleSharpFlat}>
                    {sharp ? 'Switch to Flat' : 'Switch to Sharp'}
                </button>
            </div>
        </div>
    );
};

export default TransposeControl;