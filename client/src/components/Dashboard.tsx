import React from 'react';
import { Button } from 'antd'; // Or your button library
import { useNavigate } from 'react-router-dom'; // Or your routing library

function MyComponent() {
  const navigate = useNavigate();

  return (
    <div>
      <Button
        variant="default"
        size="lg"
        className="w-full button-slide-up"
        onClick={() => navigate("/goals/new")}
      >
        Create New Goal
      </Button>
      {/*Rest of your component*/}
    </div>
  );
}

export default MyComponent;


/*index.css or your stylesheet*/
.button-slide-up {
  transition: transform 0.3s ease-in-out; /* Add transition for smooth animation */
}

.button-slide-up:hover {
  transform: translateY(-5px); /* Slide up on hover */
  background-color: lightgray; /* Still keeps the light gray background*/
}