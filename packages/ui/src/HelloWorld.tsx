import React from 'react';

export const HelloWorld = () => {
  return (
    <div style={{ padding: '20px', border: '1px solid blue', borderRadius: '5px' }}>
      <h1>Hello from Shared UI!</h1>
      <p>This component is shared between web and desktop.</p>
    </div>
  );
};
