// src/Dashboard.js
import React from 'react';
import { useState } from 'react';
import './App.css';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import ThemeProvider from './main_sub_components/ThemeProvider'; 

function Dashboard({ onLogout}) {

  const [history, setHistory] = useState({ today: [], yesterday: [], last_week: [], last_month: [] });
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]); 

  // Callback function to handle history clicks
  const handleHistoryClick = (session_id) => {
    setSelectedSessionId(session_id); 
  }; 

  // Callback to handle file selection from LeftSidebar
  const handleFileSelection = (files) => {
    setSelectedFiles(files); 
  };

  return (
    <ThemeProvider>
      <div className="App">

        <div className="container">

          <LeftSidebar history={history} onLogout={onLogout} 
           onHistoryClick={handleHistoryClick} onFileSelect={handleFileSelection} />
          <MainContent setHistory={setHistory} selectedSessionId={selectedSessionId}
          resetSelectedSessionId={() => setSelectedSessionId(null)}  selectedFiles={selectedFiles} />
        </div>
      </div>

    </ThemeProvider>
  );
}

export default Dashboard;